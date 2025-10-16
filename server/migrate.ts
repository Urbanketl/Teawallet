import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool } from '@neondatabase/serverless';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not found, skipping migrations');
    return;
  }

  console.log('🔄 Starting database migrations...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  // In production, the built file is in dist/, so migrations are one level up
  const migrationsPath = process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, '../migrations')
    : path.join(__dirname, '../migrations');
  
  console.log('Migrations path:', migrationsPath);
  
  try {
    await migrate(db, { migrationsFolder: migrationsPath });
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}
