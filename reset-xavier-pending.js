// Reset Xavier to pending status
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

console.log('🔧 Resetting Xavier to pending status...\n');

try {
  // Update Xavier to pending status
  const [updatedUser] = await db.update(users)
    .set({
      isActive: false,
      approvalStatus: 'pending',
      updatedAt: new Date()
    })
    .where(eq(users.username, 'xavier_santos'))
    .returning({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      isActive: users.isActive,
      approvalStatus: users.approvalStatus,
      profileCompleted: users.profileCompleted
    });

  if (updatedUser) {
    console.log('✅ Successfully reset Xavier Santos:');
    console.log(`ID: ${updatedUser.id}`);
    console.log(`Name: ${updatedUser.firstName} ${updatedUser.lastName}`);
    console.log(`Username: ${updatedUser.username}`);
    console.log(`Is Active: ${updatedUser.isActive}`);
    console.log(`Approval Status: ${updatedUser.approvalStatus}`);
    console.log(`Profile Completed: ${updatedUser.profileCompleted}`);
    console.log('\n🎯 Xavier is now PENDING and should show Accept/Decline buttons');
  } else {
    console.log('❌ Failed to update Xavier Santos');
  }

} catch (error) {
  console.error('❌ Error:', error);
}

process.exit(0);
