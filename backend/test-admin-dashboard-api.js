const axios = require('axios');

async function testAdminDashboardAPI() {
  try {
    console.log('🔍 Testing admin dashboard API...');

    // First, login to get auth token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@testing.np', // Testing NP admin
      password: 'password'
    });

    const token = loginResponse.data.token;
    console.log('✅ Got auth token for admin');

    // Then call admin dashboard API
    const dashboardResponse = await axios.get('http://localhost:5000/api/admin/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('\n📊 Admin Dashboard API Response:');
    console.log('Success:', dashboardResponse.data.success);
    console.log('Organization:', dashboardResponse.data.data.organization);

    console.log('\n👥 Volunteers Data:');
    const volunteers = dashboardResponse.data.data.volunteers || [];
    console.log('Volunteer count:', volunteers.length);

    volunteers.forEach((volunteer, index) => {
      console.log(`\nVolunteer ${index + 1}:`);
      console.log('  - ID:', volunteer.id);
      console.log('  - Email:', volunteer.email);
      console.log('  - Name:', volunteer.first_name, volunteer.last_name);
      console.log('  - Role:', volunteer.role);
      console.log('  - Last Login:', volunteer.last_login);
      console.log('  - Login Count:', volunteer.login_count);
      console.log('  - Is Active (has user_id):', volunteer.user_id ? 'Yes' : 'No');
      if (volunteer.email === 'jon@testing.np') {
        console.log('  🎯 FOUND JON DOE - Raw data:', JSON.stringify(volunteer, null, 2));
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAdminDashboardAPI();
