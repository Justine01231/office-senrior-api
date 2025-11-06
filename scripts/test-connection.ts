// scripts/test-connection.ts
import postgres from 'postgres';

async function testPasswords() {
  const passwords = ['', 'postgres', 'admin', 'password', '123456'];
  
  for (const pwd of passwords) {
    try {
      console.log(`🔍 Testing password: "${pwd || '(empty)'}"`);
      
      const client = postgres(`postgresql://postgres:${pwd}@localhost:5432/postgres`, {
        connect_timeout: 5
      });
      
      await client`SELECT 1`;
      console.log(`✅ SUCCESS! Password is: "${pwd || '(empty)'}"`);
      console.log(`📝 Use this in your .env: postgresql://postgres:${pwd}@localhost:5432/office_seniors_local`);
      
      await client.end();
      return;
      
    } catch (error) {
      console.log(`❌ Failed with password: "${pwd || '(empty)'}"`);
    }
  }
  
  console.log('🚨 None of the common passwords worked. You may need to reset the password.');
}

testPasswords();
