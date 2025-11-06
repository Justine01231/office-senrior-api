// setup-demo-data.js - Script to set up demo data for staff coverage scenario
import { db } from './src/db/index.js';
import { users, staffAssignments } from './src/db/schema.js';
import { eq, and } from 'drizzle-orm';

async function setupDemoData() {
  console.log('🎭 Setting up Staff Coverage Demo Data...');
  
  try {
    // Find Dr. Rodriguez (staff user)
    const drRodriguez = await db.select()
      .from(users)
      .where(and(
        eq(users.role, 'staff'),
        eq(users.firstName, 'John'),
        eq(users.lastName, 'Rodriguez')
      ))
      .limit(1);

    if (!drRodriguez || drRodriguez.length === 0) {
      console.log('❌ Dr. Rodriguez not found. Creating demo staff...');
      
      // Create Dr. Rodriguez
      const [newStaff] = await db.insert(users)
        .values({
          username: 'dr_rodriguez',
          email: 'dr.rodriguez@office.gov',
          passwordHash: '$2b$10$example', // placeholder
          role: 'staff',
          firstName: 'John',
          lastName: 'Rodriguez',
          phone: '(555) 123-4567',
          isActive: true
        })
        .returning();
      
      console.log('✅ Created Dr. Rodriguez:', newStaff);
    }

    // Find Nurse Johnson (backup staff)
    const nurseJohnson = await db.select()
      .from(users)
      .where(and(
        eq(users.role, 'staff'),
        eq(users.firstName, 'Sarah'),
        eq(users.lastName, 'Johnson')
      ))
      .limit(1);

    if (!nurseJohnson || nurseJohnson.length === 0) {
      console.log('❌ Nurse Johnson not found. Creating backup staff...');
      
      // Create Nurse Johnson
      const [newBackup] = await db.insert(users)
        .values({
          username: 'nurse_johnson',
          email: 'nurse.johnson@office.gov',
          passwordHash: '$2b$10$example', // placeholder
          role: 'staff',
          firstName: 'Sarah',
          lastName: 'Johnson',
          phone: '(555) 987-6543',
          isActive: true
        })
        .returning();
      
      console.log('✅ Created Nurse Johnson:', newBackup);
    }

    // Find Maria Santos (senior)
    const mariaSantos = await db.select()
      .from(users)
      .where(and(
        eq(users.role, 'senior'),
        eq(users.firstName, 'Maria'),
        eq(users.lastName, 'Santos')
      ))
      .limit(1);

    if (!mariaSantos || mariaSantos.length === 0) {
      console.log('❌ Maria Santos not found. Demo requires existing senior.');
      return;
    }

    // Update staff assignment with backup staff
    const staffId = drRodriguez[0]?.id || (await db.select().from(users).where(eq(users.username, 'dr_rodriguez')).limit(1))[0].id;
    const backupId = nurseJohnson[0]?.id || (await db.select().from(users).where(eq(users.username, 'nurse_johnson')).limit(1))[0].id;
    const seniorId = mariaSantos[0].id;

    // Check if assignment exists
    const existingAssignment = await db.select()
      .from(staffAssignments)
      .where(and(
        eq(staffAssignments.staffId, staffId),
        eq(staffAssignments.seniorId, seniorId)
      ))
      .limit(1);

    if (existingAssignment && existingAssignment.length > 0) {
      // Update existing assignment with backup staff
      await db.update(staffAssignments)
        .set({
          backupStaffId: backupId,
          isPrimaryActive: true, // Start in normal state
          updatedAt: new Date()
        })
        .where(eq(staffAssignments.id, existingAssignment[0].id));
      
      console.log('✅ Updated existing assignment with backup staff');
    } else {
      // Create new assignment
      await db.insert(staffAssignments)
        .values({
          staffId: staffId,
          seniorId: seniorId,
          backupStaffId: backupId,
          isPrimaryActive: true,
          isActive: true,
          notes: 'Demo assignment for staff coverage scenario'
        });
      
      console.log('✅ Created new assignment with backup staff');
    }

    console.log('🎉 Demo data setup complete!');
    console.log('');
    console.log('📋 Demo Scenario Ready:');
    console.log('• Primary Staff: Dr. Rodriguez (John Rodriguez)');
    console.log('• Backup Staff: Nurse Johnson (Sarah Johnson)');
    console.log('• Senior: Maria Santos');
    console.log('• Assignment: Active with backup coverage');
    console.log('');
    console.log('🎭 To test: Long-press "My Seniors" in Staff Dashboard');

  } catch (error) {
    console.error('❌ Error setting up demo data:', error);
  }
}

// Run the setup
setupDemoData();
