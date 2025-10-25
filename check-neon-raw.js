// Check raw Neon database structure
import postgres from 'postgres';

const connectionString = 'postgresql://neondb_owner:npg_pzWl0hVNkiU4@ep-tiny-darkness-a1r56s6k-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = postgres(connectionString);

async function checkDatabase() {
  try {
    console.log('🔍 Checking Neon database structure...\n');
    
    // Check PostgreSQL version
    const version = await client`SELECT version()`;
    console.log('📊 PostgreSQL Version:', version[0].version);
    
    // List all tables
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('\n📋 Tables:', tables.map(t => t.table_name));
    
    // Check users table structure if it exists
    if (tables.some(t => t.table_name === 'users')) {
      const columns = await client`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' AND table_schema = 'public'
        ORDER BY ordinal_position
      `;
      console.log('\n👥 Users table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabase();
