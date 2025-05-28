from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings

# Set up the database engine
engine = create_engine(settings.RDS_DATABASE_URL, echo=True)

# Create a SessionLocal class for interacting with the database
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
 
# Base class for our database models
class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
