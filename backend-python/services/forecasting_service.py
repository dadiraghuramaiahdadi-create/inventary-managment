import datetime
import math
from typing import Dict, Any, List
import pandas as pd
import numpy as np

from config import settings
from .java_client import fetch_dataset_from_java
from models.response_models import (
    SmartReorderResponse,
    SmartReorderItem
)

async def calculate_smart_reorder_recommendations() -> SmartReorderResponse:
    products, transactions = await fetch_dataset_from_java()

    if not products:
        return SmartReorderResponse(
            status="EMPTY_DATASET",
            generatedAt=datetime.datetime.utcnow().isoformat() + "Z",
            totalItemsAnalyzed=0,
            itemsNeedingReorder=0,
            estimatedTotalReorderCost=0.0,
            recommendations=[]
        )

    df_products = pd.DataFrame(products)
    df_tx = pd.DataFrame(transactions)

    # 1. Calculate Daily Time-Series Demand per Product
    # Create daily demand vectors for the 90-day window
    daily_stats = {}
    if not df_tx.empty and "type" in df_tx.columns:
        out_tx = df_tx[df_tx["type"] == "OUT"].copy()
        if not out_tx.empty:
            out_tx["quantity"] = out_tx["quantityChanged"].abs()
            out_tx["date"] = pd.to_datetime(out_tx["timestamp"]).dt.date
            
            # Group by product and date
            daily_grouped = out_tx.groupby(["productId", "date"])["quantity"].sum().reset_index()
            for prod_id, group in daily_grouped.groupby("productId"):
                demands = group["quantity"].values
                mean_d = float(np.mean(demands))
                # Exponential smoothing weights recent days higher
                ema_series = pd.Series(demands).ewm(alpha=0.3, adjust=False).mean()
                ema_d = float(ema_series.iloc[-1]) if not ema_series.empty else mean_d
                std_d = float(np.std(demands)) if len(demands) > 1 else max(0.5, mean_d * 0.4)
                
                daily_stats[prod_id] = {
                    "avg": round((mean_d + ema_d) / 2.0, 2),
                    "std": round(std_d, 2)
                }

    recommendations: List[SmartReorderItem] = []
    items_needing_reorder = 0
    total_reorder_cost = 0.0

    for _, p in df_products.iterrows():
        p_id = int(p["id"])
        sku = str(p["sku"])
        name = str(p["name"])
        cat = str(p.get("category", "General"))
        supplier = str(p.get("supplier", "General"))
        lead_time = max(1, int(p.get("leadTimeDays", 7)))
        cost = float(p["costPrice"])
        qty = int(p["quantity"])
        reorder_level = int(p["reorderLevel"])

        # Demand parameters
        stats = daily_stats.get(p_id, {"avg": 0.25, "std": 0.3})
        avg_daily = stats["avg"]
        std_daily = stats["std"]

        # Prevent dead stock from generating infinite orders
        is_dead = sku.startswith("DEAD-")
        if is_dead:
            avg_daily = 0.0
            std_daily = 0.0

        forecast_monthly = round(avg_daily * 30.0, 1)

        # Safety Stock formula: SS = ceil(Z * std_dev * sqrt(LeadTime))
        if avg_daily > 0:
            safety_stock = int(math.ceil(settings.SERVICE_LEVEL_Z * std_daily * math.sqrt(lead_time)))
            safety_stock = max(2, safety_stock)
        else:
            safety_stock = 0

        # Recommended Reorder Point (ROP) = (Avg Daily Demand * Lead Time) + Safety Stock
        if avg_daily > 0:
            rop = int(math.ceil((avg_daily * lead_time) + safety_stock))
            rop = max(reorder_level, rop)
        else:
            rop = reorder_level

        # Economic Order Quantity (EOQ):
        # EOQ = sqrt((2 * Annual_Demand * Ordering_Cost) / Holding_Cost_Per_Unit)
        annual_demand = avg_daily * 365.0
        holding_cost = max(cost * settings.HOLDING_COST_RATE, 0.5)
        
        if annual_demand > 0:
            eoq_raw = math.sqrt((2.0 * annual_demand * settings.ORDER_FIXED_COST) / holding_cost)
            eoq = int(round(eoq_raw))
            eoq = max(5, eoq)
        else:
            eoq = 0

        # Suggested Order Quantity & Need Reorder Flag
        needs_reorder = (qty <= rop) and not is_dead
        suggested_qty = 0
        urgency = "LOW"

        if needs_reorder:
            deficit = max(0, rop - qty)
            suggested_qty = max(eoq, deficit + safety_stock)
            items_needing_reorder += 1
            total_reorder_cost += suggested_qty * cost

            if qty == 0:
                urgency = "CRITICAL"
            elif qty <= safety_stock:
                urgency = "HIGH"
            else:
                urgency = "MEDIUM"

        est_order_cost = round(suggested_qty * cost, 2)
        sup_id = int(p["supplierId"]) if p.get("supplierId") is not None and not pd.isna(p.get("supplierId")) else None
        days_to_stockout = round(qty / avg_daily, 1) if avg_daily > 0 else 999.0

        recommendations.append(SmartReorderItem(
            productId=p_id,
            sku=sku,
            name=name,
            category=cat,
            supplier=supplier,
            supplierId=sup_id,
            leadTimeDays=lead_time,
            costPrice=cost,
            currentQuantity=qty,
            reorderLevel=reorder_level,
            avgDailyDemand=avg_daily,
            demandStdDev=std_daily,
            forecastedMonthlyDemand=forecast_monthly,
            safetyStock=safety_stock,
            recommendedReorderPoint=rop,
            economicOrderQuantity=eoq,
            suggestedOrderQuantity=suggested_qty,
            estimatedOrderCost=est_order_cost,
            needsReorder=needs_reorder,
            urgencyLevel=urgency,
            daysToStockout=days_to_stockout
        ))

    # Sort so items needing reorder and highest urgency appear first
    urgency_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    recommendations.sort(key=lambda x: (urgency_order[x.urgencyLevel], -x.suggestedOrderQuantity))

    return SmartReorderResponse(
        status="SUCCESS",
        generatedAt=datetime.datetime.utcnow().isoformat() + "Z",
        totalItemsAnalyzed=len(recommendations),
        itemsNeedingReorder=items_needing_reorder,
        estimatedTotalReorderCost=round(total_reorder_cost, 2),
        recommendations=recommendations
    )
