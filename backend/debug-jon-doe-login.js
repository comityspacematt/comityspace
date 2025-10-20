const db = require('./src/config/database');

async function checkJonDoeLogin() {
  try {
    console.log('🔍 Checking Jon Doe login data...');

    // Check Jon Doe in users table
    const userResult = await db.query(`
      SELECT id, email, first_name, last_name, organization_id, last_login, login_count, created_at
      FROM users
      WHERE email = 'jon@testing.np'
    `);

    console.log('\n👤 Jon Doe User Record:');
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log('  - ID:', user.id);
      console.log('  - Email:', user.email);
      console.log('  - Name:', user.first_name, user.last_name);
      console.log('  - Organization ID:', user.organization_id);
      console.log('  - Last Login:', user.last_login);
      console.log('  - Login Count:', user.login_count);
      console.log('  - Created At:', user.created_at);
      console.log('  - Raw JSON:', JSON.stringify(user, null, 2));
    } else {
      console.log('  ❌ No user record found for jon@testing.np');
    }

    // Check whitelisted_emails
    const whitelistResult = await db.query(`
      SELECT id, email, role, organization_id, is_active, created_at
      FROM whitelisted_emails
      WHERE email = 'jon@testing.np'
    `);

    console.log('\n📝 Jon Doe Whitelist Record:');
    if (whitelistResult.rows.length > 0) {
      const whitelist = whitelistResult.rows[0];
      console.log('  - ID:', whitelist.id);
      console.log('  - Email:', whitelist.email);
      console.log('  - Role:', whitelist.role);
      console.log('  - Organization ID:', whitelist.organization_id);
      console.log('  - Is Active:', whitelist.is_active);
      console.log('  - Created At:', whitelist.created_at);
    } else {
      console.log('  ❌ No whitelist record found for jon@testing.np');
    }

    // Check organization
    const orgResult = await db.query(`
      SELECT id, name FROM organizations WHERE id = 4
    `);

    console.log('\n🏢 Testing NP Organization:');
    if (orgResult.rows.length > 0) {
      const org = orgResult.rows[0];
      console.log('  - ID:', org.id);
      console.log('  - Name:', org.name);
    } else {
      console.log('  ❌ No organization found with ID 4');
    }

    // Check what admin dashboard sees
    const adminViewResult = await db.query(`
      SELECT
        u.id,
        w.email,
        u.first_name,
        u.last_name,
        u.phone,
        w.role,
        u.last_login,
        u.login_count,
        u.created_at,
        w.notes as admin_notes
      FROM whitelisted_emails w
      LEFT JOIN users u ON w.email = u.email AND u.organization_id = w.organization_id
      WHERE w.organization_id = 4 AND w.is_active = true AND w.email = 'jon@testing.np'
    `);

    console.log('\n📊 Admin Dashboard View of Jon Doe:');
    if (adminViewResult.rows.length > 0) {
      const adminView = adminViewResult.rows[0];
      console.log('  - User ID:', adminView.id);
      console.log('  - Email:', adminView.email);
      console.log('  - Name:', adminView.first_name, adminView.last_name);
      console.log('  - Role:', adminView.role);
      console.log('  - Last Login:', adminView.last_login);
      console.log('  - Login Count:', adminView.login_count);
      console.log('  - Is Active (login_count > 0):', adminView.login_count > 0);
      console.log('  - Raw JSON:', JSON.stringify(adminView, null, 2));
    } else {
      console.log('  ❌ No admin view record found for jon@testing.np');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkJonDoeLogin();