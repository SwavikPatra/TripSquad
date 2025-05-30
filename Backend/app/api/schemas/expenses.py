from uuid import UUID
from pydantic import BaseModel, Field
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
    id: UUID
    title: str
    description: Optional[str]
    total_amount: float
    created_by: UUID
    created_at: datetime
    split_type: str
    has_attachments: bool

    class Config:
        orm_mode = True

class ExpenseUpdateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    total_amount: float

class SettlementCreate(BaseModel):
    group_id: UUID = Field(..., description="ID of the group for the settlement")
    paid_to: UUID = Field(..., description="ID of the user who is receiving payment")
    amount: float = Field(..., gt=0, description="Positive amount being settled")
    note: Optional[str] = Field(None, max_length=500, description="Optional note about the settlement")

    class Config:
        schema_extra = {
            "example": {
                "group_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "paid_to": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "amount": 25.50,
                "note": "Dinner bill settlement"
            }
        }

class SettlementResponse(BaseModel):
    id: str
    paid_by: str
    paid_to: str
    amount: float
    settled_at: Optional[datetime]
    note: Optional[str]
    can_delete: bool

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class SettlementsListResponse(BaseModel):
    status: str
    message: str
    data: List[SettlementResponse]