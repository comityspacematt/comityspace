#!/usr/bin/env node

/**
 * Migration Script: Populate User Names from Whitelist Data
 *
 * This script populates first_name and last_name fields in the users table
 * from the names stored in whitelisted_emails.notes JSON field.
 *
 * Run this script to fix existing users who don't have names set.
 */

const db = require('./src/config/database');

async function populateUserNames() {
  try {
    console.log('🔄 Starting user name population from whitelist data...');

    // Find users without names who have corresponding whitelist entries with names
    const query = `
      SELECT
        u.id as user_id,
        u.email,
        u.first_name,
        u.last_name,
        w.notes
      FROM users u
      JOIN whitelisted_emails w ON u.email = w.email AND u.organization_id = w.organization_id
      WHERE (u.first_name IS NULL OR u.last_name IS NULL OR u.first_name = '' OR u.last_name = '')
        AND w.notes IS NOT NULL
        AND w.notes != ''
    `;

    const usersToUpdate = await db.query(query);
    console.log(`📊 Found ${usersToUpdate.rows.length} users that need name updates`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of usersToUpdate.rows) {
      try {
        let firstName = null;
        let lastName = null;

        // Try to parse as JSON first
        try {
          const notesData = typeof user.notes === 'string'
            ? JSON.parse(user.notes)
            : user.notes;

          if (notesData.firstName) firstName = notesData.firstName;
          if (notesData.lastName) lastName = notesData.lastName;
        } catch (jsonError) {
          // If JSON parsing fails, treat as plain text and try to extract name
          const notesText = user.notes.toString().trim();
          if (notesText && notesText.length > 0) {
            // Simple heuristic: if it looks like a name (no special chars), try to split it
            if (/^[a-zA-Z\s]+$/.test(notesText)) {
              const nameParts = notesText.split(/\s+/);
              if (nameParts.length >= 1) {
                firstName = nameParts[0];
                if (nameParts.length >= 2) {
                  lastName = nameParts.slice(1).join(' ');
                }
              }
            }
          }
        }

        if (firstName || lastName) {
          console.log(`👤 Updating user: ${user.email}`);
          console.log(`   Current: "${user.first_name || 'NULL'}" "${user.last_name || 'NULL'}"`);
          console.log(`   New: "${firstName || 'NULL'}" "${lastName || 'NULL'}"`);

          // Update the user's names
          await db.query(`
            UPDATE users
            SET
              first_name = COALESCE(NULLIF(first_name, ''), $1),
              last_name = COALESCE(NULLIF(last_name, ''), $2),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
          `, [firstName, lastName, user.user_id]);

          updatedCount++;
        } else {
          console.log(`⏭️  Skipping ${user.email}: No usable name data in whitelist notes`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing user ${user.email}:`, error.message);
        skippedCount++;
      }
    }

    console.log('\n✅ Migration completed!');
    console.log(`📈 Updated: ${updatedCount} users`);
    console.log(`⏭️  Skipped: ${skippedCount} users`);

    // Show sample of updated users
    console.log('\n📋 Sample of updated users:');
    const sampleQuery = `
      SELECT
        email,
        first_name,
        last_name,
        COALESCE(
          NULLIF(CONCAT(first_name, ' ', last_name), ' '),
          email
        ) as display_name
      FROM users
      WHERE first_name IS NOT NULL OR last_name IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 5
    `;

    const sample = await db.query(sampleQuery);
    sample.rows.forEach(user => {
      console.log(`   ${user.email} → "${user.display_name}"`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    try {
      if (db && db.end) {
        await db.end();
      }
    } catch (closeError) {
      console.log('Note: Database connection already closed');
    }
  }
}

// Run the migration
if (require.main === module) {
  populateUserNames()
    .then(() => {
      console.log('\n🎉 Migration script completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = populateUserNames;