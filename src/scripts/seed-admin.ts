// src/scripts/seed-admin.ts
import { db } from '../db/index';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

import bcrypt from 'bcryptjs';

async function seedAdmin() {
  try {
    console.log('🌱 Seeding admin user...');

    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.username, 'admin'))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash('admin123', 12);

    // Create admin user
    const adminUser = await db
      .insert(users)
      .values({
        username: 'admin',
        email: 'admin@officeseniors.gov',
        passwordHash,
        role: 'admin',
        firstName: 'System',
        lastName: 'Administrator',
        isActive: true,
        emailVerified: true,
      })
      .returning();

    console.log('✅ Admin user created successfully:', {
      id: adminUser[0].id,
      username: adminUser[0].username,
      role: adminUser[0].role,
    });

    console.log('📝 Admin credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
  }
}

// Run if called directly
if (require.main === module) {
  seedAdmin().then(() => {
    console.log('🎉 Seeding completed');
    process.exit(0);
  });
}

export { seedAdmin };
