const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');

// All super admin routes require authentication and super admin privileges
router.use(authenticateToken);
router.use(requireSuperAdmin);

// GET /super-admin/dashboard - Super admin dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    // Get overall statistics
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM organizations WHERE is_active = true) as total_organizations,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM tasks) as total_tasks,
        (SELECT COUNT(*) FROM documents) as total_documents
    `;
    const stats = await db.query(statsQuery);

    // Get analytics data
    const analyticsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE last_login >= CURRENT_DATE - INTERVAL '7 days') as active_this_week,
        (SELECT SUM(login_count) FROM users) as total_logins,
        (SELECT COUNT(*) FROM tasks WHERE status = 'completed') as completed_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status IN ('pending', 'in_progress')) as pending_tasks,
        (SELECT COUNT(*) FROM organizations WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_this_month
    `;
    const analytics = await db.query(analyticsQuery);

    // Get recent organizations
    const recentOrganizationsQuery = `
      SELECT 
        o.*,
        COUNT(u.id) as user_count
      FROM organizations o
      LEFT JOIN users u ON o.id = u.organization_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `;
    const recentOrganizations = await db.query(recentOrganizationsQuery);

    // Get top organizations by user count
    const topOrganizationsQuery = `
      SELECT 
        o.name,
        COUNT(u.id) as user_count
      FROM organizations o
      LEFT JOIN users u ON o.id = u.organization_id
      WHERE o.is_active = true
      GROUP BY o.id, o.name
      ORDER BY user_count DESC
      LIMIT 5
    `;
    const topOrganizations = await db.query(topOrganizationsQuery);

    // Get all organizations with stats
    const allOrgsQuery = `
      SELECT 
        o.*,
        COUNT(u.id) as user_count,
        COUNT(t.id) as task_count,
        COUNT(d.id) as document_count
      FROM organizations o
      LEFT JOIN users u ON o.id = u.organization_id
      LEFT JOIN tasks t ON o.id = t.organization_id
      LEFT JOIN documents d ON o.id = d.organization_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;

    const allOrganizations = await db.query(allOrgsQuery);

    res.json({
      success: true,
      data: {
        stats: stats.rows[0],
        recent_organizations: recentOrganizations.rows,
        organizations: allOrganizations.rows,
        analytics: {
          ...analytics.rows[0],
          growth_rate: 15, // Calculate this based on your metrics
          top_organizations: topOrganizations.rows,
          total_tasks: stats.rows[0].total_tasks,
          total_documents: stats.rows[0].total_documents
        }
      }
    });

  } catch (error) {
    console.error('Super admin dashboard error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to load super admin dashboard'
    });
  }
});

// GET /super-admin/organizations - Get all organizations
router.get('/organizations', async (req, res) => {
  try {
    const orgsQuery = `
      SELECT 
        o.*,
        COUNT(u.id) as user_count,
        COUNT(t.id) as task_count,
        COUNT(d.id) as document_count
      FROM organizations o
      LEFT JOIN users u ON o.id = u.organization_id
      LEFT JOIN tasks t ON o.id = t.organization_id
      LEFT JOIN documents d ON o.id = d.organization_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;

    const organizations = await db.query(orgsQuery);

    res.json({
      success: true,
      organizations: organizations.rows
    });

  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get organizations'
    });
  }
});

