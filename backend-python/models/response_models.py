from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from .request_models import SimulationRequest

class ProductIntelligenceItem(BaseModel):
    productId: int
    sku: str
    name: str
    category: str
    currentQuantity: int
    costPrice: float
    sellingPrice: float
    totalSoldUnits90d: int
    cogs90d: float
    revenue90d: float
    profitMarginPercent: float
    turnoverRatio: float
    avgDailyDemand: float
    daysOfStockLeft: float
    abcCategory: str          # "A", "B", "C"
    movementVelocity: str     # "FAST", "SLOW", "DEAD"
    riskStatus: str           # "HEALTHY", "LOW_STOCK", "OVERSTOCK", "DEAD_STOCK"

class IntelligenceSummary(BaseModel):
    totalSkus: int
    classACount: int
    classBCount: int
    classCCount: int
    fastMoversCount: int
    slowMoversCount: int
    deadStockCount: int
    deadStockTiedCapital: float
    averageTurnoverRatio: float

class IntelligenceResponse(BaseModel):
    status: str
    generatedAt: str
    summary: IntelligenceSummary
    items: List[ProductIntelligenceItem]

class SimulationTimelinePoint(BaseModel):
    day: int
    date: str
    baselineStock: float
    simulatedStock: float

class SimulationResponse(BaseModel):
    status: str
    inputs: SimulationRequest
    projectedRevenueBefore: float
    projectedRevenueAfter: float
    projectedProfitBefore: float
    projectedProfitAfter: float
    holdingCostBefore: float
    holdingCostAfter: float
    stockoutRiskBeforeCount: int
    stockoutRiskAfterCount: int
    avgDaysToStockoutBefore: float
    avgDaysToStockoutAfter: float
    timeline: List[SimulationTimelinePoint]
    highRiskProducts: List[Dict[str, Any]]

class SmartReorderItem(BaseModel):
    productId: int
    sku: str
    name: str
    category: str
    supplier: str
    leadTimeDays: int
    costPrice: float
    currentQuantity: int
    reorderLevel: int
    avgDailyDemand: float
    demandStdDev: float
    forecastedMonthlyDemand: float
    safetyStock: int
    recommendedReorderPoint: int
    economicOrderQuantity: int
    suggestedOrderQuantity: int
    estimatedOrderCost: float
    needsReorder: bool
    urgencyLevel: str         # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    supplierId: Optional[int] = None
    daysToStockout: Optional[float] = None

class SmartReorderResponse(BaseModel):
    status: str
    generatedAt: str
    totalItemsAnalyzed: int
    itemsNeedingReorder: int
    estimatedTotalReorderCost: float
    recommendations: List[SmartReorderItem]
