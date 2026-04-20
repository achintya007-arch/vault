from datetime import datetime
from sqlalchemy import Column, Integer, Float, DateTime
from app.database import Base


class Budget(Base):
    """Single-row table — one monthly spending cap for this user."""
    __tablename__ = "budgets"

    id            = Column(Integer, primary_key=True, index=True)
    monthly_limit = Column(Float, nullable=False)
    created_at    = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at    = Column(DateTime, nullable=False, default=datetime.utcnow,
                           onupdate=datetime.utcnow)
