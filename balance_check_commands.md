# Balance Check Commands

## 1. Check User Balance (Requires Authentication)
```bash
curl -X GET "http://localhost:5000/api/auth/user" \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE"
```

## 2. Check Balance via RFID Card (No Auth Required)
```bash
# This will attempt validation with 0 amount to see current balance
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "RFID_44064328_001",
    "machineId": "MACHINE_001",
    "teaType": "Green Tea",
    "amount": "0.01"
  }'
```

## 3. Current Balance for Thirtha Prasad
Based on database query:
- **User ID:** 44064328
- **Name:** Thirtha Prasad
- **Email:** prasad.thirtha@gmail.com
- **Current Balance:** ₹10.00

## 4. Transaction History
```bash
curl -X GET "http://localhost:5000/api/transactions" \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE"
```

## 5. Dispensing History
```bash
curl -X GET "http://localhost:5000/api/dispensing/history" \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE"
```

## Quick Balance Check (No Auth)
The simplest way to check balance without authentication is to use the RFID validation with a very small amount:

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

This will either:
- Return success with remaining balance if sufficient funds
- Return "Insufficient wallet balance" if balance is less than ₹0.01