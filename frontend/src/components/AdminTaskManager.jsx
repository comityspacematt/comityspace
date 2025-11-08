import React, { useState, useEffect, useCallback } from 'react';
import DashboardService from '../services/dashboardService';

const AdminTaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('list'); // 'list' or 'create'
  const [selectedTask, setSelectedTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    assign_to_emails: []
  });

  // Filter states
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    assignedTo: 'all'
  });

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/tasks?${new URLSearchParams(filters)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
      } else {
        setError(data.message || 'Failed to load tasks');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchVolunteers = useCallback(async () => {
    try {
      const result = await DashboardService.getVolunteersDirectory();
      setVolunteers(result.volunteers || []);
    } catch (error) {
      console.error('Error fetching volunteers:', error);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchVolunteers();
  }, [fetchTasks, fetchVolunteers]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(taskForm)
      });

      const data = await response.json();

      if (data.success) {
        resetForm();
        setView('list');
        fetchTasks();
      } else {
        setError(data.message || 'Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      setError('Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTaskForm({
      title: '',
      description: '',
      due_date: '',
      priority: 'medium',
      assign_to_emails: []
    });
    setSelectedTask(null);
  };

  const handleEditTask = (task) => {
    setTaskForm({
      title: task.title,
      description: task.description || '',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      priority: task.priority,
      assign_to_emails: []
    });
    setSelectedTask(task);
    setShowEditModal(true);
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description,
          due_date: taskForm.due_date,
          priority: taskForm.priority
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowEditModal(false);
        resetForm();
        fetchTasks();
        alert('Task updated successfully!');
      } else {
        setError(data.message || 'Failed to update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      setError('Failed to update task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setShowDeleteConfirm(null);
        fetchTasks();
        alert('Task deleted successfully!');
      } else {
        alert(data.message || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  const handleCompleteForVolunteer = async (taskId, userId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          userId: userId,
          completionNotes: 'Completed by admin'
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowCompleteModal(null);
        fetchTasks();
        alert('Task marked as completed for volunteer!');
      } else {
        alert(data.message || 'Failed to complete task');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Failed to complete task');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status, dueDate = null) => {
    // Check if task is overdue (due date has passed and not completed)
    const isOverdue = dueDate && status !== 'completed' && new Date(dueDate) < new Date();

    if (isOverdue) {
      return 'bg-red-100 text-red-800';
    }

    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get proper volunteer name from assignment data
  const getAssignmentDisplayName = (assignment) => {
    // Try to construct name from user_first_name and user_last_name fields
    if (assignment.user_first_name && assignment.user_first_name.trim()) {
      let name = assignment.user_first_name.trim();
      if (assignment.user_last_name && assignment.user_last_name.trim()) {
        name += ` ${assignment.user_last_name.trim()}`;
      }
      return name;
    }

    // Check if user_name exists and is not just an email
    if (assignment.user_name && !assignment.user_name.includes('@')) {
      return assignment.user_name;
    }

    // Fallback to email if no proper name is available
    if (assignment.user_email) {
      return assignment.user_email;
    }

    // Last resort fallback
    return assignment.user_name || 'Unknown User';
  };

  // Show report modal
  const handleExportReport = () => {
    if (!tasks || tasks.length === 0) {
      alert('No tasks to export');
      return;
    }
    setShowReportModal(true);
  };

  // Export tasks to CSV
  const downloadCSV = () => {
    // CSV headers
    const headers = ['Task ID', 'Title', 'Status', 'Priority', 'Due Date', 'Assigned To', 'Notes'];

    // Convert tasks data to CSV rows
    const rows = tasks.map(task => {
      const taskId = task.id || '';
      const title = task.title || '';
      const status = task.status || '';
      const priority = task.priority || '';
      const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString('en-US') : '';

      // Get assigned volunteers
      const assignedTo = task.assignments && task.assignments.length > 0
        ? task.assignments.map(a => getAssignmentDisplayName(a)).join('; ')
        : 'Unassigned';

      // Get completion notes from assignments
      const completionNotes = task.assignments && task.assignments.length > 0
        ? task.assignments
            .filter(a => a.completion_notes)
            .map(a => `${getAssignmentDisplayName(a)}: ${a.completion_notes}`)
            .join(' | ')
        : '';

      // Escape double quotes and wrap fields in quotes
      const escapeCSV = (field) => {
        if (field === null || field === undefined) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      };

      return [
        escapeCSV(taskId),
        escapeCSV(title),
        escapeCSV(status),
        escapeCSV(priority),
        escapeCSV(dueDate),
        escapeCSV(assignedTo),
        escapeCSV(completionNotes)
      ].join(',');
    });

    // Combine headers and rows
    const csv = [headers.join(','), ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `tasks-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Task Management</h2>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => setView('list')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            View Tasks
          </button>
          <button
            onClick={() => setView('create')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'create'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Create Task
          </button>
          <button
            onClick={handleExportReport}
            className="flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors bg-green-600 hover:bg-green-700 text-white"
          >
            📊 Export Report
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Task List View */}
      {view === 'list' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">All Tasks</h3>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 sm:gap-4 w-full sm:w-auto">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({...filters, priority: e.target.value})}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {tasks.length > 0 ? (
              <div className="space-y-0">
                {tasks.map((task) => (
                  <div key={task.id} className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base sm:text-lg font-medium text-gray-900">{task.title}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(task.status, task.due_date)}`}>
                            {task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
                              ? 'overdue'
                              : task.status.replace('_', ' ')
                            }
                          </span>
                        </div>

                        {task.description && (
                          <p className="mt-2 text-sm sm:text-base text-gray-600 line-clamp-2">{task.description}</p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-500">
                          <span className="whitespace-nowrap">Created by: {task.created_by_name}</span>
                          <span className="whitespace-nowrap">Due: {formatDate(task.due_date)}</span>
                          <span className="whitespace-nowrap">Assignments: {task.assignment_count || 0}</span>
                          {task.completed_assignments > 0 && (
                            <span className="text-green-600 whitespace-nowrap">
                              Completed: {task.completed_assignments}
                            </span>
                          )}
                        </div>

                        {task.assignments && task.assignments.length > 0 && (
                          <div className="mt-3">
                            <div className="flex flex-wrap gap-2">
                              {task.assignments.map((assignment, index) => (
                                <span
                                  key={index}
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    assignment.status === 'completed'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {getAssignmentDisplayName(assignment)} ({assignment.status})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-row sm:flex-col gap-2 sm:ml-4">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (task.status === 'completed') {
                              alert('Cannot delete a completed task');
                            } else {
                              setShowDeleteConfirm(task);
                            }
                          }}
                          className={`flex-1 sm:flex-none px-3 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                            task.status === 'completed'
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-red-600 hover:bg-red-700 text-white'
                          }`}
                          disabled={task.status === 'completed'}
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setSelectedTask(task)}
                          className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
                <p className="text-gray-600 mb-4">Get started by creating your first task</p>
                <button
                  onClick={() => setView('create')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Create First Task
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Task Form */}
      {view === 'create' && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4 sm:mb-6">Create New Task</h3>

          <form onSubmit={handleCreateTask} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task title"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                  rows="4"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the task requirements and details..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({...taskForm, priority: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Volunteers (Optional)
                </label>
                <select
                  multiple
                  value={taskForm.assign_to_emails}
                  onChange={(e) => setTaskForm({
                    ...taskForm, 
                    assign_to_emails: Array.from(e.target.selectedOptions, option => option.value)
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  size="4"
                >
                  {volunteers.map((volunteer) => (
                    <option key={volunteer.email} value={volunteer.email}>
                      {volunteer.firstName} {volunteer.lastName} ({volunteer.email})
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Hold Ctrl/Cmd to select multiple volunteers
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => setView('list')}
                className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {submitting ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && !showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedTask.title}</h2>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority} priority
                  </span>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedTask.status, selectedTask.due_date)}`}>
                    {selectedTask.due_date && new Date(selectedTask.due_date) < new Date() && selectedTask.status !== 'completed'
                      ? 'overdue'
                      : selectedTask.status.replace('_', ' ')
                    }
                  </span>
                </div>

                {selectedTask.description && (
                  <div>
                    <strong>Description:</strong>
                    <p className="mt-1 text-gray-700">{selectedTask.description}</p>
                  </div>
                )}

                {selectedTask.due_date && (
                  <div>
                    <strong>Due Date:</strong> {formatDate(selectedTask.due_date)}
                  </div>
                )}

                <div>
                  <strong>Created by:</strong> {selectedTask.created_by_name}
                </div>

                {selectedTask.assignments && selectedTask.assignments.length > 0 && (
                  <div>
                    <strong>Assignments:</strong>
                    <div className="mt-2 space-y-2">
                      {selectedTask.assignments.map((assignment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex-1">
                            <span className="font-medium">{getAssignmentDisplayName(assignment)}</span>
                            <span className="text-gray-600 ml-2">({assignment.user_email})</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              assignment.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {assignment.status}
                            </span>
                            {assignment.status !== 'completed' && (
                              <button
                                onClick={() => setShowCompleteModal({ taskId: selectedTask.id, assignment })}
                                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                              >
                                Mark Complete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Edit Task</h3>

              <form onSubmit={handleUpdateTask} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                    rows="4"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={taskForm.due_date}
                      onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({...taskForm, priority: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      resetForm();
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
                    {submitting ? 'Updating...' : 'Update Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Task</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the task "{showDeleteConfirm.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTask(showDeleteConfirm.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Task Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Complete Task for Volunteer</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to mark this task as completed for {getAssignmentDisplayName(showCompleteModal.assignment)}?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCompleteModal(null)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCompleteForVolunteer(showCompleteModal.taskId, showCompleteModal.assignment.user_id)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Mark Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Tasks Report</h2>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {tasks.length} task{tasks.length !== 1 ? 's' : ''} found
              </p>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{task.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="font-medium">{task.title}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status, task.due_date)}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {task.due_date ? new Date(task.due_date).toLocaleDateString('en-US') : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {task.assignments && task.assignments.length > 0
                            ? task.assignments.map(a => getAssignmentDisplayName(a)).join(', ')
                            : 'Unassigned'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {task.assignments && task.assignments.length > 0
                            ? task.assignments
                                .filter(a => a.completion_notes)
                                .map(a => `${getAssignmentDisplayName(a)}: ${a.completion_notes}`)
                                .join(' | ') || '-'
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={downloadCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors"
              >
                📥 Export to CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTaskManager;