-- Hospital Bed Occupancy & Patient Vital Monitoring System
-- PostgreSQL Database Schema (Supabase compatible)

-- ============================================
-- 1. DEVICES - Each physical ESP8266 unit
-- ============================================
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) UNIQUE NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL,
    bed_number VARCHAR(20),
    ward VARCHAR(50),
    patient_name VARCHAR(100),
    status VARCHAR(10) DEFAULT 'offline' CHECK (
        status IN ('online', 'offline')
    ),
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices (device_id);

CREATE INDEX IF NOT EXISTS idx_devices_status ON devices (status);

CREATE INDEX IF NOT EXISTS idx_devices_api_key ON devices (api_key);

-- ============================================
-- 2. SENSOR_DATA - High-frequency vitals data
-- ============================================
CREATE TABLE IF NOT EXISTS sensor_data (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    heart_rate REAL,
    spo2 REAL,
    bed_status SMALLINT DEFAULT 0, -- 0=empty, 1=occupied
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensor_device_ts ON sensor_data (device_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_sensor_timestamp ON sensor_data (timestamp);

-- ============================================
-- 3. ALERTS - AI-generated & system alerts
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    alert_type VARCHAR(50),
    severity VARCHAR(10) DEFAULT 'medium' CHECK (
        severity IN (
            'low',
            'medium',
            'high',
            'critical'
        )
    ),
    message TEXT,
    escalation_status VARCHAR(15) DEFAULT 'new' CHECK (
        escalation_status IN (
            'new',
            'acknowledged',
            'resolved'
        )
    ),
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON alerts (device_id);

CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts (severity);

CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts (timestamp);

-- ============================================
-- 4. PATIENTS - Patient registry
-- ============================================
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    device_id VARCHAR(50),
    admission_date TIMESTAMP DEFAULT NOW(),
    discharge_date TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patients_device_id ON patients (device_id);

-- ============================================
-- 5. USERS - Dashboard authentication
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    role VARCHAR(10) DEFAULT 'nurse' CHECK (role IN ('admin', 'nurse')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 6. AUDIT_LOGS - Activity tracking
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(100),
    details TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs (timestamp);