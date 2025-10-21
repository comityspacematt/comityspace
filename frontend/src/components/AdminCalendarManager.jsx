import React, { useState, useEffect } from 'react';
import api from '../services/api';

const AdminCalendarManager = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('list'); // 'list', 'calendar', 'create', or 'edit'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    location: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    is_all_day: false,
    event_type: 'volunteer_event',
    max_volunteers: '',
    video_link: '',
    meeting_id: '',
    meeting_passcode: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  // Fetch events when calendar month changes
  useEffect(() => {
    if (view === 'calendar') {
      fetchEvents();
    }
  }, [selectedDate, view]);

  // Navigate to current month when switching to calendar view for first time
  useEffect(() => {
    if (view === 'calendar') {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const selectedMonth = selectedDate.getMonth();
      const selectedYear = selectedDate.getFullYear();

      // If we're not viewing the current month, navigate to it
      if (currentMonth !== selectedMonth || currentYear !== selectedYear) {
        setSelectedDate(new Date());
      }
    }
  }, [view, selectedDate]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/calendar/events');

      if (response.data.success) {
        setEvents(response.data.events);
      } else {
        setError(response.data.message || 'Failed to load events');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      
      const eventData = {
        ...eventForm,
        max_volunteers: eventForm.max_volunteers ? parseInt(eventForm.max_volunteers) : null,
        end_date: eventForm.end_date || eventForm.start_date,
        // Add video link to description if provided
        description: eventForm.video_link 
          ? `${eventForm.description}\n\nJoin Meeting: ${eventForm.video_link}${eventForm.meeting_id ? `\nMeeting ID: ${eventForm.meeting_id}` : ''}${eventForm.meeting_passcode ? `\nPasscode: ${eventForm.meeting_passcode}` : ''}`
          : eventForm.description
      };

      const response = await api.post('/calendar/events', eventData);

      if (response.data.success) {
        resetForm();
        setView('list');
        fetchEvents();
      } else {
        setError(response.data.message || 'Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      setError('Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      
      const eventData = {
        ...eventForm,
        max_volunteers: eventForm.max_volunteers ? parseInt(eventForm.max_volunteers) : null,
        end_date: eventForm.end_date || eventForm.start_date,
        description: eventForm.video_link 
          ? `${eventForm.description}\n\nJoin Meeting: ${eventForm.video_link}${eventForm.meeting_id ? `\nMeeting ID: ${eventForm.meeting_id}` : ''}${eventForm.meeting_passcode ? `\nPasscode: ${eventForm.meeting_passcode}` : ''}`
          : eventForm.description
      };

      const response = await api.put(`/calendar/events/${selectedEvent.id}`, eventData);

      if (response.data.success) {
        resetForm();
        setView('list');
        fetchEvents();
      } else {
        setError(response.data.message || 'Failed to update event');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      setError('Failed to update event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/calendar/events/${eventId}`);

      if (response.data.success) {
        fetchEvents();
      } else {
        setError(response.data.message || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      setError('Failed to delete event');
    }
  };

  const handleEditEvent = async (event) => {
    try {
      // Fetch full event details
      const response = await api.get(`/calendar/events/${event.id}`);

      if (response.data.success) {
        setSelectedEvent(response.data.event);

        // Parse video link from description if it exists
        const description = response.data.event.description || '';
        const videoLinkMatch = description.match(/Join Meeting: (https?:\/\/[^\s\n]+)/);
        const meetingIdMatch = description.match(/Meeting ID: ([^\s\n]+)/);
        const passcodeMatch = description.match(/Passcode: ([^\s\n]+)/);
        
        // Clean description by removing video meeting info
        const cleanDescription = description
          .replace(/\n\nJoin Meeting: https?:\/\/[^\s\n]+/, '')
          .replace(/\nMeeting ID: [^\s\n]+/, '')
          .replace(/\nPasscode: [^\s\n]+/, '');

        setEventForm({
          title: response.data.event.title || '',
          description: cleanDescription,
          location: response.data.event.location || '',
          start_date: response.data.event.start_date || '',
          end_date: response.data.event.end_date || '',
          start_time: response.data.event.start_time || '',
          end_time: response.data.event.end_time || '',
          is_all_day: response.data.event.is_all_day || false,
          event_type: response.data.event.event_type || 'volunteer_event',
          max_volunteers: response.data.event.max_volunteers || '',
          video_link: videoLinkMatch ? videoLinkMatch[1] : '',
          meeting_id: meetingIdMatch ? meetingIdMatch[1] : '',
          meeting_passcode: passcodeMatch ? passcodeMatch[1] : ''
        });

        setView('edit');
      } else {
        setError(response.data.message || 'Failed to load event details');
      }
    } catch (error) {
      console.error('Error loading event details:', error);
      setError('Failed to load event details');
    }
  };

  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      location: '',
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      is_all_day: false,
      event_type: 'volunteer_event',
      max_volunteers: '',
      video_link: '',
      meeting_id: '',
      meeting_passcode: ''
    });
    setSelectedEvent(null);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const matchingEvents = events.filter(event => {
      // Handle different date formats that might come from API
      let eventDate = event.start_date;
      if (eventDate) {
        // If it's a full datetime string, extract just the date part
        if (eventDate.includes('T')) {
          eventDate = eventDate.split('T')[0];
        }
        // If it's already a date string (YYYY-MM-DD), use it as is
        return eventDate === dateStr;
      }
      return false;
    });

    // Optional debug logging (remove in production)
    // if (date.getDate() === 1) {
    //   console.log('Calendar Debug - Events for month:', {
    //     totalEvents: events.length,
    //     sampleEvent: events[0],
    //     checkingDate: dateStr,
    //     matchingEvents: matchingEvents.length
    //   });
    // }

    return matchingEvents;
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(selectedDate);
    const firstDay = getFirstDayOfMonth(selectedDate);
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Add day headers
    const dayHeaders = dayNames.map(day => (
      <div key={day} className="p-2 text-center text-sm font-semibold text-gray-700 bg-gray-50">
        {day}
      </div>
    ));

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="p-2 h-24 border border-gray-200 bg-gray-50"></div>
      );
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      const dayEvents = getEventsForDate(currentDate);
      const isToday = currentDate.toDateString() === new Date().toDateString();

      // Optional debug logging for days with events (remove in production)
      // if (dayEvents.length > 0) {
      //   console.log(`Day ${day} has ${dayEvents.length} events:`, dayEvents.map(e => e.title));
      // }

      days.push(
        <div key={day} className={`p-2 h-24 border border-gray-200 bg-white hover:bg-gray-50 ${isToday ? 'bg-blue-50' : ''}`}>
          <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.length > 0 ? (
              <>
                {dayEvents.slice(0, 2).map(event => (
                  <div
                    key={event.id}
                    onClick={() => handleEditEvent(event)}
                    className={`text-xs p-1 rounded cursor-pointer truncate ${
                      event.event_type === 'volunteer_event' ? 'bg-green-100 text-green-800' :
                      event.event_type === 'meeting' ? 'bg-blue-100 text-blue-800' :
                      event.event_type === 'training' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-gray-500">+{dayEvents.length - 2} more</div>
                )}
              </>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow">
        <div className="grid grid-cols-7">
          {dayHeaders}
          {days}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Event Management</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📋 List View
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'calendar'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📅 Calendar View
          </button>
          <button
            onClick={() => {
              resetForm();
              setView('create');
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'create'
                ? 'bg-green-600 text-white'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            ➕ Create Event
          </button>
        </div>
      </div>

      {/* Events List View */}
      {view === 'list' && (
        <div className="bg-white rounded-lg shadow">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
              <p className="text-gray-600 mb-4">Create your first event to get started</p>
              <button
                onClick={() => setView('create')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Create Event
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {events.map((event) => (
                <div key={event.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          event.event_type === 'volunteer_event' ? 'bg-green-100 text-green-800' :
                          event.event_type === 'meeting' ? 'bg-blue-100 text-blue-800' :
                          event.event_type === 'training' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {event.event_type.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center space-x-4">
                          <span>📅 {formatDate(event.start_date)}</span>
                          {!event.is_all_day && event.start_time && (
                            <span>🕐 {formatTime(event.start_time)}</span>
                          )}
                          {event.location && (
                            <span>📍 {event.location}</span>
                          )}
                        </div>
                        
                        {event.description && event.description.includes('Join Meeting:') && (
                          <div className="text-blue-600">🎥 Video meeting included</div>
                        )}
                        
                        <div className="flex items-center space-x-4">
                          <span>{event.confirmed_signups || 0} signed up</span>
                          {event.max_volunteers && (
                            <span>/ {event.max_volunteers} max</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditEvent(event)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="space-y-6">
          {/* Calendar Navigation */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                ← Previous
              </button>

              <h3 className="text-xl font-semibold text-gray-900">
                {selectedDate.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric'
                })}
              </h3>

              <button
                onClick={() => navigateMonth(1)}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          {renderCalendarGrid()}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm font-medium transition-colors"
                >
                  Today
                </button>
                <span className="text-sm text-gray-600">
                  {events.length} events this month
                </span>
              </div>

              <button
                onClick={() => {
                  resetForm();
                  setView('create');
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                ➕ Add Event
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Event Types</h4>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-100 rounded"></div>
                <span className="text-sm text-gray-600">Volunteer Events</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-100 rounded"></div>
                <span className="text-sm text-gray-600">Meetings</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-100 rounded"></div>
                <span className="text-sm text-gray-600">Training</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-100 rounded"></div>
                <span className="text-sm text-gray-600">Other</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Event Form */}
      {(view === 'create' || view === 'edit') && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            {view === 'create' ? 'Create New Event' : 'Edit Event'}
          </h3>
          
          <form onSubmit={view === 'create' ? handleCreateEvent : handleUpdateEvent} className="space-y-6">
            {/* Basic Event Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter event title..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Event description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Type
                </label>
                <select
                  value={eventForm.event_type}
                  onChange={(e) => setEventForm({...eventForm, event_type: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="volunteer_event">Volunteer Event</option>
                  <option value="meeting">Meeting</option>
                  <option value="training">Training</option>
                  <option value="fundraiser">Fundraiser</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Event location or 'Online'"
                />
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={eventForm.start_date}
                  onChange={(e) => setEventForm({...eventForm, start_date: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={eventForm.end_date}
                  onChange={(e) => setEventForm({...eventForm, end_date: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank if same as start date</p>
              </div>

              <div>
                <label className="flex items-center space-x-2 mb-4">
                  <input
                    type="checkbox"
                    checked={eventForm.is_all_day}
                    onChange={(e) => setEventForm({...eventForm, is_all_day: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">All Day Event</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Volunteers
                </label>
                <input
                  type="number"
                  min="1"
                  value={eventForm.max_volunteers}
                  onChange={(e) => setEventForm({...eventForm, max_volunteers: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave blank for unlimited"
                />
              </div>

              {!eventForm.is_all_day && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={eventForm.start_time}
                      onChange={(e) => setEventForm({...eventForm, start_time: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={eventForm.end_time}
                      onChange={(e) => setEventForm({...eventForm, end_time: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Video Meeting Section */}
            <div className="border-t pt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Video Meeting (Optional)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Link
                  </label>
                  <input
                    type="url"
                    value={eventForm.video_link}
                    onChange={(e) => setEventForm({...eventForm, video_link: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://zoom.us/j/123456789 or https://meet.google.com/abc-def-ghi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={eventForm.meeting_id}
                    onChange={(e) => setEventForm({...eventForm, meeting_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123-456-789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passcode (Optional)
                  </label>
                  <input
                    type="text"
                    value={eventForm.meeting_passcode}
                    onChange={(e) => setEventForm({...eventForm, meeting_passcode: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Meeting passcode"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setView('list');
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {submitting 
                  ? (view === 'create' ? 'Creating...' : 'Updating...') 
                  : (view === 'create' ? 'Create Event' : 'Update Event')
                }
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminCalendarManager;