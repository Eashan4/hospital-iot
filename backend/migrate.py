"""
Database migration script for Hospital IoT System.
Creates all tables and seeds the default admin user.

Usage:
    python migrate.py
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from config import DATABASE_URL
from models import Base, User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def init_db():
    """Create all tables and seed admin user."""
    print(f"Connecting to database...")
    engine = create_engine(DATABASE_URL, echo=True)

    # Create all tables
    print("Creating tables...")
    Base.metadata.create_all(engine)
    print("Tables created successfully!")

    # Seed admin user
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        existing = session.query(User).filter_by(username="admin").first()
        if not existing:
            admin = User(
                username="admin",
                password_hash=pwd_context.hash("admin123"),
                role="admin",
            )
            session.add(admin)
            session.commit()
            print("Default admin user created (admin / admin123)")
        else:
            print("Admin user already exists, skipping seed.")
    except Exception as e:
        session.rollback()
        print(f"Error seeding admin: {e}")
        raise
    finally:
        session.close()

    engine.dispose()
    print("Migration complete!")


if __name__ == "__main__":
    init_db()
