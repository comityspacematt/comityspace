const db = require('./src/config/database');

async function testAdminRouteQuery() {
  try {
    console.log('🔍 Testing admin route recent activity query...');

    const organizationId = 4; // Testing NP

    // Exact query from admin.js route
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
      ORDER BY ta.created_at DESC
      LIMIT 10
    `;

    const result = await db.query(recentActivityQuery, [organizationId]);

    console.log('\n📋 Admin Route Recent Activity Query Results:');
    console.log('Row count:', result.rows.length);

    result.rows.forEach((activity, index) => {
      console.log(`\nActivity ${index + 1}:`);
      console.log('  Type:', activity.type);
      console.log('  Description:', activity.description);
      console.log('  Due Date:', activity.due_date);
      console.log('  Due Date Type:', typeof activity.due_date);
      console.log('  Status:', activity.status);
      console.log('  User Name:', activity.user_name);
      console.log('  Raw object:', JSON.stringify(activity, null, 2));
    });

    console.log('\n🎯 What frontend should receive in recentActivity array:');
    console.log(JSON.stringify(result.rows, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testAdminRouteQuery();