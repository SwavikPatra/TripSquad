from fastapi import FastAPI
from app.api.main import api_router
from app.core.database import engine
from app.models import user_models, group_models, expense_models, itineraries_model
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://trip-squad-ashy.vercel.app/", "http://localhost:3000","http://127.0.0.1:3000"],  # For development only! Tighten this for production
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods including OPTIONS
    allow_headers=["*"],
)
app.include_router(api_router)

# Create all tables at once using the same Base metadata
Base = user_models.Base  # or group_models.Base (they should be the same)
# print(f"Base tables: {Base.metadata.tables.keys()}")
Base.metadata.create_all(engine)