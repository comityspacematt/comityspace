const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const emailService = require('../services/emailService');

// All admin routes require authentication first
router.use(authenticateToken);

// Middleware to verify admin access
router.use((req, res, next) => {
  if (!req.user || (req.userType !== 'nonprofit_admin' && req.userType !== 'super_admin')) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Admin privileges required'
    });
  }
  next();
});

// Get admin dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const organizationId = req.organizationId;

    // Get volunteer statistics
    const volunteerStatsQuery = `
      SELECT 
        COUNT(*) as total_volunteers,
        COUNT(CASE WHEN u.id IS NOT NULL THEN 1 END) as active_volunteers,
        COUNT(CASE WHEN w.role = 'nonprofit_admin' THEN 1 END) as admin_count
      FROM whitelisted_emails w
      LEFT JOIN users u ON w.email = u.email AND u.organization_id = w.organization_id
      WHERE w.organization_id = $1 AND w.is_active = true
    `;

    // Get task overview
    const taskOverviewQuery = `
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks
      FROM tasks 
      WHERE organization_id = $1
    `;

    // Get task assignments overview
    const assignmentOverviewQuery = `
      SELECT 
        COUNT(*) as total_assignments,
        COUNT(CASE WHEN ta.status = 'completed' THEN 1 END) as completed_assignments,
        COUNT(CASE WHEN ta.status = 'in_progress' THEN 1 END) as in_progress_assignments
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      WHERE t.organization_id = $1
    `;

    // Get recent activity
    console.log('🔍 Fetching recent activity for organization:', organizationId);
    const recentActivityQuery = `
      SELECT
        'task_assignment' as type,
        t.title as description,
        t.due_date,
        ta.status,
        ta.created_at as timestamp,
        CASE
          WHEN w.notes IS NOT NULL AND w.notes != '' AND w.notes != 'null'
          THEN COALESCE(
            (w.notes::jsonb)->>'volunteerName',
            NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '),
            u.email
          )
          ELSE COALESCE(
            NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '),
            u.email
          )
        END as user_name
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      JOIN users u ON ta.user_id = u.id
      LEFT JOIN whitelisted_emails w ON u.email = w.email AND u.organization_id = w.organization_id
      WHERE t.organization_id = $1
      UNION ALL
      SELECT
        'task_completion' as type,
        t.title as description,
        ta.updated_at as timestamp,
        CASE
          WHEN w.notes IS NOT NULL AND w.notes != '' AND w.notes != 'null'
          THEN COALESCE(
            (w.notes::jsonb)->>'volunteerName',
            NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '),
            u.email
          )
          ELSE COALESCE(
            NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '),
            u.email
          )
        END as user_name
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      JOIN users u ON ta.user_id = u.id
      LEFT JOIN whitelisted_emails w ON u.email = w.email AND u.organization_id = w.organization_id
      WHERE t.organization_id = $1 AND ta.status = 'completed'
      ORDER BY timestamp DESC
      LIMIT 10
    `;

    // Get upcoming events
    const upcomingEventsQuery = `
      SELECT 
        title,
        description,
        start_date,
        start_time,
        end_date,
        end_time,
        location
      FROM calendar_events 
      WHERE organization_id = $1 
        AND start_date >= CURRENT_DATE
      ORDER BY start_date ASC, start_time ASC
      LIMIT 5
    `;

    // Get recent documents
    const recentDocumentsQuery = `
      SELECT 
        title,
        description,
        category,
        is_pinned,
        created_at,
        file_url
      FROM documents 
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT 6
    `;

    // Get volunteers list
    const volunteersQuery = `
      SELECT 
        w.id,
        w.email,
        w.role,
        w.notes,
        w.is_active,
        w.created_at,
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.phone,
        u.last_login,
        u.login_count
      FROM whitelisted_emails w
      LEFT JOIN users u ON w.email = u.email AND u.organization_id = w.organization_id
      WHERE w.organization_id = $1 AND w.is_active = true
      ORDER BY 
        CASE WHEN w.role = 'nonprofit_admin' THEN 1 ELSE 2 END,
        w.created_at DESC
    `;

    // Execute all queries
    const [
      volunteerStats,
      taskOverview,
      assignmentOverview,
      recentActivity,
      upcomingEvents,
      recentDocuments,
      volunteers
    ] = await Promise.all([
      db.query(volunteerStatsQuery, [organizationId]),
      db.query(taskOverviewQuery, [organizationId]),
      db.query(assignmentOverviewQuery, [organizationId]),
      db.query(recentActivityQuery, [organizationId]),
      db.query(upcomingEventsQuery, [organizationId]),
      db.query(recentDocumentsQuery, [organizationId]),
      db.query(volunteersQuery, [organizationId])
    ]);

    // Get organization details
    const orgQuery = `SELECT name, description FROM organizations WHERE id = $1`;
    const organization = await db.query(orgQuery, [organizationId]);

    // Debug recent activity data
    console.log('📋 Recent Activity Data:', JSON.stringify(recentActivity.rows, null, 2));

    res.json({
      success: true,
      data: {
        organization: organization.rows[0] || {},
        volunteerStats: volunteerStats.rows[0] || {},
        taskOverview: {
          ...taskOverview.rows[0],
          ...assignmentOverview.rows[0]
        },
        recentActivity: recentActivity.rows || [],
        upcomingEvents: upcomingEvents.rows || [],
        recentDocuments: recentDocuments.rows || [],
        volunteers: volunteers.rows || []
      }
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to load admin dashboard data'
    });
  }
});

