// Fix missing senior profile for user ID 18
import { db } from './src/db/index.ts';
import { seniors, users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

console.log('🔧 Creating missing senior profile...');

try {
  // Get the user info
  const user = await db.select().from(users).where(eq(users.id, 18)).limit(1);
  
  if (user.length === 0) {
    console.log('❌ User not found');
    process.exit(1);
  }
  
  const userData = user[0];
  console.log('👤 User data:', userData);
  
  // Check if senior profile already exists
  const existingSenior = await db.select().from(seniors).where(eq(seniors.userId, 18)).limit(1);
  
  if (existingSenior.length > 0) {
    console.log('✅ Senior profile already exists');
    process.exit(0);
  }
  
  // Create senior profile
  const newSenior = await db.insert(seniors).values({
    userId: userData.id,
    firstName: userData.firstName,
    lastName: userData.lastName,
    phone: null,
    address: null,
    dateOfBirth: '1950-01-01', // Default date
    socialSecurity: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    photoPath: null,
    notes: 'Auto-created profile for existing user',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();
  
  console.log('✅ Created senior profile:', newSenior);
  
} catch (error) {
  console.error('❌ Error:', error);
}

process.exit(0);
