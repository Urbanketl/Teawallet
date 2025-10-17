# UrbanKetl Tea Machine - Unified Reader Support

**One codebase, two reader types - automatically detected!**

Support for both **ACR122U (USB)** and **MCRN2 (SPI)** readers with automatic detection.

---

## 🎯 Key Features

✅ **Auto-Detection** - Automatically detects which reader is connected  
✅ **Plug & Play** - Works with both ACR122U (USB) and MCRN2 (SPI)  
✅ **DESFire EV3** - Full support for MIFARE DESFire cards  
✅ **Single Codebase** - No need to switch scripts  
✅ **Lightweight** - Only loads libraries for connected reader  

---

## 🚀 Quick Start

### 1. Installation

```bash
# On your Raspberry Pi:
chmod +x install_unified.sh
./install_unified.sh
```

This installs dependencies for **both** reader types. The machine will use whichever reader you connect.

### 2. Configuration

Edit `machine_config.json`:

```json
{
  "machine_id": "UK_0001",
  "api_base_url": "https://your-domain.replit.app",
  "tea_price": 5.0,
  "dispense_time": 3.0,
  "reader_type": "auto",
  "gpio_pins": {
    "dispenser": 18
  },
  "spi_pins": {
    "cs": 8,
    "reset": 25
  }
}
```

**Reader Type Options:**
- `"auto"` - Auto-detect (recommended) ✅
- `"acr122u"` - Force ACR122U only
- `"mcrn2"` - Force MCRN2 only

### 3. Run

```bash
python3 urbanketl_machine_unified.py
```

The machine will automatically detect and use whichever reader is connected!

---

## 📡 Hardware Setup

### Option 1: ACR122U (USB Reader)

**Advantages:**
- ✅ Plug & play - just connect via USB
- ✅ No wiring needed
- ✅ Portable - works on any USB port
- ✅ LED and buzzer built-in

**Setup:**
1. Plug ACR122U into any USB port
2. Run the unified machine script
3. That's it!

**Connection:**
```
ACR122U USB Reader
       ↓
  USB Cable
       ↓
Raspberry Pi USB Port
```

No GPIO wiring needed for the reader - just connect the tea dispenser to GPIO 18.

---

### Option 2: MCRN2 (SPI Reader)

**Advantages:**
- ✅ Direct SPI connection - faster communication
- ✅ More compact - no USB cable
- ✅ Industrial applications

**Wiring (MCRN2 → Raspberry Pi):**

| MCRN2 Pin | Raspberry Pi Pin | GPIO | Description |
|-----------|------------------|------|-------------|
| SDA/CS    | Pin 24           | GPIO 8 | Chip Select |
| SCK       | Pin 23           | GPIO 11 | SPI Clock |
| MOSI      | Pin 19           | GPIO 10 | Master Out |
| MISO      | Pin 21           | GPIO 9 | Master In |
| RST       | Pin 22           | GPIO 25 | Reset |
| 3.3V      | Pin 1            | 3.3V | Power |
| GND       | Pin 6            | GND | Ground |

**SPI Configuration** (in `machine_config.json`):
```json
"spi_pins": {
  "cs": 8,
  "reset": 25
}
```

---

## 🔌 GPIO Connections (Common to Both)

These GPIO connections are the same regardless of which reader you use:

| Component | GPIO Pin | Description | Required? |
|-----------|----------|-------------|-----------|
| Tea Dispenser | GPIO 18 | Relay/Solenoid | ✅ **Required** |
| Green LED | GPIO 16 | Success indicator | Optional |
| Red LED | GPIO 20 | Error indicator | Optional |
| Buzzer | GPIO 21 | Audio feedback | Optional |

**Minimal Setup:**  
Only GPIO 18 (tea dispenser) is required. LEDs and buzzer are optional.

---

## ⚙️ Configuration Options

### Reader Type Selection

```json
"reader_type": "auto"
```

- **`"auto"`** (Recommended) - Tries ACR122U first (USB), then MCRN2 (SPI)
- **`"acr122u"`** - Only use ACR122U reader
- **`"mcrn2"`** - Only use MCRN2 reader

### Auto-Detection Order

1. **ACR122U** (USB/PC-SC) - checked first (more common)
2. **MCRN2** (SPI/PN532) - checked second
3. **Simulation** - if no readers found