// Get volunteers directory (for volunteers to see each other)
router.get('/volunteers-directory', async (req, res) => {
  try {
    const organizationId = req.organizationId;

    // Get all volunteers in the organization with their profile info
    const volunteersQuery = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.role,
        u.last_login,
        u.login_count,
        u.created_at,
        w.notes as admin_notes
      FROM whitelisted_emails w
      LEFT JOIN users u ON w.email = u.email AND u.organization_id = w.organization_id
      WHERE w.organization_id = $1 AND w.is_active = true
      ORDER BY 
        CASE WHEN w.role = 'nonprofit_admin' THEN 1 ELSE 2 END,
        u.first_name ASC NULLS LAST,
        u.last_name ASC NULLS LAST,
        w.email ASC
    `;

    const volunteers = await db.query(volunteersQuery, [organizationId]);

    // Get organization info
    const orgQuery = `
      SELECT name, description FROM organizations WHERE id = $1
    `;
    
    const organization = await db.query(orgQuery, [organizationId]);

    res.json({
      success: true,
      organization: organization.rows[0],
      volunteers: volunteers.rows.map(volunteer => ({
        id: volunteer.id,
        email: volunteer.email,
        firstName: volunteer.first_name || 'Not set',
        lastName: volunteer.last_name || 'Not set',
        phone: volunteer.phone || 'Not provided',
        role: volunteer.role,
        isActive: volunteer.login_count > 0,
        lastLogin: volunteer.last_login,
        joinedAt: volunteer.created_at,
        // Don't show admin notes to regular volunteers
        notes: req.userType === 'nonprofit_admin' || req.userType === 'super_admin' 
          ? volunteer.admin_notes 
          : null
      }))
    });

  } catch (error) {
    console.error('Get volunteers directory error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to load volunteers directory'
    });
  }
});

// Get all tasks for admin management
router.get('/tasks', async (req, res) => {
  console.log('📋 Admin tasks request:', {
    path: req.path,
    query: req.query,
    organizationId: req.organizationId,
    userType: req.userType
  });

  try {
    const organizationId = req.organizationId;
    const { status, priority, assignedTo } = req.query;

    // Build dynamic WHERE clause based on filters
    let whereConditions = ['t.organization_id = $1'];
    let queryParams = [organizationId];
    let paramIndex = 2;

    // Add status filter
    if (status && status !== 'all') {
      whereConditions.push(`t.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    // Add priority filter
    if (priority && priority !== 'all') {
      whereConditions.push(`t.priority = $${paramIndex}`);
      queryParams.push(priority);
      paramIndex++;
    }

    const tasksQuery = `
      SELECT
        t.*,
        COALESCE(
          NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '),
          u.email
        ) as created_by_name,
        COUNT(ta.id) as assignment_count,
        COUNT(CASE WHEN ta.status = 'completed' THEN 1 END) as completed_assignments
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN task_assignments ta ON t.id = ta.task_id
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY t.id, u.first_name, u.last_name, u.email
      ORDER BY t.created_at DESC
    `;

    const tasks = await db.query(tasksQuery, queryParams);

    // Get assignments for each task
    const tasksWithAssignments = await Promise.all(
      tasks.rows.map(async (task) => {
        const assignmentsQuery = `
          SELECT
            ta.status,
            ta.created_at as assigned_at,
            ta.completed_at,
            ta.completion_notes,
            ta.user_id,
            assignee.email as user_email,
            -- Extract names from whitelist notes JSON with proper error handling
            CASE
              WHEN w.notes IS NOT NULL AND w.notes != '' AND w.notes != 'null'
              THEN COALESCE(
                (w.notes::jsonb)->>'firstName',
                assignee.first_name
              )
              ELSE assignee.first_name
            END as user_first_name,
            CASE
              WHEN w.notes IS NOT NULL AND w.notes != '' AND w.notes != 'null'
              THEN COALESCE(
                (w.notes::jsonb)->>'lastName',
                assignee.last_name
              )
              ELSE assignee.last_name
            END as user_last_name,
            CASE
              WHEN w.notes IS NOT NULL AND w.notes != '' AND w.notes != 'null'
              THEN COALESCE(
                (w.notes::jsonb)->>'volunteerName',
                NULLIF(CONCAT(assignee.first_name, ' ', assignee.last_name), ' '),
                assignee.email
              )
              ELSE COALESCE(
                NULLIF(CONCAT(assignee.first_name, ' ', assignee.last_name), ' '),
                assignee.email
              )
            END as user_name,
            -- Debug info
            w.notes as whitelist_notes,
            w.id as whitelist_id
          FROM task_assignments ta
          LEFT JOIN users assignee ON ta.user_id = assignee.id
          LEFT JOIN whitelisted_emails w ON assignee.email = w.email AND assignee.organization_id = w.organization_id
          WHERE ta.task_id = $1
          ORDER BY ta.created_at DESC
        `;

        const assignments = await db.query(assignmentsQuery, [task.id]);

        // Debug: Log assignment data to see what names are available
        if (assignments.rows.length > 0) {
          console.log('📝 Assignment data for task:', task.title);
          assignments.rows.forEach(assignment => {
            console.log('  - User:', {
              first_name: assignment.user_first_name,
              last_name: assignment.user_last_name,
              user_name: assignment.user_name,
              email: assignment.user_email,
              whitelist_notes: assignment.whitelist_notes,
              whitelist_id: assignment.whitelist_id
            });
          });
        }

        return {
          ...task,
          assignments: assignments.rows
        };
      })
    );

    res.json({
      success: true,
      tasks: tasksWithAssignments
    });

  } catch (error) {
    console.error('Get admin tasks error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to load tasks'
    });
  }
});

