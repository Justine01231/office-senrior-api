// Fresh start cleanup - Keep only admin user
import { db } from './src/db/index.js';
import { seniors, healthRecords, users, staffAssignments, benefits, contacts, enrollments, programs, refreshTokens, userAuditLog } from './src/db/schema.js';
import { ne, eq } from 'drizzle-orm';

async function freshStartCleanup() {
  try {
    console.log('🧹 FRESH START CLEANUP');
    console.log('=' .repeat(50));
    
    // Show current state
    console.log('\n📊 BEFORE CLEANUP:');
    const currentUsers = await db.select().from(users);
    const currentSeniors = await db.select().from(seniors);
    const currentHealthRecords = await db.select().from(healthRecords);
    
    console.log(`👤 Users: ${currentUsers.length}`);
    console.log(`👥 Seniors: ${currentSeniors.length}`);
    console.log(`🏥 Health Records: ${currentHealthRecords.length}`);
    
    // Show admin user (the one we'll keep)
    const adminUser = currentUsers.find(user => user.role === 'admin');
    if (adminUser) {
      console.log(`\n✅ Admin user to keep: ${adminUser.email} (ID: ${adminUser.id})`);
    } else {
      console.log('\n❌ No admin user found! This is a problem.');
      return;
    }
    
    console.log('\n🚨 STARTING CLEANUP...');
    
    // 1. Delete all health records
    console.log('🗑️  Deleting all health records...');
    await db.delete(healthRecords);
    
    // 2. Delete all staff assignments
    console.log('🗑️  Deleting all staff assignments...');
    try {
      await db.delete(staffAssignments);
    } catch (error) {
      console.log('   Staff assignments table may not exist yet');
    }
    
    // 3. Delete all benefits
    console.log('🗑️  Deleting all benefits...');
    try {
      await db.delete(benefits);
    } catch (error) {
      console.log('   Benefits table may not exist yet');
    }
    
    // 4. Delete all contacts
    console.log('🗑️  Deleting all contacts...');
    try {
      await db.delete(contacts);
    } catch (error) {
      console.log('   Contacts table may not exist yet');
    }
    
    // 5. Delete all enrollments
    console.log('🗑️  Deleting all enrollments...');
    try {
      await db.delete(enrollments);
    } catch (error) {
      console.log('   Enrollments table may not exist yet');
    }
    
    // 6. Delete all programs
    console.log('🗑️  Deleting all programs...');
    try {
      await db.delete(programs);
    } catch (error) {
      console.log('   Programs table may not exist yet');
    }
    
    // 7. Delete all refresh tokens
    console.log('🗑️  Deleting all refresh tokens...');
    try {
      await db.delete(refreshTokens);
    } catch (error) {
      console.log('   Refresh tokens table may not exist yet');
    }
    
    // 8. Delete all audit logs
    console.log('🗑️  Deleting all audit logs...');
    try {
      await db.delete(userAuditLog);
    } catch (error) {
      console.log('   User audit log table may not exist yet');
    }
    
    // 9. Delete all seniors
    console.log('🗑️  Deleting all seniors...');
    await db.delete(seniors);
    
    // 10. Delete all non-admin users (keep only admin)
    console.log('🗑️  Deleting all non-admin users...');
    await db.delete(users).where(ne(users.role, 'admin'));
    
    // Show final state
    console.log('\n📊 AFTER CLEANUP:');
    const finalUsers = await db.select().from(users);
    const finalSeniors = await db.select().from(seniors);
    const finalHealthRecords = await db.select().from(healthRecords);
    
    console.log(`👤 Users: ${finalUsers.length}`);
    console.log(`👥 Seniors: ${finalSeniors.length}`);
    console.log(`🏥 Health Records: ${finalHealthRecords.length}`);
    
    if (finalUsers.length === 1) {
      console.log(`\n✅ Remaining user: ${finalUsers[0].email} (${finalUsers[0].role})`);
    }
    
    console.log('\n🎉 FRESH START COMPLETE!');
    console.log('✅ Database is now clean with only admin user');
    console.log('🚀 Ready to test staff creation and senior management from scratch!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    console.error('Stack:', error.stack);
  }
  process.exit(0);
}

freshStartCleanup();
