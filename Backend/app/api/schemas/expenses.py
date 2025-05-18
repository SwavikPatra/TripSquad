from uuid import UUID
from pydantic import BaseModel
from typing import List, Optional
from app.models.expense_models import SplitType
from datetime import datetime

class SplitCreate(BaseModel):
    user_id: UUID
    amount: float

class ExpenseCreate(BaseModel):
    group_id: UUID
    title: str
    description: Optional[str] = None
    total_amount: float
    split_type: SplitType
    splits: List[SplitCreate]

class ExpenseResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    total_amount: float
    created_by: str
    created_at: datetime
    split_type: str
    has_attachments: bool

    class Config:
        orm_mode = True

class ExpenseUpdateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    total_amount: float
    split_type: SplitType