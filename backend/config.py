import os
from dotenv import load_dotenv

load_dotenv()

# ============================================
# Database
# ============================================
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("MYSQL_DATABASE", "hospital_iot")
DB_USER = os.getenv("MYSQL_USER", "postgres")
DB_PASS = os.getenv("MYSQL_PASSWORD", "ej")

# Fallback to local postgres if DATABASE_URL is not set
default_db_url = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
DATABASE_URL = os.getenv("DATABASE_URL", default_db_url)

# Convert asyncpg URLs to standard postgresql URLs for psycopg2
if DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

# ============================================
# JWT Authentication
# ============================================
JWT_SECRET = os.getenv("JWT_SECRET", "change-this-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

# ============================================
# Device Timing (seconds)
# ============================================
HEARTBEAT_TIMEOUT = int(os.getenv("HEARTBEAT_TIMEOUT", "20"))
OFFLINE_CHECK_INTERVAL = int(os.getenv("OFFLINE_CHECK_INTERVAL", "10"))

# ============================================
# AI Model
# ============================================
AI_MODEL_PATH = os.getenv("AI_MODEL_PATH", "ai/saved_models/lstm_vitals_v1.h5")
ANOMALY_THRESHOLD = float(os.getenv("ANOMALY_THRESHOLD", "0.85"))
PREDICTION_WINDOW = int(os.getenv("PREDICTION_WINDOW", "20"))

# ============================================
# Alert Thresholds
# ============================================
HEART_RATE_LOW = 50
HEART_RATE_HIGH = 120
SPO2_CRITICAL = 90
SPO2_WARNING = 94
