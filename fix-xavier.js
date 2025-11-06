// Fix Xavier's isActive status
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

console.log('🔧 Fixing Xavier Santos isActive status...\n');

try {
  // Update Xavier's isActive to false since he's still pending approval
  const [updatedUser] = await db.update(users)
    .set({
      isActive: false,
      updatedAt: new Date()
    })
    .where(eq(users.id, 29))
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
    console.log('✅ Successfully updated Xavier Santos:');
    console.log(`ID: ${updatedUser.id}`);
    console.log(`Name: ${updatedUser.firstName} ${updatedUser.lastName}`);
    console.log(`Username: ${updatedUser.username}`);
    console.log(`Is Active: ${updatedUser.isActive}`);
    console.log(`Approval Status: ${updatedUser.approvalStatus}`);
    console.log(`Profile Completed: ${updatedUser.profileCompleted}`);
    console.log('\n🎯 Xavier should now show "Pending Admin Approval" status');
  } else {
    console.log('❌ Failed to update Xavier Santos');
  }

} catch (error) {
  console.error('❌ Error:', error);
}

process.exit(0);
