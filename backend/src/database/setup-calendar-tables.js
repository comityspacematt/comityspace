const db = require('../config/database'); // Updated path since we're in database/ folder

async function setupCalendarTables() {
  try {
    console.log('🗄️  Setting up calendar tables...');

    // Create calendar_events table
    const createEventsTable = `
      CREATE TABLE IF NOT EXISTS calendar_events (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          location VARCHAR(255),
          start_date DATE NOT NULL,
          end_date DATE,
          start_time TIME,
          end_time TIME,
          is_all_day BOOLEAN DEFAULT false,
          event_type VARCHAR(50) DEFAULT 'volunteer_event',
          max_volunteers INTEGER,
          organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await db.query(createEventsTable);
    console.log('✅ calendar_events table created/verified');

    // Create event_signups table
    const createSignupsTable = `
      CREATE TABLE IF NOT EXISTS event_signups (
          id SERIAL PRIMARY KEY,
          event_id INTEGER REFERENCES calendar_events(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'signed_up',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(event_id, user_id)
      );
    `;

    await db.query(createSignupsTable);
    console.log('✅ event_signups table created/verified');

    // Create indexes for better performance
    const createIndexes = [
      `CREATE INDEX IF NOT EXISTS idx_calendar_events_org_date 
       ON calendar_events(organization_id, start_date);`,
      `CREATE INDEX IF NOT EXISTS idx_event_signups_event 
       ON event_signups(event_id);`,
      `CREATE INDEX IF NOT EXISTS idx_event_signups_user 
       ON event_signups(user_id);`
    ];

    for (const indexQuery of createIndexes) {
      await db.query(indexQuery);
    }
    console.log('✅ Indexes created/verified');

    // Verify tables exist
    const checkTables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('calendar_events', 'event_signups')
      ORDER BY table_name;
    `);

    console.log('📋 Calendar tables in database:', checkTables.rows.map(row => row.table_name));

    // Check table structure
    const eventsColumns = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'calendar_events'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 calendar_events table structure:');
    eventsColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });

    console.log('\n🎉 Calendar database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up calendar tables:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the setup
setupCalendarTables();
