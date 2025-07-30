#!/bin/bash

# RFID Dispensing API Test Commands
# Base URL for your UrbanKetl application
BASE_URL="https://f38f20c5-c352-42da-9022-668052663894-00-1vlp199urvbd2.kirk.replit.dev"

echo "🫖 UrbanKetl RFID Dispensing API Test Commands"
echo "=============================================="

# Test 1: Valid RFID card with active machine (Kulhad Party)
echo ""
echo "Test 1: Kulhad Party - RFID_44064328_003 with UK_0007"
curl -X POST "${BASE_URL}/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "RFID_44064328_003",
    "machineId": "UK_0007"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"

echo ""
echo "----------------------------------------"

# Test 2: Valid RFID card with another active machine (Kulhad Party)
echo ""
echo "Test 2: Kulhad Party - RFID_44064328_003 with UK_0008"
curl -X POST "${BASE_URL}/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "RFID_44064328_003",
    "machineId": "UK_0008"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"

echo ""
echo "----------------------------------------"

# Test 3: Test with Ikea RFID card
echo ""
echo "Test 3: Ikea - RFID_1753802206629_604 with UK_0010"
curl -X POST "${BASE_URL}/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "RFID_1753802206629_604",
    "machineId": "UK_0010"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"

echo ""
echo "----------------------------------------"

# Test 4: Test with New Urban ketl machine
echo ""
echo "Test 4: New Urban ketl - RFID_44064328_003 with UK_0004"
curl -X POST "${BASE_URL}/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "RFID_44064328_003",
    "machineId": "UK_0004"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"

echo ""
echo "----------------------------------------"

# Test 5: Invalid RFID card (should fail)
echo ""
echo "Test 5: Invalid RFID Card - INVALID_CARD with UK_0007"
curl -X POST "${BASE_URL}/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "INVALID_CARD",
    "machineId": "UK_0007"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"

echo ""
echo "----------------------------------------"

# Test 6: Invalid machine ID (should fail)
echo ""
echo "Test 6: Invalid Machine - RFID_44064328_003 with INVALID_MACHINE"
curl -X POST "${BASE_URL}/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "RFID_44064328_003",
    "machineId": "INVALID_MACHINE"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n"

echo ""
echo "=============================================="
echo "✅ All RFID API tests completed!"