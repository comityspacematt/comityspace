#!/usr/bin/env node

const db = require('./src/config/database');

async function findMissingTask() {
  try {
    console.log('=== SEARCHING FOR MISSING TASK ===\n');

    // 1. Look for tasks titled "test" in Red Cross org
    console.log('1. Searching for "test" tasks in Red Cross organization:');
    const testTasks = await db.query(`
      SELECT
        id,
        title,
        description,
        due_date,
        organization_id,
        created_by,
        created_at,
        priority,
        status
      FROM tasks
      WHERE LOWER(title) LIKE '%test%'
        AND organization_id = 1
      ORDER BY created_at DESC
    `);

    console.log(`Found ${testTasks.rows.length} test-related tasks:`);
    testTasks.rows.forEach(task => {
      console.log(`   Task ID: ${task.id} | "${task.title}" | Due: ${task.due_date || 'No due date'} | Created: ${task.created_at}`);
      console.log(`   Description: ${task.description || 'None'} | Priority: ${task.priority} | Status: ${task.status}`);
      console.log('   ---');
    });

    // 2. Look for tasks due on Sep 26, 2024 (assuming current year)
    console.log('\n2. Searching for tasks due September 26, 2024:');
    const sep26Tasks = await db.query(`
      SELECT
        id,
        title,
        description,
        due_date,
        organization_id,
        created_by,
        created_at
      FROM tasks
      WHERE due_date = '2024-09-26'
        OR due_date = '2025-09-26'
      ORDER BY created_at DESC
    `);

    console.log(`Found ${sep26Tasks.rows.length} tasks due September 26:`);
    sep26Tasks.rows.forEach(task => {
      console.log(`   Task ID: ${task.id} | "${task.title}" | Org: ${task.organization_id} | Due: ${task.due_date}`);
    });

    // 3. Check all task assignments involving Matt Stockwell (user ID 7)
    console.log('\n3. Checking ALL task assignments for Matt Stockwell (ID: 7):');
    const mattAssignments = await db.query(`
      SELECT
        ta.id as assignment_id,
        ta.task_id,
        ta.user_id,
        ta.status,
        ta.created_at as assigned_at,
        ta.assigned_by,
        t.title as task_title,
        t.due_date,
        t.organization_id,
        assigner.email as assigned_by_email
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      LEFT JOIN users assigner ON ta.assigned_by = assigner.id
      WHERE ta.user_id = 7
      ORDER BY ta.created_at DESC
    `);

    console.log(`Found ${mattAssignments.rows.length} assignments for Matt:`);
    mattAssignments.rows.forEach(assignment => {
      console.log(`   Assignment ID: ${assignment.assignment_id} | Task: "${assignment.task_title}"`);
      console.log(`   Due: ${assignment.due_date || 'No due date'} | Status: ${assignment.status}`);
      console.log(`   Assigned by: ${assignment.assigned_by_email || 'Unknown'} on ${assignment.assigned_at}`);
      console.log('   ---');
    });

    // 4. Check for assignments that might have been made by email lookup
    console.log('\n4. Checking if there are assignments made by email lookup:');
    const emailAssignments = await db.query(`
      SELECT
        ta.id as assignment_id,
        ta.task_id,
        ta.user_id,
        ta.status,
        ta.created_at as assigned_at,
        t.title as task_title,
        t.due_date,
        u.email as user_email
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE t.organization_id = 1
        AND (u.email = 'testing1@redcross.local' OR ta.user_id = 7)
      ORDER BY ta.created_at DESC
    `);

    console.log(`Found ${emailAssignments.rows.length} assignments by email lookup:`);
    emailAssignments.rows.forEach(assignment => {
      console.log(`   Assignment: "${assignment.task_title}" → ${assignment.user_email} (ID: ${assignment.user_id})`);
    });

    // 5. Check for recent tasks created in Red Cross that might be unassigned
    console.log('\n5. Recent unassigned tasks in Red Cross:');
    const unassignedTasks = await db.query(`
      SELECT
        t.id,
        t.title,
        t.description,
        t.due_date,
        t.created_at,
        COUNT(ta.id) as assignment_count
      FROM tasks t
      LEFT JOIN task_assignments ta ON t.id = ta.task_id
      WHERE t.organization_id = 1
      GROUP BY t.id, t.title, t.description, t.due_date, t.created_at
      ORDER BY t.created_at DESC
      LIMIT 10
    `);

    console.log('Recent tasks and their assignment counts:');
    unassignedTasks.rows.forEach(task => {
      console.log(`   "${task.title}" | Due: ${task.due_date || 'No due date'} | Assignments: ${task.assignment_count} | Created: ${task.created_at}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

findMissingTask();