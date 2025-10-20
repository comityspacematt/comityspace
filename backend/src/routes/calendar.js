const express = require('express');
const router = express.Router();
const CalendarController = require('../controllers/calendarController');
const {
  authenticateToken,
  requireVolunteer,
  requireSameOrganization,
  validateOrganizationAccess
} = require('../middleware/auth');

// All calendar routes require authentication and organization validation
router.use(authenticateToken);
router.use(requireSameOrganization);
router.use(validateOrganizationAccess);

// Get calendar events
// GET /api/calendar/events?month=1&year=2025&view=month&upcoming=true
router.get('/events', CalendarController.getEvents);

// Get upcoming events for dashboard
// GET /api/calendar/upcoming?limit=5
router.get('/upcoming', CalendarController.getUpcomingEvents);

// Get single event details
// GET /api/calendar/events/:eventId
router.get('/events/:eventId', CalendarController.getEventDetails);

// RSVP to event (volunteers and admins)
// POST /api/calendar/events/:eventId/rsvp
router.post('/events/:eventId/rsvp', CalendarController.rsvpToEvent);

// Export event as ICS file
// GET /api/calendar/events/:eventId/export
router.get('/events/:eventId/export', CalendarController.exportEvent);

// Admin-only routes for creating/managing events
// Create new event (admin only)
router.post('/events', async (req, res) => {
  try {
    // Check if user is admin
    if (req.userType !== 'nonprofit_admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only nonprofit admins can create events'
      });
    }
    const {
      title,
      description,
      location,
      start_date,
      end_date,
      start_time,
      end_time,
      is_all_day,
      event_type,
      max_volunteers
    } = req.body;

    const organizationId = req.organizationId;
    const createdBy = req.user.id;

    // Validate required fields
    if (!title || !start_date) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Title and start date are required'
      });
    }

    // Validate event type
    const validTypes = ['meeting', 'volunteer_event', 'fundraiser', 'training', 'other'];
    const eventType = event_type || 'volunteer_event';
    if (!validTypes.includes(eventType)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid event type'
      });
    }

    const insertQuery = `
      INSERT INTO calendar_events (
        title, description, location, start_date, end_date, start_time, end_time,
        is_all_day, event_type, max_volunteers, organization_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      title,
      description || null,
      location || null,
      start_date,
      end_date || start_date,
      start_time || null,
      end_time || null,
      is_all_day || false,
      eventType,
      max_volunteers || null,
      organizationId,
      createdBy
    ];

    const result = await require('../config/database').query(insertQuery, values);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event: result.rows[0]
    });

  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create event'
    });
  }
});

// Update event (admin only)
router.put('/events/:eventId', async (req, res) => {
  try {
    // Check if user is admin
    if (req.userType !== 'nonprofit_admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only nonprofit admins can update events'
      });
    }
    const { eventId } = req.params;
    const {
      title,
      description,
      location,
      start_date,
      end_date,
      start_time,
      end_time,
      is_all_day,
      event_type,
      max_volunteers
    } = req.body;

    const organizationId = req.organizationId;

    // Verify event exists and belongs to organization
    const checkQuery = `
      SELECT id FROM calendar_events 
      WHERE id = $1 AND organization_id = $2
    `;
    const checkResult = await require('../config/database').query(checkQuery, [eventId, organizationId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Event not found'
      });
    }

    const updateQuery = `
      UPDATE calendar_events SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        location = COALESCE($3, location),
        start_date = COALESCE($4, start_date),
        end_date = COALESCE($5, end_date),
        start_time = COALESCE($6, start_time),
        end_time = COALESCE($7, end_time),
        is_all_day = COALESCE($8, is_all_day),
        event_type = COALESCE($9, event_type),
        max_volunteers = COALESCE($10, max_volunteers),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11 AND organization_id = $12
      RETURNING *
    `;

    const values = [
      title, description, location, start_date, end_date,
      start_time, end_time, is_all_day, event_type, max_volunteers,
      eventId, organizationId
    ];

    const result = await require('../config/database').query(updateQuery, values);

    res.json({
      success: true,
      message: 'Event updated successfully',
      event: result.rows[0]
    });

  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update event'
    });
  }
});

// Delete event (admin only)
router.delete('/events/:eventId', async (req, res) => {
  try {
    // Check if user is admin
    if (req.userType !== 'nonprofit_admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only nonprofit admins can delete events'
      });
    }
    const { eventId } = req.params;
    const organizationId = req.organizationId;

    // First delete all signups for this event
    await require('../config/database').query(
      'DELETE FROM event_signups WHERE event_id = $1',
      [eventId]
    );

    // Then delete the event
    const deleteQuery = `
      DELETE FROM calendar_events 
      WHERE id = $1 AND organization_id = $2
      RETURNING title
    `;
    const result = await require('../config/database').query(deleteQuery, [eventId, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: `Event "${result.rows[0].title}" deleted successfully`
    });

  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete event'
    });
  }
});

module.exports = router;