# AES Key Migration Guide

## Overview

This guide explains how to migrate existing plain AES keys in your production database to encrypted format using the `MASTER_KEY`.

## Background

- **Before**: RFID card AES keys stored as plain 32-character hex strings (e.g., `A3F2C8E7B9D4F1A6C5E8B2D7F3A9C6E1`)
- **After**: AES keys encrypted using MASTER_KEY and stored as IV + encrypted data (e.g., `7A3F2E...B4C9D8E1F2A3...`)

## Migration Strategy

The migration uses a **zero-downtime** approach:

1. ✅ **Backward compatibility is already active** - The system can read both plain and encrypted keys
2. ✅ **Migration script encrypts all plain keys** - One-time batch operation
3. ✅ **Cards continue working during migration** - No service interruption
4. ✅ **Safe to re-run** - Script is idempotent (skips already encrypted keys)

## Prerequisites

- `MASTER_KEY` environment variable must be set
- Database backup recommended (production safety)
- Low-traffic window recommended for production (optional but safer)

## Step-by-Step Instructions

### 1. First Run: Dry Run (Report Only)

Test the migration without making any changes:

```bash
npx tsx scripts/migrate-aes-keys.ts --dry-run
```

**Expected output:**
```
🔐 AES Key Migration Script
============================

🔍 DRY RUN MODE - No changes will be made

📊 Analyzing RFID cards...

Total cards: 150
✅ Already encrypted: 0
⚠️  Plain text keys: 150
❌ No AES key: 0

📋 DRY RUN COMPLETE: 150 cards would be encrypted.
Run without --dry-run to perform actual migration.
```

### 2. Production Migration

Once you're ready to migrate production:

```bash
npx tsx scripts/migrate-aes-keys.ts
```

**Expected output:**
```
🔐 AES Key Migration Script
============================

📊 Analyzing RFID cards...

Total cards: 150
✅ Already encrypted: 0
⚠️  Plain text keys: 150

🚀 Starting migration of 150 cards...
Processing in batches of 250

Processing batch 1 (cards 1-150)...
  ✓ Migrated 50 cards...
  ✓ Migrated 100 cards...
  ✓ Migrated 150 cards...

✅ Migration Complete!

📊 Final Statistics:
  • Successfully migrated: 150
  • Already encrypted (skipped): 0
  • Errors: 0

📊 Analyzing RFID cards...

Total cards: 150
✅ Already encrypted: 150
⚠️  Plain text keys: 0
```

### 3. Verification

After migration, verify the results:

```bash
npx tsx scripts/migrate-aes-keys.ts --dry-run
```

**Expected output:**
```
Total cards: 150
✅ Already encrypted: 150
⚠️  Plain text keys: 0

✅ All keys are already encrypted. Nothing to migrate!
```

## Migration Features

### Safety Features

1. **Idempotent**: Safe to run multiple times - skips already encrypted keys
2. **Batch processing**: Processes 250 cards at a time to avoid memory issues
3. **Error handling**: Continues on errors, reports failed cards at the end
4. **Zero downtime**: Backward compatibility allows cards to work before, during, and after migration
5. **Progress tracking**: Shows real-time progress every 50 cards
6. **Concurrency safe**: Uses conditional updates - won't overwrite keys modified during migration
7. **Auto-commit per card**: Each update commits immediately, minimizing impact of failures

### What Gets Migrated

- ✅ Cards with plain 32-character hex AES keys
- ⏭️ Cards with already encrypted keys (skipped)
- ⏭️ Cards without AES keys (skipped)

## Production Checklist

Before running in production:

- [ ] Verify `MASTER_KEY` is set correctly
- [ ] Take database backup
- [ ] Run dry-run mode to see what will be migrated
- [ ] Schedule during low-traffic window (optional but recommended)
- [ ] Monitor server logs during migration
- [ ] Verify all keys encrypted after migration

## Troubleshooting

### Error: "MASTER_KEY environment variable not set"

**Solution**: Ensure `MASTER_KEY` is set in your Replit Secrets:
1. Open Replit Secrets panel
2. Verify `MASTER_KEY` exists and has a value
3. Restart the migration script

### Migration shows errors

**Symptoms**: Some cards show errors during migration

**What to check**:
1. Check server logs for detailed error messages
2. Verify database connectivity
3. Check if specific cards have corrupted data
4. Re-run migration (will skip successful ones and retry failed ones)

### Migration completed but dry-run still shows plaintext keys

**Possible causes**:
1. Different database environment (dev vs production)
2. Migration didn't complete successfully (check for errors)
3. Database not committed (should auto-commit per batch)

**Solution**: Review migration output for errors, check database directly

## Performance

- **Small databases** (< 1,000 cards): ~1-2 seconds
- **Medium databases** (1,000-10,000 cards): ~5-30 seconds
- **Large databases** (10,000+ cards): ~1-5 minutes

Processing speed: ~500-1000 cards per second

## Post-Migration

After successful migration:

1. ✅ All new cards automatically encrypted (already implemented)
2. ✅ All existing cards now encrypted
3. ✅ Backward compatibility remains active (for safety)
4. ℹ️ Legacy key warnings in logs will disappear

## Rollback

If you need to rollback (NOT recommended):

1. Restore database from backup taken before migration
2. System will automatically detect plain keys and use them
3. Migration can be re-run later when ready

## Summary

```bash
# Step 1: Test (no changes)
npx tsx scripts/migrate-aes-keys.ts --dry-run

# Step 2: Migrate production
npx tsx scripts/migrate-aes-keys.ts

# Step 3: Verify
npx tsx scripts/migrate-aes-keys.ts --dry-run
```

**Total time**: 2-5 minutes for most databases
**Downtime**: None
**Reversible**: Yes (via database backup restore)
**Safe to re-run**: Yes (idempotent)
