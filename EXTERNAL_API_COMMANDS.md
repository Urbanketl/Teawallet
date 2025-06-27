# External API Testing Commands

## Working Replit URL for External Access

Use this URL from your Mac terminal:

```
https://f38f20c5-c352-42da-9022-668052663894-00-1v1p199urvbd2.kirk.replit.dev
```

## Test Commands

### Balance Check
```bash
curl -X POST "https://f38f20c5-c352-42da-9022-668052663894-00-1v1p199urvbd2.kirk.replit.dev/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{"cardNumber": "RFID_44064328_001", "machineId": "MACHINE_001", "teaType": "Regular tea", "amount": "0.01"}'
```

### Tea Dispensing - All 6 Cards
```bash
# Card 1 - Primary
curl -X POST "https://f38f20c5-c352-42da-9022-668052663894-00-1v1p199urvbd2.kirk.replit.dev/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{"cardNumber": "RFID_44064328_001", "machineId": "MACHINE_001", "teaType": "Regular tea", "amount": "5.00"}'

# Card 2 - Legacy
curl -X POST "https://f38f20c5-c352-42da-9022-668052663894-00-1v1p199urvbd2.kirk.replit.dev/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{"cardNumber": "RFID_TP_001234", "machineId": "MACHINE_002", "teaType": "Regular tea", "amount": "7.00"}'

# Card 3
curl -X POST "https://f38f20c5-c352-42da-9022-668052663894-00-1v1p199urvbd2.kirk.replit.dev/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{"cardNumber": "RFID_44064328_002", "machineId": "MACHINE_003", "teaType": "Regular tea", "amount": "6.00"}'

# Card 4
curl -X POST "https://f38f20c5-c352-42da-9022-668052663894-00-1v1p199urvbd2.kirk.replit.dev/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{"cardNumber": "RFID_44064328_003", "machineId": "MACHINE_001", "teaType": "Regular tea", "amount": "8.00"}'

# Card 5
curl -X POST "https://f38f20c5-c352-42da-9022-668052663894-00-1v1p199urvbd2.kirk.replit.dev/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{"cardNumber": "RFID_44064328_004", "machineId": "MACHINE_002", "teaType": "Regular tea", "amount": "5.50"}'

# Card 6
curl -X POST "https://f38f20c5-c352-42da-9022-668052663894-00-1v1p199urvbd2.kirk.replit.dev/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{"cardNumber": "RFID_44064328_005", "machineId": "MACHINE_003", "teaType": "Regular tea", "amount": "7.50"}'
```

## Current Status
- User: Thirtha Prasad (ID: 44064328)
- Current Balance: ₹33.00
- Active Cards: 6 total
- All cards share the same wallet balance

## Expected Response Format
```json
{
  "success": true,
  "message": "Tea dispensed successfully",
  "remainingBalance": "28.00"
}
```

## Alternative: Use Replit Webview
If external URLs don't work, you can also test through the Replit interface by opening the webview and using the web application directly.