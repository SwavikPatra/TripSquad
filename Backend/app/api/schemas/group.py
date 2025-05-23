from datetime import datetime
from pydantic import BaseModel, UUID4
from typing import Optional
from app.models.group_models import MembershipRole
from uuid import UUID
from typing import List

class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class GroupCreate(GroupBase):
    pass

class Group(GroupBase):
    id: UUID4
    created_by: UUID4
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True  # Enables ORM mode (formerly `orm_mode`)

class AddMembersRequest(BaseModel):
    user_ids: List[UUID]
    role: MembershipRole = MembershipRole.MEMBER  # Default role

class CreateGroupRequest(BaseModel):
    name: str
    description: str
    def __init__(self, **data):
        print(f"CreateGroupRequest received data: {data}")
        super().__init__(**data)

class GroupResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    created_by: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None