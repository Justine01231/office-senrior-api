// Check Xavier's detailed status
import { db } from './src/db/index.js';
import { users, seniors } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

console.log('🔍 Checking Xavier Santos detailed status...\n');

try {
  // Check all users named Xavier
  const xavierUsers = await db.select()
    .from(users)
    .where(eq(users.username, 'xavier_santos'));

  console.log(`📊 Found ${xavierUsers.length} users with username 'xavier_santos':`);
  for (const user of xavierUsers) {
    console.log(`ID: ${user.id}`);
    console.log(`Username: ${user.username}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Is Active: ${user.isActive}`);
    console.log(`Approval Status: ${user.approvalStatus}`);
    console.log(`Profile Completed: ${user.profileCompleted}`);
    console.log(`Created: ${user.createdAt}`);
    console.log(`Updated: ${user.updatedAt}`);
    console.log('-'.repeat(50));
  }

  // Check what the backend API returns for different filters
  console.log('\n🔍 Testing backend API responses...\n');

  // Test pending filter
  const pendingQuery = await db
    .select({
      seniorId: seniors.id,
      userId: seniors.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      approvalStatus: users.approvalStatus,
      isActive: users.isActive
    })
    .from(seniors)
    .innerJoin(users, eq(seniors.userId, users.id))
    .where(eq(users.approvalStatus, 'pending'));

  console.log(`📋 PENDING filter query result: ${pendingQuery.length} seniors`);
  for (const senior of pendingQuery) {
    console.log(`- ${senior.firstName} ${senior.lastName} (Status: ${senior.approvalStatus}, Active: ${senior.isActive})`);
  }

  // Test approved filter
  const approvedQuery = await db
    .select({
      seniorId: seniors.id,
      userId: seniors.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      approvalStatus: users.approvalStatus,
      isActive: users.isActive
    })
    .from(seniors)
    .innerJoin(users, eq(seniors.userId, users.id))
    .where(eq(users.approvalStatus, 'approved'));

  console.log(`📋 APPROVED filter query result: ${approvedQuery.length} seniors`);
  for (const senior of approvedQuery) {
    console.log(`- ${senior.firstName} ${senior.lastName} (Status: ${senior.approvalStatus}, Active: ${senior.isActive})`);
  }

} catch (error) {
  console.error('❌ Error:', error);
}

process.exit(0);
