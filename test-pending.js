// Test the pending seniors endpoints
import { db } from './src/db/index.js';
import { users, seniors } from './src/db/schema.js';
import { eq, and } from 'drizzle-orm';

console.log('🧪 Testing pending seniors endpoints...\n');

try {
  // Test 1: Direct database query for pending seniors (what the backend should return)
  console.log('1️⃣ Testing direct database query for pending seniors:');
  const pendingSeniors = await db
    .select({
      seniorId: seniors.id,
      userId: seniors.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      address: users.address,
      dateOfBirth: users.dateOfBirth,
      gender: users.gender,
      emergencyContactName: users.emergencyContactName,
      emergencyContactPhone: users.emergencyContactPhone,
      approvalStatus: users.approvalStatus,
      createdAt: seniors.createdAt,
      userEmail: users.email,
      userUsername: users.username,
      userIsActive: users.isActive
    })
    .from(seniors)
    .innerJoin(users, eq(seniors.userId, users.id))
    .where(eq(users.approvalStatus, 'pending'));

  console.log(`📋 Found ${pendingSeniors.length} pending seniors:`);
  for (const senior of pendingSeniors) {
    console.log(`- ${senior.firstName} ${senior.lastName}`);
    console.log(`  User ID: ${senior.userId}, Senior ID: ${senior.seniorId}`);
    console.log(`  Email: ${senior.userEmail}, Username: ${senior.userUsername}`);
    console.log(`  Status: ${senior.approvalStatus}, Active: ${senior.userIsActive}`);
    console.log(`  Phone: ${senior.phone || 'Not provided'}`);
    console.log(`  Address: ${senior.address || 'Not provided'}`);
    console.log('');
  }

  // Test 2: Test the exact query used in the admin-approvals route
  console.log('2️⃣ Testing admin seniors filter query (status=pending):');
  const whereCondition = and(eq(users.role, 'senior'), eq(users.approvalStatus, 'pending'));
  
  const seniorsData = await db
    .select({
      seniorId: seniors.id,
      userId: seniors.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      address: users.address,
      dateOfBirth: users.dateOfBirth,
      gender: users.gender,
      emergencyContactName: users.emergencyContactName,
      emergencyContactPhone: users.emergencyContactPhone,
      approvalStatus: users.approvalStatus,
      createdAt: seniors.createdAt,
      userEmail: users.email,
      userUsername: users.username,
      userIsActive: users.isActive
    })
    .from(seniors)
    .innerJoin(users, eq(seniors.userId, users.id))
    .where(whereCondition);

  console.log(`📋 Admin filter query found ${seniorsData.length} seniors:`);
  for (const senior of seniorsData) {
    console.log(`- ${senior.firstName} ${senior.lastName} (${senior.approvalStatus})`);
  }

  // Test 3: Simulate the mapped response
  console.log('\n3️⃣ Testing mapped response format:');
  const mappedData = seniorsData.map(senior => ({
    id: senior.seniorId,
    userId: senior.userId,
    firstName: senior.firstName,
    lastName: senior.lastName,
    fullName: `${senior.firstName} ${senior.lastName}`,
    email: senior.userEmail,
    username: senior.userUsername,
    phone: senior.phone || 'Not provided',
    address: senior.address || 'Not provided',
    dateOfBirth: senior.dateOfBirth,
    gender: senior.gender || 'Not specified',
    emergencyContactName: senior.emergencyContactName || 'Not provided',
    emergencyContactPhone: senior.emergencyContactPhone || 'Not provided',
    approvalStatus: senior.approvalStatus,
    registeredAt: senior.createdAt,
    isActive: senior.userIsActive
  }));

  console.log('📋 Mapped data for frontend:');
  console.log(JSON.stringify(mappedData, null, 2));

} catch (error) {
  console.error('❌ Error:', error);
}

process.exit(0);
