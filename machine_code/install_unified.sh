#!/bin/bash
# UrbanKetl Tea Machine - Unified Reader Installation Script
# Supports both ACR122U (USB/PC-SC) and MCRN2 (SPI/PN532) readers

echo "🚀 UrbanKetl Unified Reader Installation"
echo "=========================================="
echo ""
echo "This script will install dependencies for both:"
echo "  • ACR122U (USB/PC-SC reader)"
echo "  • MCRN2 (PN532 SPI reader)"
echo ""
echo "You can use either reader without changing code!"
echo ""

# Check if running on Raspberry Pi
if [ ! -f /proc/cpuinfo ] || ! grep -q "Raspberry Pi" /proc/cpuinfo; then
    echo "⚠️  Warning: This doesn't appear to be a Raspberry Pi"
    echo "   Some features may not work (GPIO, SPI, etc.)"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📦 Installing system dependencies..."
echo ""

# Update package list
sudo apt-get update

# Install common dependencies
echo "Installing common packages..."
sudo apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    git

# Install ACR122U (PC/SC) dependencies
echo ""
echo "📱 Installing ACR122U (USB/PC-SC) support..."
sudo apt-get install -y \
    pcscd \
    libpcsclite1 \
    libpcsclite-dev \
    pcsc-tools

# Start PC/SC daemon
sudo systemctl enable pcscd
sudo systemctl start pcscd

echo "✅ PC/SC daemon started"

# Install MCRN2 (PN532 SPI) dependencies
echo ""
echo "📡 Installing MCRN2 (PN532 SPI) support..."

# Enable SPI interface
if ! grep -q "^dtparam=spi=on" /boot/config.txt; then
    echo "Enabling SPI interface..."
    sudo raspi-config nonint do_spi 0
    echo "✅ SPI enabled (reboot required)"
fi

# Install Python libraries
echo ""
echo "🐍 Installing Python libraries..."

# Install cryptography library (required for DESFire)
pip3 install pycryptodome

# Install ACR122U Python library
pip3 install pyscard

# Install MCRN2 Python libraries
pip3 install adafruit-circuitpython-pn532

# Install other required libraries
pip3 install requests RPi.GPIO

echo ""
echo "✅ Python libraries installed:"
echo "   • pycryptodome (DESFire encryption)"
echo "   • pyscard (ACR122U PC/SC communication)"
echo "   • adafruit-circuitpython-pn532 (MCRN2 SPI communication)"
echo "   • requests (API communication)"
echo "   • RPi.GPIO (GPIO control)"

# Create config file if it doesn't exist
if [ ! -f machine_config.json ]; then
    echo ""
    echo "📝 Creating default configuration file..."
    cat > machine_config.json << 'EOF'
{
  "machine_id": "UK_0001",
  "api_base_url": "https://your-domain.replit.app",
  "tea_price": 5.0,
  "dispense_time": 3.0,
  "polling_interval": 0.05,
  "card_removal_delay": 0.5,
  "api_timeout": 5,
  "reader_type": "auto",
  "gpio_pins": {
    "dispenser": 18,
    "led_green": 16,
    "led_red": 20,
    "buzzer": 21
  },
  "spi_pins": {
    "cs": 8,
    "reset": 25
  }
}
EOF
    echo "✅ Created machine_config.json"
    echo "   ⚙️  Edit this file with your machine details"
fi

# Make Python script executable
chmod +x urbanketl_machine_unified.py

# Test reader detection
echo ""
echo "🔍 Testing reader detection..."
echo ""

# Test PC/SC readers
echo "PC/SC Readers (ACR122U):"
pcsc_scan -n 2>/dev/null || echo "  No PC/SC readers detected (plug in ACR122U via USB)"

echo ""
echo "================================"
echo "✅ Installation Complete!"
echo "================================"
echo ""
echo "📋 Reader Configuration:"
echo "   • reader_type: 'auto' - Auto-detects available reader"
echo "   • reader_type: 'acr122u' - Force ACR122U (USB)"
echo "   • reader_type: 'mcrn2' - Force MCRN2 (SPI)"
echo ""
echo "🔧 Configuration:"
echo "   1. Edit machine_config.json"
echo "   2. Set your machine_id and api_base_url"
echo "   3. Configure GPIO pins for your hardware"
echo ""
echo "🚀 To Run:"
echo "   python3 urbanketl_machine_unified.py"
echo ""
echo "🔄 Auto-start on boot (optional):"
echo "   sudo cp urbanketl.service /etc/systemd/system/"
echo "   sudo systemctl enable urbanketl"
echo "   sudo systemctl start urbanketl"
echo ""
echo "📡 Hardware Support:"
echo "   • ACR122U: Plug into any USB port"
echo "   • MCRN2: Connect to SPI pins (see README)"
echo ""
echo "⚠️  If SPI was enabled, please reboot your Raspberry Pi:"
echo "   sudo reboot"
echo ""
