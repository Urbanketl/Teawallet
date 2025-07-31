-- UrbanKetl Test Data Cleanup Script
-- WARNING: This will remove ALL test data. Back up your database first!

-- Start transaction for safety
BEGIN;

-- 1. Remove test dispensing logs
DELETE FROM dispensing_logs 
WHERE created_at < '2025-08-01' 
   OR business_unit_id IN (
     SELECT id FROM users 
     WHERE email LIKE '%test%' 
        OR business_unit_name LIKE '%Test%'
   );

-- 2. Remove test transactions
DELETE FROM transactions 
WHERE created_at < '2025-08-01'
   OR user_id IN (
     SELECT id FROM users 
     WHERE email LIKE '%test%'
   );

-- 3. Remove test support tickets
DELETE FROM support_tickets 
WHERE created_at < '2025-08-01'
   OR user_id IN (
     SELECT id FROM users 
     WHERE email LIKE '%test%'
   );

-- 4. Delete test RFID cards (no transaction history exists)
DELETE FROM rfid_cards 
WHERE card_number LIKE 'RFID_UK_%' 
   OR card_number LIKE 'RFID_TEST_%'
   OR card_number LIKE 'RFID_%_00%'  -- Catches all test pattern cards
   OR business_unit_id IN (
     SELECT id FROM users 
     WHERE email LIKE '%test%'
   );

-- 5. Remove test business unit assignments
DELETE FROM user_business_unit_assignments 
WHERE business_unit_id IN (
  SELECT id FROM users 
  WHERE business_unit_name LIKE '%Test%' 
     OR business_unit_name IN ('Test BU', 'WALMART')
);

-- 6. Remove test tea machines
DELETE FROM tea_machines 
WHERE business_unit_id IN (
  SELECT id FROM users 
  WHERE business_unit_name LIKE '%Test%'
);

-- 7. (Merged with step 4 above)

-- 8. Remove test users (keeping structure for reference)
DELETE FROM users 
WHERE email LIKE '%test%' 
   OR email IN (
     'demo@urbanketl.com',
     'test@example.com'
   )
   OR business_unit_name LIKE '%Test%'
   OR business_unit_name = 'WALMART';

-- 9. Reset sequences if needed
-- ALTER SEQUENCE support_tickets_id_seq RESTART WITH 1;

-- 10. Clean up orphaned records
DELETE FROM business_unit_transfers 
WHERE from_user_id NOT IN (SELECT id FROM users)
   OR to_user_id NOT IN (SELECT id FROM users);

-- Show what will be affected
SELECT 'Users to be removed:' as info, COUNT(*) as count 
FROM users 
WHERE email LIKE '%test%' OR business_unit_name LIKE '%Test%';

SELECT 'Transactions to be removed:' as info, COUNT(*) as count 
FROM transactions 
WHERE created_at < '2025-08-01';

SELECT 'RFID cards to be deleted:' as info, COUNT(*) as count 
FROM rfid_cards 
WHERE card_number LIKE 'RFID_UK_%' 
   OR card_number LIKE 'RFID_TEST_%'
   OR card_number LIKE 'RFID_%_00%';

-- Commit or rollback based on review
-- COMMIT;
-- ROLLBACK;