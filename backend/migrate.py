import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from models import Base
import os
import urllib.parse
import passlib.hash

async def init_db():
    password = urllib.parse.quote_plus("i2bJBN$L4@Lp.g-")
    pg_url = f"postgresql+asyncpg://postgres.{password}@db.uardwuhacfsvlklekugb.supabase.co:5432/postgres"
    
    # Supabase uses pooled connections and sometimes Requires pgbouncer settings for SQLAlchemy
    # But for a simple metadata.create_all, we can use the direct connection string.
    # The user provided postgres.postgres:password -> actually it's just postgres as user.
    # Let's construct it correctly based on standard Supabase URI:
    # postgresql://postgres:[PASSWORD]@db.uardwuhacfsvlklekugb.supabase.co:5432/postgres
    
    db_url = f"postgresql+asyncpg://postgres:{password}@db.uardwuhacfsvlklekugb.supabase.co:5432/postgres"
    
    print("Connecting to Supabase (password hidden)...")
    engine = create_async_engine(db_url)
    
    async with engine.begin() as conn:
        print("Creating tables...")
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    print("Seeding admin user...")
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.ext.asyncio import AsyncSession
    from models import User
    
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        admin = User(
            username="admin", 
            password_hash=passlib.hash.bcrypt.hash("admin123"),
            role="admin"
        )
        session.add(admin)
        await session.commit()
        
    print("Migration complete!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_db())
