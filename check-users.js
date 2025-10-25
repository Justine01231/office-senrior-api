// Simple script to check users in database
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from './src/db/schema.ts';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_pzWl0hVNkiU4@ep-tiny-darkness-a1r56s6k-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = postgres(connectionString);
const db = drizzle(client);

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');
    
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      firstName: users.firstName,
      lastName: users.lastName,
      createdAt: users.createdAt
    }).from(users).orderBy(users.id);

    console.log(`📊 Found ${allUsers.length} users:\n`);
    
    allUsers.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email || 'N/A'}`);
      console.log(`Role: ${user.role}`);
      console.log(`Name: ${user.firstName} ${user.lastName}`);
      console.log(`Created: ${user.createdAt}`);
      console.log('-------------------');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

checkUsers();
