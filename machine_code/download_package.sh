#!/bin/bash
# UrbanKetl Machine Code Download Package Creator
# Run this script to create a complete machine package

echo "📦 Creating UrbanKetl Machine Package..."

# Create package directory
PACKAGE_DIR="urbanketl-machine-$(date +%Y%m%d)"
mkdir -p "$PACKAGE_DIR"

# Copy all machine files
cp urbanketl_machine.py "$PACKAGE_DIR/"
cp machine_config.json "$PACKAGE_DIR/"
cp requirements.txt "$PACKAGE_DIR/"
cp install.sh "$PACKAGE_DIR/"
cp urbanketl-machine.service "$PACKAGE_DIR/"
cp README.md "$PACKAGE_DIR/"

# Make scripts executable
chmod +x "$PACKAGE_DIR/install.sh"
chmod +x "$PACKAGE_DIR/urbanketl_machine.py"

# Create tar package
tar -czf "$PACKAGE_DIR.tar.gz" "$PACKAGE_DIR"

echo "✅ Package created: $PACKAGE_DIR.tar.gz"
echo ""
echo "📋 To deploy on Raspberry Pi:"
echo "1. Copy package to Pi: scp $PACKAGE_DIR.tar.gz pi@your-pi-ip:~/"
echo "2. SSH to Pi: ssh pi@your-pi-ip"
echo "3. Extract: tar -xzf $PACKAGE_DIR.tar.gz"
echo "4. Install: cd $PACKAGE_DIR && bash install.sh"
echo "5. Configure: edit machine_config.json"
echo "6. Test: python3 urbanketl_machine.py"

# Cleanup
rm -rf "$PACKAGE_DIR"