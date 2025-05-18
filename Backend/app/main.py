from fastapi import FastAPI
from app.api.main import api_router
from app.core.database import engine
from app.models import user_models, group_models, expense_models, itineraries_model

app = FastAPI()
app.include_router(api_router)

# Create all tables at once using the same Base metadata
Base = user_models.Base  # or group_models.Base (they should be the same)
print(f"Base tables: {Base.metadata.tables.keys()}")
Base.metadata.create_all(engine)