import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardService from '../services/dashboardService';
import api from '../services/api';
import AdminCalendarManager from '../components/AdminCalendarManager';
import AdminDocumentManager from '../components/AdminDocumentManager';
import AdminTaskManager from '../components/AdminTaskManager';
import AdminVolunteerManager from '../components/AdminVolunteerManager';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [error, setError] = useState('');

  // Determine active tab from URL
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/tasks')) return 'tasks';
    if (path.includes('/events')) return 'events';
    if (path.includes('/documents')) return 'documents';
    if (path.includes('/volunteers')) return 'volunteers';
    return 'overview';
  };

  const activeTab = getActiveTab();

  // Helper function to get proper volunteer name from various data formats
  const getVolunteerDisplayName = (activity) => {
    // Try assignee_first_name/assignee_last_name from activity
    if (activity.assignee_first_name && activity.assignee_first_name.trim()) {
      let name = activity.assignee_first_name.trim();
      if (activity.assignee_last_name && activity.assignee_last_name.trim()) {
        name += ` ${activity.assignee_last_name.trim()}`;
      }
      return name;
    }

    // Fallback to email if no proper name is available
    if (activity.assignee_email) {
      return activity.assignee_email;
    }

    return 'Someone';
  };

  // Helper function to format activity data
  const formatActivityItem = (activity) => {
    console.log('Formatting activity:', activity);
    console.log('Due date value:', activity.due_date);
    console.log('Due date type:', typeof activity.due_date);

    if (!activity) {
      return { description: 'No activity data', timestamp: 'Unknown', status: 'unknown' };
    }

    let description = '';

    // Check if this is a task assignment (from dashboard controller)
    if (activity.activity_type === 'task_assigned') {
      const assigneeName = getVolunteerDisplayName(activity);
      description = `Task "${activity.title || 'Untitled'}" assigned to ${assigneeName}`;
      console.log('Assignment description:', description);
    }
    // Check if this is from admin route (different structure)
    else if (activity.type === 'task_assignment') {
      description = `Task "${activity.description || 'Untitled'}" assigned to ${activity.user_name || 'Someone'}`;
      console.log('Admin route assignment description:', description);
    }
    else {
      // Fallback for other activity types
      description = activity.description || activity.title || 'Activity occurred';
      console.log('Other activity description:', description);
    }

    // Format due date instead of created date
    const formatDueDate = (dateString) => {
      if (!dateString) return 'No due date';
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
      if (diffDays === 0) return 'Due today';
      if (diffDays === 1) return 'Due tomorrow';
      if (diffDays <= 7) return `Due in ${diffDays} days`;
      return `Due ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    };

    // Check if task is overdue
    const isOverdue = activity.due_date ? new Date(activity.due_date) < new Date() : false;

    // Always prioritize due_date over created_at for timestamp
    const timestamp = activity.due_date
      ? formatDueDate(activity.due_date)
      : 'No due date';

    // Set status, with special handling for overdue tasks
    let status = activity.status || 'assigned';
    if (isOverdue && status !== 'completed') {
      status = 'overdue';
    }

    return { description, timestamp, status };
  };

  // Helper function to format time from 24-hour to 12-hour format
  const formatTime12Hour = (timeString) => {
    if (!timeString) return '';

    // Parse the time string (assuming format like "14:30:00" or "14:30")
    const timeParts = timeString.split(':');
    let hours = parseInt(timeParts[0]);
    const minutes = timeParts[1] || '00';

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'

    return `${hours}:${minutes} ${ampm}`;
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const result = await DashboardService.getAdminDashboard();
      console.log('Admin Dashboard Data:', result.data);
      console.log('Recent Activity:', result.data?.recentActivity);
      if (result.data?.recentActivity?.length > 0) {
        console.log('First Activity Item:', result.data.recentActivity[0]);
        console.log('First Activity due_date field:', result.data.recentActivity[0].due_date);
        console.log('First Activity due_date type:', typeof result.data.recentActivity[0].due_date);
        console.log('Raw JSON of first activity:', JSON.stringify(result.data.recentActivity[0], null, 2));
      }
      setDashboardData(result.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentDocuments = async () => {
    try {
      setDocumentsLoading(true);
      const response = await api.get('/documents');
      if (response.data.success) {
        // Get the 6 most recent documents for dashboard
        const recent = response.data.documents.slice(0, 6);
        setRecentDocuments(recent);
        console.log('Recent Documents:', recent);
        if (recent.length > 0) {
          console.log('First Document Item:', recent[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Don't set main error for documents - they're secondary
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchRecentDocuments();

    // Redirect base admin-dashboard to overview
    if (location.pathname === '/admin-dashboard') {
      navigate('/admin-dashboard/overview', { replace: true });
    }
  }, [location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              {dashboardData?.organization && (
                <span className="text-sm sm:text-base text-gray-500">
                  · {dashboardData.organization.name}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">
                Welcome, {user?.firstName || 'Admin'}
              </span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8 overflow-x-auto">
          <nav className="-mb-px flex space-x-4 sm:space-x-8">
            <button
              onClick={() => navigate('/admin-dashboard/overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => navigate('/admin-dashboard/tasks')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tasks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Task Management
            </button>
            <button
              onClick={() => navigate('/admin-dashboard/events')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'events'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Event Management
            </button>
            <button
              onClick={() => navigate('/admin-dashboard/documents')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Document Management
            </button>
            <button
              onClick={() => navigate('/admin-dashboard/volunteers')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'volunteers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Volunteer Management
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Welcome back, {user?.firstName || 'Admin'}! 👋
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Here's what's happening in your organization
              </p>
            </div>

            {/* Quick Stats - Admin Version */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="p-2 sm:p-3 rounded-full bg-blue-50 mb-2 sm:mb-0 self-start">
                    <div className="text-xl sm:text-2xl">👥</div>
                  </div>
                  <div className="sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Total Volunteers</p>
                    <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                      {dashboardData?.volunteerStats?.total_volunteers || '0'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="p-2 sm:p-3 rounded-full bg-yellow-50 mb-2 sm:mb-0 self-start">
                    <div className="text-xl sm:text-2xl">📋</div>
                  </div>
                  <div className="sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Active Tasks</p>
                    <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                      {dashboardData?.taskOverview?.total_tasks || '0'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="p-2 sm:p-3 rounded-full bg-green-50 mb-2 sm:mb-0 self-start">
                    <div className="text-xl sm:text-2xl">✅</div>
                  </div>
                  <div className="sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                      {dashboardData?.taskOverview?.completed_assignments || '0'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="p-2 sm:p-3 rounded-full bg-purple-50 mb-2 sm:mb-0 self-start">
                    <div className="text-xl sm:text-2xl">📅</div>
                  </div>
                  <div className="sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">This Week</p>
                    <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                      {dashboardData?.upcomingEvents?.length || '0'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              {/* Recent Activity Section */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">📋 Recent Activity</h3>
                </div>

                <div className="p-4 sm:p-6">
                  {dashboardData?.recentActivity?.length > 0 ? (
                    <div className="space-y-4">
                      {dashboardData.recentActivity.slice(0, 8).map((activity, index) => {
                        console.log(`Activity ${index}:`, activity);
                        const formattedActivity = formatActivityItem(activity);
                        console.log(`Formatted Activity ${index}:`, formattedActivity);

                        const statusColor = formattedActivity.status === 'completed' ? 'bg-green-50 text-green-800' :
                                          formattedActivity.status === 'in_progress' ? 'bg-blue-50 text-blue-800' :
                                          formattedActivity.status === 'overdue' ? 'bg-red-50 text-red-800' :
                                          'bg-yellow-50 text-yellow-800';

                        const statusIcon = formattedActivity.status === 'completed' ? '✅' :
                                         formattedActivity.status === 'in_progress' ? '🔄' :
                                         formattedActivity.status === 'overdue' ? '🚨' : '👤';

                        return (
                          <div key={index} className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                                <div className="text-sm">{statusIcon}</div>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-900">{formattedActivity.description}</p>
                                  <p className="text-xs text-gray-500">{formattedActivity.timestamp}</p>
                                </div>
                                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${statusColor} ml-2`}>
                                  {formattedActivity.status === 'in_progress' ? 'in progress' : formattedActivity.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-4xl mb-3">📋</div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h4>
                      <p className="text-gray-600 mb-4">
                        Activity will appear here when you assign tasks to volunteers
                      </p>
                      <button
                        onClick={() => navigate('/admin-dashboard/tasks')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Create Your First Task
                      </button>
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t">
                    <button
                      onClick={() => navigate('/admin-dashboard/tasks')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View all activity →
                    </button>
                  </div>
                </div>
              </div>

              {/* Upcoming Events Section */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">📅 Upcoming Events</h3>
                </div>

                <div className="p-4 sm:p-6">
                  {dashboardData?.upcomingEvents?.length > 0 ? (
                    <div className="space-y-4">
                      {dashboardData.upcomingEvents.slice(0, 3).map((event, index) => (
                        <div key={index} className="border-l-4 border-purple-400 pl-4">
                          <h4 className="font-medium text-gray-900">{event.title}</h4>
                          <p className="text-sm text-gray-600">{event.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {(() => {
                              const [year, month, day] = event.start_date.split('T')[0].split('-');
                              const date = new Date(year, month - 1, day);
                              return date.toLocaleDateString();
                            })()} at {formatTime12Hour(event.start_time)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-4xl mb-3">📅</div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No upcoming events</h4>
                      <p className="text-gray-600 mb-4">
                        Create events to keep your volunteers informed and engaged
                      </p>
                      <button
                        onClick={() => navigate('/admin-dashboard/events')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Schedule Your First Event
                      </button>
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t">
                    <button
                      onClick={() => navigate('/admin-dashboard/events')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View all events →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">📄 Recent Documents</h3>
              </div>

              <div className="p-4 sm:p-6">
                {documentsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Loading documents...</p>
                  </div>
                ) : recentDocuments?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentDocuments.map((doc, index) => (
                      <div key={doc.id || index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
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
                                {(() => {
                                  const [year, month, day] = doc.created_at.split('T')[0].split('-');
                                  const date = new Date(year, month - 1, day);
                                  return date.toLocaleDateString();
                                })()}
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
                    <div className="text-gray-400 text-4xl mb-3">📄</div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h4>
                    <p className="text-gray-600 mb-4">
                      Upload documents to share them with your volunteers
                    </p>
                    <button
                      onClick={() => navigate('/admin-dashboard/documents')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Upload Documents
                    </button>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t">
                  <button
                    onClick={() => navigate('/admin-dashboard/documents')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View all documents →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <AdminTaskManager />
        )}

        {activeTab === 'events' && (
          <AdminCalendarManager />
        )}

        {activeTab === 'documents' && (
          <AdminDocumentManager />
        )}

        {activeTab === 'volunteers' && (
          <AdminVolunteerManager 
            dashboardData={dashboardData} 
            onRefreshData={fetchDashboardData}
          />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;