### API Configuration

```json
{
  "api_base_url": "https://ukteawallet.com",
  "machine_id": "UK_0001",
  "tea_price": 5.0,
  "api_timeout": 5
}
```

### Timing Configuration

```json
{
  "dispense_time": 3.0,
  "polling_interval": 0.05,
  "card_removal_delay": 0.5
}
```

- `dispense_time` - How long to activate tea dispenser (seconds)
- `polling_interval` - How often to check for cards (seconds)
- `card_removal_delay` - Delay after dispensing before accepting next card

---

## 🔄 Auto-Start on Boot

Create systemd service:

```bash
sudo nano /etc/systemd/system/urbanketl.service
```

```ini
[Unit]
Description=UrbanKetl Tea Machine
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/urbanketl
ExecStart=/usr/bin/python3 /home/pi/urbanketl/urbanketl_machine_unified.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable urbanketl
sudo systemctl start urbanketl
```

Check status:

```bash
sudo systemctl status urbanketl
```

View logs:

```bash
sudo journalctl -u urbanketl -f
```

---

## 📊 Comparison: ACR122U vs MCRN2

| Feature | ACR122U (USB) | MCRN2 (SPI) |
|---------|---------------|-------------|
| **Connection** | USB plug & play | SPI wiring required |
| **Setup Complexity** | ⭐ Easy | ⭐⭐⭐ Moderate |
| **Wiring** | None (just USB) | 7 wires to GPIO |
| **Portability** | High (USB cable) | Low (soldered) |
| **Speed** | Fast | Very fast |
| **DESFire Support** | ✅ Full | ✅ Full |
| **Built-in LED/Buzzer** | ✅ Yes | ❌ No (use GPIO) |
| **Cost** | ~$30-40 | ~$15-20 |
| **Best For** | Development, testing | Production, fixed installations |

---

## 🧪 Testing Your Setup

### Test ACR122U Detection

```bash
# Check if PC/SC daemon is running
sudo systemctl status pcscd

# List connected readers
pcsc_scan
```

You should see your ACR122U listed.

### Test MCRN2 Detection

```bash
# Check if SPI is enabled
ls /dev/spi*

# Should show: /dev/spidev0.0  /dev/spidev0.1
```

### Test the Machine

```bash
python3 urbanketl_machine_unified.py
```

Look for:
```
✅ Using ACR122U (USB/PC-SC)
```
or
```
✅ Using MCRN2 (SPI/PN532)
```

---

## 🐛 Troubleshooting

### ACR122U Not Detected

**Problem:** No PC/SC readers found

**Solutions:**
```bash
# Restart PC/SC daemon
sudo systemctl restart pcscd

# Check USB connection
lsusb | grep ACS

# Install/reinstall pcscd
sudo apt-get install --reinstall pcscd
```

---

### MCRN2 Not Detected

**Problem:** SPI communication error

**Solutions:**
```bash
# Enable SPI interface
sudo raspi-config
# Navigate to: Interface Options → SPI → Enable

# Check SPI devices
ls -l /dev/spi*

# Verify wiring connections
# Double-check all 7 pins are connected correctly
```

---

### Both Readers Available - Which Is Used?

The auto-detection tries **ACR122U first** (USB), then **MCRN2** (SPI).

To force a specific reader, set `"reader_type"` in config:

```json
"reader_type": "mcrn2"  // Force MCRN2 even if ACR122U is connected
```

---

### Card Authentication Fails

**Check:**
1. ✅ Card UID is registered in the web portal
2. ✅ Business unit has sufficient wallet balance
3. ✅ Machine is assigned to the correct business unit
4. ✅ API base URL is correct in config
5. ✅ Network connectivity from Pi to server

**Logs:**
```bash
tail -f urbanketl_machine.log
```

---

### GPIO Errors

**Problem:** GPIO not initialized

**Solution:**
```bash
# GPIO only works on Raspberry Pi
# Make sure you're running on actual Pi hardware

# Check GPIO permissions
sudo usermod -a -G gpio pi
```

---

## 📦 Dependencies

### System Packages (ACR122U)
- `pcscd` - PC/SC Smart Card Daemon
- `libpcsclite1` - PC/SC library
- `libpcsclite-dev` - Development files
- `pcsc-tools` - Diagnostic tools

