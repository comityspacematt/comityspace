const db = require('../config/database');

async function addUpdatedAtColumn() {
  try {
    console.log('🔧 Adding updated_at column to event_signups table...');

    // Check if column already exists
    const checkColumn = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'event_signups'
      AND column_name = 'updated_at'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Column updated_at already exists in event_signups table');
      process.exit(0);
      return;
    }

    // Add the updated_at column
    await db.query(`
      ALTER TABLE event_signups
      ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    console.log('✅ Successfully added updated_at column to event_signups table');

    // Verify the column was added
    const verify = await db.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'event_signups'
      AND column_name = 'updated_at'
    `);

    if (verify.rows.length > 0) {
      console.log('✅ Verification successful:', verify.rows[0]);
    }

    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Error adding updated_at column:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the migration
addUpdatedAtColumn();
