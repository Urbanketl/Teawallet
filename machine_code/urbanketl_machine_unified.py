#!/usr/bin/env python3
"""
UrbanKetl Tea Machine Controller - Unified Reader Support
Supports both ACR122U (USB/PC-SC) and MCRN2 (SPI/PN532) readers
Auto-detects which reader is available and uses it
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

# Try importing ACR122U (PC/SC) support
try:
    from smartcard.System import readers
    from smartcard.util import toHexString, toBytes
    ACR122U_AVAILABLE = True
except ImportError:
    ACR122U_AVAILABLE = False

# Try importing MCRN2 (PN532) support
try:
    import board
    import busio
    from digitalio import DigitalInOut
    from adafruit_pn532.spi import PN532_SPI
    import RPi.GPIO as GPIO
    MCRN2_AVAILABLE = True
except ImportError:
    MCRN2_AVAILABLE = False

# Cryptography for DESFire
try:
    from Crypto.Cipher import AES
    from Crypto.Util.Padding import pad, unpad
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False


class ReaderInterface:
    """Abstract interface for RFID readers"""
    
    def initialize(self, config: Dict[str, Any]) -> bool:
        """Initialize the reader hardware"""
        raise NotImplementedError
    
    def read_uid(self, timeout: float = 0.05) -> Optional[bytes]:
        """Read card UID. Returns None if no card present."""
        raise NotImplementedError
    
    def send_apdu(self, apdu_command: list) -> Optional[bytes]:
        """Send APDU command to card and return response"""
        raise NotImplementedError
    
    def get_reader_name(self) -> str:
        """Get reader type name"""
        raise NotImplementedError


class ACR122UReader(ReaderInterface):
    """ACR122U reader implementation using PC/SC"""
    
    def __init__(self):
        self.connection = None
        self.reader = None
        self.logger = logging.getLogger(__name__)
        self.current_uid = None
    
    def initialize(self, config: Dict[str, Any]) -> bool:
        """Initialize ACR122U via PC/SC"""
        try:
            # Get available readers
            reader_list = readers()
            
            if not reader_list:
                self.logger.error("❌ No PC/SC readers found")
                return False
            
            # Find ACR122U or use first available reader
            self.reader = None
            for r in reader_list:
                reader_name = str(r).upper()
                if 'ACR122' in reader_name or 'ACS' in reader_name:
                    self.reader = r
                    break
            
            if not self.reader:
                # Use first available reader
                self.reader = reader_list[0]
            
            self.logger.info(f"✅ ACR122U reader found: {self.reader}")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize ACR122U: {e}")
            return False
    
    def read_uid(self, timeout: float = 0.05) -> Optional[bytes]:
        """Read card UID using PC/SC"""
        try:
            # Try to connect to card
            if not self.connection:
                try:
                    self.connection = self.reader.createConnection()
                    self.connection.connect()
                except:
                    self.connection = None
                    self.current_uid = None
                    return None
            
            # Get UID using standard APDU command
            # Command: FF CA 00 00 00 (Get UID)
            get_uid_apdu = [0xFF, 0xCA, 0x00, 0x00, 0x00]
            
            try:
                data, sw1, sw2 = self.connection.transmit(get_uid_apdu)
                
                if sw1 == 0x90 and sw2 == 0x00:
                    # Success - convert to bytes
                    uid = bytes(data)
                    self.current_uid = uid
                    return uid
                else:
                    # No card or error
                    self.connection = None
                    self.current_uid = None
                    return None
                    
            except Exception as e:
                # Card removed or connection lost
                self.connection = None
                self.current_uid = None
                return None
                
        except Exception as e:
            self.logger.debug(f"Read UID error: {e}")
            return None
    
    def send_apdu(self, apdu_command: list) -> Optional[bytes]:
        """Send APDU command to card via PC/SC"""
        try:
            if not self.connection:
                return None
            
            data, sw1, sw2 = self.connection.transmit(apdu_command)
            
            if sw1 == 0x90 and sw2 == 0x00:
                return bytes(data)
            else:
                self.logger.error(f"❌ APDU error: SW={sw1:02X}{sw2:02X}")
                return None
                
        except Exception as e:
            self.logger.error(f"❌ APDU transmission error: {e}")
            return None
    
    def get_reader_name(self) -> str:
        return "ACR122U (USB/PC-SC)"


class MCRN2Reader(ReaderInterface):
    """MCRN2 reader implementation using PN532 SPI"""
    
    def __init__(self):
        self.nfc_reader = None
        self.logger = logging.getLogger(__name__)
    
    def initialize(self, config: Dict[str, Any]) -> bool:
        """Initialize MCRN2 via SPI"""
        try:
            # Initialize SPI bus
            spi = busio.SPI(board.SCK, board.MOSI, board.MISO)
            
            # Get pin configuration
            spi_pins = config.get('spi_pins', {})
            cs_gpio = spi_pins.get('cs', 8)
            reset_gpio = spi_pins.get('reset', 25)
            
            # Initialize CS and Reset pins
            cs_pin = DigitalInOut(getattr(board, f'D{cs_gpio}'))
            reset_pin = DigitalInOut(getattr(board, f'D{reset_gpio}'))
            
            # Initialize PN532 on SPI
            self.nfc_reader = PN532_SPI(spi, cs_pin, reset=reset_pin, debug=False)
            
            # Configure SAM (Security Access Module)
            self.nfc_reader.SAM_configuration()
            
            self.logger.info("✅ MCRN2 (PN532) reader initialized")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize MCRN2: {e}")
            return False
    
    def read_uid(self, timeout: float = 0.05) -> Optional[bytes]:
        """Read card UID using PN532"""
        try:
            if not self.nfc_reader:
                return None
            
            # Read card UID with timeout in seconds
            uid = self.nfc_reader.read_passive_target(timeout=timeout)
            return uid
            
        except Exception as e:
            self.logger.debug(f"Read UID error: {e}")
            return None
    
    def send_apdu(self, apdu_command: list) -> Optional[bytes]:
        """Send APDU command to card via PN532"""
        try:
            if not self.nfc_reader:
                return None
            
            # Send APDU via PN532's InDataExchange
            response = self.nfc_reader.in_data_exchange(apdu_command)
            
            if response and len(response) >= 1:
                # PN532 prepends status byte (0x00 on success)
                if response[0] == 0x00:
                    # Skip PN532 status byte, return all DESFire data
                    # This includes DESFire payload + status words (0x91xx)
                    desfire_response = bytes(response[1:])
                    
                    # Log DESFire status if present
                    if len(desfire_response) >= 2:
                        sw1 = desfire_response[-2]
                        sw2 = desfire_response[-1]
                        if sw1 == 0x91:
                            self.logger.debug(f"DESFire status: 91{sw2:02X}")
                    
                    return desfire_response
                else:
                    self.logger.error(f"❌ PN532 communication error: Status={response[0]:02X}")
                    return None
            else:
                return None
                
        except Exception as e:
            self.logger.error(f"❌ APDU transmission error: {e}")
            return None
    
    def get_reader_name(self) -> str:
        return "MCRN2 (SPI/PN532)"


class UrbanKetlUnifiedMachine:
    """Unified tea machine controller supporting multiple reader types"""
    
    def __init__(self, config_file="machine_config.json"):
        """Initialize the tea machine with auto-detection"""
        
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
        
        # Reader interface
        self.reader = None
        
        # Initialize hardware
        self.setup_hardware()
        
        self.logger.info(f"✅ UrbanKetl Unified Machine {self.machine_id} initialized")

    def load_config(self, config_file: str) -> Dict[str, Any]:
        """Load machine configuration from JSON file"""
        default_config = {
            "machine_id": "UK_0001",
            "api_base_url": "https://your-domain.replit.app",
            "tea_price": 5.0,
            "dispense_time": 3.0,
            "polling_interval": 0.05,
            "card_removal_delay": 0.5,
            "api_timeout": 5,
            "reader_type": "auto",  # "auto", "acr122u", or "mcrn2"
            "gpio_pins": {
                "dispenser": 18
            },
            "spi_pins": {
                "cs": 8,
                "reset": 25
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
        """Initialize hardware with auto-detection"""
        
        # Auto-detect or use configured reader type
        reader_type = self.config.get('reader_type', 'auto')
        
        self.logger.info("🔍 Detecting RFID reader...")
        
        # Try readers based on configuration
        if reader_type == 'auto':
            # Try ACR122U first (USB is more common)
            if ACR122U_AVAILABLE and self.try_acr122u():
                pass  # Success
            elif MCRN2_AVAILABLE and self.try_mcrn2():
                pass  # Success
            else:
                self.logger.warning("⚠️  No readers available - running in simulation mode")
        
        elif reader_type == 'acr122u':
            if ACR122U_AVAILABLE:
                self.try_acr122u()
            else:
                self.logger.error("❌ ACR122U libraries not installed")
        
        elif reader_type == 'mcrn2':
            if MCRN2_AVAILABLE:
                self.try_mcrn2()
            else:
                self.logger.error("❌ MCRN2 libraries not installed")
        
        # Initialize GPIO for dispenser and optional components
        if MCRN2_AVAILABLE:  # GPIO only available on Raspberry Pi
            try:
                pins = self.config['gpio_pins']
                GPIO.setup(pins['dispenser'], GPIO.OUT)
                GPIO.output(pins['dispenser'], GPIO.LOW)
                
                # Initialize optional pins
                if 'led_green' in pins:
                    GPIO.setup(pins['led_green'], GPIO.OUT)
                    GPIO.output(pins['led_green'], GPIO.LOW)
                if 'led_red' in pins:
                    GPIO.setup(pins['led_red'], GPIO.OUT)
                    GPIO.output(pins['led_red'], GPIO.LOW)
                if 'buzzer' in pins:
                    GPIO.setup(pins['buzzer'], GPIO.OUT)
                    GPIO.output(pins['buzzer'], GPIO.LOW)
                
                self.logger.info(f"✅ GPIO pins initialized: {list(pins.keys())}")
            except Exception as e:
                self.logger.error(f"❌ Failed to initialize GPIO: {e}")

    def try_acr122u(self) -> bool:
        """Try to initialize ACR122U reader"""
        try:
            reader = ACR122UReader()
            if reader.initialize(self.config):
                self.reader = reader
                self.logger.info(f"✅ Using {reader.get_reader_name()}")
                return True
        except Exception as e:
            self.logger.debug(f"ACR122U not available: {e}")
        return False
    
    def try_mcrn2(self) -> bool:
        """Try to initialize MCRN2 reader"""
        try:
            reader = MCRN2Reader()
            if reader.initialize(self.config):
                self.reader = reader
                self.logger.info(f"✅ Using {reader.get_reader_name()}")
                return True
        except Exception as e:
            self.logger.debug(f"MCRN2 not available: {e}")
        return False

    def start_polling(self):
        """Start continuous polling for RFID cards"""
        if not self.reader:
            self.logger.warning("⚠️  No reader available - polling disabled")
            return
        
        self.polling_active = True
        self.logger.info(f"🔄 Starting polling mode with {self.reader.get_reader_name()}...")
        
        def poll_loop():
            while self.polling_active:
                try:
                    if not self.processing_card:
                        # Read card UID
                        uid = self.reader.read_uid(timeout=0.05)
                        
                        if uid and uid != self.current_card_uid:
                            # New card detected!
                            card_uid_hex = binascii.hexlify(uid).decode('utf-8').upper()
                            self.current_card_uid = uid
                            self.processing_card = True
                            
                            self.logger.info(f"⚡ Card detected: {card_uid_hex}")
                            self.beep(0.1)
                            
                            # Process card in separate thread
                            threading.Thread(
                                target=self.process_desfire_authentication,
                                args=(card_uid_hex,),
                                daemon=True
                            ).start()
                        
                        elif not uid and self.current_card_uid:
                            # Card removed
                            self.logger.debug("Card removed")
                            self.current_card_uid = None
                    
                    # Sleep for polling interval
                    time.sleep(self.config.get('polling_interval', 0.05))
                
                except Exception as e:
                    self.logger.error(f"❌ Polling error: {e}")
                    time.sleep(1)
        
        # Run polling in background thread
        poll_thread = threading.Thread(target=poll_loop, daemon=True)
        poll_thread.start()
        
        self.logger.info("✅ Polling started - tap your card anytime")

    def stop_polling(self):
        """Stop polling mode"""
        self.polling_active = False
        self.logger.info("⏹️  Polling stopped")

    def process_desfire_authentication(self, card_uid_hex: str):
        """Complete DESFire challenge-response authentication flow"""
        
        try:
            self.logger.info(f"🔐 Starting DESFire authentication for UID: {card_uid_hex}")
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
            card_response = self.get_desfire_response(challenge_hex)
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
                
                self.logger.info("☕ Tea dispensed successfully!")
                
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

    def get_desfire_response(self, challenge_hex: str) -> Optional[str]:
        """Send challenge to DESFire card and get encrypted response"""
        
        if not CRYPTO_AVAILABLE:
            self.logger.error("❌ Crypto library not available")
            return None
        
        if not self.reader:
            self.logger.warning("⚠️  Using simulated response (no reader)")
            challenge_bytes = bytes.fromhex(challenge_hex)
            return binascii.hexlify(challenge_bytes).decode('utf-8').upper()
        
        try:
            # DESFire APDU for AES authentication
            challenge_bytes = bytes.fromhex(challenge_hex)
            
            # Build APDU command
            apdu = [
                0x90,  # CLA: DESFire
                0xAA,  # INS: AuthenticateEV2First
                0x00,  # P1: Key number 0
                0x00,  # P2
                0x10   # Lc: 16 bytes
            ]
            apdu.extend(list(challenge_bytes))
            apdu.append(0x00)  # Le: expect response
            
            # Send APDU via reader
            response = self.reader.send_apdu(apdu)
            
            if response and len(response) >= 2:
                # DESFire response format: [data bytes] + SW1 + SW2
                # Check status words (last 2 bytes)
                sw1 = response[-2]
                sw2 = response[-1]
                
                # 0x91 0x00 = success, 0x91 0xAF = additional frames
                if sw1 == 0x91 and (sw2 == 0x00 or sw2 == 0xAF):
                    # Extract data (everything except last 2 status bytes)
                    data = response[:-2]
                    
                    if len(data) >= 16:
                        # Return encrypted response (first 16 bytes of data)
                        response_hex = binascii.hexlify(data[:16]).decode('utf-8').upper()
                        return response_hex
                    else:
                        self.logger.error(f"❌ Insufficient response data: {len(data)} bytes")
                        return None
                else:
                    self.logger.error(f"❌ DESFire error: SW={sw1:02X}{sw2:02X}")
                    return None
            else:
                self.logger.error(f"❌ Invalid card response length: {len(response) if response else 0}")
                return None
            
        except Exception as e:
            self.logger.error(f"❌ DESFire communication error: {e}")
            # Fallback to simulation
            self.logger.warning("⚠️  Falling back to simulated response")
            challenge_bytes = bytes.fromhex(challenge_hex)
            return binascii.hexlify(challenge_bytes).decode('utf-8').upper()

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
            
            if MCRN2_AVAILABLE:
                pins = self.config['gpio_pins']
                
                self.logger.info(f"☕ Dispensing tea for {dispense_time} seconds...")
                
                # Activate dispenser
                GPIO.output(pins['dispenser'], GPIO.HIGH)
                
                # Activate green LED if available
                if 'led_green' in pins:
                    GPIO.output(pins['led_green'], GPIO.HIGH)
                
                time.sleep(dispense_time)
                
                # Deactivate
                GPIO.output(pins['dispenser'], GPIO.LOW)
                if 'led_green' in pins:
                    GPIO.output(pins['led_green'], GPIO.LOW)
            else:
                self.logger.info(f"🔧 [SIMULATION] Dispensing tea for {dispense_time} seconds...")
                time.sleep(dispense_time)
            
            self.logger.info("✅ Dispensing complete")
        
        except Exception as e:
            self.logger.error(f"❌ Dispensing error: {e}")

    def set_led(self, color: str, mode: str = 'on'):
        """Control LED indicators (optional)"""
        if not MCRN2_AVAILABLE:
            return
        
        try:
            pins = self.config['gpio_pins']
            led_key = f'led_{color}'
            
            if led_key not in pins:
                return
            
            led_pin = pins[led_key]
            
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
            self.logger.debug(f"LED not available: {e}")

    def beep(self, duration: float = 0.1):
        """Sound buzzer (optional)"""
        if not MCRN2_AVAILABLE:
            return
        
        try:
            pins = self.config['gpio_pins']
            
            if 'buzzer' not in pins:
                return
            
            GPIO.output(pins['buzzer'], GPIO.HIGH)
            time.sleep(duration)
            GPIO.output(pins['buzzer'], GPIO.LOW)
        
        except Exception as e:
            self.logger.debug(f"Buzzer not available: {e}")

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
        
        if MCRN2_AVAILABLE:
            try:
                GPIO.cleanup()
                self.logger.info("🧹 GPIO cleanup complete")
            except:
                pass
        
        self.logger.info("👋 UrbanKetl Machine shutdown complete")

    def run(self):
        """Main run loop"""
        try:
            self.logger.info("🚀 UrbanKetl Unified Machine starting...")
            self.logger.info(f"📡 Machine ID: {self.machine_id}")
            self.logger.info(f"🌐 API Base: {self.api_base}")
            
            if self.reader:
                self.logger.info(f"🔧 Reader: {self.reader.get_reader_name()}")
            else:
                self.logger.warning("⚠️  No reader detected - simulation mode")
            
            # Start heartbeat
            self.start_heartbeat(60)
            
            # Start polling
            self.start_polling()
            
            self.logger.info("✅ Machine ready - waiting for cards...")
            self.logger.info("👆 Tap your RFID card to dispense tea")
            
            # Keep main thread alive
            while True:
                time.sleep(1)
        
        except KeyboardInterrupt:
            self.logger.info("\n⏹️  Shutdown requested...")
            self.cleanup()
        
        except Exception as e:
            self.logger.error(f"❌ Fatal error: {e}")
            self.cleanup()


if __name__ == "__main__":
    machine = UrbanKetlUnifiedMachine("machine_config.json")
    machine.run()