### System Packages (MCRN2)
- `python3-dev` - Python development headers
- `build-essential` - Compiler toolchain

### Python Libraries
- `pyscard` - ACR122U communication (PC/SC)
- `adafruit-circuitpython-pn532` - MCRN2 communication (SPI)
- `pycryptodome` - DESFire encryption
- `requests` - API communication
- `RPi.GPIO` - GPIO control

**Installation:**
```bash
./install_unified.sh
```

---

## 🔒 Security

- **DESFire EV3** encryption for card authentication
- **Challenge-response** protocol prevents replay attacks
- **AES-128** encryption for all card communications
- **Server-side validation** for all transactions

---

## 📈 Performance

### Typical Response Times

| Operation | Time |
|-----------|------|
| Card detection | ~50ms |
| Challenge request | ~100-200ms |
| Card authentication | ~100-150ms |
| Response validation | ~100-200ms |
| Total (tap to dispense) | **~400-600ms** |

### Reader-Specific Performance

- **ACR122U**: ~50-100ms card detection
- **MCRN2**: ~30-80ms card detection (slightly faster via SPI)

Both are fast enough for seamless user experience.

---

## 🆚 Migration Guide

### From MCRN2-Only Setup

**No changes needed!** Just run:

```bash
./install_unified.sh
python3 urbanketl_machine_unified.py
```

Your existing config will work as-is.

### From MFRC522 Setup

1. Install unified script: `./install_unified.sh`
2. Update config file (same format)
3. Run: `python3 urbanketl_machine_unified.py`

MFRC522 has limited DESFire support. Switch to ACR122U or MCRN2 for full functionality.

---

## 💡 Switching Readers

**Swap readers without changing code:**

1. **Unplug current reader** (if ACR122U)
2. **Plug in new reader**
3. **Restart machine script**

The unified controller will auto-detect the new reader!

**Example:**
```bash
# Currently using ACR122U
# Unplug ACR122U, connect MCRN2 via SPI
sudo systemctl restart urbanketl

# Machine will now use MCRN2!
```

---

## 📝 Logs

All activity is logged to:
- **File:** `urbanketl_machine.log`
- **Console:** Real-time output

**Log Levels:**
- `INFO` - Normal operations
- `WARNING` - Non-critical issues
- `ERROR` - Operation failures

**View logs:**
```bash
# Live tail
tail -f urbanketl_machine.log

# Search for errors
grep ERROR urbanketl_machine.log

# Last 100 lines
tail -n 100 urbanketl_machine.log
```

---

## ✅ Production Checklist

Before deploying to production:

- [ ] Configure `machine_id` and `api_base_url`
- [ ] Test card authentication end-to-end
- [ ] Verify wallet deduction works correctly
- [ ] Test tea dispensing mechanism
- [ ] Enable auto-start service
- [ ] Set up log rotation
- [ ] Test network connectivity
- [ ] Verify reader detection on boot
- [ ] Check GPIO connections (dispenser, LEDs)
- [ ] Test emergency shutdown procedure

---

## 🎓 Architecture

```
┌─────────────────────────────────────────┐
│   UrbanKetl Unified Machine Controller │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   Reader Auto-Detection Layer    │ │
│  └───────────────────────────────────┘ │
│             ↓              ↓            │
│    ┌────────────┐   ┌──────────────┐  │
│    │ ACR122U    │   │ MCRN2        │  │
│    │ Adapter    │   │ Adapter      │  │
│    │ (PC/SC)    │   │ (SPI/PN532)  │  │
│    └────────────┘   └──────────────┘  │
│             ↓              ↓            │
│    ┌────────────────────────────────┐  │
│    │  DESFire Authentication Engine │  │
│    └────────────────────────────────┘  │
│                    ↓                    │
│    ┌────────────────────────────────┐  │
│    │     API Communication Layer    │  │
│    └────────────────────────────────┘  │
│                    ↓                    │
│    ┌────────────────────────────────┐  │
│    │   GPIO Control (Dispenser)     │  │
│    └────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 🤝 Support

**Issues?** Check the troubleshooting section above.

**Questions?** Contact your system administrator.

---

## 📄 License

Part of the UrbanKetl B2B Tea Dispensing System.

---

Happy brewing! ☕

**Unified. Simple. Flexible.**