// POST /super-admin/organizations - Create new organization (ENHANCED)
router.post('/organizations', async (req, res) => {
  try {
    const { 
      name, 
      description, 
      website, 
      phone, 
      address, 
      password,
      nonprofitAdminEmail,
      nonprofitAdminNotes
    } = req.body;
    const createdBy = req.user.id;

    // Validate required fields
    if (!name || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Organization name and password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check if organization name already exists
    const existingOrg = await db.query(
      'SELECT id FROM organizations WHERE LOWER(name) = LOWER($1)',
      [name]
    );

    if (existingOrg.rows.length > 0) {
      return res.status(400).json({
        error: 'Organization exists',
        message: 'An organization with this name already exists'
      });
    }

    // If nonprofit admin email is provided, validate it's not already in use
    if (nonprofitAdminEmail) {
      const existingEmail = await db.query(
        'SELECT id FROM whitelisted_emails WHERE email = $1',
        [nonprofitAdminEmail.toLowerCase()]
      );

      if (existingEmail.rows.length > 0) {
        return res.status(400).json({
          error: 'Email already exists',
          message: 'This email is already registered with another organization'
        });
      }
    }

    // Start a transaction
    await db.query('BEGIN');

    try {
      // Hash the organization password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create organization
      const insertQuery = `
        INSERT INTO organizations (
          name, shared_password_hash, description, website, phone, address, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const orgResult = await db.query(insertQuery, [
        name,
        passwordHash,
        description || null,
        website || null,
        phone || null,
        address || null,
        createdBy
      ]);

      const newOrg = orgResult.rows[0];

      // If nonprofit admin email is provided, add to whitelist
      if (nonprofitAdminEmail) {
        const whitelistQuery = `
          INSERT INTO whitelisted_emails (
            organization_id, email, role, added_by, notes
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;

        await db.query(whitelistQuery, [
          newOrg.id,
          nonprofitAdminEmail.toLowerCase().trim(),
          'nonprofit_admin',
          createdBy,
          nonprofitAdminNotes || 'Initial admin added during organization creation'
        ]);
      }

      // Commit transaction
      await db.query('COMMIT');

      res.status(201).json({
        success: true,
        message: nonprofitAdminEmail 
          ? 'Organization created successfully with nonprofit admin added'
          : 'Organization created successfully',
        organization: newOrg
      });

    } catch (transactionError) {
      // Rollback transaction
      await db.query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create organization'
    });
  }
});

// PUT /super-admin/organizations/:id - Update organization
router.put('/organizations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, website, phone, address } = req.body;

    // Validate organization exists
    const orgCheck = await db.query('SELECT id FROM organizations WHERE id = $1', [id]);
    if (orgCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Organization not found'
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let valueIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${valueIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${valueIndex++}`);
      values.push(description);
    }
    if (website !== undefined) {
      updates.push(`website = $${valueIndex++}`);
      values.push(website);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${valueIndex++}`);
      values.push(phone);
    }
    if (address !== undefined) {
      updates.push(`address = $${valueIndex++}`);
      values.push(address);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'No fields to update'
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateQuery = `
      UPDATE organizations 
      SET ${updates.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);

    res.json({
      success: true,
      message: 'Organization updated successfully',
      organization: result.rows[0]
    });

  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update organization'
    });
  }
});

// PUT /super-admin/organizations/:id/status - Toggle organization status
router.put('/organizations/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const result = await db.query(
      'UPDATE organizations SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Organization not found'
      });
    }

    res.json({
      success: true,
      message: `Organization ${is_active ? 'activated' : 'deactivated'} successfully`,
      organization: result.rows[0]
    });

  } catch (error) {
    console.error('Toggle organization status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update organization status'
    });
  }
});

// NEW: User Management Endpoints

// GET /super-admin/users - Get all users across organizations
router.get('/users', async (req, res) => {
  try {
    const usersQuery = `
      SELECT 
        w.email,
        w.role,
        w.notes,
        w.created_at as whitelisted_at,
        w.organization_id,
        o.name as organization_name,
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.phone,
        u.last_login,
        u.login_count,
        u.profile_completed
      FROM whitelisted_emails w
      JOIN organizations o ON w.organization_id = o.id
      LEFT JOIN users u ON w.email = u.email AND w.organization_id = u.organization_id
      WHERE w.is_active = true
      ORDER BY o.name, w.role DESC, w.email
    `;

    const result = await db.query(usersQuery);

    res.json({
      success: true,
      users: result.rows
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get users'
    });
  }
});

// POST /super-admin/users - Add user to organization whitelist
router.post('/users', async (req, res) => {
  try {
    const { email, role, organizationId, notes } = req.body;
    const addedBy = req.user.id;

    // Validate required fields
    if (!email || !role || !organizationId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email, role, and organization are required'
      });
    }

    // Validate role
    if (!['volunteer', 'nonprofit_admin'].includes(role)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Role must be either "volunteer" or "nonprofit_admin"'
      });
    }

    // Check if organization exists
    const orgCheck = await db.query(
      'SELECT id FROM organizations WHERE id = $1 AND is_active = true',
      [organizationId]
    );

    if (orgCheck.rows.length === 0) {
      return res.status(400).json({
        error: 'Organization not found',
        message: 'Organization not found or is inactive'
      });
    }

    // Check if email is already whitelisted anywhere
    const existingQuery = `
      SELECT organization_id, role 
      FROM whitelisted_emails 
      WHERE email = $1
    `;
    const existing = await db.query(existingQuery, [email.toLowerCase()]);

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: 'Email already exists',
        message: 'This email is already whitelisted for an organization'
      });
    }

    // Add to whitelist
    const insertQuery = `
      INSERT INTO whitelisted_emails (organization_id, email, role, added_by, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await db.query(insertQuery, [
      organizationId, 
      email.toLowerCase().trim(), 
      role, 
      addedBy, 
      notes || null
    ]);

    res.status(201).json({
      success: true,
      message: 'User added successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Add user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add user'
    });
  }
});

