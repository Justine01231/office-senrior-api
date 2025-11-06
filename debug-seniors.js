// Debug script to check seniors data
import { db } from './src/db/index.js';
import { users, seniors } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

console.log('🔍 Debugging seniors data...\n');

try {
  // Check all users with role 'senior'
  const allSeniorUsers = await db.select({
    id: users.id,
    username: users.username,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
    role: users.role,
    isActive: users.isActive,
    approvalStatus: users.approvalStatus,
    profileCompleted: users.profileCompleted,
    createdAt: users.createdAt
  })
  .from(users)
  .where(eq(users.role, 'senior'));

  console.log(`📊 Found ${allSeniorUsers.length} users with role 'senior':`);
  console.log('='.repeat(80));
  
  for (const user of allSeniorUsers) {
    console.log(`ID: ${user.id}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Username: ${user.username}`);
    console.log(`Email: ${user.email}`);
    console.log(`Is Active: ${user.isActive}`);
    console.log(`Approval Status: ${user.approvalStatus}`);
    console.log(`Profile Completed: ${user.profileCompleted}`);
    console.log(`Created: ${user.createdAt}`);
    console.log('-'.repeat(40));
  }

  // Check seniors table
  console.log('\n🏢 Checking seniors table...');
  const allSeniors = await db.select().from(seniors);
  console.log(`📊 Found ${allSeniors.length} records in seniors table:`);
  
  for (const senior of allSeniors) {
    console.log(`Senior ID: ${senior.id}, User ID: ${senior.userId}, Notes: ${senior.notes}`);
  }

  // Check specifically for pending seniors
  console.log('\n⏳ Checking PENDING seniors...');
  const pendingSeniors = await db
    .select({
      seniorId: seniors.id,
      userId: seniors.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      approvalStatus: users.approvalStatus,
      isActive: users.isActive,
      profileCompleted: users.profileCompleted
    })
    .from(seniors)
    .innerJoin(users, eq(seniors.userId, users.id))
    .where(eq(users.approvalStatus, 'pending'));

  console.log(`📋 Found ${pendingSeniors.length} pending seniors:`);
  for (const senior of pendingSeniors) {
    console.log(`- ${senior.firstName} ${senior.lastName} (User ID: ${senior.userId}, Senior ID: ${senior.seniorId})`);
    console.log(`  Status: ${senior.approvalStatus}, Active: ${senior.isActive}, Profile Complete: ${senior.profileCompleted}`);
  }

} catch (error) {
  console.error('❌ Error:', error);
}

process.exit(0);
