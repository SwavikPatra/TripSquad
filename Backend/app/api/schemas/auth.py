from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class UserAuthData(BaseModel):
    username: str
    email: str
    password: str

    class Config:
        from_attributes = True  # To allow conversion from SQLAlchemy models to Pydantic models
        
class UserData(BaseModel):
    id: UUID
    email: str
    username: str

class LoginData(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
        