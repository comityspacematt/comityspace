#!/usr/bin/env node

const db = require('./src/config/database');

async function checkTaskAssignments() {
  try {
    console.log('=== CHECKING TASK ASSIGNMENTS AND USER DATA ===\n');

    // Check users table
    console.log('📋 USERS TABLE:');
    const users = await db.query(`
      SELECT id, email, first_name, last_name, organization_id
      FROM users
      WHERE first_name IS NOT NULL OR last_name IS NOT NULL
      ORDER BY id
    `);

    users.rows.forEach(user => {
      console.log(`  ID: ${user.id} | ${user.email} | ${user.first_name} ${user.last_name} | Org: ${user.organization_id}`);
    });

    console.log('\n📋 ALL USERS:');
    const allUsers = await db.query('SELECT id, email, first_name, last_name, organization_id FROM users ORDER BY id');
    allUsers.rows.forEach(user => {
      console.log(`  ID: ${user.id} | ${user.email} | ${user.first_name || 'NULL'} ${user.last_name || 'NULL'} | Org: ${user.organization_id}`);
    });

    console.log('\n📋 TASK ASSIGNMENTS:');
    const assignments = await db.query(`
      SELECT
        ta.id as assignment_id,
        ta.task_id,
        ta.user_id,
        ta.status,
        t.title as task_title,
        u.email as user_email,
        u.first_name,
        u.last_name,
        u.id as actual_user_id
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      LEFT JOIN users u ON ta.user_id = u.id
      ORDER BY ta.id
    `);

    assignments.rows.forEach(assignment => {
      console.log(`  Assignment ID: ${assignment.assignment_id} | Task: "${assignment.task_title}" | Assigned User ID: ${assignment.user_id} | User: ${assignment.user_email || 'NOT FOUND'} | Name: ${assignment.first_name || 'NULL'} ${assignment.last_name || 'NULL'}`);
    });

    console.log('\n📋 MISMATCH CHECK:');
    const mismatches = assignments.rows.filter(a => a.user_id !== a.actual_user_id || !a.user_email);
    if (mismatches.length > 0) {
      console.log('❌ Found mismatches:');
      mismatches.forEach(m => {
        console.log(`  Assignment ID ${m.assignment_id}: Assigned to user_id ${m.user_id} but user not found or ID mismatch`);
      });
    } else {
      console.log('✅ All task assignments match valid users');
    }

    console.log('\n📋 DETAILED USER-ASSIGNMENT MAPPING:');
    for (const user of allUsers.rows) {
      const userAssignments = assignments.rows.filter(a => a.user_id === user.id);
      console.log(`  User ID ${user.id} (${user.email}): ${userAssignments.length} assignments`);
      userAssignments.forEach(a => {
        console.log(`    - Task: "${a.task_title}" (Status: ${a.status})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkTaskAssignments();