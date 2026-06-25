import os
from typing import Optional, Any
from dotenv import load_dotenv

# Force load .env variables, overriding any existing shell session configurations
load_dotenv(override=True)

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, model_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sri Lankan A/L Physics AI Tutor"
    ENV: str = "development"
    
    # Postgres Configuration Fields (loaded from environment)
    POSTGRES_USER: str = Field(default="postgres")
    POSTGRES_PASSWORD: str = Field(default="postgres_secure_pass_123")
    POSTGRES_DB: str = Field(default="al_physics_tutor")
    POSTGRES_HOST: str = Field(default="localhost")
    POSTGRES_PORT: str = Field(default="5432")
    
    DATABASE_URL: Optional[str] = None
    
    # Databases
    QDRANT_URL: str = Field(default="http://localhost:6333")
    QDRANT_API_KEY: str = Field(default="")
    
    # Gemini AI
    GEMINI_API_KEY: str = Field(default="")
    
    # JWT Authentication (defaults to placeholder; override in .env for production)
    JWT_SECRET: str = Field(default="placeholder_jwt_secret_change_in_production_1234567890")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # File Storage
    UPLOAD_DIR: str = Field(default="uploads")
    
    @model_validator(mode="before")
    @classmethod
    def assemble_db_url(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # If DATABASE_URL is not set, dynamically construct it from individual postgres parameters
            if not data.get("DATABASE_URL"):
                user = data.get("POSTGRES_USER") or "postgres"
                pw = data.get("POSTGRES_PASSWORD") or "postgres_secure_pass_123"
                host = data.get("POSTGRES_HOST") or "localhost"
                port = data.get("POSTGRES_PORT") or "5432"
                db = data.get("POSTGRES_DB") or "al_physics_tutor"
                data["DATABASE_URL"] = f"postgresql://{user}:{pw}@{host}:{port}/{db}"
        return data
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
