# DESFire AES Mutual Authentication API

This document describes the API endpoints for DESFire EV2/EV3 AES mutual authentication between Raspberry Pi tea machines and the backend server.

## Overview

The authentication process follows the NXP DESFire standard for AES mutual authentication:

1. **Start Authentication** - Pi initiates auth, gets APDU command
2. **Process Card Response** - Pi sends card's Enc(RndB), gets challenge APDU
3. **Verify Final** - Pi sends final card response, gets authentication result + dispenses tea

All cryptographic operations (encryption, decryption, key derivation) are performed server-side for security.

## Security Features

### AES Key Encryption at Rest

All RFID card AES keys are encrypted in the database using **AES-256-CBC** encryption:

- **Storage Format**: IV (16 bytes) + Encrypted Key Data
- **Encryption Key**: `MASTER_KEY` environment variable (SHA-256 hashed to 32 bytes)
- **Algorithm**: AES-256-CBC with random IV per card
- **Automatic Decryption**: Backend automatically decrypts keys during authentication
- **Backward Compatible**: System supports both encrypted and legacy plain keys
- **Migration**: Use `scripts/migrate-aes-keys.ts` to encrypt existing plain keys

**Security Benefits:**
- ✅ Database breach doesn't expose card cryptographic keys
- ✅ Keys protected at rest with industry-standard encryption
- ✅ Each key has unique IV (no pattern reuse)
- ✅ Transparent to Raspberry Pi clients (decryption handled server-side)

**Note:** The Pi machines never handle encrypted keys directly - they only provide the card UID, and the backend retrieves and decrypts the corresponding AES key from the database.

---

## Authentication Flow

```
┌─────────┐                ┌──────────┐                ┌──────┐
│   Pi    │                │  Backend │                │ Card │
└────┬────┘                └────┬─────┘                └───┬──┘
     │                          │                          │
     │  POST /api/rfid/auth/start                         │
     │──────────────────────────>│                         │
     │  { cardId, machineId }    │                         │
     │                           │                         │
     │  { sessionId, apduCommand }                        │
     │<──────────────────────────│                         │
     │                           │                         │
     │                                                     │
     │  Send APDU: 90 AA 00 00 01 00                      │
     │─────────────────────────────────────────────────────>│
     │                           │                         │
     │  Response: Enc(RndB)                               │
     │<─────────────────────────────────────────────────────│
     │                           │                         │
     │  POST /api/rfid/auth/step2                         │
     │──────────────────────────>│                         │
     │  { sessionId, cardResponse }                       │
     │                           │                         │
     │  { apduCommand }          │                         │
     │<──────────────────────────│                         │
     │                           │                         │
     │  Send APDU: 90 AF 00 00 20 ...                     │
     │─────────────────────────────────────────────────────>│
     │                           │                         │
     │  Response: Enc(Rot(RndA))                          │
     │<─────────────────────────────────────────────────────│
     │                           │                         │
     │  POST /api/rfid/auth/verify                        │
     │──────────────────────────>│                         │
     │  { sessionId, cardResponse, machineId }            │
     │                           │                         │
     │                           ├─ Verify auth            │
     │                           ├─ Check balance          │
     │                           ├─ Deduct amount          │
     │                           └─ Log transaction        │
     │                           │                         │
     │  { authenticated: true,   │                         │
     │    dispensed: true,       │                         │
     │    remainingBalance }     │                         │
     │<──────────────────────────│                         │
     │                           │                         │
     │  ✅ Dispense Tea          │                         │
     │                           │                         │
```

---

## API Endpoints

### 1. Start Authentication

**Endpoint:** `POST /api/rfid/auth/start`

**Description:** Initiates DESFire AES authentication. Validates card and machine belong to same business unit BEFORE starting authentication. Returns the first APDU command to send to the card.

**Request Body:**
```json
{
  "cardId": "045D8EFA6C6E80",
  "keyNumber": 0,
  "machineId": "UK_007"
}
```

**Request Fields:**
- `cardId` (string, required) - RFID card **hardware UID** in hex format (maps to `hardware_uid` column in `rfid_cards` table)
- `keyNumber` (number, optional) - DESFire key number (default: 0)
- `machineId` (string, **required**) - Tea machine ID (maps to `id` column in `tea_machines` table, e.g., "UK_007")

**Important:** Both card and machine must belong to the **same business unit** for authentication to proceed.

**Success Response:** `200 OK`
```json
{
  "success": true,
  "sessionId": "a3f2c8e7b9d4f1a6c5e8b2d7f3a9c6e1",
  "apduCommand": "90AA00000100"
}
```

**Response Fields:**
- `sessionId` - Unique session identifier (use in subsequent requests)
- `apduCommand` - Hex string of APDU command to send to card

**Error Responses:**

`400 Bad Request` - Missing cardId
```json
{
  "success": false,
  "error": "Missing cardId parameter"
}
```

`400 Bad Request` - Missing machineId
```json
{
  "success": false,
  "error": "Missing machineId parameter - machineId is mandatory"
}
```

