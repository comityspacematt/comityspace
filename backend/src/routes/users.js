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

    // Get current user data to preserve existing notes
    const currentUser = await db.query(
      'SELECT notes FROM users WHERE id = $1',
      [userId]
    );

    let currentNotes = {};
    try {
      if (currentUser.rows[0].notes) {
        currentNotes = JSON.parse(currentUser.rows[0].notes);
      }
    } catch (e) {
      console.log('Could not parse existing notes:', e);
    }

    // Update notes with new profile information
    const updatedNotes = {
      ...currentNotes,
      firstName,
      lastName,
      phone: phone || '',
      address: address || '',
      birthday: birthday || ''
    };

    // Update user profile
    const updateQuery = `
      UPDATE users
      SET email = $1,
          notes = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, email, role, organization_id, notes, created_at, updated_at
    `;

    const result = await db.query(updateQuery, [
      email,
      JSON.stringify(updatedNotes),
      userId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Parse the notes for the response
    let userNotes = {};
    try {
      if (user.notes) {
        userNotes = JSON.parse(user.notes);
      }
    } catch (e) {
      console.log('Could not parse user notes in response:', e);
    }

    // Get organization name
    const orgQuery = await db.query(
      'SELECT name FROM organizations WHERE id = $1',
      [user.organization_id]
    );

    const responseUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id,
      organizationName: orgQuery.rows[0]?.name || 'Unknown Organization',
      firstName: userNotes.firstName || '',
      lastName: userNotes.lastName || '',
      phone: userNotes.phone || '',
      notes: user.notes,
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
      SELECT u.id, u.email, u.role, u.organization_id, u.notes, u.created_at, u.updated_at,
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

    // Parse the notes
    let userNotes = {};
    try {
      if (user.notes) {
        userNotes = JSON.parse(user.notes);
      }
    } catch (e) {
      console.log('Could not parse user notes:', e);
    }

    const responseUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id,
      organizationName: user.organization_name || 'Unknown Organization',
      firstName: userNotes.firstName || '',
      lastName: userNotes.lastName || '',
      phone: userNotes.phone || '',
      address: userNotes.address || '',
      birthday: userNotes.birthday || '',
      notes: user.notes,
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