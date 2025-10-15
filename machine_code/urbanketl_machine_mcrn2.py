#!/usr/bin/env python3
"""
UrbanKetl Tea Machine Controller - DESFire EV3 with MCRN2 Reader
Raspberry Pi code for MCRN2 (PN532-based) RFID reader
Supports MIFARE DESFire EV3 (backward compatible with EV1/EV2)
"""

import time
import json
import requests
import logging
import threading
import binascii
from datetime import datetime
from typing import Optional, Dict, Any
import os

# PN532 Reader imports (for MCRN2)
try:
    import board
    import busio
    from digitalio import DigitalInOut
    from adafruit_pn532.spi import PN532_SPI
    import RPi.GPIO as GPIO
    HARDWARE_AVAILABLE = True
except ImportError:
    print("⚠️  PN532 library not found - running in simulation mode")
    print("   Install with: pip3 install adafruit-circuitpython-pn532")
    HARDWARE_AVAILABLE = False

# Cryptography for DESFire
try:
    from Crypto.Cipher import AES
    from Crypto.Util.Padding import pad, unpad
    CRYPTO_AVAILABLE = True
except ImportError:
    print("⚠️  pycryptodome not found. Install with: pip3 install pycryptodome")
    CRYPTO_AVAILABLE = False


class UrbanKetlMCRN2Machine:
    def __init__(self, config_file="machine_config.json"):
        """Initialize the tea machine with MCRN2 DESFire support"""
        
        # Load configuration
        self.config = self.load_config(config_file)
        
        # Setup logging
        self.setup_logging()
        
        # API settings
        self.api_base = self.config.get('api_base_url', 'https://your-domain.replit.app')
        self.machine_id = self.config.get('machine_id', 'UK_0001')
        
        # Machine status
        self.is_online = True
        self.polling_active = False
        self.current_card_uid = None
        self.processing_card = False
        
        # Statistics
        self.daily_dispensed = 0
        self.total_dispensed = 0
        self.auth_failures = 0
        
        # Initialize hardware
        self.setup_hardware()
        
        self.logger.info(f"✅ UrbanKetl MCRN2 Machine {self.machine_id} initialized")

    def load_config(self, config_file: str) -> Dict[str, Any]:
        """Load machine configuration from JSON file"""
        default_config = {
            "machine_id": "UK_0001",
            "api_base_url": "https://your-domain.replit.app",
            "tea_price": 5.0,
            "dispense_time": 3.0,
            "polling_interval": 0.05,  # 50ms polling
            "card_removal_delay": 0.5,  # Wait 500ms after card removal
            "api_timeout": 5,
            "gpio_pins": {
                "dispenser": 18,
                "led_green": 16,
                "led_red": 20,
                "buzzer": 21
            },
            "spi_pins": {
                "cs": 8,    # CE0 (Pin 24)
                "reset": 25  # GPIO 25 (Pin 22)
            }
        }
        
        try:
            if os.path.exists(config_file):
                with open(config_file, 'r') as f:
                    config = json.load(f)
                default_config.update(config)
                return default_config
            else:
                with open(config_file, 'w') as f:
                    json.dump(default_config, f, indent=2)
                print(f"📝 Created default config file: {config_file}")
                print("⚙️  Please edit the config file with your machine details")
                return default_config
        except Exception as e:
            print(f"❌ Error loading config: {e}")
            return default_config

    def setup_logging(self):
        """Setup logging configuration"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('urbanketl_machine.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def setup_hardware(self):
        """Initialize hardware components"""
        self.nfc_reader = None
        
        if HARDWARE_AVAILABLE:
            try:
                # Initialize SPI bus
                spi = busio.SPI(board.SCK, board.MOSI, board.MISO)
                
                # Initialize CS and Reset pins
                cs_pin = DigitalInOut(board.D8)  # GPIO 8 (Pin 24)
                reset_pin = DigitalInOut(board.D25)  # GPIO 25 (Pin 22)
                
                # Initialize PN532 on SPI
                self.nfc_reader = PN532_SPI(spi, cs_pin, reset=reset_pin, debug=False)
                
                # Configure SAM (Security Access Module)
                self.nfc_reader.SAM_configuration()
                
                self.logger.info("✅ MCRN2 (PN532) reader initialized")
                
                # Initialize GPIO pins for outputs
                pins = self.config['gpio_pins']
                GPIO.setup(pins['dispenser'], GPIO.OUT)
                GPIO.setup(pins['led_green'], GPIO.OUT)
                GPIO.setup(pins['led_red'], GPIO.OUT)
                GPIO.setup(pins['buzzer'], GPIO.OUT)
                
                # Initialize all pins to LOW
                for pin in pins.values():
                    GPIO.output(pin, GPIO.LOW)
                
                self.logger.info("✅ GPIO pins initialized")
                
            except Exception as e:
                self.logger.error(f"❌ Failed to initialize hardware: {e}")
        else:
            self.logger.warning("⚠️  Running in simulation mode (no hardware)")

    def start_polling(self):
        """Start continuous polling for RFID cards"""
        if not HARDWARE_AVAILABLE:
            self.logger.warning("⚠️  Hardware not available - polling disabled")
            return
        
        self.polling_active = True
        self.logger.info("🔄 Starting MCRN2 polling mode...")
        
        def poll_loop():
            while self.polling_active:
                try:
                    # Check if card is present using PN532
                    if self.nfc_reader and not self.processing_card:
                        # Read card UID (non-blocking with timeout in seconds)
                        uid = self.nfc_reader.read_passive_target(timeout=0.05)
                        
                        if uid and uid != self.current_card_uid:
                            # New card detected!
                            card_uid_hex = binascii.hexlify(uid).decode('utf-8').upper()
                            self.current_card_uid = uid
                            self.processing_card = True
                            
                            self.logger.info(f"⚡ Card detected: {card_uid_hex}")
                            self.beep(0.1)  # Quick beep
                            
                            # Process card in separate thread to not block polling
                            threading.Thread(
                                target=self.process_desfire_authentication,
                                args=(card_uid_hex,),
                                daemon=True
                            ).start()
                        
                        elif not uid and self.current_card_uid:
                            # Card was removed
                            self.logger.debug(f"Card removed")
                            self.current_card_uid = None
                    
                    # Sleep for polling interval (50ms default)
                    time.sleep(self.config.get('polling_interval', 0.05))
                
                except Exception as e:
                    self.logger.error(f"❌ Polling error: {e}")
                    time.sleep(1)  # Longer delay on error
        
        # Run polling in background thread
        poll_thread = threading.Thread(target=poll_loop, daemon=True)
        poll_thread.start()
        
        self.logger.info("✅ MCRN2 polling started - tap your card anytime")

    def stop_polling(self):
        """Stop polling mode"""
        self.polling_active = False
        self.logger.info("⏹️  MCRN2 polling stopped")

    def process_desfire_authentication(self, card_uid_hex: str):
        """Complete DESFire challenge-response authentication flow"""
        
        try:
            self.logger.info(f"🔐 Starting DESFire EV3 authentication for UID: {card_uid_hex}")
            self.set_led('green', 'blink')
            
            # Step 1: Request challenge from server
            challenge_data = self.request_challenge(card_uid_hex)
            if not challenge_data:
                self.show_error("AUTH_FAILED")
                self.processing_card = False
                return False
            
            challenge_id = challenge_data['challengeId']
            challenge_hex = challenge_data['challenge']
            
            self.logger.info(f"📨 Received challenge: {challenge_hex[:16]}...")
            
            # Step 2: Send challenge to DESFire card and get response
            card_response = self.get_desfire_response(challenge_hex, self.current_card_uid)
            if not card_response:
                self.show_error("CARD_ERROR")
                self.processing_card = False
                return False
            
            self.logger.info(f"📤 Card response: {card_response[:16]}...")
            
            # Step 3: Validate response with server
            validation = self.validate_response(challenge_id, card_response, card_uid_hex)
            if not validation or not validation.get('success'):
                error_msg = validation.get('errorMessage', 'Unknown error') if validation else 'No response'
                self.logger.warning(f"❌ Authentication failed: {error_msg}")
                self.show_error("INVALID_CARD")
                self.auth_failures += 1
                self.processing_card = False
                return False
            
            self.logger.info(f"✅ Authentication successful for card: {validation['cardNumber']}")
            
            # Step 4: Authorize dispensing
            dispense_result = self.authorize_dispensing(
                validation['cardNumber'],
                validation['businessUnitId']
            )
            
            if dispense_result and dispense_result.get('success'):
                balance = dispense_result.get('remainingBalance', 'Unknown')
                self.logger.info(f"💰 Balance deducted. Remaining: ₹{balance}")
                
                # Dispense tea
                self.show_success()
                self.dispense_tea()
                
                self.daily_dispensed += 1
                self.total_dispensed += 1
                
                self.logger.info(f"☕ Tea dispensed successfully!")
                
                # Wait before accepting next card
                time.sleep(self.config.get('card_removal_delay', 0.5))
                self.processing_card = False
                return True
            else:
                error = dispense_result.get('message', 'Dispensing failed') if dispense_result else 'No response'
                self.logger.error(f"❌ Dispensing failed: {error}")
                self.show_error("DISPENSE_FAIL")
                self.processing_card = False
                return False
        
        except Exception as e:
            self.logger.error(f"❌ Authentication error: {e}")
            self.show_error("SYSTEM_ERROR")
            self.processing_card = False
            return False

    def request_challenge(self, card_uid_hex: str) -> Optional[Dict]:
        """Request cryptographic challenge from server"""
        try:
            response = requests.post(
                f"{self.api_base}/api/machine/auth/challenge",
                json={
                    'machineId': self.machine_id,
                    'cardUid': card_uid_hex
                },
                timeout=self.config.get('api_timeout', 5)
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                self.logger.error(f"❌ Challenge request failed: {response.status_code}")
                return None
        
        except Exception as e:
            self.logger.error(f"❌ Challenge request error: {e}")
            return None

    def get_desfire_response(self, challenge_hex: str, card_uid: bytes) -> Optional[str]:
        """
        Send challenge to DESFire EV3 card via MCRN2 and get encrypted response
        
        This uses PN532's InDataExchange command to send APDU to DESFire card
        """
        
        if not CRYPTO_AVAILABLE:
            self.logger.error("❌ Crypto library not available")
            return None
        
        if not HARDWARE_AVAILABLE:
            self.logger.warning("⚠️  Using simulated response (no hardware)")
            # Simulation mode
            challenge_bytes = bytes.fromhex(challenge_hex)
            simulated_response = binascii.hexlify(challenge_bytes).decode('utf-8').upper()
            return simulated_response
        
        try:
            # DESFire EV3 APDU Command for Authentication
            # For actual implementation, you need:
            # 1. Select DESFire application (if not already selected)
            # 2. Send Authenticate command with challenge
            # 3. Receive encrypted response
            
            # DESFire Authenticate APDU structure:
            # CLA: 0x90 (DESFire)
            # INS: 0xAA (AuthenticateEV2First for EV3) or 0x1A (legacy AES)
            # P1:  0x00 (Key number)
            # P2:  0x00
            # Lc:  0x10 (16 bytes for AES-128)
            # Data: Challenge bytes
            
            challenge_bytes = bytes.fromhex(challenge_hex)
            
            # Build APDU command for DESFire AES authentication
            apdu = bytearray([
                0x90,  # CLA: DESFire
                0xAA,  # INS: AuthenticateEV2First (EV3 enhanced)
                0x00,  # P1: Key number 0
                0x00,  # P2
                0x10   # Lc: 16 bytes
            ])
            apdu.extend(challenge_bytes)
            apdu.append(0x00)  # Le: expect response
            
            # Send APDU via PN532's InDataExchange
            # Note: Adafruit PN532 prepends status byte (0x00 on success)
            response = self.nfc_reader.in_data_exchange(list(apdu))
            
            if response and len(response) >= 17:
                # Skip status byte (byte 0), extract 16 data bytes (bytes 1-17)
                encrypted_response = bytes(response[1:17])
                response_hex = binascii.hexlify(encrypted_response).decode('utf-8').upper()
                return response_hex
            else:
                self.logger.error(f"❌ Invalid card response length: {len(response) if response else 0}")
                return None
            
        except Exception as e:
            self.logger.error(f"❌ DESFire communication error: {e}")
            # Fallback to simulation for testing
            self.logger.warning("⚠️  Falling back to simulated response")
            challenge_bytes = bytes.fromhex(challenge_hex)
            simulated_response = binascii.hexlify(challenge_bytes).decode('utf-8').upper()
            return simulated_response

    def validate_response(self, challenge_id: str, response: str, card_uid: str) -> Optional[Dict]:
        """Validate challenge response with server"""
        try:
            response_obj = requests.post(
                f"{self.api_base}/api/machine/auth/validate",
                json={
                    'challengeId': challenge_id,
                    'response': response,
                    'cardUid': card_uid
                },
                timeout=self.config.get('api_timeout', 5)
            )
            
            if response_obj.status_code == 200:
                return response_obj.json()
            else:
                self.logger.error(f"❌ Validation failed: {response_obj.status_code}")
                return None
        
        except Exception as e:
            self.logger.error(f"❌ Validation error: {e}")
            return None

    def authorize_dispensing(self, card_number: str, business_unit_id: str) -> Optional[Dict]:
        """Authorize tea dispensing and deduct from wallet"""
        try:
            response = requests.post(
                f"{self.api_base}/api/machine/auth/dispense",
                json={
                    'machineId': self.machine_id,
                    'cardNumber': card_number,
                    'businessUnitId': business_unit_id,
                    'amount': self.config.get('tea_price', 5.0),
                    'teaType': 'Regular Tea'
                },
                timeout=self.config.get('api_timeout', 5)
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                self.logger.error(f"❌ Dispensing authorization failed: {response.status_code}")
                return None
        
        except Exception as e:
            self.logger.error(f"❌ Dispensing authorization error: {e}")
            return None

    def dispense_tea(self):
        """Activate tea dispensing mechanism"""
        try:
            dispense_time = self.config.get('dispense_time', 3.0)
            
            if HARDWARE_AVAILABLE:
                pins = self.config['gpio_pins']
                
                self.logger.info(f"☕ Dispensing tea for {dispense_time} seconds...")
                
                # Activate dispenser and green LED
                GPIO.output(pins['dispenser'], GPIO.HIGH)
                GPIO.output(pins['led_green'], GPIO.HIGH)
                
                time.sleep(dispense_time)
                
                # Deactivate
                GPIO.output(pins['dispenser'], GPIO.LOW)
                GPIO.output(pins['led_green'], GPIO.LOW)
            else:
                self.logger.info(f"🔧 [SIMULATION] Dispensing tea for {dispense_time} seconds...")
                time.sleep(dispense_time)
            
            self.logger.info("✅ Dispensing complete")
        
        except Exception as e:
            self.logger.error(f"❌ Dispensing error: {e}")

    def set_led(self, color: str, mode: str = 'on'):
        """Control LED indicators"""
        if not HARDWARE_AVAILABLE:
            return
        
        try:
            pins = self.config['gpio_pins']
            led_pin = pins[f'led_{color}']
            
            if mode == 'on':
                GPIO.output(led_pin, GPIO.HIGH)
            elif mode == 'off':
                GPIO.output(led_pin, GPIO.LOW)
            elif mode == 'blink':
                for _ in range(3):
                    GPIO.output(led_pin, GPIO.HIGH)
                    time.sleep(0.1)
                    GPIO.output(led_pin, GPIO.LOW)
                    time.sleep(0.1)
        
        except Exception as e:
            self.logger.error(f"❌ LED error: {e}")

    def beep(self, duration: float = 0.1):
        """Sound buzzer"""
        if not HARDWARE_AVAILABLE:
            return
        
        try:
            pins = self.config['gpio_pins']
            GPIO.output(pins['buzzer'], GPIO.HIGH)
            time.sleep(duration)
            GPIO.output(pins['buzzer'], GPIO.LOW)
        
        except Exception as e:
            self.logger.error(f"❌ Buzzer error: {e}")

    def show_success(self):
        """Show success indication"""
        self.set_led('green', 'on')
        self.beep(0.2)
        time.sleep(0.5)
        self.set_led('green', 'off')

    def show_error(self, error_type: str):
        """Show error indication"""
        self.set_led('red', 'blink')
        self.beep(0.1)
        time.sleep(0.05)
        self.beep(0.1)
        self.set_led('red', 'off')
        
        self.logger.warning(f"⚠️  Error: {error_type}")

    def send_heartbeat(self):
        """Send heartbeat to server"""
        try:
            response = requests.post(
                f"{self.api_base}/api/machine/heartbeat",
                json={
                    'machineId': self.machine_id,
                    'status': 'online',
                    'dailyDispensed': self.daily_dispensed,
                    'totalDispensed': self.total_dispensed
                },
                timeout=5
            )
            
            if response.status_code == 200:
                self.is_online = True
                self.logger.debug("💓 Heartbeat sent")
            else:
                self.logger.warning(f"⚠️  Heartbeat failed: {response.status_code}")
        
        except Exception as e:
            self.logger.error(f"❌ Heartbeat error: {e}")
            self.is_online = False

    def start_heartbeat(self, interval: int = 60):
        """Start periodic heartbeat"""
        def heartbeat_loop():
            while True:
                self.send_heartbeat()
                time.sleep(interval)
        
        thread = threading.Thread(target=heartbeat_loop, daemon=True)
        thread.start()
        self.logger.info(f"💓 Heartbeat started (every {interval}s)")

    def cleanup(self):
        """Cleanup resources"""
        self.stop_polling()
        
        if HARDWARE_AVAILABLE:
            try:
                GPIO.cleanup()
                self.logger.info("🧹 GPIO cleanup complete")
            except:
                pass
        
        self.logger.info("👋 UrbanKetl MCRN2 Machine shutdown complete")

    def run(self):
        """Main run loop"""
        try:
            self.logger.info("🚀 UrbanKetl MCRN2 DESFire EV3 Machine starting...")
            self.logger.info(f"📡 Machine ID: {self.machine_id}")
            self.logger.info(f"🌐 API Base: {self.api_base}")
            self.logger.info(f"🔧 Reader: MCRN2 (PN532)")
            
            # Start heartbeat
            self.start_heartbeat(60)
            
            # Start polling mode for instant card detection
            self.start_polling()
            
            self.logger.info("✅ Machine ready - waiting for cards...")
            self.logger.info("👆 Tap your RFID card to dispense tea")
            
            # Keep main thread alive
            while True:
                time.sleep(1)
                
                # Print stats every 60 seconds
                if int(time.time()) % 60 == 0:
                    self.logger.info(
                        f"📊 Stats - Today: {self.daily_dispensed} | "
                        f"Total: {self.total_dispensed} | "
                        f"Failures: {self.auth_failures}"
                    )
        
        except KeyboardInterrupt:
            self.logger.info("\n⏹️  Shutdown requested...")
            self.cleanup()
        
        except Exception as e:
            self.logger.error(f"❌ Fatal error: {e}")
            self.cleanup()


if __name__ == "__main__":
    # Load and run machine
    machine = UrbanKetlMCRN2Machine("machine_config.json")
    machine.run()
