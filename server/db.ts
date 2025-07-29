import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for WebSocket support with fallback
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
  neonConfig.pipelineConnect = false;
  neonConfig.useSecureWebSocket = true;
  neonConfig.poolQueryViaFetch = true; // Use HTTP fallback
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = process.env.DATABASE_URL;

// Create a simpler, more stable pool configuration
export const pool = new Pool({ 
  connectionString,
  ssl: true,
  connectionTimeoutMillis: 20000,
  idleTimeoutMillis: 30000,
  max: 3
});

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Add connection event handlers
pool.on('connect', () => {
  console.log('Database pool connected');
});

export const db = drizzle({ client: pool, schema });