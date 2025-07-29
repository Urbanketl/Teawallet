# iPad Tea Machine Simulator Guide

## Overview
The iPad simulator allows you to test the UrbanKetl RFID validation system without physical hardware. It replicates the core functionality of a tea dispensing machine.

## Setup Instructions

### 1. Get Your Server URL
- Your Replit server runs at: `https://your-replit-name.repl.dev` 
- Replace `your-replit-name` with your actual Replit project name
- The server must be running (green play button in Replit)

### 2. Open the Simulator
- Transfer `tea-machine-simulator.html` to your iPad
- Open with Safari or any web browser
- Or access it directly from your Replit deployment

### 3. Configure Server Connection
- Enter your server URL in the "Server Configuration" section
- Example: `https://urbanketl-main.repl.dev`
- Click "Refresh Tea Price" to test connection

## Using the Simulator

### Testing RFID Card Validation

**Step 1: Set Machine Details**
- Machine ID: Enter existing machine ID (e.g., `UK_001`)
- The simulator will fetch the current tea price from your server

**Step 2: Simulate Card Tap**
- Enter RFID card number manually, or
- Use Quick Cards for pre-configured test cards:
  - Admin Card 1: `RFID_BU_ADMIN_001`
  - Admin Card 2: `RFID_BU_ADMIN_002` 
  - Admin Card 3: `RFID_BU_ADMIN_003`
  - Employee Card: `RFID_001`

**Step 3: Execute Transaction**
- Tap "Simulate RFID Tap" button
- Watch for success/failure response
- View remaining balance after successful transactions

### Understanding Responses

**✅ Successful Transaction:**
```
Tea Dispensed Successfully!
Message: Tea dispensed successfully
Remaining Balance: ₹47.50
```

**❌ Failed Transaction:**
```
Transaction Failed
Insufficient business unit wallet balance
```

**🔧 Network Issues:**
```
Network Error
Failed to connect to server: Connection refused
```

## API Endpoints Tested

### 1. Get Tea Price
```
GET /api/machines/{machineId}/tea-price
```
- Updates price display on simulator
- Shows current machine configuration

### 2. RFID Validation
```
POST /api/rfid/validate
{
  "cardNumber": "RFID_BU_ADMIN_001",
  "machineId": "UK_001"
}
```
- Core transaction processing
- Wallet deduction and dispensing approval

## Real-World Machine Integration

The iPad simulator uses the **exact same API calls** that a physical tea machine would use:

### Machine Startup Sequence
1. Call `/api/machines/{machineId}/tea-price` to get current pricing
2. Display tea type and price on screen
3. Enter standby mode waiting for RFID taps

### RFID Transaction Flow
1. User taps RFID card
2. Machine reads card number
3. POST to `/api/rfid/validate` with cardNumber and machineId
4. Receive approval/rejection
5. Dispense tea if approved, show error if rejected

## Testing Scenarios

### 1. Valid Card with Sufficient Balance
- Use any assigned RFID card
- Ensure business unit has wallet balance > tea price
- Should receive success response

### 2. Valid Card with Insufficient Balance
- Use assigned card but ensure wallet balance < tea price
- Should receive "Insufficient balance" error

### 3. Invalid Card
- Use unassigned card number like `INVALID_CARD_123`
- Should receive "Invalid RFID card" error

### 4. Invalid Machine
- Use non-existent machine ID like `INVALID_MACHINE`
- Should receive "Machine not found" error

## Troubleshooting

### Connection Issues
- Verify server URL is correct
- Ensure Replit server is running (check green status)
- Check iPad internet connection

### Transaction Failures
- Verify card is assigned to a business unit
- Check business unit wallet balance
- Ensure machine exists in database

### Price Not Loading
- Check machine ID spelling
- Verify machine exists in admin panel
- Ensure machine has price configured

## Production Deployment

For real tea machines, the simulator demonstrates:
- **API endpoint compatibility**
- **Response handling patterns**
- **Error state management**
- **Network timeout handling**

The same HTTP requests work for:
- Arduino/ESP32 machines
- Raspberry Pi controllers  
- Industrial IoT devices
- Any device with HTTP client capability

## Development Benefits

✅ **No Hardware Required** - Test API without physical machines  
✅ **Real API Calls** - Uses production endpoints  
✅ **Instant Feedback** - See responses immediately  
✅ **Multiple Scenarios** - Test success/failure cases  
✅ **Portable Testing** - Works on any iPad/tablet  

This simulator is perfect for demonstrating the system to stakeholders, training staff, or developing machine integration code without waiting for hardware deployment.