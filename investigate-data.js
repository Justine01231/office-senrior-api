// Investigate data inconsistency
import { db } from './src/db/index.js';
import { seniors, users, staffAssignments } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

console.log('🔍 INVESTIGATING DATA INCONSISTENCY...\n');

try {
  // 1. Check all users with senior role
  console.log('1️⃣ USERS TABLE - Senior Role Users:');
  const seniorUsers = await db
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      isActive: users.isActive,
      createdAt: users.createdAt
    })
    .from(users)
    .where(eq(users.role, 'senior'));

  seniorUsers.forEach(user => {
    console.log(`   ${user.id}: ${user.firstName} ${user.lastName} (${user.username}) - Active: ${user.isActive}`);
  });

  // 2. Check seniors table
  console.log('\n2️⃣ SENIORS TABLE - All Records:');
  const allSeniors = await db
    .select({
      id: seniors.id,
      userId: seniors.userId,
      firstName: seniors.firstName,
      lastName: seniors.lastName,
      approvalStatus: seniors.approvalStatus,
      approvedAt: seniors.approvedAt
    })
    .from(seniors);

  allSeniors.forEach(senior => {
    console.log(`   ${senior.id}: ${senior.firstName} ${senior.lastName} (UserID: ${senior.userId}) - Status: ${senior.approvalStatus}`);
  });

  // 3. Check assignments for jacob osru
  console.log('\n3️⃣ ASSIGNMENTS - Jacob Osru History:');
  const jacobUser = seniorUsers.find(u => u.firstName === 'jacob' && u.lastName === 'osru');
  if (jacobUser) {
    const assignments = await db
      .select()
      .from(staffAssignments)
      .where(eq(staffAssignments.seniorId, jacobUser.id));
    
    console.log(`   Jacob User ID: ${jacobUser.id}`);
    console.log(`   Assignments found: ${assignments.length}`);
    assignments.forEach(assignment => {
      console.log(`   - Assignment ID: ${assignment.id}, Staff ID: ${assignment.staffId}, Assigned: ${assignment.assignedAt}`);
    });
  }

  // 4. Find missing senior records
  console.log('\n4️⃣ MISSING SENIOR RECORDS:');
  const seniorUserIds = allSeniors.map(s => s.userId);
  const missingUsers = seniorUsers.filter(user => !seniorUserIds.includes(user.id));
  
  if (missingUsers.length > 0) {
    console.log('   Missing from seniors table:');
    missingUsers.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (User ID: ${user.id})`);
    });
  } else {
    console.log('   No missing records found');
  }

} catch (error) {
  console.error('❌ Error investigating data:', error);
}

process.exit(0);
