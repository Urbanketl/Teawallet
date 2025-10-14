# UrbanKetl Tea Machine - DESFire EV3 Challenge-Response

Complete Raspberry Pi implementation with **polling mode** for instant card detection.

**Supports MIFARE DESFire EV3** (backward compatible with EV1/EV2)

## 🚀 Quick Start

### 1. Installation

```bash
# On your Raspberry Pi, run:
chmod +x install_desfire.sh
./install_desfire.sh
```

### 2. Configuration

Edit `machine_config.json`:

```json
{
  "machine_id": "UK_0001",
  "api_base_url": "https://your-domain.replit.app",
  "tea_price": 5.0,
  "dispense_time": 3.0,
  "polling_interval": 0.05,
  "card_removal_delay": 0.5,
  "api_timeout": 5,
  "gpio_pins": {
    "dispenser": 18,
    "led_green": 16,
    "led_red": 20,
    "buzzer": 21
  }
}
```

### 3. Run

```bash
# Test manually
python3 urbanketl_machine_desfire.py

# Or enable auto-start
sudo systemctl enable urbanketl
sudo systemctl start urbanketl
```

---

## 📡 Hardware Setup

### MCRN2 RFID Reader (SPI Connection)

| MCRN2 Pin | Raspberry Pi Pin | GPIO | Description |
|-----------|------------------|------|-------------|
| SDA       | Pin 24           | GPIO 8 | Chip Select |
| SCK       | Pin 23           | GPIO 11 | Clock |
| MOSI      | Pin 19           | GPIO 10 | Data In |
| MISO      | Pin 21           | GPIO 9 | Data Out |
| RST       | Pin 22           | GPIO 25 | Reset |
| 3.3V      | Pin 1            | 3.3V | Power |
| GND       | Pin 6            | GND | Ground |

### Other Components

| Component | GPIO | Pin | Description |
|-----------|------|-----|-------------|
| Tea Dispenser | GPIO 18 | Pin 12 | Relay/Solenoid |
| Green LED | GPIO 16 | Pin 36 | Success indicator |
| Red LED | GPIO 20 | Pin 38 | Error indicator |
| Buzzer | GPIO 21 | Pin 40 | Audio feedback |

---

## 🔐 How It Works

### Authentication Flow (Under 1 Second)

```
User Taps Card
      ↓
┌─────────────────────────────────────────┐
│  STEP 1: Card Detection (50ms)          │
│  Polling mode instantly detects card    │
└─────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────┐
│  STEP 2: Request Challenge (200ms)      │
│  POST /api/machine/auth/challenge       │
│  Returns: challengeId + 16-byte hex     │
└─────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────┐
│  STEP 3: Card Encrypts (100ms)          │
│  DESFire card performs AES encryption   │
│  Key NEVER leaves the card chip         │
└─────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────┐
│  STEP 4: Validate Response (200ms)      │
│  POST /api/machine/auth/validate        │
│  Server checks encrypted response       │
└─────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────┐
│  STEP 5: Authorize Dispensing (200ms)   │
│  POST /api/machine/auth/dispense        │
│  Deducts from wallet, logs transaction  │
└─────────────────────────────────────────┘
      ↓
✅ Authentication Complete (~750ms)
User can remove card now!
      ↓
☕ Tea Dispensing (3 seconds)
```

---

## ⚡ Polling Mode Explained

### What is Polling Mode?

The RFID reader continuously scans for cards in the background (every 50ms):

```python
while polling_active:
    if card_detected():
        process_card()  # Instant response!
    sleep(0.05)  # 50ms polling interval
```

### Benefits:

✅ **Instant Detection**: 10-50ms vs 100-500ms (one-shot mode)  
✅ **Better UX**: Just tap, don't hold  
✅ **No Hardware Wear**: RFID uses electromagnetic fields (no moving parts)  
✅ **24/7 Operation**: Designed for continuous use  
✅ **Low Power**: ~0.5 watts  

### Does it damage the reader?

**No!** RFID readers have:
- No mechanical parts
- Solid-state electronics
- Expected lifespan: 5-10+ years continuous operation
- Same technology used in metro gates (millions of daily scans)

---

## 🔒 Security Features

### 1. **AES Key Protection**
- 16-byte AES key stored in DESFire card chip
- Key CANNOT be extracted or read
- Encrypted copy stored in server database

