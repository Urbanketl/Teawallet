# RFID API Testing Guide

This guide shows you how to test all RFID APIs using curl commands. The application is running on `http://localhost:5000`.

## Available RFID Endpoints

### 1. Get User's RFID Card
**GET** `/api/rfid/card`
- Requires authentication
- Returns the RFID card assigned to the authenticated user

```bash
curl -X GET "http://localhost:5000/api/rfid/card" \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE"
```

### 2. Assign RFID Card to User
**POST** `/api/rfid/assign`
- Requires authentication
- Assigns a new RFID card to the authenticated user

```bash
curl -X POST "http://localhost:5000/api/rfid/assign" \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "cardNumber": "1234567890123456"
  }'
```

### 3. Validate RFID Card (Tea Machine Endpoint)
**POST** `/api/rfid/validate`
- No authentication required (used by tea machines)
- Validates card and processes tea dispensing

```bash
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "1234567890123456",
    "machineId": "MACHINE_001",
    "teaType": "Green Tea",
    "amount": "15.00"
  }'
```

### 4. Get Dispensing History
**GET** `/api/dispensing/history`
- Requires authentication
- Returns dispensing history for the authenticated user

```bash
curl -X GET "http://localhost:5000/api/dispensing/history?limit=10" \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE"
```

## Testing Steps

### Step 1: Get Session Cookie
First, you need to authenticate and get a session cookie. Since this uses Replit Auth, you'll need to:

1. Open the application in browser: `http://localhost:5000`
2. Login through the UI
3. Open browser developer tools (F12)
4. Go to Application/Storage > Cookies
5. Copy the `connect.sid` cookie value

### Step 2: Test RFID Card Assignment
```bash
# Replace YOUR_SESSION_COOKIE with actual cookie value
curl -X POST "http://localhost:5000/api/rfid/assign" \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "cardNumber": "1234567890123456"
  }'
```

Expected Response:
```json
{
  "id": 1,
  "userId": "user_123",
  "cardNumber": "1234567890123456",
  "isActive": true,
  "lastUsed": null,
  "createdAt": "2025-01-01T10:00:00Z"
}
```

### Step 3: Test Card Validation (Tea Machine Simulation)
```bash
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "1234567890123456",
    "machineId": "MACHINE_001",
    "teaType": "Green Tea",
    "amount": "15.00"
  }'
```

Expected Success Response:
```json
{
  "success": true,
  "message": "Tea dispensed successfully",
  "remainingBalance": "85.00"
}
```

Expected Error Responses:
```json
// Invalid card
{
  "success": false,
  "message": "Invalid RFID card"
}

// Insufficient balance
{
  "success": false,
  "message": "Insufficient wallet balance"
}
```

### Step 4: Check Dispensing History
```bash
curl -X GET "http://localhost:5000/api/dispensing/history" \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE"
```

Expected Response:
```json
[
  {
    "id": 1,
    "userId": "user_123",
    "rfidCardId": 1,
    "machineId": "MACHINE_001",
    "teaType": "Green Tea",
    "amount": "15.00",
    "success": true,
    "errorMessage": null,
    "createdAt": "2025-01-01T10:30:00Z"
  }
]
```

## Error Scenarios to Test

### 1. Invalid Card Number
```bash
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "invalid_card",
    "machineId": "MACHINE_001",
    "teaType": "Green Tea",
    "amount": "15.00"
  }'
```

### 2. Missing Parameters
```bash
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "1234567890123456"
  }'
```

### 3. Duplicate Card Assignment
```bash
# Try to assign the same card number twice
curl -X POST "http://localhost:5000/api/rfid/assign" \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "cardNumber": "1234567890123456"
  }'
```

## Testing with Different Tea Types

```bash
# Test different tea types
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "1234567890123456",
    "machineId": "MACHINE_002",
    "teaType": "Masala Chai",
    "amount": "20.00"
  }'

curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "1234567890123456",
    "machineId": "MACHINE_003",
    "teaType": "Earl Grey",
    "amount": "18.00"
  }'
```

## What the RFID Validation Does

When you call `/api/rfid/validate`, the system:

1. Validates the RFID card number
2. Checks if the card is active
3. Gets the user associated with the card
4. Checks wallet balance
5. Deducts the amount from wallet
6. Creates a transaction record
7. Creates a dispensing log
8. Updates card last used timestamp
9. Updates machine ping timestamp
10. Returns success with remaining balance

## Database Tables Involved

- `rfid_cards` - Stores RFID card information
- `users` - User information and wallet balance
- `transactions` - Financial transaction records
- `dispensing_logs` - Tea dispensing history
- `tea_machines` - Machine status and information

## Notes

- The validation endpoint (`/api/rfid/validate`) doesn't require authentication as it's designed to be called by tea machines
- All other RFID endpoints require user authentication
- Card numbers should be unique across the system
- Amounts are stored as decimal strings for precision
- All timestamps are in ISO 8601 format