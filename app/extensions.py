from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from celery import Celery
import redis as redis_lib
from flask_bcrypt import Bcrypt
from flask_login import LoginManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
migrate = Migrate()
bcrypt = Bcrypt()
login_manager = LoginManager()

# Rate limiter — uses memory storage by default, can switch to Redis
# get_remote_address is used as the key function to identify unique clients by IP
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["60 per minute"],  # Global rate limit: 60 requests per minute
    storage_uri="memory://"  # Using in-memory storage; can be upgraded to redis:// if Redis available
)

# Redis client (not the Celery broker — used for rate limiting + cache)
redis_client: redis_lib.Redis = None  # assigned in create_app()

# Celery instance — config injected in create_app()
celery = Celery(__name__)
