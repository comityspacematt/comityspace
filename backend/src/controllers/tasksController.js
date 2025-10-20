const db = require('../config/database');
const EmailService = require('../services/emailService');

class TasksController {
  // Get user's assigned tasks with detailed filtering
  static async getMyTasks(req, res) {
    try {
      const userId = req.user.id;
      const organizationId = req.organizationId;
      const { status, priority, category, sortBy = 'due_date', sortOrder = 'asc', page = 1, limit = 20 } = req.query;

      let filters = [];
      let params = [userId, organizationId];

      if (status && status !== 'all') {
        filters.push(`ta.status = $${params.length + 1}`);
        params.push(status);
      }

      if (priority && priority !== 'all') {
        filters.push(`t.priority = $${params.length + 1}`);
        params.push(priority);
      }

      if (category && category !== 'all') {
        filters.push(`t.category = $${params.length + 1}`);
        params.push(category);
      }

      const whereClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';
      const offset = (page - 1) * limit;

      // Validate sortBy to prevent SQL injection
      const validSortFields = ['due_date', 'priority', 'created_at', 'title', 'estimated_hours'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'due_date';
      const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      const tasksQuery = `
        SELECT 
          t.*,
          ta.id as assignment_id,
          ta.status as assignment_status,
          ta.assigned_by,
          ta.completed_at,
          ta.completion_notes,
          ta.admin_feedback,
          ta.started_at,
          ta.created_at as assignment_date,
          u_assigned.first_name as assigned_by_name,
          u_assigned.last_name as assigned_by_lastname,
          CASE 
            WHEN t.due_date IS NULL THEN 0
            WHEN t.due_date < CURRENT_DATE THEN -1
            WHEN t.due_date = CURRENT_DATE THEN 1
            WHEN t.due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 2
            ELSE 3
          END as urgency_level
        FROM tasks t
        JOIN task_assignments ta ON t.id = ta.task_id
        LEFT JOIN users u_assigned ON ta.assigned_by = u_assigned.id
        WHERE ta.user_id = $1 AND t.organization_id = $2 ${whereClause}
        ORDER BY 
          CASE WHEN '${sortField}' = 'due_date' THEN
            CASE 
              WHEN t.due_date IS NULL THEN '9999-12-31'::date
              ELSE t.due_date
            END
          END ${order} NULLS LAST,
          CASE WHEN '${sortField}' = 'priority' THEN
            CASE t.priority
              WHEN 'urgent' THEN 1
              WHEN 'high' THEN 2
              WHEN 'medium' THEN 3
              WHEN 'low' THEN 4
              ELSE 5
            END
          END ${order},
          CASE WHEN '${sortField}' = 'created_at' THEN t.created_at END ${order},
          CASE WHEN '${sortField}' = 'title' THEN t.title END ${order},
          CASE WHEN '${sortField}' = 'estimated_hours' THEN t.estimated_hours END ${order}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      params.push(limit, offset);

      const tasks = await db.query(tasksQuery, params);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM task_assignments ta
        JOIN tasks t ON ta.task_id = t.id
        WHERE ta.user_id = $1 AND t.organization_id = $2 ${whereClause}
      `;

      const totalCount = await db.query(countQuery, params.slice(0, params.length - 2));

      // Get task statistics - simplified model
      const statsQuery = `
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN ta.status = 'assigned' THEN 1 END) as assigned_tasks,
          COUNT(CASE WHEN ta.status = 'completed' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN t.due_date < CURRENT_DATE AND ta.status != 'completed' THEN 1 END) as overdue_tasks,
          COUNT(CASE WHEN t.due_date <= CURRENT_DATE + INTERVAL '3 days' AND t.due_date >= CURRENT_DATE AND ta.status != 'completed' THEN 1 END) as due_soon_tasks
        FROM task_assignments ta
        JOIN tasks t ON ta.task_id = t.id
        WHERE ta.user_id = $1 AND t.organization_id = $2
      `;

      const stats = await db.query(statsQuery, [userId, organizationId]);

      res.json({
        success: true,
        tasks: tasks.rows,
        stats: stats.rows[0],
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalCount.rows[0].total / limit),
          total_items: parseInt(totalCount.rows[0].total),
          items_per_page: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Get my tasks error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get tasks'
      });
    }
  }

