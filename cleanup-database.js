// Database cleanup and analysis script
import { db } from './src/db/index.js';
import { seniors, healthRecords, users, staffAssignments } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function cleanupDatabase() {
  try {
    console.log('🧹 DATABASE CLEANUP AND ANALYSIS\n');
    console.log('=' .repeat(60));
    
    // 1. Show current state
    console.log('\n📊 CURRENT DATABASE STATE:');
    
    const allUsers = await db.select().from(users);
    const allSeniors = await db.select().from(seniors);
    const allHealthRecords = await db.select().from(healthRecords);
    
    console.log(`👤 Users: ${allUsers.length}`);
    console.log(`👥 Seniors: ${allSeniors.length}`);
    console.log(`🏥 Health Records: ${allHealthRecords.length}`);
    
    // 2. Analyze users by role
    console.log('\n👤 USER BREAKDOWN:');
    const usersByRole = {};
    allUsers.forEach(user => {
      const role = user.role || 'undefined';
      usersByRole[role] = (usersByRole[role] || 0) + 1;
    });
    
    Object.entries(usersByRole).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`);
    });
    
    // 3. Show sample users
    console.log('\n📋 SAMPLE USERS:');
    allUsers.slice(0, 5).forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.role}) - ${user.firstName} ${user.lastName}`);
    });
    if (allUsers.length > 5) {
      console.log(`... and ${allUsers.length - 5} more users`);
    }
    
    // 4. Show all seniors
    console.log('\n👥 ALL SENIORS:');
    allSeniors.forEach((senior, index) => {
      console.log(`${index + 1}. ${senior.firstName} ${senior.lastName} - Phone: ${senior.phone} - Status: ${senior.status}`);
    });
    
    // 5. Check for staff assignments
    console.log('\n📋 STAFF ASSIGNMENTS CHECK:');
    try {
      const assignments = await db.select().from(staffAssignments);
      console.log(`Total assignments: ${assignments.length}`);
      if (assignments.length > 0) {
        assignments.forEach((assignment, index) => {
          console.log(`${index + 1}. Staff ${assignment.staffId} → Senior ${assignment.seniorId}`);
        });
      }
    } catch (error) {
      console.log('Staff assignments table may not exist yet');
    }
    
    // 6. Cleanup options
    console.log('\n🧹 CLEANUP OPTIONS:');
    console.log('1. Keep current data as-is');
    console.log('2. Remove test/duplicate users');
    console.log('3. Clean all data and start fresh');
    console.log('4. Remove only users with undefined roles');
    
    console.log('\n⚠️  To perform cleanup, modify this script and uncomment the desired cleanup section below:');
    
    // CLEANUP SECTION - UNCOMMENT WHAT YOU WANT TO DO:
    
    // Option 2: Remove users with undefined/null roles
    // const undefinedUsers = allUsers.filter(user => !user.role || user.role === 'undefined');
    // console.log(`\nRemoving ${undefinedUsers.length} users with undefined roles...`);
    // for (const user of undefinedUsers) {
    //   await db.delete(users).where(eq(users.id, user.id));
    //   console.log(`Removed: ${user.email}`);
    // }
    
    // Option 3: Clean ALL data (BE CAREFUL!)
    // console.log('\n🚨 CLEANING ALL DATA...');
    // await db.delete(healthRecords);
    // await db.delete(seniors);
    // await db.delete(users);
    // console.log('✅ All data cleaned!');
    
    // Option 4: Keep only admin and staff users
     const nonStaffUsers = allUsers.filter(user => !['admin', 'staff'].includes(user.role));
     console.log(`\nRemoving ${nonStaffUsers.length} non-staff users...`);
     for (const user of nonStaffUsers) {
      await db.delete(users).where(eq(users.id, user.id));
      console.log(`Removed: ${user.email} (${user.role})`);
     }
    
    console.log('\n✅ Analysis complete! Review the data above and decide what cleanup is needed.');
    console.log('💡 Tip: The 11 users might include test accounts, duplicates, or old schema data.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

cleanupDatabase();
