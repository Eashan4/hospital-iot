from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import declarative_base
from config import DATABASE_URL

# ============================================
# Convert DATABASE_URL for pg8000 driver
# ============================================
# pg8000 requires: postgresql+pg8000://user:pass@host:port/db
db_url = DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+pg8000://", 1)
elif db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+pg8000://", 1)

# ============================================
# Synchronous Engine & Session
# ============================================
engine = create_engine(
    db_url,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_recycle=300,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()


# ============================================
# Dependency for FastAPI routes
# ============================================
def get_db():
    """Yield a DB session, auto-close after request."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
