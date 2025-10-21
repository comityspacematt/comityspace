const API_URL = process.env.REACT_APP_API_URL;

class CalendarService {
  // Get auth headers
  static getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Handle API responses
  static async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  }

  // Get calendar events
  static async getEvents(params = {}) {
    try {
      const searchParams = new URLSearchParams();
      
      if (params.month) searchParams.set('month', params.month);
      if (params.year) searchParams.set('year', params.year);
      if (params.view) searchParams.set('view', params.view);
      if (params.upcoming) searchParams.set('upcoming', params.upcoming);
      if (params.limit) searchParams.set('limit', params.limit);

      const response = await fetch(`${API_URL}/calendar/events?${searchParams}`, {
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }

  // Get upcoming events for dashboard
  static async getUpcomingEvents(limit = 5) {
    try {
      const response = await fetch(`${API_URL}/calendar/upcoming?limit=${limit}`, {
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      throw error;
    }
  }

  // Get single event details
  static async getEventDetails(eventId) {
    try {
      const response = await fetch(`${API_URL}/calendar/events/${eventId}`, {
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching event details:', error);
      throw error;
    }
  }

  // RSVP to event
  static async rsvpToEvent(eventId, status, notes = '') {
    try {
      const response = await fetch(`${API_URL}/calendar/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ status, notes })
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error updating RSVP:', error);
      throw error;
    }
  }

  // Export event as ICS file
  static exportEvent(eventId) {
    const token = localStorage.getItem('token');
    const url = `${API_URL}/calendar/events/${eventId}/export`;
    
    // Create a temporary link to download the file
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.style.display = 'none';
    
    // Add authorization header via a fetch request instead
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.blob())
    .then(blob => {
      const objectURL = URL.createObjectURL(blob);
      link.href = objectURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectURL);
    })
    .catch(error => {
      console.error('Error exporting event:', error);
      throw error;
    });
  }

  // Admin functions for creating/managing events
  
  // Create new event (admin only)
  static async createEvent(eventData) {
    try {
      const response = await fetch(`${API_URL}/calendar/events`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(eventData)
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  // Update event (admin only)
  static async updateEvent(eventId, eventData) {
    try {
      const response = await fetch(`${API_URL}/calendar/events/${eventId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(eventData)
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  // Delete event (admin only)
  static async deleteEvent(eventId) {
    try {
      const response = await fetch(`${API_URL}/calendar/events/${eventId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // Helper functions for date/time formatting
  static formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  static formatTime(timeStr) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  static formatDateTimeRange(event) {
    const startDate = this.formatDate(event.start_date);
    let result = startDate;

    if (!event.is_all_day) {
      result += ` at ${this.formatTime(event.start_time)}`;
      if (event.end_time) {
        result += ` - ${this.formatTime(event.end_time)}`;
      }
    } else {
      result += ' (All day)';
    }

    if (event.end_date && event.end_date !== event.start_date) {
      result += ` to ${this.formatDate(event.end_date)}`;
    }

    return result;
  }

  // Get calendar event color based on event type
  static getEventColor(eventType) {
    const colors = {
      'meeting': 'bg-blue-100 text-blue-800 border-blue-200',
      'volunteer_event': 'bg-green-100 text-green-800 border-green-200',
      'fundraiser': 'bg-purple-100 text-purple-800 border-purple-200',
      'training': 'bg-orange-100 text-orange-800 border-orange-200',
      'other': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    return colors[eventType] || colors.other;
  }
}

export default CalendarService;