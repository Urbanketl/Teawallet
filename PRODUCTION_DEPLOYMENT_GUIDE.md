# Production Deployment Guide for UrbanKetl

## Handling Test Data for Production

### Current Test Data Overview
Your database currently contains:
- Test business units (Ikea, Kulhad party, New Urban ketl, Test BU)
- Test users and admin accounts
- Test RFID cards (RFID_UK_001 through RFID_UK_012, etc.)
- Test transactions and dispensing logs
- Test support tickets and FAQs
- Test wallet balances and recharge history

### Production Data Migration Strategy

#### Option 1: Clean Slate Approach (Recommended)
Start fresh with a new production database:

1. **Export Schema Only**
   ```bash
   npm run db:generate  # Generates current schema
   ```

2. **Create Production Database**
   - Set up new production database on Neon
   - Update production DATABASE_URL
   - Run schema migrations on clean database

3. **Preserve Essential Configuration**
   - Export FAQs (can be reused)
   - Export tea machine configurations (without test data)
   - Document current system settings

#### Option 2: Selective Data Migration
Keep some reference data while removing test transactions:

1. **Clean Test Transactions**
   ```sql
   -- Remove test dispensing logs
   DELETE FROM dispensing_logs WHERE created_at < '2025-08-01';
   
   -- Reset wallet balances
   UPDATE users SET wallet_balance = 0;
   
   -- Clear transaction history
   DELETE FROM transactions WHERE created_at < '2025-08-01';
   
   -- Remove test support tickets
   DELETE FROM support_tickets WHERE created_at < '2025-08-01';
   ```

2. **Reset RFID Cards**
   ```sql
   -- Deactivate all test cards
   UPDATE rfid_cards SET is_active = false WHERE card_number LIKE 'RFID_UK_%';
   ```

3. **Clean Business Units**
   ```sql
   -- Remove test business units
   DELETE FROM user_business_unit_assignments;
   DELETE FROM tea_machines;
   DELETE FROM rfid_cards;
   DELETE FROM users WHERE email LIKE '%test%';
   ```

### Production Setup Checklist

#### 1. Environment Configuration
- [ ] Production DATABASE_URL configured
- [ ] Production Razorpay API keys
- [ ] Production Replit Auth configuration
- [ ] Secure session secrets
- [ ] Production domain configuration

#### 2. Initial Production Data
- [ ] Create super admin account
- [ ] Set up real business units
- [ ] Configure actual tea machines
- [ ] Create production RFID card batches
- [ ] Set production wallet limits

#### 3. Data Validation
- [ ] Verify no test emails remain
- [ ] Confirm no test card numbers
- [ ] Check for test business unit names
- [ ] Validate wallet balances are reset

### Database Backup Strategy

Before going to production:

1. **Backup Current Test Database**
   ```bash
   pg_dump $DATABASE_URL > urbanketl_test_backup_$(date +%Y%m%d).sql
   ```

2. **Create Schema-Only Backup**
   ```bash
   pg_dump $DATABASE_URL --schema-only > urbanketl_schema.sql
   ```

3. **Document Test Scenarios**
   - Export useful test cases
   - Document edge cases discovered
   - Save performance benchmarks

### Production Initialization Script

Create a script to set up initial production data:

```typescript
// scripts/init-production.ts
async function initializeProduction() {
  // 1. Create super admin
  const superAdmin = await createUser({
    email: 'admin@urbanketl.com',
    replitId: 'production_admin_id',
    firstName: 'System',
    lastName: 'Administrator',
    isSuperAdmin: true
  });

  // 2. Set system configuration
  await updateSystemSettings({
    maxWalletBalance: 10000,
    defaultTeaPrice: 25
  });

  // 3. Create initial FAQ entries
  await createProductionFAQs();
  
  console.log('Production environment initialized');
}
```

### Post-Migration Verification

1. **Data Integrity Checks**
   - No test user accounts remain
   - All RFID cards are production-ready
   - Transaction history is clean
   - Wallet balances are accurate

2. **Functionality Testing**
   - User authentication works
   - RFID validation functions
   - Payment processing active
   - Reports generate correctly

3. **Security Audit**
   - All test API keys removed
   - Production secrets configured
   - Session management secure
   - Database access restricted

### Rollback Plan

Keep test database backup for 30 days:
- Can reference test scenarios
- Validate production behavior
- Compare performance metrics
- Debug unexpected issues

### Best Practices

1. **Never mix test and production data**
2. **Always backup before migration**
3. **Test migration process in staging first**
4. **Document all production configurations**
5. **Set up monitoring before go-live**