const db = require('./src/config/database');

async function checkTasksDueDates() {
  try {
    console.log('🔍 Checking tasks with due dates...');

    // Check all tasks with their due dates
    const tasksResult = await db.query(`
      SELECT t.id, t.title, t.due_date, t.organization_id, o.name as org_name
      FROM tasks t
      LEFT JOIN organizations o ON t.organization_id = o.id
      ORDER BY t.organization_id, t.due_date
    `);

    console.log('\n📋 All Tasks with Due Dates:');
    if (tasksResult.rows.length === 0) {
      console.log('  - No tasks found in database');
    } else {
      tasksResult.rows.forEach(task => {
        console.log(`  - ID: ${task.id}, Title: ${task.title}`);
        console.log(`    Org: ${task.org_name} (ID: ${task.organization_id})`);
        console.log(`    Due Date: ${task.due_date || 'No due date'}`);
        console.log('');
      });
    }

    // Check task assignments with due dates
    const assignmentsResult = await db.query(`
      SELECT
        ta.id as assignment_id,
        t.title,
        t.due_date,
        ta.status,
        t.organization_id,
        u.email as assignee_email
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE t.organization_id = 4
      ORDER BY ta.created_at DESC
      LIMIT 5
    `);

    console.log('\n📋 Recent Task Assignments for Testing NP (ID: 4):');
    if (assignmentsResult.rows.length === 0) {
      console.log('  - No task assignments found');
    } else {
      assignmentsResult.rows.forEach(assignment => {
        console.log(`  - Assignment ID: ${assignment.assignment_id}`);
        console.log(`    Task: ${assignment.title}`);
        console.log(`    Due Date: ${assignment.due_date || 'No due date'}`);
        console.log(`    Status: ${assignment.status}`);
        console.log(`    Assignee: ${assignment.assignee_email}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkTasksDueDates();