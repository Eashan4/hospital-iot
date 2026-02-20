#!/bin/bash
API_KEY="be8a104eec05459eb1f7e1c6ed8daab5ba44f584fe604fba9ce6ce36d1195b49"
DEVICE_ID="BED_C_1"
URL="http://localhost:8000/api/device/data"

echo "Starting simulation for $DEVICE_ID for 5 minutes..."
END_TIME=$((SECONDS+300))

while [ $SECONDS -lt $END_TIME ]; do
  # Generate slightly varying vitals
  HR=$((70 + RANDOM % 15))
  SPO2=$((95 + RANDOM % 5))
  
  curl -s -X POST "$URL" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "{\"device_id\": \"$DEVICE_ID\", \"heart_rate\": $HR, \"spo2\": $SPO2, \"bed_status\": true}" > /dev/null
    
  sleep 2
done
echo "Simulation complete."
