from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionOut, TransactionUpdate

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("/", response_model=TransactionOut, status_code=201)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)):
    # ── Idempotency: return existing transaction if client_id already seen ──
    if payload.client_id:
        existing = (
            db.query(Transaction)
            .options(joinedload(Transaction.category))
            .filter(Transaction.client_id == payload.client_id)
            .first()
        )
        if existing:
            return existing

    tx = Transaction(
        amount=payload.amount,
        kind=payload.kind,
        category_id=payload.category_id,
        note=payload.note or "",
        date=payload.date or date.today(),
        client_id=payload.client_id,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    # Re-query with joined category so the response includes category details
    return (
        db.query(Transaction)
        .options(joinedload(Transaction.category))
        .filter(Transaction.id == tx.id)
        .one()
    )


@router.get("/", response_model=List[TransactionOut])
def list_transactions(
    kind:     Optional[str] = Query(None, description="Filter by 'income' or 'expense'"),
    month:    Optional[str] = Query(None, description="Filter by month, format YYYY-MM"),
    limit:    int           = Query(50, ge=1, le=200),
    offset:   int           = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    q = db.query(Transaction).options(joinedload(Transaction.category))

    if kind:
        q = q.filter(Transaction.kind == kind)

    if month:
        try:
            year, mon = map(int, month.split("-"))
        except ValueError:
            raise HTTPException(status_code=422, detail="month must be in YYYY-MM format")
        q = q.filter(
            Transaction.date >= date(year, mon, 1),
            Transaction.date <= _last_day(year, mon),
        )

    return q.order_by(Transaction.date.desc(), Transaction.id.desc()).offset(offset).limit(limit).all()


@router.get("/{tx_id}", response_model=TransactionOut)
def get_transaction(tx_id: int, db: Session = Depends(get_db)):
    tx = (
        db.query(Transaction)
        .options(joinedload(Transaction.category))
        .filter(Transaction.id == tx_id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


@router.patch("/{tx_id}", response_model=TransactionOut)
def update_transaction(tx_id: int, payload: TransactionUpdate, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tx, field, value)

    db.commit()
    return (
        db.query(Transaction)
        .options(joinedload(Transaction.category))
        .filter(Transaction.id == tx_id)
        .one()
    )


@router.delete("/{tx_id}", status_code=204)
def delete_transaction(tx_id: int, db: Session = Depends(get_db)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(tx)
    db.commit()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _last_day(year: int, month: int) -> date:
    import calendar
    return date(year, month, calendar.monthrange(year, month)[1])
