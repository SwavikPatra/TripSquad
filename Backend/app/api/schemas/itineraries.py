from pydantic import BaseModel, constr, validator
from typing import Optional
from uuid import UUID

class ItineraryRequest(BaseModel):
    title: str
    description: Optional[str] = None
    day_number: Optional[int] = None
    google_maps_link: Optional[str] = None
    group_id: UUID

class ItineraryEntryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    day_number: Optional[int] = None
    google_maps_link: Optional[str] = None