// PUT /super-admin/users/:email/role - Update user role
router.put('/users/:email/role', async (req, res) => {
  try {
    const { email } = req.params;
    const { role, organizationId } = req.body;

    // Validate role
    if (!['volunteer', 'nonprofit_admin'].includes(role)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Role must be either "volunteer" or "nonprofit_admin"'
      });
    }

    // Update whitelist entry
    const updateQuery = `
      UPDATE whitelisted_emails
      SET role = $1, updated_at = CURRENT_TIMESTAMP
      WHERE email = $2 AND organization_id = $3
      RETURNING *
    `;

    const result = await db.query(updateQuery, [role, email, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found in organization'
      });
    }

    // Also update the user record if it exists
    await db.query(
      'UPDATE users SET role = $1 WHERE email = $2 AND organization_id = $3',
      [role, email, organizationId]
    );

    res.json({
      success: true,
      message: 'User role updated successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update user role'
    });
  }
});

// PUT /super-admin/users/:email - Update user profile information
router.put('/users/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { role, organizationId, notes, firstName, lastName, phone } = req.body;

    // Start transaction
    await db.query('BEGIN');

    try {
      // Update whitelist entry (role and notes)
      if (role || notes !== undefined) {
        const whitelistUpdates = [];
        const whitelistValues = [];
        let valueIndex = 1;

        if (role && ['volunteer', 'nonprofit_admin'].includes(role)) {
          whitelistUpdates.push(`role = $${valueIndex++}`);
          whitelistValues.push(role);
        }
        if (notes !== undefined || firstName !== undefined || lastName !== undefined) {
          // Get existing notes to preserve structure
          const existingNotesQuery = `SELECT notes FROM whitelisted_emails WHERE email = $1 AND organization_id = $2`;
          const existingResult = await db.query(existingNotesQuery, [email, organizationId]);

          let existingNotes = {};
          if (existingResult.rows.length > 0 && existingResult.rows[0].notes) {
            try {
              existingNotes = JSON.parse(existingResult.rows[0].notes);
            } catch (e) {
              existingNotes = { adminNotes: existingResult.rows[0].notes };
            }
          }

          // Create updated notes object
          const updatedNotes = {
            ...existingNotes,
            lastUpdated: new Date().toISOString()
          };

          if (notes !== undefined) updatedNotes.adminNotes = notes;
          if (firstName !== undefined) updatedNotes.firstName = firstName;
          if (lastName !== undefined) updatedNotes.lastName = lastName;

          // Update volunteerName if we have both names
          const finalFirstName = firstName !== undefined ? firstName : updatedNotes.firstName;
          const finalLastName = lastName !== undefined ? lastName : updatedNotes.lastName;
          if (finalFirstName && finalLastName) {
            updatedNotes.volunteerName = `${finalFirstName} ${finalLastName}`;
          }

          whitelistUpdates.push(`notes = $${valueIndex++}`);
          whitelistValues.push(JSON.stringify(updatedNotes));
        }

        if (whitelistUpdates.length > 0) {
          whitelistUpdates.push(`updated_at = CURRENT_TIMESTAMP`);
          whitelistValues.push(email, organizationId);

          const whitelistQuery = `
            UPDATE whitelisted_emails
            SET ${whitelistUpdates.join(', ')}
            WHERE email = $${valueIndex++} AND organization_id = $${valueIndex}
          `;

          await db.query(whitelistQuery, whitelistValues);
        }
      }

      // Update user profile information if the user exists
      const userUpdates = [];
      const userValues = [];
      let userValueIndex = 1;

      if (role && ['volunteer', 'nonprofit_admin'].includes(role)) {
        userUpdates.push(`role = $${userValueIndex++}`);
        userValues.push(role);
      }
      if (firstName !== undefined) {
        userUpdates.push(`first_name = $${userValueIndex++}`);
        userValues.push(firstName);
      }
      if (lastName !== undefined) {
        userUpdates.push(`last_name = $${userValueIndex++}`);
        userValues.push(lastName);
      }
      if (phone !== undefined) {
        userUpdates.push(`phone = $${userValueIndex++}`);
        userValues.push(phone);
      }

      if (userUpdates.length > 0) {
        userUpdates.push(`updated_at = CURRENT_TIMESTAMP`);
        userValues.push(email, organizationId);

        const userQuery = `
          UPDATE users
          SET ${userUpdates.join(', ')}
          WHERE email = $${userValueIndex++} AND organization_id = $${userValueIndex}
        `;

        await db.query(userQuery, userValues);
      }

      // Commit transaction
      await db.query('COMMIT');

      res.json({
        success: true,
        message: 'User updated successfully'
      });

    } catch (transactionError) {
      await db.query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update user'
    });
  }
});

