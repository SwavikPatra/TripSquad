from fastapi import HTTPException, status
from app.api.schemas.auth import UserAuthData
from typing import Optional
from app.helper.auth_helper import authhelper 
from datetime import datetime, timedelta
from app.models.user_models import User
from sqlalchemy.orm import Session
from jose import JWTError, jwt

SECRET_KEY = "triptrip"  # Replace with a strong secret key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

class AuthRepo:
    # Function to simulate checking and adding user to the "database"
    def add_user_to_db(self, user_data: UserAuthData, db: Session):
        db_user = db.query(User).filter(User.username == user_data.username).first()
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )

        # Check if the email is already registered
        exist_email = db.query(User).filter(User.email == user_data.email).first()
        if exist_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Hash the password before storing it
        hashed_password =  authhelper.hash_password(user_data.password)
        
        # Add user to fake database
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            password=hashed_password,
        )
        db.add(new_user)
        db.commit()  # Commit the transaction to the database
        db.refresh(new_user)  # Refresh to get the updated object with id
        
        return {"message": "User successfully created", "user_id": new_user.id}
    
    def authenticate_user(self, email: str, password: str, db: Session):
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return False
        if not authhelper.verify_password(password, user.password):
            return False
        return user

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    def login_user(self, username: str, password: str, db: Session):
        user = self.authenticate_user(username, password, db)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = self.create_access_token(
            data={"email": user.email}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}

authrepo = AuthRepo()
