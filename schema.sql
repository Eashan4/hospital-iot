-- Hospital Bed Occupancy & Patient Vital Monitoring System
-- MySQL Database Schema

CREATE DATABASE IF NOT EXISTS hospital_iot;

USE hospital_iot;

-- ============================================
-- 1. DEVICES - Each physical ESP8266 unit
-- ============================================
CREATE TABLE devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50) UNIQUE NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL,
    bed_number VARCHAR(20),
    ward VARCHAR(50),
    patient_name VARCHAR(100),
    status ENUM('online', 'offline') DEFAULT 'offline',
    last_seen DATETIME,
    created_at DATETIME DEFAULT NOW(),
    INDEX idx_device_id (device_id),
    INDEX idx_status (status),
    INDEX idx_api_key (api_key)
);

-- ============================================
-- 2. SENSOR_DATA - High-frequency vitals data
-- ============================================
CREATE TABLE sensor_data (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    heart_rate FLOAT,
    spo2 FLOAT,
    bed_status TINYINT DEFAULT 0, -- 0=empty, 1=occupied
    timestamp DATETIME DEFAULT NOW(),
    INDEX idx_device_ts (device_id, timestamp),
    INDEX idx_timestamp (timestamp)
);

-- ============================================
-- 3. ALERTS - AI-generated & system alerts
-- ============================================
CREATE TABLE alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    alert_type VARCHAR(50), -- 'low_spo2', 'high_heart_rate', 'anomaly', 'device_offline'
    severity ENUM(
        'low',
        'medium',
        'high',
        'critical'
    ) DEFAULT 'medium',
    message TEXT,
    escalation_status ENUM(
        'new',
        'acknowledged',
        'resolved'
    ) DEFAULT 'new',
    timestamp DATETIME DEFAULT NOW(),
    INDEX idx_device_id (device_id),
    INDEX idx_severity (severity),
    INDEX idx_timestamp (timestamp)
);

-- ============================================
-- 4. PATIENTS - Patient registry
-- ============================================
CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    device_id VARCHAR(50),
    admission_date DATETIME DEFAULT NOW(),
    discharge_date DATETIME,
    INDEX idx_device_id (device_id)
);

-- ============================================
-- 5. USERS - Dashboard authentication
-- ============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    role ENUM('admin', 'nurse') DEFAULT 'nurse',
    created_at DATETIME DEFAULT NOW()
);

-- ============================================
-- 6. AUDIT_LOGS - Activity tracking
-- ============================================
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100),
    details TEXT,
    timestamp DATETIME DEFAULT NOW(),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp)
);

-- ============================================
-- Insert default admin user (password: admin123)
-- Hash generated with bcrypt
-- ============================================
INSERT INTO
    users (username, password_hash, role)
VALUES (
        'admin',
        '$2b$12$LJ3m4ys3GZfnMQXYGBLqYOQIzGKqVHnJXvGHPqzGqKwFm3KJzXKK6',
        'admin'
    );