`404 Not Found` - Card not found in database (hardware_uid doesn't match)
```json
{
  "success": false,
  "error": "Card not found"
}
```

`400 Bad Request` - Card is inactive
```json
{
  "success": false,
  "error": "Card is inactive"
}
```

`404 Not Found` - Machine not found in database (id doesn't match)
```json
{
  "success": false,
  "error": "Machine not found"
}
```

`400 Bad Request` - Machine is inactive
```json
{
  "success": false,
  "error": "Machine is inactive"
}
```

`400 Bad Request` - Card or machine not assigned to business unit
```json
{
  "success": false,
  "error": "Card or machine not assigned to business unit"
}
```

`403 Forbidden` - Business unit mismatch (CRITICAL SECURITY CHECK)
```json
{
  "success": false,
  "error": "Card does not belong to the same business unit as the machine"
}
```

`400 Bad Request` - Card has no AES key configured
```json
{
  "success": false,
  "error": "Card has no AES key configured"
}
```

**APDU Command Format:**
```
CLA  INS  P1   P2   Lc   Data
90   AA   00   00   01   00
```
- CLA: 0x90 (DESFire)
- INS: 0xAA (Authenticate AES)
- P1/P2: 0x00
- Lc: 0x01 (1 byte data)
- Data: Key number (0x00)

---

### 2. Process Card Response (Step 2)

**Endpoint:** `POST /api/rfid/auth/step2`

**Description:** Processes the card's Enc(RndB) response and returns the challenge APDU.

**Request Body:**
```json
{
  "sessionId": "a3f2c8e7b9d4f1a6c5e8b2d7f3a9c6e1",
  "cardResponse": "8734FA9120FE113C8A45B29C7D6E3F81"
}
```

**Request Fields:**
- `sessionId` (string, required) - Session ID from step 1
- `cardResponse` (string, required) - Card's response in hex (Enc(RndB), 16 bytes)

**Success Response:** `200 OK`
```json
{
  "success": true,
  "apduCommand": "90AF0000201FE8C7A29B4D5E663F72A1D8E304B65C9F2E81B37A40C928D1E64F3A90"
}
```

**Response Fields:**
- `apduCommand` - Hex string of Continue Authenticate APDU (37 bytes)

**Error Responses:**

`400 Bad Request` - Missing parameters
```json
{
  "success": false,
  "error": "Missing sessionId or cardResponse"
}
```

`400 Bad Request` - Session not found or expired
```json
{
  "success": false,
  "error": "Session not found or expired"
}
```

`400 Bad Request` - Invalid card response length
```json
{
  "success": false,
  "error": "Invalid card response length: expected 16 bytes, got X"
}
```

**APDU Command Format:**
```
CLA  INS  P1   P2   Lc   Data (32 bytes)
90   AF   00   00   20   [Enc(RndA || Rot(RndB))]
```

---

### 3. Verify Final Response + Balance Check + Dispense Tea

**Endpoint:** `POST /api/rfid/auth/verify`

**Description:** Verifies the card's final response, completes authentication, checks business unit balance, and dispenses tea if sufficient balance available.

**Request Body:**
```json
{
  "sessionId": "a3f2c8e7b9d4f1a6c5e8b2d7f3a9c6e1",
  "cardResponse": "72A1C40D5E996F8392B3E145A7D20C8F",
  "machineId": "machine-123"
}
```

**Request Fields:**
- `sessionId` (string, required) - Session ID from step 1
- `cardResponse` (string, required) - Card's final response in hex (Enc(Rot(RndA)), 16 bytes)
- `machineId` (string, required) - Tea machine ID for balance check and dispensing

**Success Response (Authenticated & Dispensed):** `200 OK`
```json
{
  "success": true,
  "authenticated": true,
  "dispensed": true,
  "sessionKey": "A3F2C8E7B9D4F1A6C5E8B2D7F3A9C6E1",
  "cardId": "04:12:34:56:78:90:AB",
  "message": "Tea dispensed successfully",
  "remainingBalance": "95.00",
  "businessUnitName": "Engineering Dept",
  "machineLocation": "Floor 2 - Cafeteria"
}
```

**Success Response (Authenticated but Insufficient Balance):** `400 Bad Request`
```json
{
  "success": false,
  "authenticated": true,
  "dispensed": false,
  "error": "Insufficient balance",
  "cardId": "04:12:34:56:78:90:AB"
}
```

**Success Response (Authentication Failed):** `400 Bad Request`
```json
{
  "success": false,
  "authenticated": false,
  "dispensed": false,
  "error": "Authentication failed: RndA mismatch"
}
```

**Response Fields:**
- `authenticated` (boolean) - Whether DESFire authentication succeeded
- `dispensed` (boolean) - Whether tea was dispensed
- `sessionKey` (string, optional) - Derived session key in hex (16 bytes) - only if authenticated
- `cardId` (string, optional) - Card ID - only if authenticated
- `message` (string, optional) - Success message
- `remainingBalance` (string, optional) - Remaining wallet balance after deduction
- `businessUnitName` (string, optional) - Name of business unit
- `machineLocation` (string, optional) - Location of tea machine
- `error` (string, optional) - Error message if failed

**Error Responses:**

`400 Bad Request` - Missing parameters
```json
{
  "success": false,
  "authenticated": false,
  "dispensed": false,
  "error": "Missing sessionId or cardResponse"
}
```

`404 Not Found` - Machine not found
```json
{
  "success": false,
  "authenticated": true,
  "dispensed": false,
  "error": "Machine not found"
}
```

`400 Bad Request` - Machine disabled
```json
{
  "success": false,
  "authenticated": true,
  "dispensed": false,
  "error": "Machine is disabled"
}
```

`400 Bad Request` - Invalid card for machine
```json
{
  "success": false,
  "authenticated": true,
  "dispensed": false,
  "error": "Invalid card for this machine"
}
```

---

## Session Management

**Session Timeout:** 30 seconds

Each authentication session is valid for 30 seconds from creation. After this time:
- The session is automatically deleted
- API calls with that sessionId will return "Session not found or expired"
- You must start a new authentication from step 1

**Session Cleanup:**
- Expired sessions are cleaned up every 60 seconds
- Successfully authenticated sessions are deleted 5 seconds after verification
- Failed authentication attempts remain logged for debugging

---

## Integration Examples

### Python Example (Raspberry Pi with pyscard)

```python
import requests
from smartcard.System import readers
from smartcard.util import toHexString, toBytes

# Configuration
API_BASE_URL = "https://your-backend-url.replit.app"
CARD_UID = "04:12:34:56:78:90:AB"
MACHINE_ID = 123

# Connect to card reader (ACR122U)
reader_list = readers()
reader = reader_list[0]
connection = reader.createConnection()
connection.connect()

# Step 1: Start authentication
response = requests.post(f"{API_BASE_URL}/api/rfid/auth/start", json={
    "cardId": CARD_UID,
    "keyNumber": 0,
    "machineId": MACHINE_ID
})
data = response.json()
session_id = data["sessionId"]
apdu_hex = data["apduCommand"]

# Send first APDU to card
apdu = toBytes(apdu_hex)
card_response, sw1, sw2 = connection.transmit(apdu)

# Step 2: Process card response
enc_rndb = toHexString(card_response)
response = requests.post(f"{API_BASE_URL}/api/rfid/auth/step2", json={
    "sessionId": session_id,
    "cardResponse": enc_rndb.replace(" ", "")
})
data = response.json()
apdu_hex = data["apduCommand"]

# Send challenge APDU to card
apdu = toBytes(apdu_hex)
card_response, sw1, sw2 = connection.transmit(apdu)

# Step 3: Verify final response
enc_rot_rnda = toHexString(card_response)
response = requests.post(f"{API_BASE_URL}/api/rfid/auth/verify", json={
    "sessionId": session_id,
    "cardResponse": enc_rot_rnda.replace(" ", "")
})
data = response.json()

if data["authenticated"]:
    print(f"✅ Authentication successful!")
    print(f"Session Key: {data['sessionKey']}")
    # Proceed to dispense tea
else:
    print(f"❌ Authentication failed: {data.get('error')}")

connection.disconnect()
```

---

## Security Notes

1. **Server-Side Crypto:** All encryption/decryption is performed server-side. The Pi never has access to AES keys.

2. **Session Security:** 
   - Sessions expire after 30 seconds
   - Each session uses fresh random numbers (RndA)
   - Sessions cannot be reused

3. **Transport Security:** 
   - Use HTTPS in production
   - Card responses contain encrypted data only

4. **Key Storage:** 
   - AES keys are stored encrypted in the database
   - Keys are never returned in API responses

5. **Logging:**
   - All authentication attempts are logged
   - Failed attempts are logged with reasons
   - Session statistics available for monitoring

---

## Troubleshooting

### "Card not found"
- Verify the cardId matches the format in your database
- Check if card exists: `SELECT * FROM rfid_cards WHERE card_number = '04:12:34:56:78:90:AB'`

### "Card has no AES key configured"
- Card must have an AES key in the database
- Check: `SELECT aes_key_encrypted FROM rfid_cards WHERE card_number = '...'`

### "Session not found or expired"
- Session timeout is 30 seconds
- Complete all 3 steps within this timeframe
- Start a new authentication if session expires

### "Invalid card response length"
- Verify card responses are exactly 16 bytes
- Remove spaces and colons from hex strings
- Check card reader communication

### "Authentication failed: RndA mismatch"
- Card authentication failed (wrong key or card issue)
- Verify AES key matches the card's configured key
- Check card is a genuine DESFire EV2/EV3 card

---

## Additional Resources

- [NXP DESFire EV3 Datasheet](https://www.nxp.com/docs/en/data-sheet/MF3DX2_MF3DHX2_SDS.pdf)
- [DESFire Authentication Guide](https://www.nxp.com/docs/en/application-note/AN12343.pdf)
- ACR122U SDK Documentation

---

## Version History

- **v1.0** (2025-01-31) - Initial implementation of DESFire AES mutual authentication
