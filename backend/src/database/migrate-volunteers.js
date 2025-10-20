const db = require('../config/database');

async function migrateVolunteersToUsers() {
  try {
    console.log('🔄 Starting volunteer migration...');

    // Find all whitelisted emails that don't have corresponding user records
    const query = `
      SELECT w.*, o.name as org_name
      FROM whitelisted_emails w
      JOIN organizations o ON w.organization_id = o.id
      LEFT JOIN users u ON w.email = u.email AND w.organization_id = u.organization_id
      WHERE u.id IS NULL AND w.is_active = true
      ORDER BY o.name, w.email
    `;

    const result = await db.query(query);
    const volunteersToMigrate = result.rows;

    console.log(`📋 Found ${volunteersToMigrate.length} volunteers without user records:`);

    if (volunteersToMigrate.length === 0) {
      console.log('✅ All volunteers already have user records!');
      return;
    }

    for (const volunteer of volunteersToMigrate) {
      console.log(`\n👤 Processing ${volunteer.email} (${volunteer.org_name})...`);

      // Extract name from notes if available
      let firstName = null;
      let lastName = null;

      if (volunteer.notes) {
        try {
          const notesData = JSON.parse(volunteer.notes);
          firstName = notesData.firstName || null;
          lastName = notesData.lastName || null;
          console.log(`   📝 Extracted from notes: ${firstName || 'N/A'} ${lastName || 'N/A'}`);
        } catch (e) {
          console.log('   ⚠️  Notes not in JSON format, skipping name extraction');
        }
      }

      // Create user record
      const createUserQuery = `
        INSERT INTO users (email, organization_id, role, first_name, last_name, login_count, profile_completed)
        VALUES ($1, $2, $3, $4, $5, 0, false)
        RETURNING *
      `;

      try {
        const userResult = await db.query(createUserQuery, [
          volunteer.email,
          volunteer.organization_id,
          volunteer.role,
          firstName,
          lastName
        ]);

        const newUser = userResult.rows[0];
        console.log(`   ✅ Created user record: ID ${newUser.id}, Name: "${newUser.first_name || 'N/A'} ${newUser.last_name || 'N/A'}"`);
      } catch (error) {
        console.log(`   ❌ Failed to create user: ${error.message}`);
      }
    }

    console.log('\n🎉 Migration complete!');

    // Verify the migration
    const verifyQuery = `
      SELECT
        o.name as org_name,
        COUNT(w.id) as total_volunteers,
        COUNT(u.id) as volunteers_with_users
      FROM whitelisted_emails w
      JOIN organizations o ON w.organization_id = o.id
      LEFT JOIN users u ON w.email = u.email AND w.organization_id = u.organization_id
      WHERE w.is_active = true
      GROUP BY o.id, o.name
      ORDER BY o.name
    `;

    const verifyResult = await db.query(verifyQuery);
    console.log('\n📊 Post-migration summary:');
    for (const org of verifyResult.rows) {
      console.log(`   ${org.org_name}: ${org.volunteers_with_users}/${org.total_volunteers} volunteers have user records`);
    }

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the migration
migrateVolunteersToUsers();