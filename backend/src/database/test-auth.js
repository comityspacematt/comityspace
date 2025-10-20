const axios = require('axios');

// Base URL for your API
const API_BASE = 'http://localhost:5000/api';

// Test credentials
const testCredentials = [
  {
    name: 'Super Admin',
    email: 'admin@comityspace.com',
    password: 'admin123',
    expectedType: 'super_admin'
  },
  {
    name: 'Red Cross Admin',
    email: 'admin@redcross.local',
    password: 'redcross123',
    expectedType: 'nonprofit_admin'
  },
  {
    name: 'Red Cross Volunteer (Sandy)',
    email: 'sandy@gmail.com',
    password: 'redcross123',
    expectedType: 'volunteer'
  },
  {
    name: 'Food Bank Admin',
    email: 'manager@foodbank.local',
    password: 'foodbank123',
    expectedType: 'nonprofit_admin'
  },
  {
    name: 'Food Bank Volunteer',
    email: 'helper@gmail.com',
    password: 'foodbank123',
    expectedType: 'volunteer'
  }
];

async function testLogin(credentials) {
  try {
    console.log(`\n🧪 Testing: ${credentials.name}`);
    console.log(`📧 Email: ${credentials.email}`);
    console.log(`🔑 Password: ${credentials.password}`);

    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: credentials.email,
      password: credentials.password
    });

    const { success, userType, user, tokens, message } = response.data;

    if (success) {
      console.log(`✅ Login successful!`);
      console.log(`👤 User Type: ${userType}`);
      console.log(`👤 Name: ${user.firstName || 'Not set'} ${user.lastName || 'Not set'}`);
      console.log(`🏢 Organization: ${user.organizationName || 'ComitySpace'}`);
      console.log(`🎭 Role: ${user.role}`);
      console.log(`💬 Message: ${message}`);
      
      // Check if user type matches expected
      if (userType === credentials.expectedType) {
        console.log(`✅ User type matches expected (${credentials.expectedType})`);
      } else {
        console.log(`⚠️  User type mismatch! Expected: ${credentials.expectedType}, Got: ${userType}`);
      }

      // Test getting user info with the token
      try {
        const meResponse = await axios.get(`${API_BASE}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`
          }
        });

        console.log(`✅ Token verification successful`);
        console.log(`📊 User ID: ${meResponse.data.user.id}`);

      } catch (tokenError) {
        console.log(`❌ Token verification failed: ${tokenError.message}`);
      }

    } else {
      console.log(`❌ Login failed: ${response.data.message}`);
    }

  } catch (error) {
    console.log(`❌ Login error: ${error.response?.data?.message || error.message}`);
  }
}

async function testEmailCheck() {
  console.log('\n🔍 Testing email whitelist checks...');
  
  const emailsToTest = [
    'sandy@gmail.com',
    'admin@redcross.local',
    'notwhitelisted@gmail.com'
  ];

  for (const email of emailsToTest) {
    try {
      console.log(`\n📧 Checking: ${email}`);
      const response = await axios.get(`${API_BASE}/auth/check-email/${email}`);
      
      if (response.data.allowed) {
        console.log(`✅ Email allowed - Organization: ${response.data.organization}, Role: ${response.data.role}`);
      } else {
        console.log(`❌ Email not allowed - ${response.data.message}`);
      }
    } catch (error) {
      console.log(`❌ Email check error: ${error.message}`);
    }
  }
}

async function runAllTests() {
  console.log('🚀 Starting ComitySpace Authentication Tests');
  console.log('=' .repeat(50));

  // Test server is running
  try {
    const healthResponse = await axios.get('http://localhost:5000/health');
    console.log('✅ Server is running');
    console.log(`📊 Server uptime: ${Math.round(healthResponse.data.uptime)}s`);
  } catch (error) {
    console.log('❌ Server is not running! Start it with: node server.js');
    return;
  }

  // Test email checking
  await testEmailCheck();

  // Test all login credentials
  console.log('\n🔐 Testing login credentials...');
  console.log('=' .repeat(50));

  for (const credentials of testCredentials) {
    await testLogin(credentials);
    
    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n🎉 Authentication testing complete!');
  console.log('\nNext steps:');
  console.log('1. Build the React login page');
  console.log('2. Create dashboard components');
  console.log('3. Add task management features');
}

// Handle axios dependency
async function checkDependencies() {
  try {
    require('axios');
  } catch (error) {
    console.log('❌ axios is not installed. Installing now...');
    console.log('Run this command: npm install axios');
    return false;
  }
  return true;
}

// Run the tests
async function main() {
  const hasAxios = await checkDependencies();
  if (hasAxios) {
    await runAllTests();
  }
}

main();