#!/bin/bash
# Export UrbanKetl project for local development

echo "Creating project export..."

# Create export directory
mkdir -p urbanketl-export

# Copy main project files
cp -r client urbanketl-export/
cp -r server urbanketl-export/
cp -r shared urbanketl-export/
cp package.json urbanketl-export/
cp package-lock.json urbanketl-export/
cp vite.config.ts urbanketl-export/
cp tsconfig.json urbanketl-export/
cp tailwind.config.ts urbanketl-export/
cp postcss.config.js urbanketl-export/
cp components.json urbanketl-export/
cp drizzle.config.ts urbanketl-export/

# Create .env template
cat > urbanketl-export/.env.example << EOF
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/urbanketl

# Razorpay (get from https://dashboard.razorpay.com/)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Session
SESSION_SECRET=your_random_session_secret

# Auth (for local development - optional)
REPLIT_DB_URL=file:./local.db
EOF

# Create setup instructions
cat > urbanketl-export/README_LOCAL.md << EOF
# UrbanKetl Local Setup

## Prerequisites
- Node.js 18+
- PostgreSQL
- Razorpay account (for payments)

## Setup Steps

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Set up PostgreSQL:
   \`\`\`bash
   # macOS
   brew install postgresql
   brew services start postgresql
   createdb urbanketl
   \`\`\`

3. Copy environment file:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your database credentials
   \`\`\`

4. Set up database:
   \`\`\`bash
   npm run db:push
   \`\`\`

5. Seed test data:
   \`\`\`sql
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
   \`\`\`

6. Start the server:
   \`\`\`bash
   npm run dev
   \`\`\`

7. Test the API:
   \`\`\`bash
   curl -X POST "http://localhost:5000/api/rfid/validate" \\
     -H "Content-Type: application/json" \\
     -d '{"cardNumber": "RFID_44064328_001", "machineId": "MACHINE_001", "teaType": "Green Tea", "amount": "5.00"}'
   \`\`\`

## Notes
- Authentication will be simplified for local development
- You'll need your own Razorpay credentials for payment testing
- Database schema is in shared/schema.ts
EOF

echo "Export complete! Files are in urbanketl-export/"
echo "Follow README_LOCAL.md for setup instructions."