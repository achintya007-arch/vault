# Import all models here so that Base.metadata sees them when create_all() is called.
from app.models.category import Category       # noqa: F401
from app.models.transaction import Transaction  # noqa: F401
from app.models.goal import Goal               # noqa: F401
