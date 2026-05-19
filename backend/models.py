from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class FinancialIndicators(BaseModel):
    current_ratio: float
    quick_ratio: float
    debt_ratio: float
    debt_to_equity: float
    net_profit_margin: float
    return_on_assets: float
    return_on_equity: float
    asset_turnover: float
    working_capital_ratio: float
    interest_coverage: float


class CompanyRecord(BaseModel):
    company_name: str
    year: int
    indicators: FinancialIndicators
    is_bankrupt: Optional[int] = None
    risk_score: Optional[float] = None
    risk_label: Optional[str] = None
    predicted_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("year")
    @classmethod
    def year_must_be_valid(cls, v: int) -> int:
        if v < 1900 or v > 2100:
            raise ValueError("Anul trebuie să fie între 1900 și 2100")
        return v


class PredictionRequest(BaseModel):
    indicators: FinancialIndicators


class PredictionResponse(BaseModel):
    risk_score: float
    risk_label: str
    probabilities: dict[str, float]
    feature_contributions: dict[str, float]


class TrainResponse(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    auc_roc: float
    n_samples: int
    n_features: int
    feature_importance: dict[str, float]
    model_type: str


class CompanyOut(BaseModel):
    id: str
    company_name: str
    year: int
    risk_score: Optional[float]
    risk_label: Optional[str]
    is_bankrupt: Optional[int]
    indicators: FinancialIndicators
    created_at: datetime
