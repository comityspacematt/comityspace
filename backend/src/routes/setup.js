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
    await pool.query(`
      INSERT INTO super_admins (email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE
      SET password_hash = $2
    `, ['admin@comityspace.com', superAdminPassword, 'Super', 'Admin']);
    results.push('✅ Super Admin: admin@comityspace.com / admin123');

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

    results.push(`✅ Organization: Demo Red Cross (ID: ${redCrossId}) / redcross123`);
    results.push(`✅ Organization: Demo Food Bank (ID: ${foodBankId}) / foodbank123`);

    // 3. Create Users
    console.log('3. Creating Users...');

    // Red Cross Admin
    await pool.query(`
      INSERT INTO users (email, first_name, last_name, role, organization_id, profile_completed)
      VALUES ($1, $2, $3, $4, $5, false)
      ON CONFLICT (email) DO UPDATE
      SET organization_id = $5, role = $4
    `, ['admin@redcross.local', 'Admin', 'RedCross', 'nonprofit_admin', redCrossId]);
    results.push('✅ User: admin@redcross.local (Admin) - password: redcross123');

    // Red Cross Volunteer
    await pool.query(`
      INSERT INTO users (email, first_name, last_name, role, organization_id, profile_completed)
      VALUES ($1, $2, $3, $4, $5, false)
      ON CONFLICT (email) DO UPDATE
      SET organization_id = $5, role = $4
    `, ['sandy@gmail.com', 'Sandy', 'Cheeks', 'volunteer', redCrossId]);
    results.push('✅ User: sandy@gmail.com (Volunteer) - password: redcross123');

    // Food Bank Admin
    await pool.query(`
      INSERT INTO users (email, first_name, last_name, role, organization_id, profile_completed)
      VALUES ($1, $2, $3, $4, $5, false)
      ON CONFLICT (email) DO UPDATE
      SET organization_id = $5, role = $4
    `, ['manager@foodbank.local', 'Food Bank', 'Manager', 'nonprofit_admin', foodBankId]);
    results.push('✅ User: manager@foodbank.local (Admin) - password: foodbank123');

    // Food Bank Volunteer
    await pool.query(`
      INSERT INTO users (email, first_name, last_name, role, organization_id, profile_completed)
      VALUES ($1, $2, $3, $4, $5, false)
      ON CONFLICT (email) DO UPDATE
      SET organization_id = $5, role = $4
    `, ['john@volunteer.com', 'John', 'Doe', 'volunteer', foodBankId]);
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
    res.status(500).json({
      success: false,
      message: 'Failed to set up demo data',
      error: error.message
    });
  }
});

module.exports = router;
