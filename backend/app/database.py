import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

# Store the SQLite file in backend/data/ so it is easy to gitignore
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'data', 'vault.db')}")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # required for SQLite + FastAPI
)

# Enable WAL mode for better concurrent read performance
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


# ---------------------------------------------------------------------------
# Session
# ---------------------------------------------------------------------------

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Table init + seeding
# ---------------------------------------------------------------------------

def create_tables():
    """Create all tables. Called once at startup."""
    from app.models import transaction, category, goal, budget  # noqa: F401 – registers models
    Base.metadata.create_all(bind=engine)


def seed_categories():
    """Insert default categories if the table is empty."""
    from app.models.category import Category

    defaults = [
        # Expense categories
        {"name": "Food & Dining",   "icon": "🍜", "color": "#FF6B6B", "kind": "expense"},
        {"name": "Transport",       "icon": "🚌", "color": "#4ECDC4", "kind": "expense"},
        {"name": "Shopping",        "icon": "🛍️", "color": "#A78BFA", "kind": "expense"},
        {"name": "Entertainment",   "icon": "🎮", "color": "#F59E0B", "kind": "expense"},
        {"name": "Education",       "icon": "📚", "color": "#3B82F6", "kind": "expense"},
        {"name": "Health",          "icon": "💊", "color": "#10B981", "kind": "expense"},
        {"name": "Utilities",       "icon": "⚡", "color": "#6B7280", "kind": "expense"},
        {"name": "Rent",            "icon": "🏠", "color": "#F97316", "kind": "expense"},
        {"name": "Other",           "icon": "📦", "color": "#9CA3AF", "kind": "expense"},
        # Income categories
        {"name": "Salary / Stipend", "icon": "💼", "color": "#22C55E", "kind": "income"},
        {"name": "Freelance",        "icon": "💻", "color": "#06B6D4", "kind": "income"},
        {"name": "Gift / Transfer",  "icon": "🎁", "color": "#EC4899", "kind": "income"},
        {"name": "Other Income",     "icon": "💰", "color": "#84CC16", "kind": "income"},
    ]

    db = SessionLocal()
    try:
        if db.query(Category).count() == 0:
            db.bulk_insert_mappings(Category, defaults)
            db.commit()
    finally:
        db.close()
