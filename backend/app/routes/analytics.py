import calendar
from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.transaction import Transaction
from app.models.category import Category

router = APIRouter(prefix="/analytics", tags=["analytics"])


# ---------------------------------------------------------------------------
# Response shapes
# ---------------------------------------------------------------------------

class MonthlySummary(BaseModel):
    month:         str    # "YYYY-MM"
    total_income:  float
    total_expense: float
    balance:       float  # income - expense


class CategoryBreakdown(BaseModel):
    category_id:   int
    category_name: str
    icon:          str
    color:         str
    total:         float
    pct:           float  # percentage of total expenses for that month


class BudgetInsights(BaseModel):
    month:                  str
    daily_avg:              float   # mean expense per elapsed day (linear)
    projected_spend:        float   # daily_avg * days_in_month  (linear baseline)
    projected_spend_wk:     float   # weekday/weekend-aware projection (more accurate)
    weekday_avg:            float   # mean expense per weekday elapsed
    weekend_avg:            float   # mean expense per weekend day elapsed
    weekdays_elapsed:       int
    weekend_days_elapsed:   int
    weekdays_remaining:     int
    weekend_days_remaining: int
    no_spend_days:          int     # elapsed days with zero expense transactions
    elapsed_days:           int     # days elapsed so far (full month if past)
    days_in_month:          int
    top_category:           Optional[CategoryBreakdown] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/summary", response_model=MonthlySummary)
def monthly_summary(
    month: str = Query(..., description="YYYY-MM"),
    db: Session = Depends(get_db),
):
    year, mon = _parse_month(month)
    start, end = date(year, mon, 1), date(year, mon, calendar.monthrange(year, mon)[1])

    rows = (
        db.query(Transaction.kind, func.sum(Transaction.amount).label("total"))
        .filter(Transaction.date >= start, Transaction.date <= end)
        .group_by(Transaction.kind)
        .all()
    )

    totals = {r.kind: float(r.total) for r in rows}
    income  = totals.get("income",  0.0)
    expense = totals.get("expense", 0.0)

    return MonthlySummary(
        month=month,
        total_income=round(income, 2),
        total_expense=round(expense, 2),
        balance=round(income - expense, 2),
    )


@router.get("/by-category", response_model=List[CategoryBreakdown])
def spending_by_category(
    month: str = Query(..., description="YYYY-MM"),
    db: Session = Depends(get_db),
):
    year, mon = _parse_month(month)
    start, end = date(year, mon, 1), date(year, mon, calendar.monthrange(year, mon)[1])

    rows = (
        db.query(
            Transaction.category_id,
            Category.name.label("category_name"),
            Category.icon,
            Category.color,
            func.sum(Transaction.amount).label("total"),
        )
        .join(Category, Transaction.category_id == Category.id)
        .filter(
            Transaction.date >= start,
            Transaction.date <= end,
            Transaction.kind == "expense",
        )
        .group_by(Transaction.category_id)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )

    if not rows:
        return []

    grand_total = sum(float(r.total) for r in rows)

    return [
        CategoryBreakdown(
            category_id=r.category_id,
            category_name=r.category_name,
            icon=r.icon,
            color=r.color,
            total=round(float(r.total), 2),
            pct=round(float(r.total) / grand_total * 100, 1),
        )
        for r in rows
    ]


