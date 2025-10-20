#!/usr/bin/env node

const db = require('./src/config/database');

async function debugMattStockwell() {
  try {
    console.log('=== DEBUGGING MATT STOCKWELL (testing1@redcross.local) ===\n');

    // 1. Check if user exists in users table
    console.log('1. Checking if user exists in users table:');
    const userCheck = await db.query(`
      SELECT id, email, first_name, last_name, role, organization_id, login_count, profile_completed
      FROM users
      WHERE email = $1
    `, ['testing1@redcross.local']);

    if (userCheck.rows.length > 0) {
      console.log('✅ User found in users table:');
      userCheck.rows.forEach(user => {
        console.log(`   ID: ${user.id}, Email: ${user.email}, Name: ${user.first_name || 'NULL'} ${user.last_name || 'NULL'}`);
        console.log(`   Role: ${user.role}, Org: ${user.organization_id}, Logins: ${user.login_count}`);
      });
    } else {
      console.log('❌ User NOT found in users table');
    }

    // 2. Check if user exists in whitelisted_emails table
    console.log('\n2. Checking whitelisted_emails table:');
    const whitelistCheck = await db.query(`
      SELECT email, role, organization_id, notes, added_by
      FROM whitelisted_emails
      WHERE email = $1
    `, ['testing1@redcross.local']);

    if (whitelistCheck.rows.length > 0) {
      console.log('✅ User found in whitelisted_emails:');
      whitelistCheck.rows.forEach(entry => {
        console.log(`   Email: ${entry.email}, Role: ${entry.role}, Org: ${entry.organization_id}`);
        console.log(`   Notes: ${entry.notes}`);
        console.log(`   Added by: ${entry.added_by}`);
      });
    } else {
      console.log('❌ User NOT found in whitelisted_emails');
    }

    // 3. Check task assignments for this email/user
    console.log('\n3. Checking task assignments:');

    // First, check assignments by email (if assignments were made before user was created)
    const emailAssignments = await db.query(`
      SELECT
        ta.id as assignment_id,
        ta.task_id,
        ta.user_id,
        ta.status,
        t.title as task_title,
        t.organization_id as task_org,
        u.email as assigned_user_email
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE u.email = $1 OR ta.user_id IN (
        SELECT id FROM users WHERE email = $1
      )
    `, ['testing1@redcross.local']);

    if (emailAssignments.rows.length > 0) {
      console.log('✅ Task assignments found:');
      emailAssignments.rows.forEach(assignment => {
        console.log(`   Assignment ID: ${assignment.assignment_id}`);
        console.log(`   Task: "${assignment.task_title}" (Task ID: ${assignment.task_id})`);
        console.log(`   Assigned User ID: ${assignment.user_id}`);
        console.log(`   Status: ${assignment.status}`);
        console.log(`   Task Organization: ${assignment.task_org}`);
        console.log(`   User Email: ${assignment.assigned_user_email || 'NOT FOUND'}`);
        console.log('   ---');
      });
    } else {
      console.log('❌ No task assignments found for this user');
    }

    // 4. Check all task assignments that might be orphaned
    console.log('\n4. Checking for orphaned task assignments:');
    const orphanedAssignments = await db.query(`
      SELECT
        ta.id as assignment_id,
        ta.task_id,
        ta.user_id,
        ta.status,
        t.title as task_title,
        u.email as user_email
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE u.id IS NULL
    `);

    if (orphanedAssignments.rows.length > 0) {
      console.log('⚠️  Found orphaned assignments (assigned to non-existent users):');
      orphanedAssignments.rows.forEach(assignment => {
        console.log(`   Assignment ID: ${assignment.assignment_id}, Task: "${assignment.task_title}", User ID: ${assignment.user_id} (NOT FOUND)`);
      });
    } else {
      console.log('✅ No orphaned assignments found');
    }

    // 5. Check recent task assignments in Red Cross organization
    console.log('\n5. Recent task assignments in Red Cross organization:');
    const recentAssignments = await db.query(`
      SELECT
        ta.id as assignment_id,
        ta.task_id,
        ta.user_id,
        ta.status,
        ta.created_at as assigned_at,
        t.title as task_title,
        u.email as user_email,
        u.first_name,
        u.last_name
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.id
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE t.organization_id = 1
      ORDER BY ta.created_at DESC
      LIMIT 10
    `);

    console.log('Recent assignments in Red Cross org:');
    recentAssignments.rows.forEach(assignment => {
      console.log(`   ${assignment.assigned_at}: "${assignment.task_title}" → ${assignment.user_email || 'USER NOT FOUND'} (${assignment.first_name || 'NULL'} ${assignment.last_name || 'NULL'})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

debugMattStockwell();