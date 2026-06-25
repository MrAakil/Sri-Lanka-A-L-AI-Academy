import os
from dotenv import load_dotenv

# Force load .env variables, overriding any existing shell session configurations
load_dotenv(override=True)

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sri Lankan A/L Physics AI Tutor"
    ENV: str = "development"
    
    # Databases
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres_secure_pass_123@localhost:5432/al_physics_tutor"
    )
    QDRANT_URL: str = Field(default="http://localhost:6333")
    QDRANT_API_KEY: str = Field(default="")
    
    # Gemini AI
    GEMINI_API_KEY: str = Field(default="")
    
    # JWT Authentication
    JWT_SECRET: str = Field(default="supersecretkeyforalphysicstutorapp1234567890!@#")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # File Storage
    UPLOAD_DIR: str = Field(default="uploads")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
