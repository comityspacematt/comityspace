#!/usr/bin/env node

const db = require('./src/config/database');

async function showUsers() {
  try {
    console.log('=== USERS TABLE ===\n');

    const users = await db.query(`
      SELECT
        id,
        email,
        first_name,
        last_name,
        role,
        organization_id,
        login_count,
        profile_completed,
        created_at
      FROM users
      ORDER BY id
    `);

    console.log('Total users:', users.rows.length);
    console.log('');

    users.rows.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.first_name || 'NULL'} ${user.last_name || 'NULL'}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Organization ID: ${user.organization_id}`);
      console.log(`  Login Count: ${user.login_count}`);
      console.log(`  Profile Completed: ${user.profile_completed}`);
      console.log(`  Created: ${user.created_at}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

showUsers();