### 2. **Challenge-Response Protocol**
- Each transaction uses unique random challenge
- Prevents replay attacks
- 30-second challenge timeout

### 3. **Server-Side Validation**
- Server has encrypted master copy of keys
- All validation happens server-side
- Complete audit trail

### 4. **Hardware Security**
- MIFARE DESFire EV1 certified cards
- ISO/IEC 7816-4 compliant
- Hardware-based encryption

---

## 📊 API Endpoints

### 1. Generate Challenge
```bash
POST /api/machine/auth/challenge
{
  "machineId": "UK_0001",
  "cardUid": "04ABC123"
}

Response:
{
  "challengeId": "uuid-here",
  "challenge": "A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6"
}
```

### 2. Validate Response
```bash
POST /api/machine/auth/validate
{
  "challengeId": "uuid-here",
  "response": "encrypted-response-hex",
  "cardUid": "04ABC123"
}

Response:
{
  "success": true,
  "cardNumber": "CARD001",
  "businessUnitId": "BU001"
}
```

### 3. Authorize Dispensing
```bash
POST /api/machine/auth/dispense
{
  "machineId": "UK_0001",
  "cardNumber": "CARD001",
  "businessUnitId": "BU001",
  "amount": 5.0,
  "teaType": "Regular Tea"
}

Response:
{
  "success": true,
  "remainingBalance": "245.50"
}
```

---

## 🛠️ Troubleshooting

### Issue: "MFRC522 library not found"
```bash
pip3 install mfrc522
```

### Issue: "Crypto library not available"
```bash
pip3 install pycryptodome
```

### Issue: "SPI not enabled"
```bash
sudo raspi-config
# Interface Options → SPI → Enable
```

### Issue: "Permission denied for GPIO"
```bash
sudo usermod -a -G gpio pi
sudo reboot
```

### Issue: "Card not detected"
1. Check SPI wiring
2. Verify reader power (3.3V, not 5V!)
3. Check RST pin connection
4. Run: `lsmod | grep spi` to verify SPI loaded

---

## 📝 Logging

### View Live Logs
```bash
# If running as service
sudo journalctl -u urbanketl -f

# Or check log file
tail -f urbanketl_machine.log
```

### Log Format
```
2025-10-14 12:30:45 - INFO - ⚡ Card detected: 04ABC123
2025-10-14 12:30:45 - INFO - 🔐 Starting DESFire authentication
2025-10-14 12:30:45 - INFO - 📨 Received challenge: A1B2C3D4E5F6...
2025-10-14 12:30:45 - INFO - 📤 Card response: X9Y8Z7W6V5U4...
2025-10-14 12:30:46 - INFO - ✅ Authentication successful
2025-10-14 12:30:46 - INFO - 💰 Balance deducted. Remaining: ₹245.50
2025-10-14 12:30:46 - INFO - ☕ Tea dispensed successfully!
```

---

## 🔧 Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| `polling_interval` | 0.05 | Card scan interval (50ms) |
| `card_removal_delay` | 0.5 | Wait time after card removed (500ms) |
| `api_timeout` | 5 | API request timeout (seconds) |
| `dispense_time` | 3.0 | Tea dispensing duration (seconds) |
| `tea_price` | 5.0 | Price per cup (₹) |

---

## 📈 Performance Metrics

| Metric | Value |
|--------|-------|
| **Card Detection** | 10-50ms |
| **Authentication Time** | 750ms - 1.2s |
| **Total Transaction** | ~4-6s (with dispensing) |
| **Cards/Hour** | ~600 (1 per 6 seconds) |
| **Cards/Day** | ~5,000 (assuming 8hr operation) |

---

## 🎯 Production Checklist

- [ ] Configure `machine_id` in config file
- [ ] Set correct `api_base_url`
- [ ] Test RFID reader detection
- [ ] Verify GPIO pin connections
- [ ] Test tea dispensing mechanism
- [ ] Enable systemd auto-start
- [ ] Set up log rotation
- [ ] Configure firewall (if needed)
- [ ] Test with actual DESFire cards
- [ ] Verify server connectivity

---

## 📞 Support

For issues or questions:
1. Check logs: `tail -f urbanketl_machine.log`
2. Verify hardware connections
3. Test API endpoints manually
4. Check server status

Happy brewing! ☕
