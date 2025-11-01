const db = require('../config/database');

class DashboardController {
  // Get dashboard overview data for volunteers
  static async getVolunteerDashboard(req, res) {
    try {
      const userId = req.user.id;
      const organizationId = req.organizationId;

      // Get user's assigned tasks
      const tasksQuery = `
        SELECT t.*, ta.status as assignment_status, ta.completed_at, ta.assigned_by,
               u.first_name as assigned_by_name, u.last_name as assigned_by_lastname
        FROM tasks t
        JOIN task_assignments ta ON t.id = ta.task_id
        LEFT JOIN users u ON ta.assigned_by = u.id
        WHERE ta.user_id = $1 AND t.organization_id = $2
        ORDER BY 
          CASE WHEN ta.status = 'assigned' THEN 1 
               WHEN ta.status = 'in_progress' THEN 2 
               ELSE 3 END,
          t.due_date ASC NULLS LAST,
          t.created_at DESC
        LIMIT 10
      `;

      const tasks = await db.query(tasksQuery, [userId, organizationId]);

      // Get upcoming calendar events
      const eventsQuery = `
        SELECT * FROM calendar_events
        WHERE organization_id = $1 AND start_date >= CURRENT_DATE
        ORDER BY start_date ASC, start_time ASC NULLS LAST
        LIMIT 10
      `;

      const events = await db.query(eventsQuery, [organizationId]);

      // Get recent/pinned documents
      const documentsQuery = `
        SELECT d.*, u.first_name as uploader_name, u.last_name as uploader_lastname
        FROM documents d
        LEFT JOIN users u ON d.uploaded_by = u.id
        WHERE d.organization_id = $1 AND (d.visibility = 'all' OR d.visibility = 'volunteers_only')
        ORDER BY d.is_pinned DESC, d.created_at DESC
        LIMIT 6
      `;

      const documents = await db.query(documentsQuery, [organizationId]);

      // Get task statistics
      const taskStatsQuery = `
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN ta.status = 'assigned' THEN 1 END) as pending_tasks,
          COUNT(CASE WHEN ta.status = 'in_progress' THEN 1 END) as in_progress_tasks,
          COUNT(CASE WHEN ta.status = 'completed' THEN 1 END) as completed_tasks
        FROM task_assignments ta
        JOIN tasks t ON ta.task_id = t.id
        WHERE ta.user_id = $1 AND t.organization_id = $2
      `;

      const taskStats = await db.query(taskStatsQuery, [userId, organizationId]);

      res.json({
        success: true,
        dashboard: {
          tasks: tasks.rows,
          events: events.rows,
          documents: documents.rows,
          taskStats: taskStats.rows[0] || {
            total_tasks: 0,
            pending_tasks: 0,
            in_progress_tasks: 0,
            completed_tasks: 0
          }
        }
      });

    } catch (error) {
      console.error('Volunteer dashboard error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to load dashboard data'
      });
    }
  }

  // Get admin dashboard data
  static async getAdminDashboard(req, res) {
    try {
      console.log('🔍 Admin dashboard API called!');
      const organizationId = req.organizationId;
      console.log('🔍 Organization ID:', organizationId);

      // Get volunteer statistics
      const volunteerStatsQuery = `
        SELECT 
          COUNT(*) as total_volunteers,
          COUNT(CASE WHEN w.role = 'nonprofit_admin' THEN 1 END) as admin_count,
          COUNT(CASE WHEN u.last_login IS NOT NULL THEN 1 END) as active_volunteers
        FROM whitelisted_emails w
        LEFT JOIN users u ON w.email = u.email AND u.organization_id = w.organization_id
        WHERE w.organization_id = $1 AND w.is_active = true
      `;

      const volunteerStats = await db.query(volunteerStatsQuery, [organizationId]);

      // Get task overview
      const taskOverviewQuery = `
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
          COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
          COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN ta.status = 'completed' THEN 1 END) as completed_assignments
        FROM tasks t
        LEFT JOIN task_assignments ta ON t.id = ta.task_id
        WHERE t.organization_id = $1
      `;

      const taskOverview = await db.query(taskOverviewQuery, [organizationId]);

      // Get recent activity (tasks assigned with due dates and status)
      const recentTasksQuery = `
        SELECT
          t.title,
          t.due_date,
          ta.status,
          ta.created_at,
          creator.first_name as creator_first_name,
          creator.last_name as creator_last_name,
          assignee.first_name as assignee_first_name,
          assignee.last_name as assignee_last_name,
          assignee.email as assignee_email,
          'task_assigned' as activity_type
        FROM task_assignments ta
        JOIN tasks t ON ta.task_id = t.id
        LEFT JOIN users creator ON t.created_by = creator.id
        LEFT JOIN users assignee ON ta.user_id = assignee.id
        WHERE t.organization_id = $1 AND ta.created_at IS NOT NULL
        ORDER BY ta.created_at DESC
        LIMIT 8
      `;

      let recentActivityRows = [];
      try {
        const recentActivity = await db.query(recentTasksQuery, [organizationId]);
        recentActivityRows = recentActivity.rows;
        console.log('Recent Activity Query Result:', recentActivityRows);
        console.log('Sample activity with due date:', recentActivityRows[0]);
      } catch (queryError) {
        console.error('Recent Activity Query Error:', queryError);
        // Continue with empty array if query fails
      }

      // Get upcoming events
      const upcomingEventsQuery = `
        SELECT * FROM calendar_events
        WHERE organization_id = $1 AND start_date >= CURRENT_DATE
        ORDER BY start_date ASC, start_time ASC NULLS LAST
        LIMIT 5
      `;

      const upcomingEvents = await db.query(upcomingEventsQuery, [organizationId]);

      res.json({
        success: true,
        dashboard: {
          volunteerStats: volunteerStats.rows[0] || {
            total_volunteers: 0,
            admin_count: 0,
            active_volunteers: 0
          },
          taskOverview: taskOverview.rows[0] || {
            total_tasks: 0,
            pending_tasks: 0,
            in_progress_tasks: 0,
            completed_tasks: 0,
            completed_assignments: 0
          },
          recentActivity: recentActivityRows,
          upcomingEvents: upcomingEvents.rows
        }
      });

    } catch (error) {
      console.error('Admin dashboard error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to load admin dashboard data'
      });
    }
  }

  // Get volunteers directory (for volunteers to see each other)
  static async getVolunteersDirectory(req, res) {
    try {
      // Use targetOrganizationId set by requireSameOrganization middleware, fallback to organizationId
      const organizationId = req.targetOrganizationId || req.organizationId;

      console.log('🔍 Volunteers directory debug:', {
        userEmail: req.user?.email,
        userType: req.userType,
        organizationId: req.organizationId,
        targetOrganizationId: req.targetOrganizationId,
        usingOrgId: organizationId
      });

      // Get all volunteers in the organization with their profile info
      const volunteersQuery = `
        SELECT
          u.id,
          w.email,
          u.first_name,
          u.last_name,
          u.phone,
          u.address,
          u.birth_date,
          w.role,
          u.last_login,
          u.login_count,
          u.created_at,
          w.notes as admin_notes
        FROM whitelisted_emails w
        LEFT JOIN users u ON w.email = u.email AND u.organization_id = w.organization_id
        WHERE w.organization_id = $1 AND w.is_active = true AND w.email IS NOT NULL
        ORDER BY
          CASE WHEN w.role = 'nonprofit_admin' THEN 1 ELSE 2 END,
          u.first_name ASC NULLS LAST,
          u.last_name ASC NULLS LAST,
          w.email ASC
      `;

      const volunteers = await db.query(volunteersQuery, [organizationId]);

      console.log('🔍 Raw volunteers data from DB:', volunteers.rows.map(v => ({
        email: v.email,
        first_name: v.first_name,
        last_name: v.last_name,
        admin_notes: v.admin_notes
      })));

      // Get organization info
      const orgQuery = `
        SELECT name, description FROM organizations WHERE id = $1
      `;
      
      const organization = await db.query(orgQuery, [organizationId]);

      res.json({
        success: true,
        organization: organization.rows[0],
        volunteers: volunteers.rows.map(volunteer => {
          // Admin is the authoritative source for volunteer data
          // Always check notes first, then fall back to user registration data
          let firstName = 'Not set';
          let lastName = 'Not set';
          let adminNotes = '';

          // Try to get admin-managed data from notes JSON first
          if (volunteer.admin_notes) {
            try {
              const notesData = JSON.parse(volunteer.admin_notes);
              console.log(`📝 Parsing notes for ${volunteer.email}:`, notesData);
              if (notesData.firstName) {
                firstName = notesData.firstName;
              }
              if (notesData.lastName) {
                lastName = notesData.lastName;
              }
              if (notesData.adminNotes) {
                adminNotes = notesData.adminNotes;
              }
            } catch (e) {
              console.log(`❌ JSON parse failed for ${volunteer.email}, treating as plain notes:`, volunteer.admin_notes);
              // If notes is not valid JSON, treat it as plain admin notes
              adminNotes = volunteer.admin_notes;
            }
          }

          // Only fall back to user registration data if admin hasn't set names
          if (firstName === 'Not set' && volunteer.first_name) {
            firstName = volunteer.first_name;
          }
          if (lastName === 'Not set' && volunteer.last_name) {
            lastName = volunteer.last_name;
          }

          // Format birth_date as YYYY-MM-DD for HTML date input compatibility
          let formattedBirthday = '';
          if (volunteer.birth_date) {
            const date = new Date(volunteer.birth_date);
            formattedBirthday = date.toISOString().split('T')[0];
          }

          const result = {
            id: volunteer.id,
            email: volunteer.email,
            firstName: firstName,
            lastName: lastName,
            phone: volunteer.phone || 'Not provided',
            address: volunteer.address || '',
            birthday: formattedBirthday,
            role: volunteer.role,
            isActive: volunteer.login_count > 0,
            lastLogin: volunteer.last_login,
            joinedAt: volunteer.created_at,
            // Don't show admin notes to regular volunteers
            notes: req.userType === 'nonprofit_admin' || req.userType === 'super_admin'
              ? adminNotes
              : null
          };

          console.log(`👤 Processed volunteer ${volunteer.email}:`, {
            firstName: result.firstName,
            lastName: result.lastName,
            notes: result.notes
          });

          return result;
        })
      });

    } catch (error) {
      console.error('Volunteers directory error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to load volunteers directory'
      });
    }
  }

  // Get calendar events
  static async getCalendarEvents(req, res) {
    try {
      const organizationId = req.organizationId;
      const { month, year, view = 'month' } = req.query;

      let dateFilter = '';
      let params = [organizationId];

      if (month && year) {
        // Filter by specific month/year
        dateFilter = `AND EXTRACT(MONTH FROM start_date) = $2 AND EXTRACT(YEAR FROM start_date) = $3`;
        params.push(month, year);
      } else {
        // Default to current month and future
        dateFilter = `AND start_date >= CURRENT_DATE - INTERVAL '30 days'`;
      }

      const eventsQuery = `
        SELECT 
          e.*,
          u.first_name as creator_name,
          u.last_name as creator_lastname,
          (SELECT COUNT(*) FROM event_signups es WHERE es.event_id = e.id) as signup_count,
          CASE WHEN EXISTS (
            SELECT 1 FROM event_signups es2 
            WHERE es2.event_id = e.id AND es2.user_id = $${params.length + 1}
          ) THEN true ELSE false END as user_signed_up
        FROM calendar_events e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.organization_id = $1 ${dateFilter}
        ORDER BY e.start_date ASC, e.start_time ASC NULLS LAST
      `;

      params.push(req.user.id);

      const events = await db.query(eventsQuery, params);

      res.json({
        success: true,
        events: events.rows,
        view: view
      });

    } catch (error) {
      console.error('Calendar events error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to load calendar events'
      });
    }
  }
}

module.exports = DashboardController;