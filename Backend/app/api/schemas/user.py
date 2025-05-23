# Schema for response
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class GroupOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    created_at: datetime
    role: str  # The user's role in this group
    
    class Config:
        orm_mode = True