// Create new task
router.post('/tasks', async (req, res) => {
  try {
    const {
      title,
      description,
      due_date,
      priority = 'medium',
      category = 'general',
      estimated_hours,
      assign_to_emails = [] // Array of volunteer emails to assign to
    } = req.body;

    const organizationId = req.organizationId;
    const createdBy = req.user.id;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Task title is required'
      });
    }

    // Create the task
    const taskQuery = `
      INSERT INTO tasks (title, description, due_date, priority, category, estimated_hours, organization_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const taskResult = await db.query(taskQuery, [
      title, description, due_date || null, priority, category, 
      estimated_hours || null, organizationId, createdBy
    ]);

    const task = taskResult.rows[0];

    // Assign task to volunteers if specified
    if (assign_to_emails && assign_to_emails.length > 0) {
      for (const email of assign_to_emails) {
        // Get user ID from email
        const userQuery = `
          SELECT id FROM users 
          WHERE email = $1 AND organization_id = $2
        `;
        const userResult = await db.query(userQuery, [email, organizationId]);

        if (userResult.rows.length > 0) {
          const userId = userResult.rows[0].id;
          
          // Create assignment
          const assignQuery = `
            INSERT INTO task_assignments (task_id, user_id, assigned_by)
            VALUES ($1, $2, $3)
          `;
          
          await db.query(assignQuery, [task.id, userId, createdBy]);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: task
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create task'
    });
  }
});

// Assign task to volunteer
router.post('/tasks/:taskId/assign', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { volunteer_email } = req.body;
    const organizationId = req.organizationId;
    const assignedBy = req.user.id;

    // Validate task exists and belongs to organization
    const taskQuery = `
      SELECT id FROM tasks 
      WHERE id = $1 AND organization_id = $2
    `;
    const taskResult = await db.query(taskQuery, [taskId, organizationId]);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Task not found',
        message: 'Task not found or does not belong to your organization'
      });
    }

    // Get volunteer user info
    const userQuery = `
      SELECT u.id, u.first_name, u.last_name 
      FROM users u
      JOIN whitelisted_emails w ON u.email = w.email
      WHERE u.email = $1 AND u.organization_id = $2 AND w.is_active = true
    `;
    
    const userResult = await db.query(userQuery, [volunteer_email, organizationId]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid volunteer',
        message: 'Volunteer not found or not active'
      });
    }

    const volunteer = userResult.rows[0];

    // Check if already assigned
    const existingAssignment = await db.query(
      'SELECT id FROM task_assignments WHERE task_id = $1 AND user_id = $2',
      [taskId, volunteer.id]
    );

    if (existingAssignment.rows.length > 0) {
      return res.status(400).json({
        error: 'Already assigned',
        message: 'Task is already assigned to this volunteer'
      });
    }

    // Create assignment
    const assignQuery = `
      INSERT INTO task_assignments (task_id, user_id, assigned_by)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    await db.query(assignQuery, [taskId, volunteer.id, assignedBy]);

    res.json({
      success: true,
      message: `Task assigned to ${volunteer.first_name} ${volunteer.last_name}`
    });

  } catch (error) {
    console.error('Assign task error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to assign task'
    });
  }
});

