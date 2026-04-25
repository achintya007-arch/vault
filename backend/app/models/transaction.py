from datetime import date, datetime
from sqlalchemy import Column, Integer, Float, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id          = Column(Integer, primary_key=True, index=True)
    amount      = Column(Float, nullable=False)
    kind        = Column(String, nullable=False)           # "income" | "expense"
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    note        = Column(String, nullable=True, default="")
    date        = Column(Date, nullable=False, default=date.today)
    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
    # Idempotency key set by the client for offline-first duplicate prevention.
    # A second POST with the same client_id returns the existing transaction.
    client_id   = Column(String(36), nullable=True, unique=True, index=True)

    category = relationship("Category", back_populates="transactions")
