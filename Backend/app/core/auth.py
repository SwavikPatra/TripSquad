# app/core/auth.py

from fastapi import Depends, HTTPException, status
from pydantic import ValidationError
from fastapi.security import OAuth2PasswordBearer, HTTPBearer
from fastapi.security.http import HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.models.user_models import User
from app.core.config import settings
from app.core.database import get_db
from app.api.schemas.auth import UserData

token_scheme  = HTTPBearer(auto_error=True)

def get_user_by_email(db: Session, email: str):
    """Get user from database by email"""
    return db.query(User).filter(User.email == email).first()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(token_scheme),  # 👈 Note the type
    db: Session = Depends(get_db)
) -> UserData:
    try:
        # Extract the token string from credentials
        token = credentials.credentials  # 👈 This is the key fix
        
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
            
        user = get_user_by_email(db, email)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        try:
            user_data = UserData(
                id=user.id, 
                email=user.email, 
                username=user.username
            )
            return user_data
            
        except ValidationError as ve:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"User data validation failed: {ve}")

        
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")