  // Update task assignment status with enhanced functionality
  static async updateTaskStatus(req, res) {
    try {
      const { taskId } = req.params;
      const { status, completionNotes } = req.body;
      const userId = req.user.id;
      const organizationId = req.organizationId;

      // Validate status
      const validStatuses = ['assigned', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Status must be "assigned", "in_progress", or "completed"'
        });
      }

      // Verify user is assigned to this task
      const assignmentCheck = await db.query(`
        SELECT ta.*, t.organization_id, t.title, t.description
        FROM task_assignments ta
        JOIN tasks t ON ta.task_id = t.id
        WHERE ta.task_id = $1 AND ta.user_id = $2 AND t.organization_id = $3
      `, [taskId, userId, organizationId]);

      if (assignmentCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Task assignment not found'
        });
      }

      const currentAssignment = assignmentCheck.rows[0];

      // Prepare update values - simplified model
      let updateFields = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
      let params = [status];

      if (status === 'completed') {
        updateFields.push(`completed_at = $${params.length + 1}`);
        params.push(new Date());

        if (completionNotes) {
          updateFields.push(`completion_notes = $${params.length + 1}`);
          params.push(completionNotes);
        }
      }

      // Add WHERE clause parameters
      params.push(taskId, userId);

      const updateQuery = `
        UPDATE task_assignments
        SET ${updateFields.join(', ')}
        WHERE task_id = $${params.length - 1} AND user_id = $${params.length}
        RETURNING *
      `;

      const result = await db.query(updateQuery, params);

      // Update main task status based on assignment statuses
      if (status === 'completed') {
        // Check if all assignments for this task are completed
        const allAssignmentsQuery = `
          SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
          FROM task_assignments
          WHERE task_id = $1
        `;
        
        const assignmentStats = await db.query(allAssignmentsQuery, [taskId]);
        const stats = assignmentStats.rows[0];

        if (stats.total === stats.completed) {
          await db.query(`
            UPDATE tasks 
            SET status = 'completed', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [taskId]);
        } else {
          await db.query(`
            UPDATE tasks 
            SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND status = 'pending'
          `, [taskId]);
        }
      } else if (status === 'in_progress') {
        await db.query(`
          UPDATE tasks 
          SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND status = 'pending'
        `, [taskId]);
      }

      // Send notification email to admin when task is completed
      if (status === 'completed' && currentAssignment.assigned_by) {
        try {
          const adminQuery = await db.query(`
            SELECT email, first_name, last_name FROM users WHERE id = $1
          `, [currentAssignment.assigned_by]);

          if (adminQuery.rows.length > 0) {
            const admin = adminQuery.rows[0];
            await EmailService.sendTaskCompletedNotification({
              adminEmail: admin.email,
              adminName: `${admin.first_name} ${admin.last_name}`.trim(),
              volunteerName: `${req.user.firstName} ${req.user.lastName}`.trim() || req.user.email,
              taskTitle: currentAssignment.title,
              completionNotes: completionNotes,
              organizationName: req.user.organizationName
            });
          }
        } catch (emailError) {
          console.error('Failed to send task completion email:', emailError);
          // Don't fail the request if email fails
        }
      }

      res.json({
        success: true,
        message: `Task ${status.replace('_', ' ')} successfully`,
        assignment: result.rows[0]
      });

    } catch (error) {
      console.error('Update task status error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update task status'
      });
    }
  }

// Create new task (admin only)
  static async createTask(req, res) {
    try {
      const {
        title,
        description,
        due_date,
        priority = 'medium',
        assign_to_emails // Array of volunteer emails
      } = req.body;

      const organizationId = req.organizationId;
      const createdBy = req.user.id;

      // Validation
      if (!title) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Task title is required'
        });
      }

      if (!assign_to_emails || !Array.isArray(assign_to_emails) || assign_to_emails.length === 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'At least one volunteer must be assigned to the task'
        });
      }

      // Create the task (removed category and estimated_hours)
      const taskResult = await db.query(`
        INSERT INTO tasks (
          title, description, due_date, priority, created_by, organization_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [title, description, due_date, priority, createdBy, organizationId]);

      const task = taskResult.rows[0];

      // Convert emails to user IDs and assign task to volunteers
      const assignments = [];
      
      for (const email of assign_to_emails) {
        // Get user ID from email and verify they belong to the same organization
        const userQuery = `
          SELECT id, email, first_name, last_name FROM users 
          WHERE email = $1 AND organization_id = $2
        `;
        const userResult = await db.query(userQuery, [email, organizationId]);
        
        if (userResult.rows.length > 0) {
          const volunteer = userResult.rows[0];
          
          // Create task assignment
          await db.query(`
            INSERT INTO task_assignments (task_id, user_id, assigned_by)
            VALUES ($1, $2, $3)
          `, [task.id, volunteer.id, createdBy]);

          assignments.push(volunteer);
        } else {
          console.warn(`Volunteer with email ${email} not found in organization ${organizationId}`);
        }
      }

      if (assignments.length === 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'No valid volunteers found for assignment'
        });
      }

      // Send email notifications to assigned volunteers
      try {
        for (const volunteer of assignments) {
          await EmailService.sendTaskAssignmentNotification({
            volunteerEmail: volunteer.email,
            volunteerName: `${volunteer.first_name} ${volunteer.last_name}`.trim() || volunteer.email,
            taskTitle: title,
            taskDescription: description,
            dueDate: due_date,
            priority: priority,
            estimatedHours: null, // No longer capturing estimated hours
            assignedByName: `${req.user.firstName} ${req.user.lastName}`.trim(),
            organizationName: req.user.organizationName
          });
        }

        // Schedule reminder emails if task has due date
        if (due_date) {
          await EmailService.scheduleTaskReminders(task.id, due_date, assignments);
        }

      } catch (emailError) {
        console.error('Failed to send task assignment emails:', emailError);
        // Don't fail the request if email fails
      }

      res.status(201).json({
        success: true,
        message: `Task created and assigned to ${assignments.length} volunteer(s)`,
        task: task,
        assignedTo: assignments.length
      });

    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create task'
      });
    }
  }

  // Get all tasks (admin view)
  static async getAllTasks(req, res) {
    try {
      const organizationId = req.organizationId;
      const { status, assignedTo, category, page = 1, limit = 50 } = req.query;

      let filters = [];
      let params = [organizationId];

      if (status && status !== 'all') {
        filters.push(`t.status = $${params.length + 1}`);
        params.push(status);
      }

      if (assignedTo && assignedTo !== 'all') {
        filters.push(`ta.user_id = $${params.length + 1}`);
        params.push(assignedTo);
      }

      if (category && category !== 'all') {
        filters.push(`t.category = $${params.length + 1}`);
        params.push(category);
      }

      const whereClause = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';
      const offset = (page - 1) * limit;

      const tasksQuery = `
        SELECT 
          t.*,
          u_creator.first_name as creator_name,
          u_creator.last_name as creator_lastname,
          COUNT(ta.id) as total_assignments,
          COUNT(CASE WHEN ta.status = 'completed' THEN 1 END) as completed_assignments,
          COUNT(CASE WHEN ta.status = 'in_progress' THEN 1 END) as in_progress_assignments,
          array_agg(
            CASE WHEN ta.user_id IS NOT NULL THEN
              json_build_object(
                'assignment_id', ta.id,
                'user_id', ta.user_id,
                'user_email', u_assigned.email,
                'user_first_name', u_assigned.first_name,
                'user_last_name', u_assigned.last_name,
                'user_name', COALESCE(
                  NULLIF(CONCAT(u_assigned.first_name, ' ', u_assigned.last_name), ' '),
                  u_assigned.email
                ),
                'status', ta.status,
                'started_at', ta.started_at,
                'completed_at', ta.completed_at,
                'completion_notes', ta.completion_notes,
                'assigned_date', ta.created_at
              )
            END
          ) FILTER (WHERE ta.user_id IS NOT NULL) as assignments
        FROM tasks t
        LEFT JOIN task_assignments ta ON t.id = ta.task_id
        LEFT JOIN users u_creator ON t.created_by = u_creator.id
        LEFT JOIN users u_assigned ON ta.user_id = u_assigned.id
        WHERE t.organization_id = $1 ${whereClause}
        GROUP BY t.id, u_creator.first_name, u_creator.last_name
        ORDER BY t.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      params.push(limit, offset);

      const tasks = await db.query(tasksQuery, params);

      // Get task statistics for admin dashboard - simplified model
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT t.id) as total_tasks,
          COUNT(CASE WHEN t.status = 'assigned' THEN 1 END) as assigned_tasks,
          COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN t.due_date < CURRENT_DATE AND t.status != 'completed' THEN 1 END) as overdue_tasks,
          AVG(t.estimated_hours) as avg_estimated_hours
        FROM tasks t
        WHERE t.organization_id = $1
      `;

      const stats = await db.query(statsQuery, [organizationId]);

      res.json({
        success: true,
        tasks: tasks.rows,
        stats: stats.rows[0],
        pagination: {
          current_page: parseInt(page),
          items_per_page: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Get all tasks error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get tasks'
      });
    }
  }

  // Get task details (for both volunteers and admins)
  static async getTaskDetails(req, res) {
    try {
      const { taskId } = req.params;
      const userId = req.user.id;
      const organizationId = req.organizationId;
      const userType = req.userType;

      let taskQuery;
      let params;

      if (userType === 'volunteer') {
        // Volunteers can only see tasks assigned to them
        taskQuery = `
          SELECT 
            t.*,
            ta.id as assignment_id,
            ta.status as assignment_status,
            ta.assigned_by,
            ta.completed_at,
            ta.completion_notes,
            ta.admin_feedback,
            ta.started_at,
            ta.created_at as assignment_date,
            u_creator.first_name as creator_name,
            u_creator.last_name as creator_lastname,
            u_assigned_by.first_name as assigned_by_name,
            u_assigned_by.last_name as assigned_by_lastname
          FROM tasks t
          JOIN task_assignments ta ON t.id = ta.task_id
          LEFT JOIN users u_creator ON t.created_by = u_creator.id
          LEFT JOIN users u_assigned_by ON ta.assigned_by = u_assigned_by.id
          WHERE t.id = $1 AND ta.user_id = $2 AND t.organization_id = $3
        `;
        params = [taskId, userId, organizationId];
      } else {
        // Admins can see any task in their organization
        taskQuery = `
          SELECT 
            t.*,
            u_creator.first_name as creator_name,
            u_creator.last_name as creator_lastname,
            array_agg(
              CASE WHEN ta.user_id IS NOT NULL THEN
                json_build_object(
                  'assignment_id', ta.id,
                  'user_id', ta.user_id,
                  'user_email', u_assigned.email,
                  'user_first_name', u_assigned.first_name,
                  'user_last_name', u_assigned.last_name,
                  'user_name', COALESCE(
                    NULLIF(CONCAT(u_assigned.first_name, ' ', u_assigned.last_name), ' '),
                    u_assigned.email
                  ),
                  'status', ta.status,
                  'started_at', ta.started_at,
                  'completed_at', ta.completed_at,
                  'completion_notes', ta.completion_notes,
                  'admin_feedback', ta.admin_feedback,
                  'assigned_date', ta.created_at
                )
              END
            ) FILTER (WHERE ta.user_id IS NOT NULL) as assignments
          FROM tasks t
          LEFT JOIN task_assignments ta ON t.id = ta.task_id
          LEFT JOIN users u_creator ON t.created_by = u_creator.id
          LEFT JOIN users u_assigned ON ta.user_id = u_assigned.id
          WHERE t.id = $1 AND t.organization_id = $2
          GROUP BY t.id, u_creator.first_name, u_creator.last_name
        `;
        params = [taskId, organizationId];
      }

      const result = await db.query(taskQuery, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Task not found'
        });
      }

      res.json({
        success: true,
        task: result.rows[0]
      });

    } catch (error) {
      console.error('Get task details error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get task details'
      });
    }
  }

  // Update task (admin only)
  static async updateTask(req, res) {
    try {
      const { taskId } = req.params;
      const { title, description, due_date, priority } = req.body;
      const organizationId = req.organizationId;

      // Verify task belongs to organization
      const taskCheck = await db.query(
        'SELECT id FROM tasks WHERE id = $1 AND organization_id = $2',
        [taskId, organizationId]
      );

      if (taskCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Task not found in your organization'
        });
      }

      // Build update query dynamically
      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        params.push(title);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        params.push(description);
      }
      if (due_date !== undefined) {
        updates.push(`due_date = $${paramIndex++}`);
        params.push(due_date);
      }
      if (priority !== undefined) {
        updates.push(`priority = $${paramIndex++}`);
        params.push(priority);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'No fields provided for update'
        });
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(taskId);

      const updateQuery = `
        UPDATE tasks
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await db.query(updateQuery, params);

      res.json({
        success: true,
        message: 'Task updated successfully',
        task: result.rows[0]
      });

    } catch (error) {
      console.error('Update task error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update task'
      });
    }
  }

  // Delete task (admin only) - only if not completed
  static async deleteTask(req, res) {
    try {
      const { taskId } = req.params;
      const organizationId = req.organizationId;

      // Check if task exists and belongs to organization
      const taskCheck = await db.query(
        'SELECT id, status FROM tasks WHERE id = $1 AND organization_id = $2',
        [taskId, organizationId]
      );

      if (taskCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Task not found in your organization'
        });
      }

      const task = taskCheck.rows[0];

      // Check if task is completed
      if (task.status === 'completed') {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Cannot delete a completed task'
        });
      }

      // Delete task assignments first (due to foreign key constraint)
      await db.query('DELETE FROM task_assignments WHERE task_id = $1', [taskId]);

      // Delete the task
      await db.query('DELETE FROM tasks WHERE id = $1', [taskId]);

      res.json({
        success: true,
        message: 'Task deleted successfully'
      });

    } catch (error) {
      console.error('Delete task error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete task'
      });
    }
  }

  // Complete task for volunteer (admin only)
  static async completeTaskForVolunteer(req, res) {
    try {
      const { taskId } = req.params;
      const { userId, completionNotes } = req.body;
      const organizationId = req.organizationId;
      const adminId = req.user.id;

      // Validate userId is provided
      if (!userId) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'User ID is required'
        });
      }

      // Verify task exists and belongs to organization
      const taskCheck = await db.query(
        'SELECT id, title FROM tasks WHERE id = $1 AND organization_id = $2',
        [taskId, organizationId]
      );

      if (taskCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Task not found in your organization'
        });
      }

      // Verify assignment exists
      const assignmentCheck = await db.query(
        'SELECT id, status FROM task_assignments WHERE task_id = $1 AND user_id = $2',
        [taskId, userId]
      );

      if (assignmentCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Task assignment not found for this user'
        });
      }

      const assignment = assignmentCheck.rows[0];

      // Check if already completed
      if (assignment.status === 'completed') {
        return res.status(400).json({
          error: 'Validation error',
          message: 'This task assignment is already completed'
        });
      }

      // Update assignment to completed
      const updateResult = await db.query(`
        UPDATE task_assignments
        SET status = 'completed',
            completed_at = CURRENT_TIMESTAMP,
            completion_notes = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE task_id = $2 AND user_id = $3
        RETURNING *
      `, [completionNotes || 'Completed by admin', taskId, userId]);

      // Check if all assignments for this task are completed
      const allAssignmentsQuery = `
        SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM task_assignments
        WHERE task_id = $1
      `;

      const assignmentStats = await db.query(allAssignmentsQuery, [taskId]);
      const stats = assignmentStats.rows[0];

      // If all assignments are completed, mark the task as completed
      if (stats.total === stats.completed) {
        await db.query(`
          UPDATE tasks
          SET status = 'completed', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [taskId]);
      } else {
        // Otherwise mark as in_progress
        await db.query(`
          UPDATE tasks
          SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND status = 'pending'
        `, [taskId]);
      }

      res.json({
        success: true,
        message: 'Task completed successfully for volunteer',
        assignment: updateResult.rows[0]
      });

    } catch (error) {
      console.error('Complete task for volunteer error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to complete task for volunteer'
      });
    }
  }
}

module.exports = TasksController;