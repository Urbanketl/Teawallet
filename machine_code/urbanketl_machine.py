#!/usr/bin/env python3
"""
UrbanKetl Tea Machine Controller
Raspberry Pi code for RFID-based tea dispensing system
"""

import time
import json
import requests
import logging
from datetime import datetime
from typing import Optional, Dict, Any
import os
import hashlib

# RFID Reader imports (install with: pip install mfrc522)
try:
    from mfrc522 import SimpleMFRC522
    RFID_AVAILABLE = True
except ImportError:
    print("MFRC522 library not found. Install with: pip install mfrc522")
    RFID_AVAILABLE = False

# GPIO imports for dispensing control
try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
except ImportError:
    print("RPi.GPIO not available - running in simulation mode")
    GPIO_AVAILABLE = False

class UrbanKetlMachine:
    def __init__(self, config_file="machine_config.json"):
        """Initialize the tea machine controller"""
        
        # Load configuration
        self.config = self.load_config(config_file)
        
        # Setup logging
        self.setup_logging()
        
        # Initialize hardware
        self.setup_hardware()
        
        # API settings
        self.api_base = self.config.get('api_base_url', 'https://your-domain.replit.app')
        self.machine_id = self.config.get('machine_id', 'UK_0001')
        self.machine_secret = self.config.get('machine_secret', 'your-machine-secret')
        
        # Machine status
        self.is_online = False
        self.last_heartbeat = None
        
        # Statistics
        self.daily_dispensed = 0
        self.total_dispensed = 0
        
        self.logger.info(f"UrbanKetl Machine {self.machine_id} initialized")

    def load_config(self, config_file: str) -> Dict[str, Any]:
        """Load machine configuration from JSON file"""
        default_config = {
            "machine_id": "UK_0001", 
            "machine_secret": "change-this-secret",
            "api_base_url": "https://your-domain.replit.app",
            "tea_price": 5.0,
            "dispense_time": 3.0,
            "heartbeat_interval": 60,
            "offline_mode": False,
            "gpio_pins": {
                "dispenser": 18,
                "led_green": 16,
                "led_red": 20,
                "buzzer": 21
            }
        }
        
        try:
            if os.path.exists(config_file):
                with open(config_file, 'r') as f:
                    config = json.load(f)
                # Merge with defaults
                default_config.update(config)
                return default_config
            else:
                # Create default config file
                with open(config_file, 'w') as f:
                    json.dump(default_config, f, indent=2)
                print(f"Created default config file: {config_file}")
                print("Please edit the config file with your machine details")
                return default_config
        except Exception as e:
            print(f"Error loading config: {e}")
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
        self.rfid_reader = None
        
        # Initialize RFID reader
        if RFID_AVAILABLE:
            try:
                self.rfid_reader = SimpleMFRC522()
                self.logger.info("RFID reader initialized")
            except Exception as e:
                self.logger.error(f"Failed to initialize RFID reader: {e}")
        
        # Initialize GPIO pins
        if GPIO_AVAILABLE:
            try:
                GPIO.setmode(GPIO.BCM)
                GPIO.setwarnings(False)
                
                # Setup GPIO pins
                pins = self.config['gpio_pins']
                GPIO.setup(pins['dispenser'], GPIO.OUT)
                GPIO.setup(pins['led_green'], GPIO.OUT)
                GPIO.setup(pins['led_red'], GPIO.OUT)
                GPIO.setup(pins['buzzer'], GPIO.OUT)
                
                # Initialize all pins to LOW
                for pin in pins.values():
                    GPIO.output(pin, GPIO.LOW)
                
                self.logger.info("GPIO pins initialized")
            except Exception as e:
                self.logger.error(f"Failed to initialize GPIO: {e}")

    def api_request(self, endpoint: str, method: str = 'GET', data: Dict = None) -> Optional[Dict]:
        """Make API request to UrbanKetl server"""
        url = f"{self.api_base}{endpoint}"
        
        headers = {
            'Content-Type': 'application/json',
            'X-Machine-ID': self.machine_id,
            'X-Machine-Secret': self.machine_secret
        }
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                self.logger.error(f"API request failed: {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"API request error: {e}")
            return None

    def process_rfid_transaction(self, card_id: str) -> bool:
        """Process RFID card transaction (validation + dispensing in one call)"""
        
        # Check if dispensing is allowed
        if not self.is_online and not self.config.get('offline_mode', False):
            self.logger.warning("Machine offline - dispensing not allowed")
            self.show_error("OFFLINE")
            return False
        
        self.logger.info(f"Processing RFID transaction for card: {card_id}")
        
        # Call unified API endpoint that handles validation and transaction
        transaction_data = {
            'cardNumber': card_id,
            'machineId': self.machine_id
        }
        
        result = self.api_request('/api/rfid/validate', 'POST', transaction_data)
        
        if result and result.get('success'):
            # Transaction was successful, now dispense tea
            self.logger.info("Card validated and balance deducted, dispensing tea...")
            self.show_status("DISPENSING")
            
            # Activate dispenser
            success = self.dispense_tea()
            
            if success:
                self.logger.info(f"Tea dispensed successfully. Remaining balance: ₹{result.get('remainingBalance', 'Unknown')}")
                self.daily_dispensed += 1
                self.total_dispensed += 1
                self.show_success()
                return True
            else:
                self.logger.error("Physical dispensing failed after successful payment")
                self.show_error("DISPENSE_FAIL")
                # Note: Money was already deducted, this is a hardware issue
                return False
        else:
            # Handle different error cases
            error_message = result.get('message', 'Unknown error') if result else 'No response from server'
            self.logger.warning(f"Transaction failed: {error_message}")
            
            if 'Invalid card' in error_message or 'Machine not found' in error_message:
                self.show_error("INVALID_CARD")
            elif 'Insufficient balance' in error_message:
                self.show_error("LOW_BALANCE")
            elif 'Machine is disabled' in error_message:
                self.show_error("MACHINE_DISABLED")
            else:
                self.show_error("TRANSACTION_FAILED")
            
            return False

    def dispense_tea(self) -> bool:
        """Control tea dispensing mechanism"""
        try:
            if GPIO_AVAILABLE:
                # Activate dispenser for configured time
                GPIO.output(self.config['gpio_pins']['dispenser'], GPIO.HIGH)
                time.sleep(self.config['dispense_time'])
                GPIO.output(self.config['gpio_pins']['dispenser'], GPIO.LOW)
            else:
                # Simulation mode
                self.logger.info(f"SIMULATION: Dispensing tea for {self.config['dispense_time']} seconds")
                time.sleep(self.config['dispense_time'])
            
            return True
        except Exception as e:
            self.logger.error(f"Dispensing error: {e}")
            return False

    def show_status(self, status: str):
        """Show status using LEDs and buzzer"""
        if not GPIO_AVAILABLE:
            self.logger.info(f"STATUS: {status}")
            return
            
        pins = self.config['gpio_pins']
        
        try:
            if status == "READY":
                GPIO.output(pins['led_green'], GPIO.HIGH)
                GPIO.output(pins['led_red'], GPIO.LOW)
            elif status == "DISPENSING":
                # Blink green LED
                for _ in range(3):
                    GPIO.output(pins['led_green'], GPIO.HIGH)
                    time.sleep(0.2)
                    GPIO.output(pins['led_green'], GPIO.LOW)
                    time.sleep(0.2)
            elif status == "ERROR":
                GPIO.output(pins['led_red'], GPIO.HIGH)
                GPIO.output(pins['led_green'], GPIO.LOW)
                # Buzzer beep
                GPIO.output(pins['buzzer'], GPIO.HIGH)
                time.sleep(0.1)
                GPIO.output(pins['buzzer'], GPIO.LOW)
        except Exception as e:
            self.logger.error(f"Status display error: {e}")

    def show_success(self):
        """Show success indication"""
        self.show_status("READY")
        if GPIO_AVAILABLE:
            try:
                # Success beep
                GPIO.output(self.config['gpio_pins']['buzzer'], GPIO.HIGH)
                time.sleep(0.05)
                GPIO.output(self.config['gpio_pins']['buzzer'], GPIO.LOW)
                time.sleep(0.05)
                GPIO.output(self.config['gpio_pins']['buzzer'], GPIO.HIGH)
                time.sleep(0.05)
                GPIO.output(self.config['gpio_pins']['buzzer'], GPIO.LOW)
            except Exception as e:
                self.logger.error(f"Success indication error: {e}")

    def show_error(self, error_type: str):
        """Show error indication"""
        self.logger.warning(f"Error indication: {error_type}")
        self.show_status("ERROR")
        time.sleep(2)
        self.show_status("READY")

    def send_heartbeat(self):
        """Send heartbeat to server"""
        data = {
            'machineId': self.machine_id,
            'status': 'online',
            'dailyDispensed': self.daily_dispensed,
            'totalDispensed': self.total_dispensed,
            'timestamp': datetime.now().isoformat()
        }
        
        result = self.api_request('/api/machines/heartbeat', 'POST', data)
        
        if result:
            self.is_online = True
            self.last_heartbeat = datetime.now()
            self.logger.debug("Heartbeat sent successfully")
        else:
            self.is_online = False
            self.logger.warning("Heartbeat failed")

    def read_rfid_card(self) -> Optional[str]:
        """Read RFID card"""
        if not self.rfid_reader:
            # Simulation mode - return test card
            return "1234567890"
        
        try:
            # Non-blocking read with timeout
            id, text = self.rfid_reader.read_no_block()
            if id:
                return str(id)
            return None
        except Exception as e:
            self.logger.error(f"RFID read error: {e}")
            return None

    def run(self):
        """Main machine control loop"""
        self.logger.info("Starting UrbanKetl machine...")
        
        # Show ready status
        self.show_status("READY")
        
        # Send initial heartbeat
        self.send_heartbeat()
        
        last_heartbeat_time = time.time()
        
        try:
            while True:
                current_time = time.time()
                
                # Send periodic heartbeat
                if current_time - last_heartbeat_time >= self.config['heartbeat_interval']:
                    self.send_heartbeat()
                    last_heartbeat_time = current_time
                
                # Read RFID card
                card_id = self.read_rfid_card()
                
                if card_id:
                    self.logger.info(f"RFID card detected: {card_id}")
                    
                    # Process transaction (validation + dispensing in one call)
                    success = self.process_rfid_transaction(card_id)
                    
                    if success:
                        self.logger.info("Transaction completed successfully")
                    else:
                        self.logger.warning("Transaction failed")
                    
                    # Wait before next read to avoid double-reads
                    time.sleep(2)
                
                # Short delay to prevent CPU overload
                time.sleep(0.1)
                
        except KeyboardInterrupt:
            self.logger.info("Machine shutdown requested")
        except Exception as e:
            self.logger.error(f"Unexpected error: {e}")
        finally:
            self.cleanup()

    def cleanup(self):
        """Cleanup resources"""
        self.logger.info("Cleaning up resources...")
        
        if GPIO_AVAILABLE:
            try:
                GPIO.cleanup()
            except Exception as e:
                self.logger.error(f"GPIO cleanup error: {e}")
        
        self.logger.info("UrbanKetl machine stopped")

if __name__ == "__main__":
    # Create and run the machine
    machine = UrbanKetlMachine()
    machine.run()