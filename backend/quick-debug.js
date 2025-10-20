const db = require('./src/config/database');

async function quickDebug() {
  try {
    console.log('🔍 Quick Volunteer Debug...\n');

    // Check connection
    await db.query('SELECT NOW()');
    console.log('✅ Database connected\n');

    // Check organizations
    const orgs = await db.query('SELECT id, name FROM organizations');
    console.log('🏢 Organizations:');
    orgs.rows.forEach(org => console.log(`  ${org.id}: ${org.name}`));

    // Check Red Cross whitelisted emails
    console.log('\n📧 Red Cross Whitelisted Emails:');
    const whitelist = await db.query(`
      SELECT email, role, is_active 
      FROM whitelisted_emails 
      WHERE organization_id = 1
    `);
    whitelist.rows.forEach(w => console.log(`  • ${w.email} (${w.role}) - Active: ${w.is_active}`));

    // Check Red Cross registered users
    console.log('\n👥 Red Cross Registered Users:');
    const users = await db.query(`
      SELECT email, first_name, last_name, role, login_count 
      FROM users 
      WHERE organization_id = 1
    `);
    if (users.rows.length > 0) {
      users.rows.forEach(u => console.log(`  • ${u.email} - ${u.first_name} ${u.last_name} (${u.login_count} logins)`));
    } else {
      console.log('  ⚠️  No registered users found!');
    }

    // Test admin dashboard query
    console.log('\n🔄 Admin Dashboard Query Result:');
    const dashboard = await db.query(`
      SELECT w.email, w.role, u.first_name, u.last_name, u.id as user_id
      FROM whitelisted_emails w
      LEFT JOIN users u ON w.email = u.email AND u.organization_id = w.organization_id
      WHERE w.organization_id = 1 AND w.is_active = true
    `);
    
    console.log(`Found ${dashboard.rows.length} volunteers:`);
    dashboard.rows.forEach((v, i) => {
      console.log(`  ${i+1}. ${v.email} (${v.role})`);
      console.log(`     User ID: ${v.user_id || 'NOT REGISTERED'}`);
      console.log(`     Name: ${v.first_name || 'NULL'} ${v.last_name || 'NULL'}`);
    });

    console.log('\n💡 DIAGNOSIS:');
    if (dashboard.rows.length === 0) {
      console.log('❌ No volunteers found - check organization_id!');
    } else {
      const unregistered = dashboard.rows.filter(v => !v.user_id);
      if (unregistered.length > 0) {
        console.log(`⚠️  ${unregistered.length} volunteers haven't registered yet`);
        console.log('   This is likely why they don\'t show up in the admin interface!');
      } else {
        console.log('✅ All volunteers are registered');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.pool.end();
    process.exit(0);
  }
}

quickDebug();