// DELETE /super-admin/users/:email - Remove user from ALL organizations
router.delete('/users/:email', async (req, res) => {
  try {
    const { email } = req.params;

    // Get user info before deletion for response
    const userQuery = `
      SELECT w.*, o.name as organization_name
      FROM whitelisted_emails w
      JOIN organizations o ON w.organization_id = o.id
      WHERE w.email = $1
    `;
    const userInfo = await db.query(userQuery, [email]);

    if (userInfo.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
    }

    // Start transaction
    await db.query('BEGIN');

    try {
      // Remove from ALL whitelisted_emails entries (across all organizations)
      const whitelistResult = await db.query('DELETE FROM whitelisted_emails WHERE email = $1', [email]);

      // Remove from ALL users table entries (across all organizations)
      const usersResult = await db.query('DELETE FROM users WHERE email = $1', [email]);

      // Also clean up any task assignments for this user
      await db.query('DELETE FROM task_assignments WHERE assigned_email = $1', [email]);

      // Clean up any calendar RSVPs
      await db.query('DELETE FROM event_rsvps WHERE user_email = $1', [email]);

      // Commit transaction
      await db.query('COMMIT');

      const organizationNames = userInfo.rows.map(row => row.organization_name).join(', ');

      res.json({
        success: true,
        message: `Permanently deleted ${email} from all organizations: ${organizationNames}`,
        deletedFromOrganizations: userInfo.rows.length,
        whitelistEntriesRemoved: whitelistResult.rowCount,
        userRecordsRemoved: usersResult.rowCount
      });

    } catch (transactionError) {
      await db.query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete user'
    });
  }
});

// GET /super-admin/users/:organizationId - Get users for specific organization
router.get('/users/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;

    const usersQuery = `
      SELECT 
        w.*,
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.phone,
        u.last_login,
        u.login_count,
        u.profile_completed
      FROM whitelisted_emails w
      LEFT JOIN users u ON w.email = u.email AND w.organization_id = u.organization_id
      WHERE w.organization_id = $1 AND w.is_active = true
      ORDER BY w.role DESC, w.email
    `;

    const result = await db.query(usersQuery, [organizationId]);

    res.json({
      success: true,
      users: result.rows
    });

  } catch (error) {
    console.error('Get organization users error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get organization users'
    });
  }
});

module.exports = router;