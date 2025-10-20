const db = require('./src/config/database');

async function testExactControllerQuery() {
  try {
    console.log('🔍 Testing exact controller query...');

    // Use the exact organizationId that would be passed by the middleware
    const organizationId = 4; // Testing NP

    // Exact query from the controller
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
      if (recentActivityRows.length > 0) {
        console.log('Sample activity with due date:', recentActivityRows[0]);
        console.log('Due date field specifically:', recentActivityRows[0].due_date);
        console.log('Due date type:', typeof recentActivityRows[0].due_date);
      }
    } catch (queryError) {
      console.error('Recent Activity Query Error:', queryError);
      // Continue with empty array if query fails
    }

    // Simulate the exact response structure the controller sends
    const response = {
      success: true,
      dashboard: {
        volunteerStats: { total_volunteers: 0, admin_count: 0, active_volunteers: 0 },
        taskOverview: { total_tasks: 0, pending_tasks: 0, in_progress_tasks: 0, completed_tasks: 0, completed_assignments: 0 },
        recentActivity: recentActivityRows,
        upcomingEvents: []
      }
    };

    console.log('\n🎯 Complete response structure:');
    console.log(JSON.stringify(response, null, 2));

    console.log('\n📊 Analysis:');
    console.log('- Recent activity count:', recentActivityRows.length);
    console.log('- First activity due_date:', recentActivityRows[0]?.due_date);
    console.log('- Is due_date truthy?', !!recentActivityRows[0]?.due_date);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testExactControllerQuery();