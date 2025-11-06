// Fix missing senior records
import { db } from './src/db/index.js';
import { users, seniors } from './src/db/schema.js';
import { eq, and, notInArray } from 'drizzle-orm';

console.log('🔧 Fixing missing senior records...');

try {
  // 1. Find all users with role 'senior'
  const seniorUsers = await db
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role
    })
    .from(users)
    .where(eq(users.role, 'senior'));

  console.log(`👥 Found ${seniorUsers.length} users with role 'senior':`);
  seniorUsers.forEach(user => {
    console.log(`  - ID: ${user.id}, Username: ${user.username}, Name: ${user.firstName} ${user.lastName}`);
  });

  // 2. Find existing senior records
  const existingSeniors = await db
    .select({
      userId: seniors.userId,
      id: seniors.id
    })
    .from(seniors);

  console.log(`\n📋 Found ${existingSeniors.length} existing senior records:`);
  existingSeniors.forEach(senior => {
    console.log(`  - Senior ID: ${senior.id}, User ID: ${senior.userId}`);
  });

  // 3. Find users who need senior records
  const existingUserIds = existingSeniors.map(s => s.userId);
  const missingUsers = seniorUsers.filter(user => !existingUserIds.includes(user.id));

  console.log(`\n❌ Missing senior records for ${missingUsers.length} users:`);
  missingUsers.forEach(user => {
    console.log(`  - User ID: ${user.id}, Username: ${user.username}`);
  });

  // 4. Create missing senior records
  if (missingUsers.length > 0) {
    console.log(`\n🔧 Creating ${missingUsers.length} missing senior records...`);
    
    for (const user of missingUsers) {
      const [newSenior] = await db
        .insert(seniors)
        .values({
          userId: user.id,
          notes: `Auto-created senior record for ${user.username}`
        })
        .returning();
      
      console.log(`✅ Created senior record: ID=${newSenior.id} for User ID=${user.id} (${user.username})`);
    }
  }

  // 5. Verify the fix
  console.log('\n🔍 Verification - All senior records:');
  const allSeniors = await db
    .select({
      seniorId: seniors.id,
      userId: seniors.userId,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName
    })
    .from(seniors)
    .innerJoin(users, eq(seniors.userId, users.id));

  allSeniors.forEach(senior => {
    console.log(`  ✅ Senior ID: ${senior.seniorId}, User ID: ${senior.userId}, Username: ${senior.username}`);
  });

  console.log('\n🎯 Fix completed successfully!');

} catch (error) {
  console.error('❌ Error fixing senior records:', error);
}

process.exit(0);
