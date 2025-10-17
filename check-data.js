// Quick script to check database data
import { db } from './src/db/index.js';
import { seniors, healthRecords, users } from './src/db/schema.js';

async function checkData() {
  try {
    console.log('📊 Checking database data...\n');
    
    // Count seniors
    const seniorCount = await db.select().from(seniors);
    console.log(`👥 Seniors: ${seniorCount.length}`);
    if (seniorCount.length > 0) {
      console.log('   Sample:', seniorCount[0].firstName, seniorCount[0].lastName);
    }
    
    // Count health records
    const healthCount = await db.select().from(healthRecords);
    console.log(`🏥 Health Records: ${healthCount.length}`);
    
    // Count users
    const userCount = await db.select().from(users);
    console.log(`👤 Users: ${userCount.length}`);
    
    console.log('\n✅ Data check complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

checkData();
