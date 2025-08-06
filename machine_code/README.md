# UrbanKetl Tea Machine - Raspberry Pi Code

This is the complete software package for running UrbanKetl tea machines on Raspberry Pi.

## 🚀 Quick Setup

1. **Flash Raspberry Pi OS** to SD card
2. **Enable SSH and SPI** in raspi-config
3. **Copy files** to Raspberry Pi:
   ```bash
   scp -r machine_code/ pi@your-pi-ip:~/urbanketl-machine/
   ```
4. **Run installation**:
   ```bash
   ssh pi@your-pi-ip
   cd urbanketl-machine
   bash install.sh
   ```

## ⚙️ Configuration

Edit `machine_config.json`:

```json
{
  "machine_id": "UK_0001",
  "machine_secret": "your-secure-secret",
  "api_base_url": "https://urbanketl.com",
  "tea_price": 5.0,
  "dispense_time": 3.0
}
```

## 🔌 Hardware Connections

### RFID Reader (RC522)
| RC522 Pin | Raspberry Pi Pin | GPIO |
|-----------|------------------|------|
| VCC       | 3.3V (Pin 1)     | -    |
| GND       | Ground (Pin 6)   | -    |
| MISO      | Pin 21           | 9    |
| MOSI      | Pin 19           | 10   |
| SCK       | Pin 23           | 11   |
| SDA       | Pin 24           | 8    |
| RST       | Pin 22           | 25   |

### Control Components
| Component | GPIO Pin | Physical Pin |
|-----------|----------|--------------|
| Dispenser | GPIO 18  | Pin 12       |
| Green LED | GPIO 16  | Pin 36       |
| Red LED   | GPIO 20  | Pin 38       |
| Buzzer    | GPIO 21  | Pin 40       |

## 📡 API Endpoints Used

The machine communicates with these UrbanKetl API endpoints:

- `POST /api/rfid/validate` - Validate RFID card
- `POST /api/rfid/dispense` - Log dispensing transaction
- `POST /api/machines/heartbeat` - Send machine status

## 🔧 Commands

```bash
# Test the machine
python3 urbanketl_machine.py

# Start as service
sudo systemctl start urbanketl-machine

# Check status
sudo systemctl status urbanketl-machine

# View logs
sudo journalctl -u urbanketl-machine -f

# Stop service
sudo systemctl stop urbanketl-machine
```

## 🚨 Troubleshooting

### RFID Not Working
- Check SPI is enabled: `sudo raspi-config`
- Verify wiring connections
- Test with: `python3 -c "from mfrc522 import SimpleMFRC522; print('RFID OK')"`

### Network Issues
- Check internet connectivity
- Verify API URL in config
- Check machine secret is correct

### GPIO Errors
- Run as root/sudo for GPIO access
- Check pin assignments in config
- Verify no other processes using GPIO

### Service Not Starting
```bash
# Check service logs
sudo journalctl -u urbanketl-machine -n 50

# Restart service
sudo systemctl restart urbanketl-machine
```

## 📊 Monitoring

The machine sends heartbeat data every 60 seconds including:
- Machine status (online/offline)
- Daily cups dispensed
- Total cups dispensed
- Error counts

## 🔒 Security

- Keep `machine_secret` confidential
- Use HTTPS for API communications
- Regularly update system packages
- Monitor logs for unauthorized access

## 📈 Features

- ✅ RFID card validation
- ✅ Real-time balance checking
- ✅ Automatic transaction logging
- ✅ LED status indicators
- ✅ Audio feedback (buzzer)
- ✅ Offline mode support
- ✅ Auto-restart on errors
- ✅ Comprehensive logging
- ✅ Heartbeat monitoring

## 🆘 Support

For technical support:
1. Check the logs: `tail -f urbanketl_machine.log`
2. Verify network connectivity
3. Test API endpoints manually
4. Contact UrbanKetl support with machine ID and logs