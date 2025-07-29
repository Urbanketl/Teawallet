# UrbanKetl API Testing Guide

## 1. Balance Check APIs

### Check User Balance (Requires Authentication)
```bash
curl -X GET "http://localhost:5000/api/auth/user" \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE"
```
**Response:** Returns user profile with wallet_balance field

### Quick Balance Check via RFID (No Authentication)
```bash
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "RFID_44064328_001",
    "machineId": "MACHINE_001",
    "teaType": "Green Tea",
    "amount": "0.01"
  }'
```
**Response:** Shows remaining balance after minimal deduction

## 2. Tea Dispensing API

### RFID Card Validation & Dispensing

**For External Access (from your local machine):**
```bash
# Try these URLs in order until one works:

# Option 1: Direct Replit dev domain (Simplified - no tea type or amount needed)
curl -X POST "https://workspace-prasadthirtha.replit.dev/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "RFID_44064328_001",
    "machineId": "UK_0010"
  }'

# Option 2: Alternative Replit URL format
curl -X POST "https://workspace.prasadthirtha.repl.co/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "RFID_44064328_001",
    "machineId": "UK_0010"
  }'
```

**For Internal/Local Testing:**
```bash
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "RFID_44064328_001",
    "machineId": "UK_0010"
  }'
```

**Parameters (Simplified):**
- `cardNumber`: Any valid RFID card (e.g., RFID_44064328_001, IKEA0001)
- `machineId`: Machine identifier (e.g., UK_0010, UK_0020, UK_0024)

**Note:** The system now automatically:
- Uses "Regular Tea" as the tea type
- Gets the price from the machine's configuration
- No need to specify `teaType` or `amount` anymore

**Success Response:**
```json
{
  "success": true,
  "message": "Tea dispensed successfully",
  "remainingBalance": "33.00"
}
```

**Failure Response:**
```json
{
  "success": false,
  "message": "Insufficient wallet balance"
}
```

## 3. Transaction History APIs

### Get User Transactions (Requires Authentication)
```bash
curl -X GET "http://localhost:5000/api/transactions" \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE"
```

### Get Dispensing History (Requires Authentication)
```bash
curl -X GET "http://localhost:5000/api/dispensing/history" \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE"
```

## 4. RFID Card Management APIs

### Get All User Cards (Requires Authentication)
```bash
curl -X GET "http://localhost:5000/api/rfid/cards" \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE"
```

### Assign New RFID Card (Requires Authentication)
```bash
curl -X POST "http://localhost:5000/api/rfid/assign" \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "cardNumber": "RFID_44064328_006"
  }'
```

### Deactivate RFID Card (Requires Authentication)
```bash
curl -X PUT "http://localhost:5000/api/rfid/card/CARD_ID/deactivate" \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE"
```

## 5. Test All Thirtha Prasad's Cards

Current active cards for testing:
- RFID_44064328_001 (Primary)
- RFID_TP_001234 (Legacy format)
- RFID_44064328_002
- RFID_44064328_003
- RFID_44064328_004
- RFID_44064328_005

**Current Balance: ₹38.00**

### Test Card 1
```bash
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{"cardNumber": "RFID_44064328_001", "machineId": "MACHINE_001", "teaType": "Green Tea", "amount": "5.00"}'
```

### Test Card 2
```bash
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{"cardNumber": "RFID_TP_001234", "machineId": "MACHINE_002", "teaType": "Masala Chai", "amount": "7.00"}'
```

### Test Card 3
```bash
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{"cardNumber": "RFID_44064328_002", "machineId": "MACHINE_003", "teaType": "Earl Grey", "amount": "6.00"}'
```

### Test Card 4
```bash
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{"cardNumber": "RFID_44064328_003", "machineId": "MACHINE_001", "teaType": "Oolong Tea", "amount": "8.00"}'
```

### Test Card 5
```bash
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{"cardNumber": "RFID_44064328_004", "machineId": "MACHINE_002", "teaType": "Black Tea", "amount": "5.50"}'
```

### Test Card 6
```bash
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{"cardNumber": "RFID_44064328_005", "machineId": "MACHINE_003", "teaType": "Chamomile", "amount": "7.50"}'
```

## 6. Payment APIs

### Create Payment Order (Requires Authentication)
```bash
curl -X POST "http://localhost:5000/api/wallet/create-order" \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "amount": 100
  }'
```

### Verify Payment (Requires Authentication)
```bash
curl -X POST "http://localhost:5000/api/wallet/verify-payment" \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "orderId": "order_id_from_create_order",
    "paymentId": "payment_id_from_razorpay",
    "signature": "signature_from_razorpay"
  }'
```

## Notes
- All authenticated APIs require a valid session cookie
- RFID validation API works without authentication (for machine integration)
- Amounts should be in string format with decimal places
- All 6 cards share the same wallet balance
- Balance is updated in real-time across all cards