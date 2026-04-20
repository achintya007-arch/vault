from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.category import Category
from app.schemas.category import CategoryOut

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/", response_model=List[CategoryOut])
def list_categories(
    kind: Optional[str] = Query(None, description="Filter by 'income' or 'expense'"),
    db: Session = Depends(get_db),
):
    q = db.query(Category)
    if kind:
        q = q.filter(Category.kind == kind)
    return q.order_by(Category.name).all()
