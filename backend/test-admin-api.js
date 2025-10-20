const express = require('express');
const cors = require('cors');
const db = require('./src/config/database');

// Simple test to check admin dashboard API
async function testAdminDashboard() {
  try {
    console.log('🔍 Testing admin dashboard API directly...');

    // Test the exact query from the controller
    const organizationId = 4; // Testing NP

    const recentDocumentsQuery = `
      SELECT
        title,
        description,
        category,
        is_pinned,
        created_at,
        file_path
      FROM documents
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT 6
    `;

    const recentDocuments = await db.query(recentDocumentsQuery, [organizationId]);

    console.log('📄 Documents query result:', {
      organizationId,
      rowCount: recentDocuments.rows.length,
      documents: recentDocuments.rows
    });

    // Test what the response would look like
    const response = {
      success: true,
      dashboard: {
        volunteerStats: { total_volunteers: 0, admin_count: 0, active_volunteers: 0 },
        taskOverview: { total_tasks: 0, pending_tasks: 0, in_progress_tasks: 0, completed_tasks: 0, completed_assignments: 0 },
        recentActivity: [],
        upcomingEvents: [],
        recentDocuments: recentDocuments.rows
      }
    };

    console.log('🎯 Expected API response structure:', JSON.stringify(response, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testAdminDashboard();