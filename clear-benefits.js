import 'dotenv/config';
import { db } from './src/db/index.ts';
import { benefits } from './src/db/schema.ts';

async function main() {
  console.log('⚠️  WARNING: This will DELETE ALL benefits from the database!');
  console.log('');
  
  // Count current benefits
  const currentBenefits = await db.select().from(benefits);
  const total = currentBenefits.length;
  
  if (total === 0) {
    console.log('✅ No benefits found in database. Already clean!');
    return;
  }
  
  console.log(`📊 Found ${total} benefit(s) in database.`);
  console.log('');
  console.log('🗑️  Proceeding to delete all benefits...');
  
  try {
    // Delete all benefits
    const deleted = await db.delete(benefits).returning();
    
    console.log('');
    console.log(`✅ Successfully deleted ${deleted.length} benefit(s).`);
    console.log('🧹 Database is now clean (no benefits).');
  } catch (err) {
    console.error('❌ Failed to delete benefits:', err);
    process.exitCode = 1;
  }
}

main();