// Add volunteer to whitelist
router.post('/volunteers', async (req, res) => {
  try {
    const { name, email, role = 'volunteer', notes } = req.body;
    const organizationId = req.organizationId;
    const addedBy = req.user.id;

    // Validate required fields
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Valid email address is required'
      });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation error', 
        message: 'Volunteer name is required'
      });
    }

    // Parse name into first and last name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Check if email is already whitelisted
    const existingQuery = `
      SELECT id FROM whitelisted_emails 
      WHERE email = $1
    `;
    const existing = await db.query(existingQuery, [email]);

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: 'Email already exists',
        message: 'This email is already whitelisted for an organization'
      });
    }

    // Enhanced notes to include name information
    const enhancedNotes = {
      adminNotes: notes || '',
      volunteerName: name,
      firstName: firstName,
      lastName: lastName,
      addedDate: new Date().toISOString()
    };

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
      JSON.stringify(enhancedNotes)
    ]);

    // Also create user record immediately so they can be assigned tasks
    // First check if user already exists
    const existingUserQuery = `
      SELECT * FROM users WHERE email = $1 AND organization_id = $2
    `;
    const existingUser = await db.query(existingUserQuery, [
      email.toLowerCase().trim(),
      organizationId
    ]);

    let userResult;
    if (existingUser.rows.length > 0) {
      // Update existing user with proper name information
      const updateUserQuery = `
        UPDATE users
        SET first_name = $1, last_name = $2, role = $3, updated_at = CURRENT_TIMESTAMP
        WHERE email = $4 AND organization_id = $5
        RETURNING *
      `;
      userResult = await db.query(updateUserQuery, [
        firstName,
        lastName,
        role,
        email.toLowerCase().trim(),
        organizationId
      ]);
    } else {
      // Create new user record
      const createUserQuery = `
        INSERT INTO users (email, organization_id, role, first_name, last_name, login_count, profile_completed)
        VALUES ($1, $2, $3, $4, $5, 0, false)
        RETURNING *
      `;
      userResult = await db.query(createUserQuery, [
        email.toLowerCase().trim(),
        organizationId,
        role,
        firstName,
        lastName
      ]);
    }

    // Get organization details and password for welcome email
    const orgQuery = await db.query(`
      SELECT name, shared_password_hash FROM organizations WHERE id = $1
    `, [organizationId]);

    const organization = orgQuery.rows[0];

    // Get admin details (person who added the volunteer)
    const adminQuery = await db.query(`
      SELECT first_name, last_name, email FROM users WHERE id = $1
    `, [addedBy]);

    const admin = adminQuery.rows[0];
    const adminName = admin ? `${admin.first_name || ''} ${admin.last_name || ''}`.trim() : null;

    // Send welcome email (async, don't wait for it)
    // Note: Organization password is hashed, so we need to show a generic message
    emailService.sendWelcomeEmail({
      volunteerEmail: email.toLowerCase().trim(),
      volunteerName: name,
      role: role,
      organizationName: organization.name,
      organizationPassword: '[Contact your administrator for the organization password]',
      adminName: adminName || 'Your administrator',
      adminEmail: admin ? admin.email : null
    }).catch(err => {
      console.error('Failed to send welcome email:', err);
      // Don't fail the request if email fails
    });

    // Return response with parsed name information
    const volunteer = result.rows[0];
    const user = userResult.rows[0];
    res.status(201).json({
      success: true,
      message: `${name} has been added to the volunteer whitelist and user account created successfully`,
      volunteer: {
        ...volunteer,
        volunteerName: name,
        firstName: firstName,
        lastName: lastName
      },
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id
      }
    });

  } catch (error) {
    console.error('Add volunteer error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add volunteer'
    });
  }
});

