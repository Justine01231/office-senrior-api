// Reset Neon database with new schema
import postgres from 'postgres';

const connectionString = 'postgresql://neondb_owner:npg_pzWl0hVNkiU4@ep-tiny-darkness-a1r56s6k-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = postgres(connectionString);

async function resetDatabase() {
  try {
    console.log('🗑️ Dropping existing tables...\n');
    
    // Drop tables in correct order (handle foreign keys)
    await client`DROP TABLE IF EXISTS staff_assignments CASCADE`;
    await client`DROP TABLE IF EXISTS refresh_tokens CASCADE`;
    await client`DROP TABLE IF EXISTS user_audit_log CASCADE`;
    await client`DROP TABLE IF EXISTS enrollments CASCADE`;
    await client`DROP TABLE IF EXISTS health_records CASCADE`;
    await client`DROP TABLE IF EXISTS contacts CASCADE`;
    await client`DROP TABLE IF EXISTS seniors CASCADE`;
    await client`DROP TABLE IF EXISTS users CASCADE`;
    await client`DROP TABLE IF EXISTS programs CASCADE`;
    await client`DROP TABLE IF EXISTS benefits CASCADE`;
    
    console.log('✅ All tables dropped successfully!');
    console.log('🔄 Now run: bun run db:push');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

resetDatabase();
