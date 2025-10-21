const express = require('express');
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const router = express.Router();

// POST /api/setup/demo-data - Set up demo data (USE WITH CAUTION!)
// Can also use GET for easier browser access
router.all('/demo-data', async (req, res) => {
  try {
    console.log('🚀 Setting up demo data...');
    console.log('Query params:', req.query);
    console.log('Body params:', req.body);

    // Security check - only allow in development or with special key
    const setupKey = req.query.setupKey || req.body?.setupKey;
    const expectedKey = process.env.SETUP_KEY || 'demo-setup-key-12345';

    console.log('Received key:', setupKey);
    console.log('Expected key:', expectedKey);

    if (setupKey !== expectedKey) {
      return res.status(403).json({
        success: false,
        message: 'Invalid setup key. Provide setupKey in request body or query.',
        received: setupKey,
        query: req.query,
        body: req.body
      });
    }

    const results = [];

    // 1. Create or update Super Admin
    console.log('1. Creating Super Admin...');
    const superAdminPassword = await bcrypt.hash('admin123', 10);

    // Check if super admin exists first
    const existingSuperAdmin = await pool.query(
      'SELECT id FROM super_admins WHERE email = $1',
      ['admin@comityspace.com']
    );

    if (existingSuperAdmin.rows.length > 0) {
      // Update existing
      await pool.query(
        'UPDATE super_admins SET password_hash = $1 WHERE email = $2',
        [superAdminPassword, 'admin@comityspace.com']
      );
      console.log('Updated existing super admin');
    } else {
      // Insert new
      await pool.query(`
        INSERT INTO super_admins (email, password_hash, first_name, last_name)
        VALUES ($1, $2, $3, $4)
      `, ['admin@comityspace.com', superAdminPassword, 'Super', 'Admin']);
      console.log('Created new super admin');
    }
    results.push('✅ Super Admin: admin@comityspace.com / admin123');

    // 2. Create Organizations
    console.log('2. Creating Organizations...');
    const redCrossPassword = await bcrypt.hash('redcross123', 10);
    const foodBankPassword = await bcrypt.hash('foodbank123', 10);

    // Red Cross
    let redCrossId;
    const existingRedCross = await pool.query(
      'SELECT id FROM organizations WHERE name = $1',
      ['Demo Red Cross']
    );
    if (existingRedCross.rows.length > 0) {
      redCrossId = existingRedCross.rows[0].id;
      await pool.query(
        'UPDATE organizations SET shared_password_hash = $1 WHERE id = $2',
        [redCrossPassword, redCrossId]
      );
    } else {
      const result = await pool.query(
        'INSERT INTO organizations (name, shared_password_hash, description, is_active) VALUES ($1, $2, $3, true) RETURNING id',
        ['Demo Red Cross', redCrossPassword, 'Demo Red Cross Organization']
      );
      redCrossId = result.rows[0].id;
    }

    // Food Bank
    let foodBankId;
    const existingFoodBank = await pool.query(
      'SELECT id FROM organizations WHERE name = $1',
      ['Demo Food Bank']
    );
    if (existingFoodBank.rows.length > 0) {
      foodBankId = existingFoodBank.rows[0].id;
      await pool.query(
        'UPDATE organizations SET shared_password_hash = $1 WHERE id = $2',
        [foodBankPassword, foodBankId]
      );
    } else {
      const result = await pool.query(
        'INSERT INTO organizations (name, shared_password_hash, description, is_active) VALUES ($1, $2, $3, true) RETURNING id',
        ['Demo Food Bank', foodBankPassword, 'Demo Food Bank Organization']
      );
      foodBankId = result.rows[0].id;
    }

    results.push(`✅ Organization: Demo Red Cross (ID: ${redCrossId}) / redcross123`);
    results.push(`✅ Organization: Demo Food Bank (ID: ${foodBankId}) / foodbank123`);

    // 3. Create Users
    console.log('3. Creating Users...');

    // Helper function to create or update user
    const createOrUpdateUser = async (email, firstName, lastName, role, orgId) => {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        await pool.query(
          'UPDATE users SET first_name = $1, last_name = $2, role = $3, organization_id = $4 WHERE email = $5',
          [firstName, lastName, role, orgId, email]
        );
      } else {
        await pool.query(
          'INSERT INTO users (email, first_name, last_name, role, organization_id, profile_completed) VALUES ($1, $2, $3, $4, $5, false)',
          [email, firstName, lastName, role, orgId]
        );
      }
    };

    // Red Cross Admin
    await createOrUpdateUser('admin@redcross.local', 'Admin', 'RedCross', 'nonprofit_admin', redCrossId);
    results.push('✅ User: admin@redcross.local (Admin) - password: redcross123');

    // Red Cross Volunteer
    await createOrUpdateUser('sandy@gmail.com', 'Sandy', 'Cheeks', 'volunteer', redCrossId);
    results.push('✅ User: sandy@gmail.com (Volunteer) - password: redcross123');

    // Food Bank Admin
    await createOrUpdateUser('manager@foodbank.local', 'Food Bank', 'Manager', 'nonprofit_admin', foodBankId);
    results.push('✅ User: manager@foodbank.local (Admin) - password: foodbank123');

    // Food Bank Volunteer
    await createOrUpdateUser('john@volunteer.com', 'John', 'Doe', 'volunteer', foodBankId);
    results.push('✅ User: john@volunteer.com (Volunteer) - password: foodbank123');

    console.log('🎉 Demo data setup complete!');

    res.json({
      success: true,
      message: 'Demo data created successfully',
      credentials: {
        superAdmin: 'admin@comityspace.com / admin123',
        redCross: 'admin@redcross.local / redcross123',
        volunteer: 'sandy@gmail.com / redcross123',
        foodBank: 'manager@foodbank.local / foodbank123'
      },
      details: results
    });

  } catch (error) {
    console.error('❌ Error setting up demo data:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to set up demo data',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      errorType: error.constructor.name
    });
  }
});

// POST /api/setup/super-admin - Create specific super admin
router.all('/super-admin', async (req, res) => {
  try {
    console.log('🚀 Creating Super Admin...');

    // Security check
    const setupKey = req.query.setupKey || req.body?.setupKey;
    const expectedKey = process.env.SETUP_KEY || 'demo-setup-key-12345';

    if (setupKey !== expectedKey) {
      return res.status(403).json({
        success: false,
        message: 'Invalid setup key'
      });
    }

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

    let action;
    if (existing.rows.length > 0) {
      // Update existing
      await pool.query(
        'UPDATE super_admins SET password_hash = $1, first_name = $2, last_name = $3 WHERE email = $4',
        [passwordHash, firstName, lastName, email]
      );
      action = 'updated';
      console.log('✅ Updated existing Super Admin');
    } else {
      // Create new
      await pool.query(
        'INSERT INTO super_admins (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4)',
        [email, passwordHash, firstName, lastName]
      );
      action = 'created';
      console.log('✅ Created new Super Admin');
    }

    res.json({
      success: true,
      message: `Super Admin ${action} successfully`,
      credentials: {
        email: email,
        password: '***hidden***',
        note: 'Check your email for the password'
      }
    });

  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create super admin',
      error: error.message
    });
  }
});

module.exports = router;
