import os
from dotenv import load_dotenv

load_dotenv()

# ============================================
# Database (Supabase PostgreSQL)
# ============================================
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/hospital_iot"
)

# Normalize postgres:// to postgresql:// (some providers use the shorter form)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

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
