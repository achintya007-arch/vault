from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.budget import Budget
from app.schemas.budget import BudgetSet, BudgetOut

router = APIRouter(prefix="/budget", tags=["budget"])


@router.get("/", response_model=Optional[BudgetOut])
def get_budget(db: Session = Depends(get_db)):
    """Return the current budget, or null if none has been set."""
    return db.query(Budget).first()


@router.put("/", response_model=BudgetOut)
def set_budget(payload: BudgetSet, db: Session = Depends(get_db)):
    """Create or update the monthly budget (upsert)."""
    budget = db.query(Budget).first()
    if budget:
        budget.monthly_limit = payload.monthly_limit
        budget.updated_at    = datetime.utcnow()
    else:
        budget = Budget(monthly_limit=payload.monthly_limit)
        db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/", status_code=204)
def delete_budget(db: Session = Depends(get_db)):
    """Remove the budget entirely."""
    budget = db.query(Budget).first()
    if budget:
        db.delete(budget)
        db.commit()
