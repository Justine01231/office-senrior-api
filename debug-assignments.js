// Debug assignments for staff ID 14
import { db } from './src/db/index.ts';
import { staffAssignments, users, seniors } from './src/db/schema.ts';
import { eq, and } from 'drizzle-orm';

console.log('🔍 Debugging assignments for staff ID 14...');

try {
  // Check staff assignments
  const assignments = await db.select().from(staffAssignments).where(eq(staffAssignments.staffId, 14));
  console.log('📋 Staff assignments:', JSON.stringify(assignments, null, 2));
  
  if (assignments.length > 0) {
    const seniorId = assignments[0].seniorId;
    console.log(`🔍 Checking senior ID: ${seniorId}`);
    
    // Check if senior user exists
    const seniorUser = await db.select().from(users).where(eq(users.id, seniorId));
    console.log('👤 Senior user:', JSON.stringify(seniorUser, null, 2));
    
    // Check if senior profile exists
    const seniorProfile = await db.select().from(seniors).where(eq(seniors.userId, seniorId));
    console.log('👴 Senior profile:', JSON.stringify(seniorProfile, null, 2));
    
    // Try the exact query from staff-dashboard.ts
    console.log('🔍 Testing the exact query from staff-dashboard...');
    const testQuery = await db
      .select({
        seniorId: seniors.id,
        seniorName: seniors.firstName,
        seniorLastName: seniors.lastName,
        seniorEmail: users.email,
        seniorIsActive: users.isActive,
        assignedAt: staffAssignments.assignedAt,
        assignmentId: staffAssignments.id
      })
      .from(staffAssignments)
      .innerJoin(users, eq(staffAssignments.seniorId, users.id))
      .innerJoin(seniors, eq(users.id, seniors.userId))
      .where(
        and(
          eq(staffAssignments.staffId, 14),
          eq(staffAssignments.isActive, true),
          eq(users.isActive, true)
        )
      );
    
    console.log('✅ Test query result:', JSON.stringify(testQuery, null, 2));
  }
  
} catch (error) {
  console.error('❌ Error:', error);
}

process.exit(0);
