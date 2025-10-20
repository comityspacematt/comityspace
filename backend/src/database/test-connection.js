const db = require('../config/database');

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    const result = await db.query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully!');
    console.log('🕐 Current time:', result.rows[0].current_time);
    
    // Test our tables exist
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tables created:');
    tables.rows.forEach(row => {
      console.log(`  • ${row.table_name}`);
    });
    
    // Test sample data - Super Admins
    const superAdmins = await db.query('SELECT id, email, first_name, last_name FROM super_admins');
    console.log('\n👑 Super Admins:');
    if (superAdmins.rows.length > 0) {
      superAdmins.rows.forEach(admin => {
        console.log(`  • ${admin.first_name} ${admin.last_name} (${admin.email})`);
      });
    } else {
      console.log('  • No super admins found');
    }
    
    // Test organizations
    const orgs = await db.query('SELECT id, name, description FROM organizations');
    console.log('\n🏢 Organizations:');
    if (orgs.rows.length > 0) {
      orgs.rows.forEach(org => {
        console.log(`  • ID ${org.id}: ${org.name}: ${org.description || 'No description'}`);
      });
    } else {
      console.log('  • No organizations found');
    }
    
    // Test whitelisted emails
    const whitelistQuery = await db.query(`
      SELECT w.email, w.role, o.name as org_name, w.is_active, w.organization_id
      FROM whitelisted_emails w 
      JOIN organizations o ON w.organization_id = o.id 
      ORDER BY o.name, w.role DESC
    `);
    console.log('\n📧 Whitelisted Emails:');
    if (whitelistQuery.rows.length > 0) {
      let currentOrg = '';
      whitelistQuery.rows.forEach(item => {
        if (item.org_name !== currentOrg) {
          console.log(`\n  📌 ${item.org_name} (ID: ${item.organization_id}):`);
          currentOrg = item.org_name;
        }
        console.log(`    • ${item.email} (${item.role}) - Active: ${item.is_active}`);
      });
    } else {
      console.log('  • No whitelisted emails found');
    }
    
    // Test users (actual logged in users)
    const users = await db.query('SELECT id, email, first_name, last_name, role, organization_id, login_count FROM users');
    console.log('\n👥 Active Users:');
    if (users.rows.length > 0) {
      users.rows.forEach(user => {
        console.log(`  • ${user.first_name || 'N/A'} ${user.last_name || 'N/A'} (${user.email}) - ${user.role} - Org: ${user.organization_id} - Logins: ${user.login_count}`);
      });
    } else {
      console.log('  • No active users found (users are created when they first login)');
    }

    // 🔍 VOLUNTEER DEBUG SECTION
    console.log('\n' + '='.repeat(60));
    console.log('🔍 DEBUGGING VOLUNTEER DIRECTORY ISSUE');
    console.log('='.repeat(60));

    // Debug Red Cross volunteers specifically
    console.log('\n📊 Red Cross Volunteer Debug (org_id = 1):');
    
    const redCrossWhitelist = await db.query(`
      SELECT id, email, role, is_active, notes, created_at 
      FROM whitelisted_emails 
      WHERE organization_id = 1 
      ORDER BY role DESC, email
    `);
    
    console.log(`\n📧 Whitelisted emails for Red Cross (${redCrossWhitelist.rows.length} found):`);
    redCrossWhitelist.rows.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.email} (${item.role}) - Active: ${item.is_active}`);
      if (item.notes) {
        console.log(`     Notes: ${item.notes}`);
      }
    });

    const redCrossUsers = await db.query(`
      SELECT id, email, first_name, last_name, role, login_count, last_login
      FROM users 
      WHERE organization_id = 1 
      ORDER BY role DESC, email
    `);
    
    console.log(`\n👥 Registered users for Red Cross (${redCrossUsers.rows.length} found):`);
    if (redCrossUsers.rows.length > 0) {
      redCrossUsers.rows.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} - ${user.first_name} ${user.last_name} (${user.role})`);
        console.log(`     Logins: ${user.login_count}, Last: ${user.last_login || 'Never'}`);
      });
    } else {
      console.log('  ⚠️  No registered users found for Red Cross!');
      console.log('  💡 This means volunteers are whitelisted but haven\'t logged in yet.');
    }

    // Test the exact admin dashboard query
    console.log('\n🔄 Testing Admin Dashboard Volunteer Query:');
    const dashboardQuery = `
      SELECT 
        w.id,
        w.email,
        w.role,
        w.notes,
        w.is_active,
        w.created_at,
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.phone,
        u.last_login,
        u.login_count
      FROM whitelisted_emails w
      LEFT JOIN users u ON w.email = u.email AND u.organization_id = w.organization_id
      WHERE w.organization_id = 1 AND w.is_active = true
      ORDER BY 
        CASE WHEN w.role = 'nonprofit_admin' THEN 1 ELSE 2 END,
        w.created_at DESC
    `;

    const dashboardResult = await db.query(dashboardQuery);
    
    console.log(`\n📋 Dashboard query returned ${dashboardResult.rows.length} volunteers:`);
    dashboardResult.rows.forEach((vol, index) => {
      console.log(`\n  ${index + 1}. ${vol.email} (${vol.role})`);
      console.log(`     ↳ Whitelist ID: ${vol.id}`);
      console.log(`     ↳ User ID: ${vol.user_id || 'NOT REGISTERED YET'}`);
      console.log(`     ↳ Name: ${vol.first_name || 'NULL'} ${vol.last_name || 'NULL'}`);
      console.log(`     ↳ Active: ${vol.is_active}`);
      console.log(`     ↳ Login Count: ${vol.login_count || 0}`);
      if (vol.notes) {
        console.log(`     ↳ Notes: ${vol.notes}`);
      }
    });

    // Check admin accounts
    console.log('\n🔑 Admin Account Check:');
    const adminCheck = await db.query(`
      SELECT u.id, u.email, u.organization_id, u.role
      FROM users u 
      WHERE u.role = 'nonprofit_admin'
      ORDER BY u.organization_id
    `);

    if (adminCheck.rows.length > 0) {
      adminCheck.rows.forEach(admin => {
        console.log(`  • ${admin.email} - Org ID: ${admin.organization_id} (Role: ${admin.role})`);
      });
    } else {
      console.log('  ⚠️  No nonprofit admins found in users table!');
    }

    console.log('\n' + '='.repeat(60));
    console.log('💡 DIAGNOSIS:');
    console.log('='.repeat(60));
    
    if (dashboardResult.rows.length === 0) {
      console.log('❌ No volunteers found in dashboard query!');
      console.log('   Check: Is your admin logged in with organization_id = 1?');
    } else {
      console.log('✅ Volunteers found in database query');
      const unregistered = dashboardResult.rows.filter(v => !v.user_id);
      if (unregistered.length > 0) {
        console.log(`⚠️  ${unregistered.length} volunteers haven't registered yet:`);
        unregistered.forEach(v => console.log(`   - ${v.email}`));
      }
    }

    // Test table counts
    const taskCount = await db.query('SELECT COUNT(*) FROM tasks');
    const docCount = await db.query('SELECT COUNT(*) FROM documents');
    const eventCount = await db.query('SELECT COUNT(*) FROM calendar_events');
    
    console.log('\n📊 Data Summary:');
    console.log(`  • Tasks: ${taskCount.rows[0].count}`);
    console.log(`  • Documents: ${docCount.rows[0].count}`);
    console.log(`  • Calendar Events: ${eventCount.rows[0].count}`);
    
    console.log('\n🎉 Database connection test complete!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await db.pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
testConnection();