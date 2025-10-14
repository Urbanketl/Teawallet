#!/bin/bash
# UrbanKetl Tea Machine - DESFire Installation Script
# Run this script on your Raspberry Pi to set up the tea machine

echo "☕ UrbanKetl Tea Machine - DESFire Installation"
echo "================================================"
echo ""

# Update system
echo "📦 Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install Python and dependencies
echo "🐍 Installing Python and development tools..."
sudo apt install -y python3 python3-pip python3-dev git

# Enable SPI interface for RFID reader
echo "📡 Enabling SPI interface..."
sudo raspi-config nonint do_spi 0

# Install Python packages
echo "📚 Installing Python libraries..."
pip3 install --upgrade pip

# Create requirements file
cat > requirements.txt << EOF
mfrc522==0.0.1
RPi.GPIO==0.7.1
requests==2.31.0
pycryptodome==3.19.0
EOF

pip3 install -r requirements.txt

# Create systemd service for auto-start
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/urbanketl.service > /dev/null << EOF
[Unit]
Description=UrbanKetl Tea Machine DESFire Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/python3 $(pwd)/urbanketl_machine_desfire.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Make script executable
chmod +x urbanketl_machine_desfire.py

# Reload systemd
sudo systemctl daemon-reload

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Edit machine_config.json with your settings:"
echo "   - machine_id: Your unique machine ID (e.g., UK_0001)"
echo "   - api_base_url: Your UrbanKetl server URL"
echo ""
echo "2. Test the machine manually:"
echo "   python3 urbanketl_machine_desfire.py"
echo ""
echo "3. Enable auto-start on boot:"
echo "   sudo systemctl enable urbanketl"
echo "   sudo systemctl start urbanketl"
echo ""
echo "4. Check status:"
echo "   sudo systemctl status urbanketl"
echo ""
echo "5. View logs:"
echo "   sudo journalctl -u urbanketl -f"
echo ""
echo "🔧 GPIO Pin Configuration:"
echo "   Dispenser: GPIO 18 (Pin 12)"
echo "   Green LED: GPIO 16 (Pin 36)"
echo "   Red LED:   GPIO 20 (Pin 38)"
echo "   Buzzer:    GPIO 21 (Pin 40)"
echo ""
echo "📡 MCRN2 RFID Reader (SPI):"
echo "   SDA:  GPIO 8  (Pin 24)"
echo "   SCK:  GPIO 11 (Pin 23)"
echo "   MOSI: GPIO 10 (Pin 19)"
echo "   MISO: GPIO 9  (Pin 21)"
echo "   RST:  GPIO 25 (Pin 22)"
echo "   3.3V: Pin 1"
echo "   GND:  Pin 6"
echo ""
echo "Happy brewing! ☕"
