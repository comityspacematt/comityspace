import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardService from '../services/dashboardService';
import TaskCompletionModal from '../components/TaskCompletionModal';

const MyTasks = () => {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState({});

  // Task completion modal state
  const [completionModal, setCompletionModal] = useState({
    isOpen: false,
    taskId: null,
    taskTitle: '',
    loading: false
  });
  
  // Filter and sort states
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    category: 'all',
    sortBy: 'due_date',
    sortOrder: 'asc'
  });
  
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    items_per_page: 20
  });

  // Load tasks based on current filters
  const loadTasks = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: page,
        limit: pagination.items_per_page
      };
      
      const result = await DashboardService.getMyTasks(params);
      setTasks(result.tasks);
      setStats(result.stats);
      setPagination(result.pagination);
      setError('');
    } catch (error) {
      console.error('Load tasks error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load tasks on component mount and filter changes
  useEffect(() => {
    loadTasks();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle task status update
  const handleStatusUpdate = async (taskId, newStatus, completionNotes = null) => {
    const updateKey = `${taskId}-${newStatus}`;

    try {
      setUpdating(prev => ({ ...prev, [updateKey]: true }));
      setCompletionModal(prev => ({ ...prev, loading: true }));

      await DashboardService.updateTaskStatus(taskId, newStatus, completionNotes);
      await loadTasks(pagination.current_page);

      // Close modal if it was a completion
      if (newStatus === 'completed') {
        setCompletionModal({
          isOpen: false,
          taskId: null,
          taskTitle: '',
          loading: false
        });
      }

    } catch (error) {
      console.error('Task update error:', error);
      setError(`Failed to update task: ${error.message}`);
      setCompletionModal(prev => ({ ...prev, loading: false }));
    } finally {
      setUpdating(prev => ({ ...prev, [updateKey]: false }));
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
      handleStatusUpdate(completionModal.taskId, 'completed', notes);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Due today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Due tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  // Get urgency styling
  const getUrgencyStyle = (task) => {
    if (!task.due_date) return '';
    
    const dueDate = new Date(task.due_date);
    const today = new Date();
    const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) return 'border-l-red-500 bg-red-50'; // Overdue
    if (daysDiff === 0) return 'border-l-orange-500 bg-orange-50'; // Due today
    if (daysDiff <= 3) return 'border-l-yellow-500 bg-yellow-50'; // Due soon
    return 'border-l-blue-500 bg-blue-50'; // Normal
  };

  // Get status badge styling - simplified model with overdue detection
  const getStatusStyle = (status, dueDate = null) => {
    // Check if task is overdue (due date has passed and not completed)
    const isOverdue = dueDate && status !== 'completed' && new Date(dueDate) < new Date();

    if (isOverdue) {
      return 'bg-red-100 text-red-800';
    }

    const styles = {
      assigned: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-yellow-100 text-yellow-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  // Get priority styling
  const getPriorityStyle = (priority) => {
    const styles = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-blue-100 text-blue-800',
      low: 'bg-green-100 text-green-800'
    };
    return styles[priority] || 'bg-gray-100 text-gray-800';
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                {user?.organizationName} - My Tasks
              </h1>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                🏠 Dashboard
              </Link>
              <Link
                to="/volunteers"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                👥 Volunteers
              </Link>
              <Link
                to="/my-tasks"
                className="bg-blue-100 text-blue-800 px-3 py-2 rounded-md text-sm font-medium"
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
        {/* Stats Cards - Simplified Model */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.total_tasks || 0}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.assigned_tasks || 0}</div>
              <div className="text-sm text-gray-600">Assigned</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-green-600">{stats.completed_tasks || 0}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-red-600">{stats.overdue_tasks || 0}</div>
              <div className="text-sm text-gray-600">Overdue</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="all">All Status</option>
                  <option value="assigned">Assigned</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="all">All Priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="all">All Categories</option>
                  <option value="training">Training</option>
                  <option value="event_prep">Event Prep</option>
                  <option value="administrative">Administrative</option>
                  <option value="marketing">Marketing</option>
                  <option value="mentoring">Mentoring</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="due_date">Due Date</option>
                  <option value="priority">Priority</option>
                  <option value="created_at">Created Date</option>
                  <option value="title">Title</option>
                  <option value="estimated_hours">Estimated Hours</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Tasks List */}
        <div className="space-y-4">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div key={task.id} className={`bg-white rounded-lg shadow border-l-4 ${getUrgencyStyle(task)}`}>
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Task Header */}
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {task.title}
                        </h3>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusStyle(task.assignment_status, task.due_date)}`}>
                          {task.due_date && new Date(task.due_date) < new Date() && task.assignment_status !== 'completed'
                            ? 'overdue'
                            : task.assignment_status.replace('_', ' ')
                          }
                        </span>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityStyle(task.priority)}`}>
                          {task.priority}
                        </span>
                        {task.category && (
                          <span className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                            {task.category.replace('_', ' ')}
                          </span>
                        )}
                      </div>

                      {/* Task Description */}
                      {task.description && (
                        <p className="text-gray-700 mb-4">{task.description}</p>
                      )}

                      {/* Task Metadata */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                        <div>
                          <span className="font-medium">Due Date:</span>
                          <div className={`mt-1 ${task.urgency_level <= 0 ? 'text-red-600 font-medium' : task.urgency_level <= 2 ? 'text-orange-600' : ''}`}>
                            {formatDate(task.due_date)}
                          </div>
                        </div>
                        
                        {task.estimated_hours && (
                          <div>
                            <span className="font-medium">Estimated Time:</span>
                            <div className="mt-1">{task.estimated_hours} hours</div>
                          </div>
                        )}
                        
                        {task.assigned_by_name && (
                          <div>
                            <span className="font-medium">Assigned By:</span>
                            <div className="mt-1">{task.assigned_by_name} {task.assigned_by_lastname}</div>
                          </div>
                        )}
                        
                        <div>
                          <span className="font-medium">Assigned:</span>
                          <div className="mt-1">{new Date(task.assignment_date).toLocaleDateString()}</div>
                        </div>
                      </div>

                      {/* Completion Details */}
                      {task.assignment_status === 'completed' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                          <div className="text-sm">
                            <div className="font-medium text-green-800 mb-2">
                              Completed on {new Date(task.completed_at).toLocaleDateString()}
                            </div>
                            {task.completion_notes && (
                              <div>
                                <span className="font-medium text-green-800">Your notes:</span>
                                <p className="text-green-700 mt-1">{task.completion_notes}</p>
                              </div>
                            )}
                            {task.admin_feedback && (
                              <div className="mt-3 pt-3 border-t border-green-300">
                                <span className="font-medium text-green-800">Admin feedback:</span>
                                <p className="text-green-700 mt-1">{task.admin_feedback}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons - Simplified Model */}
                    <div className="ml-6 flex flex-col space-y-2">
                      {task.assignment_status === 'assigned' && (
                        <button
                          onClick={() => openCompletionModal(task.id, task.title)}
                          disabled={updating[`${task.id}-completed`]}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          {updating[`${task.id}-completed`] ? 'Completing...' : 'Mark Complete'}
                        </button>
                      )}

                      {task.assignment_status === 'completed' && (
                        <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-medium text-center">
                          Completed
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-600">
                {Object.values(filters).some(v => v !== 'all') 
                  ? 'Try adjusting your filters to see more tasks' 
                  : 'No tasks have been assigned to you yet'
                }
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.current_page - 1) * pagination.items_per_page) + 1} to{' '}
              {Math.min(pagination.current_page * pagination.items_per_page, pagination.total_items)} of{' '}
              {pagination.total_items} tasks
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => loadTasks(pagination.current_page - 1)}
                disabled={pagination.current_page === 1 || loading}
                className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm disabled:opacity-50"
              >
                Previous
              </button>
              
              <span className="bg-primary-600 text-white px-3 py-2 rounded-md text-sm">
                {pagination.current_page} of {pagination.total_pages}
              </span>
              
              <button
                onClick={() => loadTasks(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.total_pages || loading}
                className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Task Completion Modal */}
        <TaskCompletionModal
          isOpen={completionModal.isOpen}
          onClose={closeCompletionModal}
          onConfirm={handleCompletionConfirm}
          taskTitle={completionModal.taskTitle}
          loading={completionModal.loading}
        />
      </div>
    </div>
  );
};

export default MyTasks;