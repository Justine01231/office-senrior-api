// Test staff creation API endpoint
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';

async function testStaffCreation() {
  try {
    console.log('🧪 Testing Staff Creation API...\n');

    // Step 1: Login as admin to get token
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    const loginData = await loginResponse.json();
    
    if (!loginData.success) {
      console.log('❌ Login failed:', loginData.message);
      return;
    }

    console.log('✅ Login successful');
    const token = loginData.token;

    // Step 2: Create a test staff member
    console.log('\n2️⃣ Creating test staff member...');
    const staffData = {
      username: 'teststaff',
      email: 'test@staff.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Staff'
    };

    const createResponse = await fetch(`${API_BASE}/staff/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(staffData)
    });

    const createData = await createResponse.json();
    
    console.log('📋 Staff Creation Response:');
    console.log(JSON.stringify(createData, null, 2));

    // Step 3: Get staff list
    console.log('\n3️⃣ Getting staff list...');
    const listResponse = await fetch(`${API_BASE}/staff/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const listData = await listResponse.json();
    
    console.log('📋 Staff List Response:');
    console.log(JSON.stringify(listData, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testStaffCreation();
