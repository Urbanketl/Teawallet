# Tea Pricing Control Guide

## Overview
Tea pricing in UrbanKetl is now **dynamically controlled per machine** through the database configuration. The ₹5.00 you were seeing was from hardcoded test commands, not the actual system pricing.

## ✅ Current Pricing Structure (Updated)

### Machine-Specific Tea Prices

**MACHINE_001 (Tea Station Alpha)**
- Earl Grey: ₹8.00
- Green Tea: ₹7.00  
- Masala Chai: ₹6.00
- Black Tea: ₹5.00
- Herbal Tea: ₹9.00

**MACHINE_002 (Tea Station Beta)**
- Earl Grey: ₹8.00
- Green Tea: ₹7.00
- Masala Chai: ₹6.00

**MACHINE_003 (Tea Station Gamma)** 
- Earl Grey: ₹8.00
- Green Tea: ₹7.00
- Masala Chai: ₹6.00
- Black Tea: ₹5.00
- Herbal Tea: ₹9.00

## 🎛️ How to Control Tea Pricing

### 1. **Database Level (Direct SQL)**
Update the `tea_types` field in the `tea_machines` table:

```sql
UPDATE tea_machines 
SET tea_types = '[
  {"name": "Earl Grey", "price": "8.00"},
  {"name": "Green Tea", "price": "7.00"},
  {"name": "Masala Chai", "price": "6.00"},
  {"name": "Black Tea", "price": "5.00"},
  {"name": "Herbal Tea", "price": "9.00"}
]'::jsonb
WHERE id = 'MACHINE_001';
```

### 2. **API Level (Get Current Prices)**
```bash
curl -X GET "http://localhost:5000/api/machines/MACHINE_001/tea-prices"
```

Response:
```json
{
  "success": true,
  "machineId": "MACHINE_001",
  "location": "Office Floor 1 - Cafeteria",
  "teaTypes": [
    {"name": "Earl Grey", "price": "8.00"},
    {"name": "Green Tea", "price": "7.00"},
    {"name": "Masala Chai", "price": "6.00"},
    {"name": "Black Tea", "price": "5.00"},
    {"name": "Herbal Tea", "price": "9.00"}
  ]
}
```

### 3. **Machine Integration (RFID Validation)**
The tea machines now automatically use the correct price:

```bash
# Old way (manual amount) - Still supported as fallback
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "RFID_44064328_001",
    "machineId": "MACHINE_001", 
    "teaType": "Green Tea",
    "amount": "7.00"
  }'

# New way (automatic pricing) - Machine determines price
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "RFID_44064328_001",
    "machineId": "MACHINE_001",
    "teaType": "Green Tea"
  }'
```

## 🔄 How the New System Works

### RFID Validation Flow:
1. **Card Tapped**: Employee taps RFID card on machine
2. **Tea Selection**: Machine detects tea type selected 
3. **Price Lookup**: System queries machine's tea_types configuration
4. **Validation**: Verifies tea type is available on that machine
5. **Charging**: Uses correct price from machine configuration
6. **Dispensing**: Dispenses tea if wallet has sufficient balance

### Error Handling:
- **Invalid Tea Type**: "Tea type 'XYZ' not available on this machine"
- **Machine Not Found**: "Machine not found"
- **Insufficient Balance**: "Insufficient wallet balance"

## 📊 Testing the New Pricing

### Test Different Tea Types:
```bash
# Earl Grey (₹8.00)
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -d '{"cardNumber": "RFID_44064328_001", "machineId": "MACHINE_001", "teaType": "Earl Grey"}'

# Green Tea (₹7.00)  
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -d '{"cardNumber": "RFID_44064328_001", "machineId": "MACHINE_001", "teaType": "Green Tea"}'

# Black Tea (₹5.00)
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -d '{"cardNumber": "RFID_44064328_001", "machineId": "MACHINE_001", "teaType": "Black Tea"}'
```

### Success Response Example:
```json
{
  "success": true,
  "message": "Tea dispensed successfully",
  "remainingBalance": "1478.00"
}
```

## 🛠️ Administrative Control

### Future Enhancements:
1. **Admin Panel Integration**: Add UI for business unit admins to modify tea prices
2. **Bulk Price Updates**: Update all machines simultaneously  
3. **Time-based Pricing**: Different prices for peak/off-peak hours
4. **Promotional Pricing**: Temporary discounts and offers

### Database Schema:
```sql
-- Tea machines table structure
tea_machines:
- id (primary key)
- business_unit_admin_id 
- name, location, is_active
- tea_types (jsonb) -- Array of {name, price} objects
- created_at, updated_at
```

## 💡 Key Benefits

1. **Flexible Pricing**: Each machine can have different prices
2. **Easy Updates**: Change prices without code deployment
3. **Machine Validation**: Ensures tea types exist on specific machines
4. **Accurate Billing**: Correct prices charged automatically
5. **Audit Trail**: All transactions logged with actual prices paid

## ⚠️ Important Notes

- **Backward Compatibility**: Old API calls with manual amounts still work
- **Price Validation**: System validates tea type availability per machine
- **Real-time Updates**: Price changes take effect immediately
- **Business Unit Control**: Each business unit admin manages their machine prices

Your ₹5.00 charges were from test commands using hardcoded amounts. The new system now uses the proper machine-specific pricing configuration!