const db = require('./src/config/database');

async function checkAdminUser() {
  try {
    console.log('🔍 Checking admin users and their organizations...');

    // Check all users and their organizations
    const usersResult = await db.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.organization_id, o.name as org_name
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      ORDER BY u.organization_id, u.email
    `);

    console.log('\n👥 All Users:');
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id}) -> Org: ${user.org_name} (ID: ${user.organization_id})`);
    });

    // Check whitelisted_emails table for admin roles
    const adminResult = await db.query(`
      SELECT w.email, w.role, w.organization_id, o.name as org_name
      FROM whitelisted_emails w
      LEFT JOIN organizations o ON w.organization_id = o.id
      WHERE w.role = 'nonprofit_admin'
      ORDER BY w.organization_id, w.email
    `);

    console.log('\n🔑 Admin Users (from whitelisted_emails):');
    adminResult.rows.forEach(admin => {
      console.log(`  - ${admin.email} (Role: ${admin.role}) -> Org: ${admin.org_name} (ID: ${admin.organization_id})`);
    });

    // Check documents for Testing NP (org ID 4)
    const testingNpDocs = await db.query(`
      SELECT title, description, category, is_pinned, created_at
      FROM documents
      WHERE organization_id = 4
      ORDER BY created_at DESC
    `);

    console.log('\n📄 Documents for Testing NP (ID: 4):');
    if (testingNpDocs.rows.length === 0) {
      console.log('  - No documents found');
    } else {
      testingNpDocs.rows.forEach(doc => {
        console.log(`  - Title: ${doc.title}`);
        console.log(`    Description: ${doc.description || 'None'}`);
        console.log(`    Category: ${doc.category || 'None'}`);
        console.log(`    Pinned: ${doc.is_pinned}`);
        console.log(`    Created: ${doc.created_at}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkAdminUser();