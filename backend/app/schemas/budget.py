from datetime import datetime
from pydantic import BaseModel, field_validator


class BudgetSet(BaseModel):
    monthly_limit: float

    @field_validator("monthly_limit")
    @classmethod
    def validate_limit(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("monthly_limit must be greater than 0")
        return round(v, 2)


class BudgetOut(BaseModel):
    id:            int
    monthly_limit: float
    created_at:    datetime
    updated_at:    datetime

    model_config = {"from_attributes": True}
