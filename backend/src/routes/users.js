const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, email, phone, address, birthday } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and email are required'
      });
    }

    // Check if email is already taken by another user
    const emailCheck = await db.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, userId]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email address is already in use by another account'
      });
    }

    // Update user profile using actual table columns
    const updateQuery = `
      UPDATE users
      SET email = $1,
          first_name = $2,
          last_name = $3,
          phone = $4,
          address = $5,
          birth_date = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING id, email, first_name, last_name, phone, address, birth_date, role, organization_id, created_at, updated_at
    `;

    const result = await db.query(updateQuery, [
      email,
      firstName,
      lastName,
      phone || null,
      address || null,
      birthday || null,
      userId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Get organization name
    const orgQuery = await db.query(
      'SELECT name FROM organizations WHERE id = $1',
      [user.organization_id]
    );

    // Format birth_date as YYYY-MM-DD for HTML date input
    let formattedBirthday = '';
    if (user.birth_date) {
      const date = new Date(user.birth_date);
      formattedBirthday = date.toISOString().split('T')[0];
    }

    const responseUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id,
      organizationName: orgQuery.rows[0]?.name || 'Unknown Organization',
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      phone: user.phone || '',
      address: user.address || '',
      birthday: formattedBirthday,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: responseUser
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.address, u.birth_date,
             u.role, u.organization_id, u.created_at, u.updated_at,
             o.name as organization_name
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = $1
    `;

    const result = await db.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Format birth_date as YYYY-MM-DD for HTML date input
    let formattedBirthday = '';
    if (user.birth_date) {
      const date = new Date(user.birth_date);
      formattedBirthday = date.toISOString().split('T')[0];
    }

    const responseUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id,
      organizationName: user.organization_name || 'Unknown Organization',
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      phone: user.phone || '',
      address: user.address || '',
      birthday: formattedBirthday,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    res.json({
      success: true,
      user: responseUser
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;