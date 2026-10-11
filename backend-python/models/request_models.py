from typing import Optional
from pydantic import BaseModel, Field

class SimulationRequest(BaseModel):
    demandChangePercent: float = Field(
        default=0.0,
        description="Percentage shift in customer demand (+20% means 1.2x demand)",
        ge=-100.0,
        le=500.0
    )
    leadTimeChangeDays: int = Field(
        default=0,
        description="Additional supplier lead time days added or subtracted",
        ge=-30,
        le=90
    )
    priceChangePercent: float = Field(
        default=0.0,
        description="Percentage shift in product selling prices",
        ge=-90.0,
        le=300.0
    )
    reorderLevelChangePercent: float = Field(
        default=0.0,
        description="Percentage adjustment to current product reorder levels",
        ge=-90.0,
        le=300.0
    )
    productId: Optional[int] = Field(
        default=None,
        description="Optional filter to simulate for a specific product ID only"
    )
