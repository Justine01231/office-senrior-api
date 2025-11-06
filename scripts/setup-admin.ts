// scripts/setup-admin.ts
import 'dotenv/config';
import { db } from '../src/db';
import { users } from '../src/db/schema';

async function createAdminUser() {
  try {
    console.log('🔧 Setting up admin user...');
    
    // Hash the password using Bun's built-in password hashing
    const hashedPassword = await Bun.password.hash('admin123');
    
    // Insert admin user
    const [admin] = await db.insert(users).values({
      username: 'admin',
      email: 'admin@officeseniors.gov',
      passwordHash: hashedPassword,
      role: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
      isActive: true,
      profileCompleted: true,
      emailVerified: true,
      approvalStatus: 'approved'
    }).returning();
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Username: admin');
    console.log('🔑 Password: admin123');
    console.log('👤 User ID:', admin?.id || 'Created successfully');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    process.exit(0);
  }
}

createAdminUser();
