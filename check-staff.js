// Check staff members in database
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL || 'postgresql://admin:cwIk9ohYw4HF4mf3EkW2BXe4Z8pd0hsD@dpg-d3ebu40gjchc738hn76g-a.oregon-postgres.render.com/office_seniors_db?sslmode=require';

const client = postgres(connectionString);
const db = drizzle(client);

async function checkStaff() {
  try {
    console.log('🔍 Checking staff members in database...\n');

    // Get all users with role 'staff'
    const staffMembers = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      assignedBy: users.assignedBy
    })
    .from(users)
    .where(eq(users.role, 'staff'));

    if (staffMembers.length === 0) {
      console.log('❌ No staff members found in database');
    } else {
      console.log(`✅ Found ${staffMembers.length} staff member(s):\n`);
      
      staffMembers.forEach((staff, index) => {
        console.log(`👤 Staff #${index + 1}:`);
        console.log(`   ID: ${staff.id}`);
        console.log(`   Name: ${staff.firstName} ${staff.lastName}`);
        console.log(`   Username: ${staff.username}`);
        console.log(`   Email: ${staff.email || 'Not provided'}`);
        console.log(`   Status: ${staff.isActive ? 'Active' : 'Inactive'}`);
        console.log(`   Created: ${staff.createdAt}`);
        console.log(`   Assigned by: ${staff.assignedBy}`);
        console.log('');
      });
    }

    // Also check total users count
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      role: users.role
    }).from(users);

    console.log(`📊 Total users in database: ${allUsers.length}`);
    
    const roleCount = {};
    allUsers.forEach(user => {
      roleCount[user.role] = (roleCount[user.role] || 0) + 1;
    });
    
    console.log('📈 Users by role:');
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`   ${role}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkStaff();
