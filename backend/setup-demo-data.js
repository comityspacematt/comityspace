require('dotenv').config();
const pool = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function setupDemoData() {
  try {
    console.log('🚀 Setting up demo data...\n');

    // 1. Create or update Super Admin
    console.log('1. Creating Super Admin...');
    const superAdminPassword = await bcrypt.hash('admin123', 10);
    await pool.query(`
      INSERT INTO super_admins (email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE
      SET password_hash = $2
    `, ['admin@comityspace.com', superAdminPassword, 'Super', 'Admin']);
    console.log('✅ Super Admin: admin@comityspace.com / admin123\n');

    // 2. Create Organizations
    console.log('2. Creating Organizations...');
    const redCrossPassword = await bcrypt.hash('redcross123', 10);
    const foodBankPassword = await bcrypt.hash('foodbank123', 10);

    const orgResult = await pool.query(`
      INSERT INTO organizations (name, shared_password_hash, description, is_active)
      VALUES
        ($1, $2, 'Demo Red Cross Organization', true),
        ($3, $4, 'Demo Food Bank Organization', true)
      ON CONFLICT (name) DO UPDATE
      SET shared_password_hash = EXCLUDED.shared_password_hash
      RETURNING id, name
    `, ['Demo Red Cross', redCrossPassword, 'Demo Food Bank', foodBankPassword]);

    const redCrossId = orgResult.rows.find(r => r.name === 'Demo Red Cross')?.id;
    const foodBankId = orgResult.rows.find(r => r.name === 'Demo Food Bank')?.id;

    console.log(`✅ Organization: Demo Red Cross (ID: ${redCrossId}) / redcross123`);
    console.log(`✅ Organization: Demo Food Bank (ID: ${foodBankId}) / foodbank123\n`);

    // 3. Create Users
    console.log('3. Creating Users...');

    // Red Cross Admin
    await pool.query(`
      INSERT INTO users (email, first_name, last_name, role, organization_id, profile_completed)
      VALUES ($1, $2, $3, $4, $5, false)
      ON CONFLICT (email) DO UPDATE
      SET organization_id = $5, role = $4
    `, ['admin@redcross.local', 'Admin', 'RedCross', 'nonprofit_admin', redCrossId]);
    console.log('✅ User: admin@redcross.local (Admin) - uses org password: redcross123');

    // Red Cross Volunteer
    await pool.query(`
      INSERT INTO users (email, first_name, last_name, role, organization_id, profile_completed)
      VALUES ($1, $2, $3, $4, $5, false)
      ON CONFLICT (email) DO UPDATE
      SET organization_id = $5, role = $4
    `, ['sandy@gmail.com', 'Sandy', 'Cheeks', 'volunteer', redCrossId]);
    console.log('✅ User: sandy@gmail.com (Volunteer) - uses org password: redcross123');

    // Food Bank Admin
    await pool.query(`
      INSERT INTO users (email, first_name, last_name, role, organization_id, profile_completed)
      VALUES ($1, $2, $3, $4, $5, false)
      ON CONFLICT (email) DO UPDATE
      SET organization_id = $5, role = $4
    `, ['manager@foodbank.local', 'Food Bank', 'Manager', 'nonprofit_admin', foodBankId]);
    console.log('✅ User: manager@foodbank.local (Admin) - uses org password: foodbank123');

    // Food Bank Volunteer
    await pool.query(`
      INSERT INTO users (email, first_name, last_name, role, organization_id, profile_completed)
      VALUES ($1, $2, $3, $4, $5, false)
      ON CONFLICT (email) DO UPDATE
      SET organization_id = $5, role = $4
    `, ['john@volunteer.com', 'John', 'Doe', 'volunteer', foodBankId]);
    console.log('✅ User: john@volunteer.com (Volunteer) - uses org password: foodbank123\n');

    console.log('🎉 Demo data setup complete!\n');
    console.log('=== LOGIN CREDENTIALS ===');
    console.log('Super Admin: admin@comityspace.com / admin123');
    console.log('Red Cross:   admin@redcross.local / redcross123');
    console.log('Volunteer:   sandy@gmail.com / redcross123');
    console.log('Food Bank:   manager@foodbank.local / foodbank123');
    console.log('=========================\n');

  } catch (error) {
    console.error('❌ Error setting up demo data:', error);
  } finally {
    process.exit(0);
  }
}

setupDemoData();