@router.get("/budget-insights", response_model=BudgetInsights)
def budget_insights(
    month: str = Query(..., description="YYYY-MM"),
    db: Session = Depends(get_db),
):
    year, mon = _parse_month(month)
    today        = date.today()
    start        = date(year, mon, 1)
    days_in_month = calendar.monthrange(year, mon)[1]
    end          = date(year, mon, days_in_month)

    # How many days have elapsed (full month for past months)
    if today < start:
        elapsed_days = 0
    elif today >= end:
        elapsed_days = days_in_month
    else:
        elapsed_days = today.day

    # Per-date expense totals for the elapsed period (one query used for everything below)
    daily_rows = (
        db.query(
            Transaction.date,
            func.sum(Transaction.amount).label("daily_total"),
        )
        .filter(
            Transaction.date >= start,
            Transaction.date <= end,
            Transaction.kind == "expense",
        )
        .group_by(Transaction.date)
        .all()
    )
    daily_spend: dict[date, float] = {r.date: float(r.daily_total) for r in daily_rows}

    # Aggregate totals and classify elapsed days into weekday / weekend
    total_expense          = 0.0
    weekday_total          = 0.0
    weekend_total          = 0.0
    weekdays_elapsed       = 0
    weekend_days_elapsed   = 0
    weekdays_remaining     = 0
    weekend_days_remaining = 0
    expense_date_count     = 0

    for i in range(days_in_month):
        d          = start + timedelta(days=i)
        is_weekend = d.weekday() >= 5   # Saturday=5, Sunday=6
        if i < elapsed_days:
            spend = daily_spend.get(d, 0.0)
            total_expense += spend
            if spend > 0:
                expense_date_count += 1
            if is_weekend:
                weekend_total        += spend
                weekend_days_elapsed += 1
            else:
                weekday_total    += spend
                weekdays_elapsed += 1
        else:
            if is_weekend:
                weekend_days_remaining += 1
            else:
                weekdays_remaining += 1

    # Linear projection
    daily_avg       = total_expense / elapsed_days if elapsed_days > 0 else 0.0
    projected_spend = daily_avg * days_in_month

    # Weekday/weekend-aware projection:
    # Use observed rates for each day-type; fall back to daily_avg for unseen types
    weekday_avg = weekday_total / weekdays_elapsed if weekdays_elapsed > 0 else daily_avg
    weekend_avg = weekend_total / weekend_days_elapsed if weekend_days_elapsed > 0 else daily_avg

    if weekdays_elapsed > 0 and weekend_days_elapsed > 0:
        # Both types observed — full split model
        projected_spend_wk = (
            total_expense
            + weekday_avg * weekdays_remaining
            + weekend_avg * weekend_days_remaining
        )
    elif weekdays_elapsed > 0:
        # Only weekday data seen so far — use daily_avg for unobserved weekends
        projected_spend_wk = (
            total_expense
            + weekday_avg * weekdays_remaining
            + daily_avg   * weekend_days_remaining
        )
    elif weekend_days_elapsed > 0:
        projected_spend_wk = (
            total_expense
            + daily_avg   * weekdays_remaining
            + weekend_avg * weekend_days_remaining
        )
    else:
        projected_spend_wk = projected_spend   # no data, fall back

    # No-spend days: elapsed days with zero expense
    no_spend_days = max(0, elapsed_days - expense_date_count)

    # Top spending category for the month
    top_rows = (
        db.query(
            Transaction.category_id,
            Category.name.label("category_name"),
            Category.icon,
            Category.color,
            func.sum(Transaction.amount).label("total"),
        )
        .join(Category, Transaction.category_id == Category.id)
        .filter(
            Transaction.date >= start,
            Transaction.date <= end,
            Transaction.kind == "expense",
        )
        .group_by(Transaction.category_id)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(1)
        .all()
    )

    top_category = None
    if top_rows:
        r = top_rows[0]
        top_category = CategoryBreakdown(
            category_id=r.category_id,
            category_name=r.category_name,
            icon=r.icon,
            color=r.color,
            total=round(float(r.total), 2),
            pct=0.0,
        )

    return BudgetInsights(
        month=month,
        daily_avg=round(daily_avg, 2),
        projected_spend=round(projected_spend, 2),
        projected_spend_wk=round(projected_spend_wk, 2),
        weekday_avg=round(weekday_avg, 2),
        weekend_avg=round(weekend_avg, 2),
        weekdays_elapsed=weekdays_elapsed,
        weekend_days_elapsed=weekend_days_elapsed,
        weekdays_remaining=weekdays_remaining,
        weekend_days_remaining=weekend_days_remaining,
        no_spend_days=no_spend_days,
        elapsed_days=elapsed_days,
        days_in_month=days_in_month,
        top_category=top_category,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_month(month: str):
    try:
        year, mon = map(int, month.split("-"))
        if not (1 <= mon <= 12):
            raise ValueError
        return year, mon
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail="month must be in YYYY-MM format")
