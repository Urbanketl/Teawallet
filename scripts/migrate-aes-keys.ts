import { db } from "../server/db";
import { rfidCards } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { encryptAESKey, isEncrypted } from "../server/utils/aes-key-crypto";

const BATCH_SIZE = 250;
const DRY_RUN = process.argv.includes('--dry-run');

interface MigrationStats {
  total: number;
  encrypted: number;
  plaintext: number;
  migrated: number;
  errors: number;
}

async function reportStatus(): Promise<MigrationStats> {
  console.log('\n📊 Analyzing RFID cards...\n');
  
  const allCards = await db
    .select({
      id: rfidCards.id,
      cardNumber: rfidCards.cardNumber,
      aesKeyEncrypted: rfidCards.aesKeyEncrypted,
    })
    .from(rfidCards);

  const stats: MigrationStats = {
    total: allCards.length,
    encrypted: 0,
    plaintext: 0,
    migrated: 0,
    errors: 0,
  };

  for (const card of allCards) {
    if (!card.aesKeyEncrypted) {
      continue;
    }

    if (isEncrypted(card.aesKeyEncrypted)) {
      stats.encrypted++;
    } else {
      stats.plaintext++;
    }
  }

  console.log(`Total cards: ${stats.total}`);
  console.log(`✅ Already encrypted: ${stats.encrypted}`);
  console.log(`⚠️  Plain text keys: ${stats.plaintext}`);
  console.log(`❌ No AES key: ${stats.total - stats.encrypted - stats.plaintext}\n`);

  return stats;
}

async function migrateKeys(): Promise<void> {
  console.log('🔐 AES Key Migration Script');
  console.log('============================\n');
  
  if (!process.env.MASTER_KEY) {
    console.error('❌ ERROR: MASTER_KEY environment variable not set!');
    console.error('Migration cannot proceed without MASTER_KEY.\n');
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  const initialStats = await reportStatus();

  if (initialStats.plaintext === 0) {
    console.log('✅ All keys are already encrypted. Nothing to migrate!\n');
    return;
  }

  if (DRY_RUN) {
    console.log(`\n📋 DRY RUN COMPLETE: ${initialStats.plaintext} cards would be encrypted.`);
    console.log('Run without --dry-run to perform actual migration.\n');
    return;
  }

  console.log(`\n🚀 Starting migration of ${initialStats.plaintext} cards...`);
  console.log(`Processing in batches of ${BATCH_SIZE}\n`);

  const cardsToMigrate = await db
    .select({
      id: rfidCards.id,
      cardNumber: rfidCards.cardNumber,
      aesKeyEncrypted: rfidCards.aesKeyEncrypted,
    })
    .from(rfidCards);

  let migrated = 0;
  let errors = 0;
  let skipped = 0;

  for (let i = 0; i < cardsToMigrate.length; i += BATCH_SIZE) {
    const batch = cardsToMigrate.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (cards ${i + 1}-${Math.min(i + BATCH_SIZE, cardsToMigrate.length)})...`);

    for (const card of batch) {
      if (!card.aesKeyEncrypted) {
        skipped++;
        continue;
      }

      if (isEncrypted(card.aesKeyEncrypted)) {
        skipped++;
        continue;
      }

      try {
        const plainKeySnapshot = card.aesKeyEncrypted;
        const encryptedKey = encryptAESKey(plainKeySnapshot);
        
        const result = await db
          .update(rfidCards)
          .set({ aesKeyEncrypted: encryptedKey })
          .where(
            and(
              eq(rfidCards.id, card.id),
              eq(rfidCards.aesKeyEncrypted, plainKeySnapshot)
            )
          )
          .returning({ id: rfidCards.id });

        if (result.length === 0) {
          skipped++;
          console.log(`  ⏭️  Card ${card.cardNumber} was modified concurrently, skipping...`);
        } else {
          migrated++;
          if (migrated % 50 === 0) {
            console.log(`  ✓ Migrated ${migrated} cards...`);
          }
        }
      } catch (error) {
        errors++;
        console.error(`  ❌ Error migrating card ${card.cardNumber}:`, error);
      }
    }
  }

  console.log('\n✅ Migration Complete!\n');
  console.log('📊 Final Statistics:');
  console.log(`  • Successfully migrated: ${migrated}`);
  console.log(`  • Already encrypted (skipped): ${skipped}`);
  console.log(`  • Errors: ${errors}`);
  console.log('');

  await reportStatus();
}

migrateKeys()
  .then(() => {
    console.log('✨ Script finished successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
