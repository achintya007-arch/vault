from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, field_validator
from app.schemas.category import CategoryOut


class TransactionCreate(BaseModel):
    amount:      float
    kind:        str          # "income" | "expense"
    category_id: int
    note:        Optional[str] = ""
    date:        Optional[date] = None  # defaults to today server-side

    @field_validator("kind")
    @classmethod
    def validate_kind(cls, v: str) -> str:
        if v not in ("income", "expense"):
            raise ValueError("kind must be 'income' or 'expense'")
        return v

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("amount must be greater than 0")
        return round(v, 2)


class TransactionUpdate(BaseModel):
    category_id: Optional[int]   = None
    note:        Optional[str]   = None
    amount:      Optional[float] = None
    kind:        Optional[str]   = None
    date:        Optional[date]  = None

    @field_validator("kind")
    @classmethod
    def validate_kind(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("income", "expense"):
            raise ValueError("kind must be 'income' or 'expense'")
        return v

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("amount must be greater than 0")
        return None if v is None else round(v, 2)


class TransactionOut(BaseModel):
    id:         int
    amount:     float
    kind:       str
    note:       Optional[str]
    date:       date
    created_at: datetime
    category:   CategoryOut

    model_config = {"from_attributes": True}
