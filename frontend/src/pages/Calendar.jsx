import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import VolunteerNav from '../components/VolunteerNav';

const Calendar = () => {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('list');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  const currentMonth = selectedDate.getMonth() + 1;
  const currentYear = selectedDate.getFullYear();

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, view]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');

      let params;
      if (view === 'list') {
        // For list view, show all upcoming events
        params = new URLSearchParams({
          upcoming: 'true'
        });
      } else {
        // For calendar/month view, filter by selected month
        params = new URLSearchParams({
          month: currentMonth,
          year: currentYear,
          view: view
        });
      }

      const response = await api.get(`/calendar/events?${params}`);

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

  const handleEventClick = async (event) => {
    try {
      const response = await api.get(`/calendar/events/${event.id}`);

      if (response.data.success) {
        setSelectedEvent(response.data.event);
        setShowEventModal(true);
      } else {
        setError(response.data.message || 'Failed to load event details');
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      setError('Failed to load event details');
    }
  };

  const handleRSVP = async (eventId, status, notes = '') => {
    try {
      setRsvpLoading(true);

      const response = await api.post(`/calendar/events/${eventId}/rsvp`, {
        status,
        notes
      });

      if (response.data.success) {
        fetchEvents();
        if (selectedEvent) {
          handleEventClick(selectedEvent);
        }
      } else {
        setError(response.data.message || 'Failed to update RSVP');
      }
    } catch (error) {
      console.error('Error updating RSVP:', error);
      setError('Failed to update RSVP');
    } finally {
      setRsvpLoading(false);
    }
  };

  const exportEvent = (eventId) => {
    window.open(`${process.env.REACT_APP_API_URL}/calendar/events/${eventId}/export`, '_blank');
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  const formatDate = (dateStr) => {
    // Parse date as local time to avoid timezone shifts
    const [year, month, day] = dateStr.split('T')[0].split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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

  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    // const lastDay = new Date(year, month + 1, 0); // Not used
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const dayEvents = events.filter(event => {
        // Parse event date as local time to avoid timezone shifts
        const [year, month, day] = event.start_date.split('T')[0].split('-');
        const eventDate = new Date(year, month - 1, day);
        return eventDate.toDateString() === currentDate.toDateString();
      });

      days.push({
        date: new Date(currentDate),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: currentDate.toDateString() === new Date().toDateString(),
        events: dayEvents
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const monthName = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VolunteerNav currentPage="Calendar" />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Events</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Controls */}
          <div className={`flex flex-col sm:flex-row items-center gap-4 ${view === 'list' ? 'justify-end' : 'justify-between'}`}>
            {/* Month Navigation - only show in calendar view */}
            {view === 'month' && (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ←
                </button>
                <h3 className="text-xl font-semibold min-w-48 text-center">{monthName}</h3>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  →
                </button>
              </div>
            )}

            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  view === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setView('month')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  view === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                Month
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Views */}
        {view === 'month' ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Calendar Header */}
            <div className="grid grid-cols-7 border-b border-gray-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center font-medium text-gray-700 bg-gray-50">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {generateCalendarDays().map((day, index) => (
                <div
                  key={index}
                  className={`min-h-32 p-2 border-b border-r border-gray-200 ${
                    !day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                  } ${day.isToday ? 'bg-blue-50' : ''}`}
                >
                  <div className={`text-sm mb-1 ${day.isToday ? 'font-bold text-blue-600' : ''}`}>
                    {day.date.getDate()}
                  </div>
                  
                  {day.events.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className="text-xs p-1 mb-1 bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-blue-200 transition-colors truncate"
                    >
                      {event.is_all_day ? '' : formatTime(event.start_time) + ' '}
                      {event.title}
                    </div>
                  ))}
                  
                  {day.events.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{day.events.length - 3} more
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No upcoming events found
              </div>
            ) : (
              events.map(event => (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {event.title}
                      </h3>
                      <p className="text-gray-600 mb-2">{formatDate(event.start_date)}</p>
                      {!event.is_all_day && (
                        <p className="text-gray-600 mb-2">
                          {formatTime(event.start_time)}
                          {event.end_time && ` - ${formatTime(event.end_time)}`}
                        </p>
                      )}
                      {event.location && (
                        <p className="text-gray-600 mb-2">📍 {event.location}</p>
                      )}
                      {event.description && (
                        <p className="text-gray-700 mb-3">{event.description}</p>
                      )}
                    </div>
                    
                    <div className="ml-4 text-right">
                      <div className="text-sm text-gray-500 mb-1">
                        {event.confirmed_signups} RSVP'd
                        {event.max_volunteers && ` / ${event.max_volunteers} max`}
                      </div>
                      {event.user_rsvp_status && (
                        <div className={`text-sm px-2 py-1 rounded ${
                          event.user_rsvp_status === 'signed_up'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {event.user_rsvp_status === 'signed_up' ? 'RSVP\'d Yes' : 'RSVP\'d No'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h2>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <strong>Date:</strong> {formatDate(selectedEvent.start_date)}
                  {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.start_date && (
                    <span> - {formatDate(selectedEvent.end_date)}</span>
                  )}
                </div>

                {!selectedEvent.is_all_day && (
                  <div>
                    <strong>Time:</strong> {formatTime(selectedEvent.start_time)}
                    {selectedEvent.end_time && ` - ${formatTime(selectedEvent.end_time)}`}
                  </div>
                )}

                {selectedEvent.location && (
                  <div>
                    <strong>Location:</strong> {selectedEvent.location}
                  </div>
                )}

                {selectedEvent.description && (
                  <div>
                    <strong>Description:</strong>
                    <p className="mt-1 text-gray-700">{selectedEvent.description}</p>
                  </div>
                )}

                <div>
                  <strong>Attendance:</strong> {selectedEvent.confirmed_signups} RSVP'd
                  {selectedEvent.max_volunteers && ` (${selectedEvent.max_volunteers} max)`}
                </div>

                {selectedEvent.creator_name && (
                  <div>
                    <strong>Organized by:</strong> {selectedEvent.creator_name} {selectedEvent.creator_lastname}
                  </div>
                )}
              </div>

              {/* RSVP Actions */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row gap-3">
                  {selectedEvent.user_rsvp_status === 'signed_up' ? (
                    // User is signed up - show option to change to No
                    <button
                      onClick={() => handleRSVP(selectedEvent.id, 'cancelled')}
                      disabled={rsvpLoading}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {rsvpLoading ? 'Updating...' : 'RSVP No'}
                    </button>
                  ) : selectedEvent.user_rsvp_status === 'cancelled' ? (
                    // User has RSVP'd No - allow them to change to Yes regardless of capacity
                    <button
                      onClick={() => handleRSVP(selectedEvent.id, 'signed_up')}
                      disabled={rsvpLoading}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {rsvpLoading ? 'RSVPing...' : 'RSVP Yes'}
                    </button>
                  ) : (
                    // User hasn't RSVP'd yet - show RSVP Yes if space available
                    selectedEvent.can_signup && (
                      <button
                        onClick={() => handleRSVP(selectedEvent.id, 'signed_up')}
                        disabled={rsvpLoading}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {rsvpLoading ? 'RSVPing...' : 'RSVP Yes'}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => exportEvent(selectedEvent.id)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Export to Calendar
                  </button>
                </div>

                {!selectedEvent.can_signup && !selectedEvent.user_rsvp_status && (
                  <p className="text-red-600 text-sm mt-2">This event is at capacity</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;