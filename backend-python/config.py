import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "InvenIQ Core Backend & Analytics Engine"
    VERSION: str = "2.0.0"
    DEBUG: bool = True
    
    # Internal Service Key
    INTERNAL_SERVICE_KEY: str = os.getenv("INTERNAL_SERVICE_KEY", "InvenIQ_Internal_Secret_2026_SecureKey")
    
    # Unified Server Port (matches frontend Axios baseURL http://localhost:8080/api)
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8080"))
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./inveniq.db")

    # Inventory Analytics Math Constants
    HOLDING_COST_RATE: float = 0.20  # 20% annual holding cost per inventory unit value
    ORDER_FIXED_COST: float = 50.0   # $50 estimated fixed cost per PO placed
    SERVICE_LEVEL_Z: float = 1.645   # 95% service level z-score for safety stock calculation

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