// Update volunteer information
router.put('/volunteers/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { name, role, notes } = req.body;
    const organizationId = req.organizationId;

    console.log('🔄 Volunteer update request:', {
      email,
      name,
      role,
      notes,
      organizationId
    });

    // Check if volunteer exists
    const existingQuery = `
      SELECT * FROM whitelisted_emails 
      WHERE email = $1 AND organization_id = $2
    `;
    const existing = await db.query(existingQuery, [email, organizationId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Volunteer not found in whitelist'
      });
    }

    // Parse existing notes to preserve structure
    let existingNotes = {};
    try {
      if (existing.rows[0].notes) {
        existingNotes = JSON.parse(existing.rows[0].notes);
      }
    } catch (e) {
      // If notes is not JSON, preserve as adminNotes
      existingNotes = { adminNotes: existing.rows[0].notes || '' };
    }

    // Update fields
    const updates = [];
    const values = [];
    let valueIndex = 1;

    if (role !== undefined) {
      updates.push(`role = $${valueIndex++}`);
      values.push(role);
    }

    if (name !== undefined) {
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      const updatedNotes = {
        ...existingNotes,
        volunteerName: name,
        firstName: firstName,
        lastName: lastName,
        lastUpdated: new Date().toISOString()
      };

      if (notes !== undefined) {
        updatedNotes.adminNotes = notes;
      }

      updates.push(`notes = $${valueIndex++}`);
      values.push(JSON.stringify(updatedNotes));
    } else if (notes !== undefined) {
      const updatedNotes = {
        ...existingNotes,
        adminNotes: notes,
        lastUpdated: new Date().toISOString()
      };

      updates.push(`notes = $${valueIndex++}`);
      values.push(JSON.stringify(updatedNotes));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'No valid fields provided for update'
      });
    }

    // Add WHERE clause parameters
    values.push(email, organizationId);

    const updateQuery = `
      UPDATE whitelisted_emails 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE email = $${valueIndex++} AND organization_id = $${valueIndex++}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);

    // Also update the user table to keep it in sync
    let firstName, lastName;
    if (name !== undefined) {
      const nameParts = name.trim().split(' ');
      firstName = nameParts[0];
      lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    }

    if (firstName !== undefined || lastName !== undefined || role !== undefined) {
      const userUpdateFields = [];
      const userUpdateValues = [];
      let userValueIndex = 1;

      if (firstName !== undefined) {
        userUpdateFields.push(`first_name = $${userValueIndex++}`);
        userUpdateValues.push(firstName);
      }

      if (lastName !== undefined) {
        userUpdateFields.push(`last_name = $${userValueIndex++}`);
        userUpdateValues.push(lastName);
      }

      if (role !== undefined) {
        userUpdateFields.push(`role = $${userValueIndex++}`);
        userUpdateValues.push(role);
      }

      userUpdateValues.push(email, organizationId);

      const userUpdateQuery = `
        UPDATE users
        SET ${userUpdateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE email = $${userValueIndex++} AND organization_id = $${userValueIndex++}
      `;

      await db.query(userUpdateQuery, userUpdateValues);
    }

    console.log('✅ Volunteer update successful:', {
      updatedVolunteer: result.rows[0],
      updates: updates,
      values: values
    });

    res.json({
      success: true,
      message: 'Volunteer updated successfully',
      volunteer: result.rows[0]
    });

  } catch (error) {
    console.error('Update volunteer error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update volunteer'
    });
  }
});

// Test route to verify path
router.get('/volunteers/invalid/test', (req, res) => {
  res.json({ message: 'Route is working', path: '/admin/volunteers/invalid/test' });
});

// Delete invalid volunteer records by criteria (for records without ID)
// THIS MUST COME FIRST - MOST SPECIFIC ROUTE
router.post('/volunteers/invalid/delete-by-criteria', async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const { role, notes, firstName, lastName } = req.body;

    console.log('🗑️ Deleting invalid volunteer by criteria:', {
      role, notes, firstName, lastName, organizationId
    });

    // Build WHERE clause based on provided criteria
    let whereConditions = ['organization_id = $1', '(email IS NULL OR email = \'\')'];
    let queryParams = [organizationId];
    let paramIndex = 2;

    if (role !== undefined && role !== null) {
      whereConditions.push(`role = $${paramIndex}`);
      queryParams.push(role);
      paramIndex++;
    }

    if (notes !== undefined && notes !== null && notes !== '') {
      whereConditions.push(`notes = $${paramIndex}`);
      queryParams.push(notes);
      paramIndex++;
    }

    // For firstName/lastName, we need to check JSON notes
    if (firstName || lastName) {
      let jsonConditions = [];

      if (firstName) {
        jsonConditions.push(`notes::text LIKE $${paramIndex}`);
        queryParams.push(`%"firstName":"${firstName}"%`);
        paramIndex++;
      }

      if (lastName) {
        jsonConditions.push(`notes::text LIKE $${paramIndex}`);
        queryParams.push(`%"lastName":"${lastName}"%`);
        paramIndex++;
      }

      if (jsonConditions.length > 0) {
        whereConditions.push(`(${jsonConditions.join(' AND ')})`);
      }
    }

    const deleteQuery = `
      DELETE FROM whitelisted_emails
      WHERE ${whereConditions.join(' AND ')}
      RETURNING id, email, role, notes
    `;

    console.log('🔍 Delete query:', deleteQuery);
    console.log('🔍 Query params:', queryParams);

    const result = await db.query(deleteQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'No invalid records found matching the criteria'
      });
    }

    console.log('✅ Deleted invalid records:', result.rows);

    res.json({
      success: true,
      message: `Deleted ${result.rows.length} invalid record(s)`,
      deletedRecords: result.rows
    });

  } catch (error) {
    console.error('Delete invalid records by criteria error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete invalid records'
    });
  }
});

// Delete invalid volunteer record by ID (for records without email)
router.delete('/volunteers/invalid/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    console.log('🗑️ Deleting invalid volunteer record:', { id, organizationId });

    if (id === 'null' || !id) {
      return res.status(400).json({
        error: 'Invalid ID',
        message: 'Cannot delete record with null or missing ID'
      });
    }

    const deleteQuery = `
      DELETE FROM whitelisted_emails
      WHERE id = $1 AND organization_id = $2 AND (email IS NULL OR email = '')
      RETURNING id, email
    `;

    const result = await db.query(deleteQuery, [id, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Invalid record not found or record has email address'
      });
    }

    console.log('✅ Deleted invalid record:', result.rows[0]);

    res.json({
      success: true,
      message: `Deleted invalid record with ID ${id}`
    });

  } catch (error) {
    console.error('Delete invalid record error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete invalid record'
    });
  }
});

// Remove volunteer from whitelist (regular deletion by email)
router.delete('/volunteers/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const organizationId = req.organizationId;

    console.log('🗑️ Removing volunteer by email:', { email, organizationId });

    const deleteQuery = `
      DELETE FROM whitelisted_emails
      WHERE email = $1 AND organization_id = $2
      RETURNING email
    `;

    const result = await db.query(deleteQuery, [email, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Volunteer not found in whitelist'
      });
    }

    console.log('✅ Removed volunteer:', result.rows[0]);

    res.json({
      success: true,
      message: `Removed ${email} from whitelist`
    });

  } catch (error) {
    console.error('Remove volunteer error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to remove volunteer'
    });
  }
});

// Get volunteer statistics
router.get('/volunteers/stats', async (req, res) => {
  try {
    const organizationId = req.organizationId;

    const statsQuery = `
      SELECT 
        COUNT(*) as total_volunteers,
        COUNT(CASE WHEN u.id IS NOT NULL THEN 1 END) as registered_volunteers,
        COUNT(CASE WHEN w.role = 'nonprofit_admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN u.last_login >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as active_last_30_days,
        COUNT(CASE WHEN u.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_last_30_days
      FROM whitelisted_emails w
      LEFT JOIN users u ON w.email = u.email AND u.organization_id = w.organization_id
      WHERE w.organization_id = $1 AND w.is_active = true
    `;

    const stats = await db.query(statsQuery, [organizationId]);

    res.json({
      success: true,
      stats: stats.rows[0]
    });

  } catch (error) {
    console.error('Get volunteer stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to load volunteer statistics'
    });
  }
});

module.exports = router;