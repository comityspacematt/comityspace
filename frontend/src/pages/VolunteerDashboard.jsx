import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardService from '../services/dashboardService';
import TaskCompletionModal from '../components/TaskCompletionModal';
import api from '../services/api';

const VolunteerDashboard = () => {
  const { user, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [calendarView, setCalendarView] = useState('month'); // 'month' or 'list'

  // Task completion modal state
  const [completionModal, setCompletionModal] = useState({
    isOpen: false,
    taskId: null,
    taskTitle: '',
    loading: false
  });

  // Event modal state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  // Load dashboard data
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const result = await DashboardService.getVolunteerDashboard();
        setDashboardData(result.data);
      } catch (error) {
        console.error('Dashboard error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  // Handle task status update
  const handleTaskStatusUpdate = async (taskId, newStatus, completionNotes = null) => {
    try {
      setCompletionModal(prev => ({ ...prev, loading: true }));

      await DashboardService.updateTaskStatus(taskId, newStatus, completionNotes);

      // Reload dashboard data to reflect changes
      const result = await DashboardService.getVolunteerDashboard();
      setDashboardData(result.data);

      // Close modal and reset state
      setCompletionModal({
        isOpen: false,
        taskId: null,
        taskTitle: '',
        loading: false
      });
    } catch (error) {
      console.error('Task update error:', error);
      setCompletionModal(prev => ({ ...prev, loading: false }));
      setError(`Failed to update task: ${error.message}`);
    }
  };

  // Open completion modal
  const openCompletionModal = (taskId, taskTitle) => {
    setCompletionModal({
      isOpen: true,
      taskId,
      taskTitle,
      loading: false
    });
  };

  // Close completion modal
  const closeCompletionModal = () => {
    setCompletionModal({
      isOpen: false,
      taskId: null,
      taskTitle: '',
      loading: false
    });
  };

  // Handle completion confirmation
  const handleCompletionConfirm = (notes) => {
    if (completionModal.taskId) {
      handleTaskStatusUpdate(completionModal.taskId, 'completed', notes);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Handle event click - fetch detailed event info and show modal
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

  // Handle RSVP to event
  const handleRSVP = async (eventId, status) => {
    try {
      setRsvpLoading(true);
      const response = await api.post(`/calendar/events/${eventId}/rsvp`, {
        status: status
      });

      if (response.data.success) {
        // Reload dashboard data to reflect changes
        const result = await DashboardService.getVolunteerDashboard();
        setDashboardData(result.data);

        // Refresh the selected event details
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

  // Export event to calendar
  const exportEvent = (eventId) => {
    window.open(`${process.env.REACT_APP_API_URL}/calendar/events/${eventId}/export`, '_blank');
  };


  // Get task status color - simplified model
  const getTaskStatusColor = (status) => {
    switch (status) {
      case 'assigned': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-50 text-green-800 border-green-200';
      default: return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { tasks, events, documents, taskStats } = dashboardData || {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                {user?.organizationName} - Volunteer Portal
              </h1>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <Link
                to="/volunteers"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                👥 Volunteers
              </Link>
              <Link
                to="/my-tasks"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                ✅ My Tasks
              </Link>
              <Link
                to="/calendar"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                📅 Calendar
              </Link>
              <Link
                to="/documents"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                📄 Documents
              </Link>

              <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
                <Link
                  to="/profile"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {user?.firstName || user?.email}
                </Link>
                <button
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName || 'Volunteer'}! 👋
          </h2>
          <p className="text-gray-600">
            Here's what's happening in your organization
          </p>
        </div>

        {/* Quick Stats - Simplified Model */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-50">
                <div className="text-2xl">📋</div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {taskStats?.total_tasks || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-50">
                <div className="text-2xl">📝</div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Assigned</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {taskStats?.assigned_tasks || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-50">
                <div className="text-2xl">✅</div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {taskStats?.completed_tasks || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendar Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">📅 Upcoming Events</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCalendarView('month')}
                    className={`px-3 py-1 text-sm rounded ${
                      calendarView === 'month'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setCalendarView('list')}
                    className={`px-3 py-1 text-sm rounded ${
                      calendarView === 'list'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    List
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {events && events.length > 0 ? (
                <div className="space-y-4">
                  {events.slice(0, 5).map((event, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                          <span className="text-primary-600 font-medium">
                            {new Date(event.start_date).getDate()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {event.title}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {formatDate(event.start_date)}
                          {event.start_time && ` at ${formatTime(event.start_time)}`}
                        </p>
                        {event.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📅</div>
                  <p className="text-gray-600">No upcoming events</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t">
                <Link
                  to="/calendar"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  View full calendar →
                </Link>
              </div>
            </div>
          </div>

          {/* My Tasks Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">✅ My Recent Tasks</h3>
            </div>

            <div className="p-6">
              {tasks && tasks.length > 0 ? (
                <div className="space-y-4">
                  {tasks.slice(0, 5).map((task, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium text-gray-900">{task.title}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                          
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            {task.due_date && (
                              <span>Due: {formatDate(task.due_date)}</span>
                            )}
                            {task.estimated_hours && (
                              <span>Est: {task.estimated_hours}h</span>
                            )}
                          </div>
                        </div>

                        <div className="ml-4 flex flex-col items-end space-y-2">
                          <span className={`px-3 py-1 text-xs rounded-full border ${getTaskStatusColor(task.assignment_status)}`}>
                            {task.assignment_status.replace('_', ' ')}
                          </span>

                          {task.assignment_status === 'assigned' && (
                            <button
                              onClick={() => openCompletionModal(task.id, task.title)}
                              className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">✅</div>
                  <p className="text-gray-600">No tasks assigned</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t">
                <Link
                  to="/my-tasks"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  View all my tasks →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">📄 Recent Documents</h3>
          </div>

          <div className="p-6">
            {documents && documents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.slice(0, 6).map((doc, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                          {doc.is_pinned ? '📌' : '📄'}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {doc.title}
                        </h4>
                        {doc.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {doc.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {formatDate(doc.created_at)}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {doc.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📄</div>
                <p className="text-gray-600">No documents available</p>
              </div>
            )}

            <div className="mt-6 pt-4 border-t">
              <Link
                to="/documents"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View all documents →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Task Completion Modal */}
      <TaskCompletionModal
        isOpen={completionModal.isOpen}
        onClose={closeCompletionModal}
        onConfirm={handleCompletionConfirm}
        taskTitle={completionModal.taskTitle}
        loading={completionModal.loading}
      />

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h2>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
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

export default VolunteerDashboard;