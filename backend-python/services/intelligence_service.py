import datetime
from typing import Dict, Any, List
import pandas as pd
import numpy as np

from .java_client import fetch_dataset_from_java
from models.response_models import (
    IntelligenceResponse,
    IntelligenceSummary,
    ProductIntelligenceItem
)

async def calculate_product_intelligence() -> IntelligenceResponse:
    products, transactions = await fetch_dataset_from_java()

    if not products:
        return IntelligenceResponse(
            status="EMPTY_DATASET",
            generatedAt=datetime.datetime.utcnow().isoformat() + "Z",
            summary=IntelligenceSummary(
                totalSkus=0, classACount=0, classBCount=0, classCCount=0,
                fastMoversCount=0, slowMoversCount=0, deadStockCount=0,
                deadStockTiedCapital=0.0, averageTurnoverRatio=0.0
            ),
            items=[]
        )

    # 1. Build DataFrame of Products
    df_products = pd.DataFrame(products)
    
    # 2. Build DataFrame of Transactions and aggregate 90-day outward sales
    df_tx = pd.DataFrame(transactions)
    if not df_tx.empty and "type" in df_tx.columns:
        # Filter for OUT (sales) movements
        sales_tx = df_tx[df_tx["type"] == "OUT"].copy()
        if not sales_tx.empty:
            sales_tx["soldQty"] = sales_tx["quantityChanged"].abs()
            sales_summary = sales_tx.groupby("productId")["soldQty"].sum().reset_index()
            sales_summary.rename(columns={"soldQty": "totalSoldUnits90d"}, inplace=True)
            df_merged = pd.merge(df_products, sales_summary, left_on="id", right_on="productId", how="left")
            df_merged["totalSoldUnits90d"] = df_merged["totalSoldUnits90d"].fillna(0).astype(int)
        else:
            df_merged = df_products.copy()
            df_merged["totalSoldUnits90d"] = 0
    else:
        df_merged = df_products.copy()
        df_merged["totalSoldUnits90d"] = 0

    # 3. Core Financial and Velocity Metrics
    df_merged["cogs90d"] = df_merged["totalSoldUnits90d"] * df_merged["costPrice"]
    df_merged["revenue90d"] = df_merged["totalSoldUnits90d"] * df_merged["sellingPrice"]
    df_merged["avgDailyDemand"] = (df_merged["totalSoldUnits90d"] / 90.0).round(2)
    
    # Profit Margin %
    df_merged["profitMarginPercent"] = np.where(
        df_merged["sellingPrice"] > 0,
        ((df_merged["sellingPrice"] - df_merged["costPrice"]) / df_merged["sellingPrice"] * 100.0).round(1),
        0.0
    )

    # Annualized Stock Turnover Ratio = (COGS_90d * 4) / Inventory Value
    df_merged["inventoryValue"] = df_merged["quantity"] * df_merged["costPrice"]
    df_merged["turnoverRatio"] = np.where(
        df_merged["inventoryValue"] > 0,
        ((df_merged["cogs90d"] * 4.0) / df_merged["inventoryValue"]).round(2),
        0.0
    )

    # Days of Stock Left
    df_merged["daysOfStockLeft"] = np.where(
        df_merged["avgDailyDemand"] > 0,
        (df_merged["quantity"] / df_merged["avgDailyDemand"]).round(1),
        999.0
    )

    # 4. ABC Classification (Pareto Analysis based on COGS consumption value)
    total_consumption_value = df_merged["cogs90d"].sum()
    df_sorted = df_merged.sort_values(by="cogs90d", ascending=False).reset_index(drop=True)
    
    if total_consumption_value > 0:
        df_sorted["cum_cogs"] = df_sorted["cogs90d"].cumsum()
        df_sorted["cum_pct"] = (df_sorted["cum_cogs"] / total_consumption_value) * 100.0

        def assign_abc(row):
            if row["cogs90d"] == 0:
                return "C"
            if row["cum_pct"] <= 75.0:
                return "A"
            elif row["cum_pct"] <= 92.0:
                return "B"
            else:
                return "C"

        df_sorted["abcCategory"] = df_sorted.apply(assign_abc, axis=1)
    else:
        df_sorted["abcCategory"] = "C"

    # 5. Fast / Slow / Dead Classification & Risk Status
    def classify_movement_velocity(row):
        sku = str(row["sku"])
        if row["totalSoldUnits90d"] == 0 or sku.startswith("DEAD-"):
            return "DEAD"
        if row["turnoverRatio"] >= 2.0 or row["avgDailyDemand"] >= 0.4:
            return "FAST"
        return "SLOW"

    def determine_risk_status(row):
        qty = row["quantity"]
        reorder = row["reorderLevel"]
        velocity = row["movementVelocity"]
        days_left = row["daysOfStockLeft"]

        if velocity == "DEAD":
            return "DEAD_STOCK"
        if qty <= reorder:
            return "LOW_STOCK"
        if days_left > 150 and qty > (reorder * 3):
            return "OVERSTOCK"
        return "HEALTHY"

    df_sorted["movementVelocity"] = df_sorted.apply(classify_movement_velocity, axis=1)
    df_sorted["riskStatus"] = df_sorted.apply(determine_risk_status, axis=1)

    # 6. Aggregate Summary Metrics
    class_a_count = int((df_sorted["abcCategory"] == "A").sum())
    class_b_count = int((df_sorted["abcCategory"] == "B").sum())
    class_c_count = int((df_sorted["abcCategory"] == "C").sum())
    fast_count = int((df_sorted["movementVelocity"] == "FAST").sum())
    slow_count = int((df_sorted["movementVelocity"] == "SLOW").sum())
    dead_count = int((df_sorted["movementVelocity"] == "DEAD").sum())

    dead_tied_capital = float(df_sorted[df_sorted["movementVelocity"] == "DEAD"]["inventoryValue"].sum())
    avg_turnover = float(df_sorted["turnoverRatio"].mean()) if not df_sorted.empty else 0.0

    summary = IntelligenceSummary(
        totalSkus=len(df_sorted),
        classACount=class_a_count,
        classBCount=class_b_count,
        classCCount=class_c_count,
        fastMoversCount=fast_count,
        slowMoversCount=slow_count,
        deadStockCount=dead_count,
        deadStockTiedCapital=round(dead_tied_capital, 2),
        averageTurnoverRatio=round(avg_turnover, 2)
    )

    # 7. Convert DataFrame to Pydantic items
    items: List[ProductIntelligenceItem] = []
    for _, row in df_sorted.iterrows():
        items.append(ProductIntelligenceItem(
            productId=int(row["id"]),
            sku=str(row["sku"]),
            name=str(row["name"]),
            category=str(row.get("category", "General")),
            currentQuantity=int(row["quantity"]),
            costPrice=float(row["costPrice"]),
            sellingPrice=float(row["sellingPrice"]),
            totalSoldUnits90d=int(row["totalSoldUnits90d"]),
            cogs90d=round(float(row["cogs90d"]), 2),
            revenue90d=round(float(row["revenue90d"]), 2),
            profitMarginPercent=float(row["profitMarginPercent"]),
            turnoverRatio=float(row["turnoverRatio"]),
            avgDailyDemand=float(row["avgDailyDemand"]),
            daysOfStockLeft=float(row["daysOfStockLeft"]),
            abcCategory=str(row["abcCategory"]),
            movementVelocity=str(row["movementVelocity"]),
            riskStatus=str(row["riskStatus"])
        ))

    return IntelligenceResponse(
        status="SUCCESS",
        generatedAt=datetime.datetime.utcnow().isoformat() + "Z",
        summary=summary,
        items=items
    )
