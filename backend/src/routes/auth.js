const express = require('express');
const AuthService = require('../services/authService');
const { 
  authenticateToken, 
  requireSuperAdmin, 
  requireNonprofitAdmin,
  requireVolunteer
} = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login - Universal login for all user types
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    const result = await AuthService.login(email, password);

    res.json({
      success: true,
      message: result.message,
      userType: result.userType,
      user: result.user,
      tokens: result.tokens
    });

  } catch (error) {
    console.error('Login error:', error);
    
    res.status(401).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Refresh token is required'
      });
    }

    const result = await AuthService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      user: result.user,
      tokens: result.tokens
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    res.status(401).json({
      error: 'Token refresh failed',
      message: error.message
    });
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user,
      userType: req.userType,
      organizationId: req.organizationId
    });
  } catch (error) {
    console.error('Get user error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user information'
    });
  }
});

// GET /api/auth/organizations - Get all organizations (Super Admin only)
router.get('/organizations', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const organizations = await AuthService.getAllOrganizations();
    
    res.json({
      success: true,
      organizations
    });
  } catch (error) {
    console.error('Get organizations error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get organizations'
    });
  }
});

// POST /api/auth/change-org-password - Change organization password (Admin only)
router.post('/change-org-password', authenticateToken, requireNonprofitAdmin, async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'New password and confirmation are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Passwords do not match'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Password must be at least 8 characters long'
      });
    }

    const organizationId = req.userType === 'super_admin' 
      ? req.body.organizationId 
      : req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Organization ID is required'
      });
    }

    await AuthService.updateOrganizationPassword(organizationId, newPassword, req.user.id);

    res.json({
      success: true,
      message: 'Organization password updated successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to change organization password'
    });
  }
});

// GET /api/auth/check-email/:email - Check if email is whitelisted
router.get('/check-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    // Check if it's a super admin email first
    const superAdminCheck = await AuthService.getUserById(null, 'super_admin');
    // This is a simplified check - in production you'd query the super_admins table
    
    const result = await AuthService.isEmailWhitelisted(email);
    
    if (result.allowed) {
      res.json({
        success: true,
        allowed: true,
        organization: result.whitelist.organization_name,
        role: result.whitelist.role,
        userType: result.whitelist.role === 'nonprofit_admin' ? 'nonprofit_admin' : 'volunteer',
        message: result.message
      });
    } else {
      res.json({
        success: true,
        allowed: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Email check error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check email'
    });
  }
});

// POST /api/auth/update-profile - Update user profile (volunteers and admins)
router.post('/update-profile', authenticateToken, requireVolunteer, async (req, res) => {
  try {
    const { firstName, lastName, phone, address, birthDate, emergencyContactName, emergencyContactPhone } = req.body;

    if (req.userType === 'super_admin') {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Super admins cannot update profiles through this endpoint'
      });
    }

    // Update user profile
    const updateQuery = `
      UPDATE users 
      SET first_name = $1, 
          last_name = $2, 
          phone = $3, 
          address = $4, 
          birth_date = $5,
          emergency_contact_name = $6,
          emergency_contact_phone = $7,
          profile_completed = $8,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `;

    const profileCompleted = firstName && lastName && phone;

    const result = await require('../config/database').query(updateQuery, [
      firstName || null,
      lastName || null,
      phone || null,
      address || null,
      birthDate || null,
      emergencyContactName || null,
      emergencyContactPhone || null,
      profileCompleted,
      req.user.id
    ]);

    const updatedUser = result.rows[0];

    res.json({
      success: true, 
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        phone: updatedUser.phone,
        address: updatedUser.address,
        birthDate: updatedUser.birth_date,
        emergencyContactName: updatedUser.emergency_contact_name,
        emergencyContactPhone: updatedUser.emergency_contact_phone,
        profileCompleted: updatedUser.profile_completed,
        role: updatedUser.role,
        organizationId: updatedUser.organization_id
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update profile'
    });
  }
});

// POST /api/auth/logout - Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a production app, you'd invalidate the refresh token here
    // For now, we'll just send a success response
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to logout'
    });
  }
});

module.exports = router;