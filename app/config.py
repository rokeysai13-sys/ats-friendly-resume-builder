import os
from datetime import timedelta
from dotenv import load_dotenv

# Load .env from the project root (one level above this file's directory)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))


class Config:
    SECRET_KEY = os.environ["SECRET_KEY"]
    JWT_SECRET_KEY = os.environ["JWT_SECRET_KEY"]
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 3600))
    JWT_REFRESH_TOKEN_EXPIRES = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", 2592000))
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///resume_builder.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "google")
    LLM_MODEL = os.getenv("LLM_MODEL", "gemini-1.5-flash")
    LLM_FALLBACK_PROVIDER = os.getenv("LLM_FALLBACK_PROVIDER", "openai")
    LLM_FALLBACK_MODEL = os.getenv("LLM_FALLBACK_MODEL", "gemini-1.5-pro")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    LLM_TIMEOUT_SECONDS = int(os.getenv("LLM_TIMEOUT_SECONDS", 5))
    LLM_MAX_DAILY_CALLS_PER_USER = int(os.getenv("LLM_MAX_DAILY_CALLS_PER_USER", 50))
    S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
    S3_REGION = os.getenv("S3_REGION", "eu-west-1")
    SESSION_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    REMEMBER_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = True
    REMEMBER_COOKIE_SECURE = True
    PREFERRED_URL_SCHEME = "https"
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    REMEMBER_COOKIE_DURATION = timedelta(days=7)


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = True   # log SQL in dev
    SESSION_COOKIE_SECURE = False
    REMEMBER_COOKIE_SECURE = False
    PREFERRED_URL_SCHEME = "http"


class ProductionConfig(Config):
    DEBUG = False
    SESSION_COOKIE_SECURE = True
    REMEMBER_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    PREFERRED_URL_SCHEME = "https"


config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}
