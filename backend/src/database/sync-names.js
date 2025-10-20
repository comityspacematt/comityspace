const db = require('../config/database');

async function syncNamesFromWhitelist() {
  try {
    console.log('🔄 Syncing names from whitelist to user records...');

    // Find users with null names that have corresponding whitelist entries with names in notes
    const query = `
      SELECT
        u.id as user_id,
        u.email,
        u.first_name,
        u.last_name,
        w.notes,
        o.name as org_name
      FROM users u
      JOIN whitelisted_emails w ON u.email = w.email AND u.organization_id = w.organization_id
      JOIN organizations o ON u.organization_id = o.id
      WHERE (u.first_name IS NULL OR u.last_name IS NULL)
        AND w.notes IS NOT NULL
        AND w.notes != ''
      ORDER BY o.name, u.email
    `;

    const result = await db.query(query);
    const usersToSync = result.rows;

    console.log(`📋 Found ${usersToSync.length} users with missing names that have whitelist notes:`);

    if (usersToSync.length === 0) {
      console.log('✅ All users already have complete names!');
      return;
    }

    for (const user of usersToSync) {
      console.log(`\n👤 Processing ${user.email} (${user.org_name})...`);
      console.log(`   Current: "${user.first_name || 'NULL'}" "${user.last_name || 'NULL'}"`);

      // Extract name from notes
      let firstName = null;
      let lastName = null;

      try {
        const notesData = JSON.parse(user.notes);
        firstName = notesData.firstName || null;
        lastName = notesData.lastName || null;
        console.log(`   From notes: "${firstName || 'N/A'}" "${lastName || 'N/A'}"`);
      } catch (e) {
        // Try to extract name from plain text notes
        const notesText = user.notes.toString().trim();
        if (notesText && /^[a-zA-Z\s]+$/.test(notesText)) {
          const nameParts = notesText.split(/\s+/);
          if (nameParts.length >= 1) {
            firstName = nameParts[0];
            if (nameParts.length >= 2) {
              lastName = nameParts.slice(1).join(' ');
            }
          }
          console.log(`   From plain text: "${firstName || 'N/A'}" "${lastName || 'N/A'}"`);
        } else {
          console.log('   ⚠️  Could not extract names from notes');
          continue;
        }
      }

      if (firstName || lastName) {
        // Update user record
        const updateQuery = `
          UPDATE users
          SET first_name = COALESCE($1, first_name),
              last_name = COALESCE($2, last_name),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING first_name, last_name
        `;

        try {
          const updateResult = await db.query(updateQuery, [
            firstName,
            lastName,
            user.user_id
          ]);

          const updated = updateResult.rows[0];
          console.log(`   ✅ Updated: "${updated.first_name || 'NULL'}" "${updated.last_name || 'NULL'}"`);
        } catch (error) {
          console.log(`   ❌ Failed to update: ${error.message}`);
        }
      }
    }

    console.log('\n🎉 Name sync complete!');

    // Verify the sync
    const verifyQuery = `
      SELECT
        o.name as org_name,
        COUNT(u.id) as total_users,
        COUNT(CASE WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL THEN 1 END) as users_with_names
      FROM users u
      JOIN organizations o ON u.organization_id = o.id
      GROUP BY o.id, o.name
      ORDER BY o.name
    `;

    const verifyResult = await db.query(verifyQuery);
    console.log('\n📊 Post-sync summary:');
    for (const org of verifyResult.rows) {
      console.log(`   ${org.org_name}: ${org.users_with_names}/${org.total_users} users have complete names`);
    }

  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the sync
syncNamesFromWhitelist();