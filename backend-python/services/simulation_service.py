import datetime
from typing import Dict, Any, List
import pandas as pd
import numpy as np

from config import settings
from .java_client import fetch_dataset_from_java
from models.request_models import SimulationRequest
from models.response_models import (
    SimulationResponse,
    SimulationTimelinePoint
)

async def run_inventory_simulation(request: SimulationRequest) -> SimulationResponse:
    products, transactions = await fetch_dataset_from_java()
    
    if not products:
        today_str = datetime.date.today().isoformat()
        return SimulationResponse(
            status="EMPTY_DATASET",
            inputs=request,
            projectedRevenueBefore=0.0,
            projectedRevenueAfter=0.0,
            projectedProfitBefore=0.0,
            projectedProfitAfter=0.0,
            holdingCostBefore=0.0,
            holdingCostAfter=0.0,
            stockoutRiskBeforeCount=0,
            stockoutRiskAfterCount=0,
            avgDaysToStockoutBefore=30.0,
            avgDaysToStockoutAfter=30.0,
            timeline=[SimulationTimelinePoint(day=1, date=today_str, baselineStock=0, simulatedStock=0)],
            highRiskProducts=[]
        )

    # Filter by specific product if requested
    if request.productId:
        products = [p for p in products if p.get("id") == request.productId]
        if not products:
            raise ValueError(f"Product with id {request.productId} not found in catalog")

    df_products = pd.DataFrame(products)

    # Calculate historical average daily sales from transactions
    df_tx = pd.DataFrame(transactions)
    if not df_tx.empty and "type" in df_tx.columns:
        out_tx = df_tx[df_tx["type"] == "OUT"].copy()
        if not out_tx.empty:
            out_tx["soldQty"] = out_tx["quantityChanged"].abs()
            sales_by_prod = out_tx.groupby("productId")["soldQty"].sum().reset_index()
            sales_by_prod["avgDailyDemand"] = (sales_by_prod["soldQty"] / 90.0).round(2)
            df_merged = pd.merge(df_products, sales_by_prod[["productId", "avgDailyDemand"]], left_on="id", right_on="productId", how="left")
            df_merged["avgDailyDemand"] = df_merged["avgDailyDemand"].fillna(0.3)
        else:
            df_merged = df_products.copy()
            df_merged["avgDailyDemand"] = 0.3
    else:
        df_merged = df_products.copy()
        df_merged["avgDailyDemand"] = 0.3

    # Ensure nonzero floor for simulation
    df_merged["avgDailyDemand"] = df_merged["avgDailyDemand"].apply(lambda x: max(float(x), 0.05))

    demand_mult = 1.0 + (request.demandChangePercent / 100.0)
    price_mult = 1.0 + (request.priceChangePercent / 100.0)
    daily_holding_rate = settings.HOLDING_COST_RATE / 365.0

    # 30-Day Forward Simulation Loop
    HORIZON_DAYS = 30
    
    baseline_stock = df_merged["quantity"].copy().values.astype(float)
    simulated_stock = df_merged["quantity"].copy().values.astype(float)
    
    cost_prices = df_merged["costPrice"].values.astype(float)
    base_sell_prices = df_merged["sellingPrice"].values.astype(float)
    sim_sell_prices = (base_sell_prices * price_mult).astype(float)

    base_daily_demand = df_merged["avgDailyDemand"].values.astype(float)
    sim_daily_demand = (base_daily_demand * demand_mult).astype(float)

    total_base_revenue = 0.0
    total_sim_revenue = 0.0
    total_base_profit = 0.0
    total_sim_profit = 0.0
    total_base_holding = 0.0
    total_sim_holding = 0.0

    timeline_points: List[SimulationTimelinePoint] = []
    base_stockout_days = np.full(len(df_merged), fill_value=HORIZON_DAYS, dtype=float)
    sim_stockout_days = np.full(len(df_merged), fill_value=HORIZON_DAYS, dtype=float)

    start_date = datetime.date.today()

    for day in range(1, HORIZON_DAYS + 1):
        cur_date = start_date + datetime.timedelta(days=day)

        # Baseline day iteration
        base_sales_possible = np.minimum(baseline_stock, base_daily_demand)
        total_base_revenue += np.sum(base_sales_possible * base_sell_prices)
        total_base_profit += np.sum(base_sales_possible * (base_sell_prices - cost_prices))
        total_base_holding += np.sum(baseline_stock * cost_prices * daily_holding_rate)
        
        # Track baseline stockouts
        for idx in range(len(baseline_stock)):
            if baseline_stock[idx] <= 0 and base_stockout_days[idx] == HORIZON_DAYS:
                base_stockout_days[idx] = day
        baseline_stock = np.maximum(0.0, baseline_stock - base_daily_demand)

        # Simulated day iteration
        sim_sales_possible = np.minimum(simulated_stock, sim_daily_demand)
        total_sim_revenue += np.sum(sim_sales_possible * sim_sell_prices)
        total_sim_profit += np.sum(sim_sales_possible * (sim_sell_prices - cost_prices))
        total_sim_holding += np.sum(simulated_stock * cost_prices * daily_holding_rate)
        
        # Track simulated stockouts
        for idx in range(len(simulated_stock)):
            if simulated_stock[idx] <= 0 and sim_stockout_days[idx] == HORIZON_DAYS:
                sim_stockout_days[idx] = day
        simulated_stock = np.maximum(0.0, simulated_stock - sim_daily_demand)

        timeline_points.append(SimulationTimelinePoint(
            day=day,
            date=cur_date.strftime("%b %d"),
            baselineStock=round(float(np.sum(baseline_stock)), 1),
            simulatedStock=round(float(np.sum(simulated_stock)), 1)
        ))

    stockout_risk_before = int(np.sum(base_stockout_days < HORIZON_DAYS))
    stockout_risk_after = int(np.sum(sim_stockout_days < HORIZON_DAYS))

    avg_days_to_stockout_before = round(float(np.mean(base_stockout_days)), 1)
    avg_days_to_stockout_after = round(float(np.mean(sim_stockout_days)), 1)

    # Identify high risk products under simulated conditions
    high_risk_list = []
    for idx, row in df_merged.iterrows():
        days_to_depletion = sim_stockout_days[idx]
        if days_to_depletion < 21:  # Depleted within 3 weeks
            stockout_date = start_date + datetime.timedelta(days=int(days_to_depletion))
            high_risk_list.append({
                "productId": int(row["id"]),
                "sku": str(row["sku"]),
                "name": str(row["name"]),
                "currentStock": int(row["quantity"]),
                "simulatedDemand": round(float(sim_daily_demand[idx]), 2),
                "projectedStockoutDays": int(days_to_depletion),
                "projectedStockoutDate": stockout_date.strftime("%d %b %Y"),
                "urgency": "CRITICAL" if days_to_depletion <= 7 else "HIGH"
            })

    # Sort high risk items by urgency (fewest days left first)
    high_risk_list.sort(key=lambda x: x["projectedStockoutDays"])

    return SimulationResponse(
        status="SUCCESS",
        inputs=request,
        projectedRevenueBefore=round(total_base_revenue, 2),
        projectedRevenueAfter=round(total_sim_revenue, 2),
        projectedProfitBefore=round(total_base_profit, 2),
        projectedProfitAfter=round(total_sim_profit, 2),
        holdingCostBefore=round(total_base_holding, 2),
        holdingCostAfter=round(total_sim_holding, 2),
        stockoutRiskBeforeCount=stockout_risk_before,
        stockoutRiskAfterCount=stockout_risk_after,
        avgDaysToStockoutBefore=avg_days_to_stockout_before,
        avgDaysToStockoutAfter=avg_days_to_stockout_after,
        timeline=timeline_points,
        highRiskProducts=high_risk_list[:10]
    )
