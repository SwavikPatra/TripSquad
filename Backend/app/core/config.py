from pydantic_settings import BaseSettings
from pydantic import AnyUrl, PostgresDsn, Field
from typing import Optional

class Settings(BaseSettings):
    # Database Settings
    DATABASE_URL: str
    
    # JWT Settings
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str 
    ACCESS_TOKEN_EXPIRE_MINUTES: int 
    UPLOAD_FOLDER: str

    # AWS
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    

    AWS_DEFAULT_REGION:str
    S3_BUCKET_NAME:str
    S3_ENDPOINT_URL:str
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

settings = Settings()