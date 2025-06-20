from fastapi import APIRouter, Depends
from app.api.schemas.auth import(
    UserAuthData,
    LoginData
)
from fastapi import APIRouter, HTTPException, status
from app.repository.auth import authrepo
from app.api.schemas.auth import Token
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db

router = APIRouter(prefix="/auth")

@router.post("/signup")
def signup(user_data: UserAuthData, db: Session = Depends(get_db)):
    try:
        # Call function to add user to the database
        authrepo.add_user_to_db(user_data, db)
    except HTTPException as e:
        raise e
    
    return {"message": f"User {user_data.username} successfully signed up!"}, status.HTTP_201_CREATED

@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: LoginData,
    db: Session = Depends(get_db)
):
    return authrepo.login_user(form_data.email, form_data.password, db)

