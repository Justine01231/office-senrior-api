// Check seniors table data
import { db } from './src/db/index.js';
import { seniors, users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

console.log('🔍 Checking seniors in database...\n');

try {
  const allSeniors = await db
    .select({
      seniorId: seniors.id,
      userId: seniors.userId,
      firstName: seniors.firstName,
      lastName: seniors.lastName,
      approvalStatus: seniors.approvalStatus,
      approvedAt: seniors.approvedAt,
      createdAt: seniors.createdAt,
      userIsActive: users.isActive,
      userRole: users.role
    })
    .from(seniors)
    .leftJoin(users, eq(seniors.userId, users.id));

  console.log(`📊 Found ${allSeniors.length} seniors:\n`);

  console.log('Senior ID | Name | Status | Active');
  console.log('---------|------|--------|-------');
  allSeniors.forEach(senior => {
    console.log(`${senior.seniorId} | ${senior.firstName} ${senior.lastName} | ${senior.approvalStatus} | ${senior.userIsActive}`);
  });

} catch (error) {
  console.error('❌ Error checking seniors:', error);
}

process.exit(0);
