# Running UrbanKetl Locally

## Option 1: Use Replit's Public URL (Recommended)
The easiest way is to use the public Replit URL from your local machine:

```bash
# Replace localhost:5000 with the Replit URL
curl -X POST "https://workspace.prasadthirtha.repl.co/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "RFID_44064328_001",
    "machineId": "MACHINE_001",
    "teaType": "Green Tea",
    "amount": "5.00"
  }'
```

## Option 2: Download and Run Locally

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database
- Git

### Steps

1. **Download the project files** (since this is a Replit project)
2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables** in `.env`:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/urbanketl
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   SESSION_SECRET=your_session_secret
   ```

4. **Set up PostgreSQL database:**
   ```bash
   # Install PostgreSQL (macOS)
   brew install postgresql
   brew services start postgresql
   
   # Create database
   createdb urbanketl
   ```

5. **Run database migrations:**
   ```bash
   npm run db:push
   ```

6. **Start the server:**
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:5000`

### Database Setup
You'll need to recreate the database schema and data:

```sql
-- Create users table
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE,
  wallet_balance DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create rfid_cards table  
CREATE TABLE rfid_cards (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  card_number VARCHAR UNIQUE,
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMP,
  last_machine VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert test user
INSERT INTO users (id, email, wallet_balance) 
VALUES ('44064328', 'prasad.thirtha@gmail.com', 33.00);

-- Insert test RFID cards
INSERT INTO rfid_cards (user_id, card_number, is_active) VALUES 
('44064328', 'RFID_44064328_001', true),
('44064328', 'RFID_TP_001234', true),
('44064328', 'RFID_44064328_002', true),
('44064328', 'RFID_44064328_003', true),
('44064328', 'RFID_44064328_004', true),
('44064328', 'RFID_44064328_005', true);
```

## Option 3: Use Replit's Port Forwarding

If you're working in Replit, you can also access the dev server directly:
- The server runs on port 5000 inside Replit
- Access it via the webview or public URL
- For external access, always use the public Replit URL

## Testing Locally

Once running locally, you can use:

```bash
# Test balance
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{"cardNumber": "RFID_44064328_001", "machineId": "MACHINE_001", "teaType": "Green Tea", "amount": "0.01"}'

# Test dispensing
curl -X POST "http://localhost:5000/api/rfid/validate" \
  -H "Content-Type: application/json" \
  -d '{"cardNumber": "RFID_44064328_001", "machineId": "MACHINE_001", "teaType": "Green Tea", "amount": "5.00"}'
```

## Important Notes

- **Database**: You'll need to set up PostgreSQL locally and recreate the schema
- **Environment**: Replit provides built-in PostgreSQL, but locally you need your own
- **Authentication**: Replit Auth won't work locally - you'd need to implement alternative auth
- **Secrets**: You'll need your own Razorpay credentials for payment testing

**Recommended**: Use the public Replit URL for external testing rather than setting up locally, unless you need to modify the code.