from datetime import date, datetime
from sqlalchemy import Column, Integer, Float, String, Date, DateTime
from app.database import Base


class Goal(Base):
    __tablename__ = "goals"

    id             = Column(Integer, primary_key=True, index=True)
    name           = Column(String, nullable=False)
    target_amount  = Column(Float, nullable=False)
    current_amount = Column(Float, nullable=False, default=0.0)
    deadline       = Column(Date, nullable=True)
    icon           = Column(String, nullable=True, default="🎯")
    color          = Column(String, nullable=True, default="#A78BFA")
    created_at     = Column(DateTime, nullable=False, default=datetime.utcnow)

    @property
    def progress_pct(self) -> float:
        if self.target_amount == 0:
            return 0.0
        return round(min(self.current_amount / self.target_amount * 100, 100), 1)
