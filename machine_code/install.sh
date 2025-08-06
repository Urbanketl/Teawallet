#!/bin/bash
# UrbanKetl Tea Machine Installation Script
# Run with: bash install.sh

echo "🚀 Installing UrbanKetl Tea Machine Software..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
sudo apt install -y python3 python3-pip python3-dev

# Enable SPI for RFID reader
echo "📡 Enabling SPI interface..."
sudo raspi-config nonint do_spi 0

# Install Python packages
echo "📚 Installing Python packages..."
pip3 install -r requirements.txt

# Set up systemd service for auto-start
echo "⚙️ Setting up system service..."
sudo cp urbanketl-machine.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable urbanketl-machine.service

# Create directories
mkdir -p logs
mkdir -p backups

# Set permissions
chmod +x urbanketl_machine.py

echo "✅ Installation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit machine_config.json with your machine details"
echo "2. Update the API base URL to your domain"
echo "3. Set your machine ID and secret"
echo "4. Test the machine: python3 urbanketl_machine.py"
echo "5. Start the service: sudo systemctl start urbanketl-machine"
echo ""
echo "🔧 Hardware connections:"
echo "- RFID Reader: Connect to SPI pins (MOSI=19, MISO=21, CLK=23, SDA=24, RST=22)"
echo "- Dispenser: GPIO 18"
echo "- Green LED: GPIO 16"
echo "- Red LED: GPIO 20"
echo "- Buzzer: GPIO 21"