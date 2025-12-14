// src/db/index.ts
import 'dotenv/config'; // 👈 ADD THIS LINE
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Check if DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in .env file');
}

const connectionString = process.env.DATABASE_URL;

// Create postgres client with timeout settings
// Increased timeouts for Render deployment stability
const client = postgres(connectionString, {
  idle_timeout: 60, // 60 seconds idle timeout (was 20)
  max_lifetime: 60 * 60, // 1 hour max lifetime (was 30 minutes)
  connect_timeout: 30, // 30 seconds timeout for connection (was 10)
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Test database connection on startup
async function testConnection() {
  try {
    console.log('  Testing database connection...');
    const result = await client`SELECT 1 as test`;
    console.log('  Database connection successful!');
  } catch (error) {
    console.error('  Database connection failed:', error);
  }
}

// Test connection when module loads
testConnection();