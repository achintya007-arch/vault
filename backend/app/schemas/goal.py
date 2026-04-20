from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, field_validator


class GoalCreate(BaseModel):
    name:          str
    target_amount: float
    deadline:      Optional[date] = None
    icon:          Optional[str]  = "🎯"
    color:         Optional[str]  = "#A78BFA"

    @field_validator("target_amount")
    @classmethod
    def validate_target(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("target_amount must be greater than 0")
        return round(v, 2)


class GoalUpdate(BaseModel):
    name:           Optional[str]   = None
    target_amount:  Optional[float] = None
    current_amount: Optional[float] = None
    deadline:       Optional[date]  = None
    icon:           Optional[str]   = None
    color:          Optional[str]   = None


class GoalOut(BaseModel):
    id:             int
    name:           str
    target_amount:  float
    current_amount: float
    progress_pct:   float
    deadline:       Optional[date]
    icon:           Optional[str]
    color:          Optional[str]
    created_at:     datetime

    model_config = {"from_attributes": True}
