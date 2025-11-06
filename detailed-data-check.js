// Detailed script to analyze all database data
import { db } from './src/db/index.js';
import { seniors, healthRecords, users, staffAssignments } from './src/db/schema.js';

async function detailedDataCheck() {
  try {
    console.log('🔍 DETAILED DATABASE ANALYSIS\n');
    console.log('=' .repeat(50));
    
    // 1. Analyze Users Table
    console.log('\n👤 USERS ANALYSIS:');
    const allUsers = await db.select().from(users);
    console.log(`Total Users: ${allUsers.length}`);
    
    if (allUsers.length > 0) {
      console.log('\nUser Details:');
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id} | Email: ${user.email} | Role: ${user.role} | Name: ${user.firstName} ${user.lastName}`);
      });
      
      // Count by role
      const roleCount = {};
      allUsers.forEach(user => {
        roleCount[user.role] = (roleCount[user.role] || 0) + 1;
      });
      console.log('\nUsers by Role:');
      Object.entries(roleCount).forEach(([role, count]) => {
        console.log(`  ${role}: ${count}`);
      });
    }
    
    // 2. Analyze Seniors Table
    console.log('\n👥 SENIORS ANALYSIS:');
    const allSeniors = await db.select().from(seniors);
    console.log(`Total Seniors: ${allSeniors.length}`);
    
    if (allSeniors.length > 0) {
      console.log('\nSenior Details:');
      allSeniors.forEach((senior, index) => {
        console.log(`${index + 1}. ID: ${senior.id} | Name: ${senior.firstName} ${senior.lastName} | Phone: ${senior.phone} | Status: ${senior.status}`);
      });
    }
    
    // 3. Analyze Health Records
    console.log('\n🏥 HEALTH RECORDS ANALYSIS:');
    const allHealthRecords = await db.select().from(healthRecords);
    console.log(`Total Health Records: ${allHealthRecords.length}`);
    
    // 4. Analyze Staff Assignments (if table exists)
    console.log('\n📋 STAFF ASSIGNMENTS ANALYSIS:');
    try {
      const allAssignments = await db.select().from(staffAssignments);
      console.log(`Total Staff Assignments: ${allAssignments.length}`);
      
      if (allAssignments.length > 0) {
        console.log('\nAssignment Details:');
        allAssignments.forEach((assignment, index) => {
          console.log(`${index + 1}. Staff ID: ${assignment.staffId} | Senior ID: ${assignment.seniorId} | Assigned: ${assignment.assignedAt}`);
        });
      }
    } catch (error) {
      console.log('Staff assignments table may not exist or be accessible');
    }
    
    // 5. Data Integrity Check
    console.log('\n🔍 DATA INTEGRITY CHECK:');
    
    // Check for staff users without assignments
    const staffUsers = allUsers.filter(user => user.role === 'staff');
    console.log(`Staff Users: ${staffUsers.length}`);
    
    // Check for admin users
    const adminUsers = allUsers.filter(user => user.role === 'admin');
    console.log(`Admin Users: ${adminUsers.length}`);
    
    // Check for users with unknown roles
    const unknownRoleUsers = allUsers.filter(user => !['admin', 'staff', 'senior'].includes(user.role));
    console.log(`Users with Unknown Roles: ${unknownRoleUsers.length}`);
    if (unknownRoleUsers.length > 0) {
      unknownRoleUsers.forEach(user => {
        console.log(`  - ${user.email}: "${user.role}"`);
      });
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Detailed analysis complete!');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    console.error('Stack:', error.stack);
  }
  process.exit(0);
}

detailedDataCheck();
