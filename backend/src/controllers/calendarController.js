const db = require('../config/database');

class CalendarController {
  // Get calendar events with RSVP status
  static async getEvents(req, res) {
    try {
      const organizationId = req.organizationId;
      const userId = req.user.id;
      const { month, year, view = 'month', upcoming = false } = req.query;

      let dateFilter = '';
      let params = [organizationId, userId];

      if (upcoming === 'true') {
        // Get upcoming events only
        dateFilter = `AND e.start_date >= CURRENT_DATE`;
      } else if (month && year) {
        // Filter by specific month/year
        dateFilter = `AND EXTRACT(MONTH FROM e.start_date) = $3 AND EXTRACT(YEAR FROM e.start_date) = $4`;
        params.push(month, year);
      } else {
        // Default to current month and next 3 months
        dateFilter = `AND e.start_date >= CURRENT_DATE - INTERVAL '7 days' AND e.start_date <= CURRENT_DATE + INTERVAL '3 months'`;
      }

      const eventsQuery = `
        SELECT 
          e.*,
          u.first_name as creator_name,
          u.last_name as creator_lastname,
          COUNT(es.id) as total_signups,
          COUNT(CASE WHEN es.status = 'signed_up' THEN 1 END) as confirmed_signups,
          CASE WHEN user_signup.id IS NOT NULL THEN user_signup.status ELSE null END as user_rsvp_status,
          user_signup.id as user_signup_id,
          user_signup.notes as user_signup_notes
        FROM calendar_events e
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN event_signups es ON e.id = es.event_id
        LEFT JOIN event_signups user_signup ON e.id = user_signup.event_id AND user_signup.user_id = $2
        WHERE e.organization_id = $1 ${dateFilter}
        GROUP BY e.id, u.first_name, u.last_name, user_signup.id, user_signup.status, user_signup.notes
        ORDER BY e.start_date ASC, e.start_time ASC NULLS LAST
      `;

      const events = await db.query(eventsQuery, params);

      // Format events for frontend
      const formattedEvents = events.rows.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        start_date: event.start_date,
        end_date: event.end_date,
        start_time: event.start_time,
        end_time: event.end_time,
        is_all_day: event.is_all_day,
        event_type: event.event_type,
        max_volunteers: event.max_volunteers,
        total_signups: parseInt(event.total_signups) || 0,
        confirmed_signups: parseInt(event.confirmed_signups) || 0,
        created_by: event.created_by,
        creator_name: event.creator_name,
        creator_lastname: event.creator_lastname,
        user_rsvp_status: event.user_rsvp_status,
        user_signup_id: event.user_signup_id,
        user_signup_notes: event.user_signup_notes,
        can_signup: !event.max_volunteers || parseInt(event.confirmed_signups) < event.max_volunteers,
        created_at: event.created_at
      }));

      res.json({
        success: true,
        events: formattedEvents,
        view: view,
        filter: { month, year, upcoming }
      });

    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get events'
      });
    }
  }

  // Get single event details
  static async getEventDetails(req, res) {
    try {
      const { eventId } = req.params;
      const organizationId = req.organizationId;
      const userId = req.user.id;

      const eventQuery = `
        SELECT 
          e.*,
          u.first_name as creator_name,
          u.last_name as creator_lastname,
          COUNT(es.id) as total_signups,
          COUNT(CASE WHEN es.status = 'signed_up' THEN 1 END) as confirmed_signups,
          CASE WHEN user_signup.id IS NOT NULL THEN user_signup.status ELSE null END as user_rsvp_status,
          user_signup.id as user_signup_id,
          user_signup.notes as user_signup_notes
        FROM calendar_events e
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN event_signups es ON e.id = es.event_id
        LEFT JOIN event_signups user_signup ON e.id = user_signup.event_id AND user_signup.user_id = $2
        WHERE e.id = $1 AND e.organization_id = $3
        GROUP BY e.id, u.first_name, u.last_name, user_signup.id, user_signup.status, user_signup.notes
      `;

      const eventResult = await db.query(eventQuery, [eventId, userId, organizationId]);

      if (eventResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Event not found'
        });
      }

      const event = eventResult.rows[0];

      // Get list of attendees (for admins or if user is signed up)
      let attendees = [];
      if (req.userType === 'nonprofit_admin' || event.user_signup_id) {
        const attendeesQuery = `
          SELECT 
            es.id,
            es.status,
            es.notes,
            es.created_at as signup_date,
            u.first_name,
            u.last_name,
            u.email
          FROM event_signups es
          JOIN users u ON es.user_id = u.id
          WHERE es.event_id = $1
          ORDER BY es.created_at ASC
        `;

        const attendeesResult = await db.query(attendeesQuery, [eventId]);
        attendees = attendeesResult.rows;
      }

      res.json({
        success: true,
        event: {
          id: event.id,
          title: event.title,
          description: event.description,
          location: event.location,
          start_date: event.start_date,
          end_date: event.end_date,
          start_time: event.start_time,
          end_time: event.end_time,
          is_all_day: event.is_all_day,
          event_type: event.event_type,
          max_volunteers: event.max_volunteers,
          total_signups: parseInt(event.total_signups) || 0,
          confirmed_signups: parseInt(event.confirmed_signups) || 0,
          created_by: event.created_by,
          creator_name: event.creator_name,
          creator_lastname: event.creator_lastname,
          user_rsvp_status: event.user_rsvp_status,
          user_signup_id: event.user_signup_id,
          user_signup_notes: event.user_signup_notes,
          can_signup: !event.max_volunteers || parseInt(event.confirmed_signups) < event.max_volunteers,
          created_at: event.created_at
        },
        attendees: attendees
      });

    } catch (error) {
      console.error('Get event details error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get event details'
      });
    }
  }

  // RSVP to event
  static async rsvpToEvent(req, res) {
    try {
      const { eventId } = req.params;
      const { status, notes } = req.body; // status: 'signed_up' or 'cancelled'
      const userId = req.user?.id;
      const organizationId = req.organizationId;

      // Debug logging
      console.log('RSVP Debug:', {
        eventId,
        status,
        notes,
        userId,
        organizationId,
        userObj: req.user
      });

      // Check if we have required data
      if (!userId) {
        return res.status(401).json({
          error: 'Authentication error',
          message: 'User ID not found in request'
        });
      }

      if (!organizationId) {
        return res.status(401).json({
          error: 'Authentication error',
          message: 'Organization ID not found in request'
        });
      }

      // Validate status
      const validStatuses = ['signed_up', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Status must be "signed_up" or "cancelled"'
        });
      }

      // Verify event exists and belongs to organization
      console.log('Checking event:', { eventId, organizationId });
      const eventCheck = await db.query(`
        SELECT id, title, max_volunteers,
               (SELECT COUNT(*) FROM event_signups WHERE event_id = $1 AND status = 'signed_up') as current_signups
        FROM calendar_events
        WHERE id = $1 AND organization_id = $2
      `, [eventId, organizationId]);

      console.log('Event check result:', eventCheck.rows);

      if (eventCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Event not found'
        });
      }

      const event = eventCheck.rows[0];

      // Check if event is full (if max_volunteers is set)
      if (status === 'signed_up' && event.max_volunteers && event.current_signups >= event.max_volunteers) {
        return res.status(400).json({
          error: 'Event full',
          message: 'This event has reached maximum capacity'
        });
      }

      // Check if user already has an RSVP
      const existingRsvp = await db.query(`
        SELECT id, status FROM event_signups 
        WHERE event_id = $1 AND user_id = $2
      `, [eventId, userId]);

      let result;
      if (existingRsvp.rows.length > 0) {
        // Update existing RSVP
        result = await db.query(`
          UPDATE event_signups 
          SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
          WHERE event_id = $3 AND user_id = $4
          RETURNING *
        `, [status, notes || null, eventId, userId]);
      } else {
        // Create new RSVP
        result = await db.query(`
          INSERT INTO event_signups (event_id, user_id, status, notes)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [eventId, userId, status, notes || null]);
      }

      const action = status === 'signed_up' ? 'signed up for' : 'cancelled RSVP for';
      
      res.json({
        success: true,
        message: `Successfully ${action} "${event.title}"`,
        rsvp: result.rows[0]
      });

    } catch (error) {
      console.error('RSVP error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update RSVP'
      });
    }
  }

  // Generate calendar export (ICS format)
  static async exportEvent(req, res) {
    try {
      const { eventId } = req.params;
      const organizationId = req.organizationId;

      const eventQuery = `
        SELECT e.*, o.name as organization_name
        FROM calendar_events e
        JOIN organizations o ON e.organization_id = o.id
        WHERE e.id = $1 AND e.organization_id = $2
      `;

      const eventResult = await db.query(eventQuery, [eventId, organizationId]);

      if (eventResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Event not found'
        });
      }

      const event = eventResult.rows[0];
      
      // Generate ICS content
      const icsContent = CalendarController.generateICS(event);

      // Set headers for file download
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', `attachment; filename="${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics"`);
      
      res.send(icsContent);

    } catch (error) {
      console.error('Export event error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to export event'
      });
    }
  }

  // Generate ICS file content
  static generateICS(event) {
    const formatDate = (date, time = null, isAllDay = false) => {
      const d = new Date(date);
      
      if (isAllDay) {
        // All-day events use YYYYMMDD format
        return d.toISOString().split('T')[0].replace(/-/g, '');
      }
      
      if (time) {
        const [hours, minutes] = time.split(':');
        d.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        d.setHours(0, 0, 0, 0);
      }
      
      // Return in YYYYMMDDTHHMMSSZ format
      return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const uid = `event-${event.id}@comityspace.com`;
    
    const startDate = event.is_all_day 
      ? formatDate(event.start_date, null, true)
      : formatDate(event.start_date, event.start_time);
      
    const endDate = event.is_all_day
      ? formatDate(event.end_date || event.start_date, null, true)
      : formatDate(event.end_date || event.start_date, event.end_time || event.start_time);

    // Escape special characters in text fields
    const escapeText = (text) => {
      if (!text) return '';
      return text.replace(/\\/g, '\\\\')
                 .replace(/,/g, '\\,')
                 .replace(/;/g, '\\;')
                 .replace(/\n/g, '\\n')
                 .replace(/\r/g, '');
    };

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ComitySpace//ComitySpace Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART${event.is_all_day ? ';VALUE=DATE' : ''}:${startDate}`,
      `DTEND${event.is_all_day ? ';VALUE=DATE' : ''}:${endDate}`,
      `SUMMARY:${escapeText(event.title)}`,
      `DESCRIPTION:${escapeText(event.description || '')}`,
      event.location ? `LOCATION:${escapeText(event.location)}` : '',
      `ORGANIZER:CN=${escapeText(event.organization_name)}`,
      `STATUS:CONFIRMED`,
      `CATEGORIES:${event.event_type || 'EVENT'}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(line => line !== '').join('\r\n');

    return icsContent;
  }

  // Get upcoming events for dashboard
  static async getUpcomingEvents(req, res) {
    try {
      const organizationId = req.organizationId;
      const userId = req.user.id;
      const limit = req.query.limit || 5;

      const eventsQuery = `
        SELECT 
          e.*,
          u.first_name as creator_name,
          u.last_name as creator_lastname,
          COUNT(es.id) as total_signups,
          CASE WHEN user_signup.id IS NOT NULL THEN user_signup.status ELSE null END as user_rsvp_status
        FROM calendar_events e
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN event_signups es ON e.id = es.event_id
        LEFT JOIN event_signups user_signup ON e.id = user_signup.event_id AND user_signup.user_id = $2
        WHERE e.organization_id = $1 AND e.start_date >= CURRENT_DATE
        GROUP BY e.id, u.first_name, u.last_name, user_signup.id, user_signup.status
        ORDER BY e.start_date ASC, e.start_time ASC NULLS LAST
        LIMIT $3
      `;

      const events = await db.query(eventsQuery, [organizationId, userId, limit]);

      res.json({
        success: true,
        events: events.rows.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          location: event.location,
          start_date: event.start_date,
          end_date: event.end_date,
          start_time: event.start_time,
          end_time: event.end_time,
          is_all_day: event.is_all_day,
          event_type: event.event_type,
          total_signups: parseInt(event.total_signups) || 0,
          creator_name: event.creator_name,
          creator_lastname: event.creator_lastname,
          user_rsvp_status: event.user_rsvp_status
        }))
      });

    } catch (error) {
      console.error('Get upcoming events error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get upcoming events'
      });
    }
  }
}

module.exports = CalendarController;