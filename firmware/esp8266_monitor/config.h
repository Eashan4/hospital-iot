/*
 * Hospital IoT - ESP8266 Configuration
 * Flash these values for each device
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================
// WiFi Configuration
// ============================================
#define WIFI_SSID        "YOUR_WIFI_SSID"
#define WIFI_PASSWORD    "YOUR_WIFI_PASSWORD"

// ============================================
// Server Configuration
// ============================================
#define SERVER_URL       "http://YOUR_SERVER_IP:8000"
#define API_KEY          "YOUR_DEVICE_API_KEY"
#define DEVICE_ID        "BED_ICU_01"

// ============================================
// Timing (milliseconds)
// ============================================
#define DATA_INTERVAL       5000    // Send vitals every 5 seconds
#define HEARTBEAT_INTERVAL  10000   // Send heartbeat every 10 seconds
#define WIFI_RETRY_DELAY    5000    // WiFi reconnect delay
#define HTTP_TIMEOUT        5000    // HTTP request timeout

// ============================================
// Sensor Pins
// ============================================
#define PRESSURE_PIN     A0        // FSR 402 analog pin
#define PRESSURE_THRESHOLD 500     // ADC value above which bed is "occupied"

// ============================================
// MAX30100 Configuration
// ============================================
#define REPORTING_PERIOD_MS 1000   // MAX30100 reporting period

#endif
