# Tea Pricing Control Guide

## Overview
Tea pricing in UrbanKetl is now **simplified to only Regular Tea** with pricing dynamically controlled per machine through the platform admin interface. Each machine has its own configured price for Regular Tea.

## ✅ Current Pricing Structure (Simplified)

### Machine-Specific Regular Tea Price

The system now only serves **Regular Tea** with machine-specific pricing:

- Each machine has its own configured price for Regular Tea
- Prices are set and updated through the Admin Dashboard > Machines > Edit tab
- Default price is ₹5.00 if not configured
- Price updates take effect immediately

## 🎛️ How to Control Tea Pricing

### 1. **Admin Dashboard (Recommended)**
Platform admins can update tea prices through:
- Navigate to **Admin Dashboard > Machines > Edit tab**
- Select a machine from the dropdown
- Update the price for Regular Tea
- Click "Update Price" to save changes

### 2. **Database Level (Direct SQL)**
Update the `tea_types` field in the `tea_machines` table:

```sql
UPDATE tea_machines 
SET tea_types = '[
  {"name": "Regular Tea", "price": "6.00"}
]'::jsonb
WHERE id = 'UK_0010';
```

### 3. **API Level (Get Current Price)**
```bash
curl -X GET "http://localhost:5000/api/machines/UK_0010/tea-price"
```

Response:
```json
{
  "success": true,
  "machineId": "UK_0010",
  "teaType": "Regular Tea",
  "price": "5.00",
  "location": "Ikea Hitech City"
}
```

### 4. **RFID Validation (Simplified)**
The machines now automatically use the configured price:

```bash
# New simplified API - no need to specify tea type or amount
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "RFID_44064328_001",
    "machineId": "UK_0010"
  }'
```

## 🔄 How the Simplified System Works

### RFID Validation Flow:
1. **Card Tapped**: Employee taps RFID card on machine
2. **Price Lookup**: System gets the Regular Tea price from machine configuration
3. **Charging**: Deducts the configured price from business unit wallet
4. **Dispensing**: Dispenses Regular Tea if wallet has sufficient balance

### Key Changes:
- No need to specify tea type (always "Regular Tea")
- No need to pass amount (uses machine's configured price)
- Price is centrally managed per machine
- Fallback to ₹5.00 if price not configured

## 📊 Testing the Simplified System

### Test RFID Validation:
```bash
# Simple validation - machine determines price automatically
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "IKEA0001",
    "machineId": "UK_0010"
  }'
```

### Success Response Example:
```json
{
  "success": true,
  "message": "Tea dispensed successfully",
  "remainingBalance": "994.00"
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