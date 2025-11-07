// Script to manually fix missing columns in production database
import postgres from 'postgres';

const connectionString = 'postgresql://neondb_owner:npg_pzWl0hVNkiU4@ep-tiny-darkness-a1r56s6k-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = postgres(connectionString);

async function fixSchema() {
  try {
    console.log('🔧 Checking and fixing database schema...\n');
    
    // Check if phone column exists
    const phoneColumnCheck = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'phone'
    `;
    
    if (phoneColumnCheck.length === 0) {
      console.log('📱 Adding missing phone column...');
      await client`ALTER TABLE users ADD COLUMN phone VARCHAR(20)`;
      console.log('✅ Phone column added successfully');
    } else {
      console.log('✅ Phone column already exists');
    }
    
    // Check if gender column exists
    const genderColumnCheck = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'gender'
    `;
    
    if (genderColumnCheck.length === 0) {
      console.log('👤 Adding missing gender column...');
      await client`ALTER TABLE users ADD COLUMN gender VARCHAR(20)`;
      console.log('✅ Gender column added successfully');
    } else {
      console.log('✅ Gender column already exists');
    }
    
    // Check if department column exists
    const departmentColumnCheck = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'department'
    `;
    
    if (departmentColumnCheck.length === 0) {
      console.log('🏢 Adding missing department column...');
      await client`ALTER TABLE users ADD COLUMN department VARCHAR(50)`;
      console.log('✅ Department column added successfully');
    } else {
      console.log('✅ Department column already exists');
    }
    
    // Show current columns
    console.log('\n📊 Current users table columns:');
    const columns = await client`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `;
    
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    console.log('\n🎉 Schema fix completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

fixSchema();
