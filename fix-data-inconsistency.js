// Fix data inconsistency issues
import { db } from './src/db/index.js';
import { seniors, users, staffAssignments } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

console.log('🔧 FIXING DATA INCONSISTENCY ISSUES...\n');

try {
  // 1. Find users with senior role but no senior record
  const seniorUsers = await db
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      isActive: users.isActive
    })
    .from(users)
    .where(eq(users.role, 'senior'));

  const existingSeniors = await db
    .select({ userId: seniors.userId })
    .from(seniors);

  const existingUserIds = existingSeniors.map(s => s.userId);
  const missingUsers = seniorUsers.filter(user => !existingUserIds.includes(user.id));

  console.log(`Found ${missingUsers.length} users missing senior records:`);
  
  // 2. Create missing senior records
  for (const user of missingUsers) {
    console.log(`Creating senior record for: ${user.firstName} ${user.lastName}`);
    
    await db.insert(seniors).values({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: 'Not provided',
      address: 'Not provided',
      dateOfBirth: '1950-01-01', // Default date
      approvalStatus: 'approved', // Set as approved since they're already in system
      approvedBy: 1, // Admin user ID
      approvedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log(`✅ Created senior record for ${user.firstName} ${user.lastName}`);
  }

  // 3. Fix jacob osru status (he should be approved since he has assignments)
  const jacobUser = seniorUsers.find(u => u.firstName === 'jacob' && u.lastName === 'osru');
  if (jacobUser) {
    // Check if jacob has assignments
    const assignments = await db
      .select()
      .from(staffAssignments)
      .where(eq(staffAssignments.seniorId, jacobUser.id));

    if (assignments.length > 0) {
      console.log(`\n🔄 Jacob has ${assignments.length} assignments, fixing his status to approved...`);
      
      await db
        .update(seniors)
        .set({
          approvalStatus: 'approved',
          approvedBy: 1,
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(seniors.userId, jacobUser.id));
      
      console.log('✅ Fixed jacob osru status to approved');
    }
  }

  console.log('\n🎉 Data inconsistency fixes completed!');
  console.log('\nRun the app again to see all 5 seniors properly displayed.');

} catch (error) {
  console.error('❌ Error fixing data:', error);
}

process.exit(0);
