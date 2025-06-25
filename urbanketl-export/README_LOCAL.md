# UrbanKetl Local Setup

## Prerequisites
- Node.js 18+
- PostgreSQL
- Razorpay account (for payments)

## Setup Steps

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up PostgreSQL:
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql
   createdb urbanketl
   ```

3. Copy environment file:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. Set up database:
   ```bash
   npm run db:push
   ```

5. Seed test data:
   ```sql
   -- Connect to your database and run:
   INSERT INTO users (id, email, wallet_balance) 
   VALUES ('44064328', 'prasad.thirtha@gmail.com', 33.00);

   INSERT INTO rfid_cards (user_id, card_number, is_active) VALUES 
   ('44064328', 'RFID_44064328_001', true),
   ('44064328', 'RFID_TP_001234', true),
   ('44064328', 'RFID_44064328_002', true),
   ('44064328', 'RFID_44064328_003', true),
   ('44064328', 'RFID_44064328_004', true),
   ('44064328', 'RFID_44064328_005', true);
   ```

6. Start the server:
   ```bash
   npm run dev
   ```

7. Test the API:
   ```bash
   curl -X POST "http://localhost:5000/api/rfid/validate" \
     -H "Content-Type: application/json" \
     -d '{"cardNumber": "RFID_44064328_001", "machineId": "MACHINE_001", "teaType": "Green Tea", "amount": "5.00"}'
   ```

## Notes
- Authentication will be simplified for local development
- You'll need your own Razorpay credentials for payment testing
- Database schema is in shared/schema.ts
