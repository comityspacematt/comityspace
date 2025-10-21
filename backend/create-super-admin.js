require('dotenv').config();
const pool = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function createSuperAdmin() {
  try {
    console.log('🚀 Creating Super Admin...\n');

    const email = 'matt@comityspace.com';
    const password = 'Comity300509$';
    const firstName = 'Matt';
    const lastName = 'Stockwell';

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Check if super admin already exists
    const existing = await pool.query(
      'SELECT id FROM super_admins WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      // Update existing
      await pool.query(
        'UPDATE super_admins SET password_hash = $1, first_name = $2, last_name = $3 WHERE email = $4',
        [passwordHash, firstName, lastName, email]
      );
      console.log('✅ Updated existing Super Admin');
    } else {
      // Create new
      await pool.query(
        'INSERT INTO super_admins (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4)',
        [email, passwordHash, firstName, lastName]
      );
      console.log('✅ Created new Super Admin');
    }

    console.log('\n=== SUPER ADMIN CREDENTIALS ===');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createSuperAdmin();
