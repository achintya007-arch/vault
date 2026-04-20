from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    id    = Column(Integer, primary_key=True, index=True)
    name  = Column(String, nullable=False, unique=True)
    icon  = Column(String, nullable=False, default="📦")   # emoji
    color = Column(String, nullable=False, default="#9CA3AF")  # hex
    kind  = Column(String, nullable=False, default="expense")  # "income" | "expense"

    transactions = relationship("Transaction", back_populates="category")
