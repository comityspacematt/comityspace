const db = require('../config/database');

async function checkTestingNP() {
  try {
    console.log('🔍 Checking Testing NP volunteers...');

    // Get Testing NP organization details
    const orgQuery = `SELECT * FROM organizations WHERE name ILIKE '%testing%'`;
    const orgResult = await db.query(orgQuery);

    if (orgResult.rows.length === 0) {
      console.log('❌ No Testing NP organization found!');
      return;
    }

    const testingOrg = orgResult.rows[0];
    console.log(`📋 Found organization: ${testingOrg.name} (ID: ${testingOrg.id})`);

    // Check whitelisted emails
    const whitelistQuery = `
      SELECT * FROM whitelisted_emails
      WHERE organization_id = $1
      ORDER BY email
    `;
    const whitelistResult = await db.query(whitelistQuery, [testingOrg.id]);

    console.log(`\n📧 Whitelisted emails for ${testingOrg.name}:`);
    for (const email of whitelistResult.rows) {
      let notes = 'No notes';
      if (email.notes) {
        try {
          const notesData = JSON.parse(email.notes);
          notes = `Name: ${notesData.firstName || 'N/A'} ${notesData.lastName || 'N/A'}`;
        } catch (e) {
          notes = `Plain text: ${email.notes}`;
        }
      }
      console.log(`   - ${email.email} (${email.role}) - ${notes}`);
    }

    // Check users
    const usersQuery = `
      SELECT * FROM users
      WHERE organization_id = $1
      ORDER BY email
    `;
    const usersResult = await db.query(usersQuery, [testingOrg.id]);

    console.log(`\n👥 User records for ${testingOrg.name}:`);
    for (const user of usersResult.rows) {
      console.log(`   - ${user.email}: "${user.first_name || 'N/A'} ${user.last_name || 'N/A'}" (ID: ${user.id})`);
    }

    // Check recent task assignments
    const assignmentsQuery = `
      SELECT
        t.title,
        ta.created_at,
        u.email,
        u.first_name,
        u.last_name
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      JOIN users u ON ta.user_id = u.id
      WHERE t.organization_id = $1
      ORDER BY ta.created_at DESC
      LIMIT 5
    `;
    const assignmentsResult = await db.query(assignmentsQuery, [testingOrg.id]);

    console.log(`\n📋 Recent task assignments for ${testingOrg.name}:`);
    for (const assignment of assignmentsResult.rows) {
      console.log(`   - "${assignment.title}" assigned to ${assignment.email} (${assignment.first_name || 'N/A'} ${assignment.last_name || 'N/A'})`);
    }

  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the check
checkTestingNP();