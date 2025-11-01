import React, { useState, useEffect } from 'react';
import DashboardService from '../services/dashboardService';

const AdminVolunteerManager = ({ dashboardData, onRefreshData }) => {
  // State for volunteers list
  const [volunteers, setVolunteers] = useState([]);
  const [invalidRecords, setInvalidRecords] = useState([]);
  const [volunteersLoading, setVolunteersLoading] = useState(true);
  const [volunteersError, setVolunteersError] = useState('');

  // Load volunteers list
  useEffect(() => {
    const loadVolunteers = async () => {
      try {
        setVolunteersLoading(true);
        const result = await DashboardService.getVolunteersDirectory();

        // Separate valid and invalid records
        const allVolunteers = result.volunteers || [];

        console.log('🔍 All volunteers from API:', allVolunteers.map(v => ({
          email: v.email,
          firstName: v.firstName,
          lastName: v.lastName,
          lastLogin: v.lastLogin,
          emailType: typeof v.email,
          hasEmail: !!v.email
        })));

        const validVolunteers = allVolunteers.filter(v => v.email);
        const invalidVolunteers = allVolunteers.filter(v => !v.email);

        console.log('📧 Initial load - valid volunteers:', validVolunteers);
        console.log('❌ Initial load - invalid records:', invalidVolunteers);

        setVolunteers(validVolunteers);
        setInvalidRecords(invalidVolunteers);
        setVolunteersError('');
      } catch (error) {
        console.error('Error loading volunteers:', error);
        setVolunteersError(error.message);
      } finally {
        setVolunteersLoading(false);
      }
    };

    loadVolunteers();
  }, []);
  // Volunteer management state
  const [showVolunteerForm, setShowVolunteerForm] = useState(false);
  const [volunteerFormData, setVolunteerFormData] = useState({
    name: '',
    email: '',
    role: 'volunteer',
    notes: ''
  });
  const [volunteerAdding, setVolunteerAdding] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(null);

  // Edit volunteer state
  const [showEditModal, setShowEditModal] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: 'volunteer',
    notes: ''
  });
  const [volunteerUpdating, setVolunteerUpdating] = useState(false);

  // Profile modal state
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Helper function to get volunteer name
  const getVolunteerName = (volunteer) => {
    // Check if we have valid firstName/lastName (not "Not set")
    if (volunteer.firstName && volunteer.firstName !== 'Not set' &&
        volunteer.lastName && volunteer.lastName !== 'Not set') {
      return `${volunteer.firstName} ${volunteer.lastName}`.trim();
    }

    // Check if we have at least one valid name
    if (volunteer.firstName && volunteer.firstName !== 'Not set') {
      return volunteer.firstName.trim();
    }
    if (volunteer.lastName && volunteer.lastName !== 'Not set') {
      return volunteer.lastName.trim();
    }

    // Fallback for legacy data structure
    if (volunteer.first_name && volunteer.first_name !== 'Not set') {
      if (volunteer.last_name && volunteer.last_name !== 'Not set') {
        return `${volunteer.first_name} ${volunteer.last_name}`.trim();
      }
      return volunteer.first_name.trim();
    }
    if (volunteer.last_name && volunteer.last_name !== 'Not set') {
      return volunteer.last_name.trim();
    }

    // If name is stored in notes as JSON (admin-managed names)
    try {
      if (volunteer.notes) {
        const notesData = JSON.parse(volunteer.notes);
        if (notesData.volunteerName) {
          return notesData.volunteerName;
        }
        // Try firstName/lastName from notes
        if (notesData.firstName && notesData.lastName) {
          return `${notesData.firstName} ${notesData.lastName}`.trim();
        }
        if (notesData.firstName) {
          return notesData.firstName.trim();
        }
        if (notesData.lastName) {
          return notesData.lastName.trim();
        }
      }
    } catch (e) {
      // If notes is not JSON, ignore
    }

    return 'Name not provided';
  };

  const getAdminNotes = (volunteer) => {
    try {
      if (volunteer.notes) {
        const notesData = JSON.parse(volunteer.notes);
        return notesData.adminNotes || '';
      }
    } catch (e) {
      // If notes is not JSON, return as is
      return volunteer.notes || '';
    }
    return '';
  };

  // Helper function to format last login date
  const formatLastLogin = (dateString) => {
    if (!dateString) return 'Never logged in';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    if (diffDays <= 30) return `${Math.ceil((diffDays - 1) / 7)} weeks ago`;
    if (diffDays <= 365) return `${Math.ceil((diffDays - 1) / 30)} months ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Handle volunteer click to show profile
  const handleVolunteerClick = (volunteer) => {
    setSelectedVolunteer(volunteer);
    setShowProfileModal(true);
  };

  // Format birthday for display
  const formatBirthday = (birthday) => {
    if (!birthday) return 'Not provided';
    const date = new Date(birthday);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Export volunteers to CSV
  const handleExportDirectory = () => {
    if (!volunteers || volunteers.length === 0) {
      alert('No volunteers to export');
      return;
    }

    // CSV headers
    const headers = ['Name', 'Email', 'Phone', 'Address', 'Birthday', 'Role', 'Last Login', 'Admin Notes'];

    // Convert volunteers data to CSV rows
    const rows = volunteers.map(volunteer => {
      const name = getVolunteerName(volunteer);
      const email = volunteer.email || '';
      const phone = volunteer.phone && volunteer.phone !== 'Not provided' ? volunteer.phone : '';
      const address = volunteer.address || '';
      const birthday = volunteer.birthday || '';
      const role = volunteer.role === 'nonprofit_admin' ? 'Admin' : 'Volunteer';
      const lastLogin = formatLastLogin(volunteer.lastLogin);
      const notes = getAdminNotes(volunteer);

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
        escapeCSV(name),
        escapeCSV(email),
        escapeCSV(phone),
        escapeCSV(address),
        escapeCSV(birthday),
        escapeCSV(role),
        escapeCSV(lastLogin),
        escapeCSV(notes)
      ].join(',');
    });

    // Combine headers and rows
    const csv = [headers.join(','), ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `volunteers-directory-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddVolunteer = async (e) => {
    e.preventDefault();
    try {
      setVolunteerAdding(true);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/volunteers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(volunteerFormData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to add volunteer');
      }

      // Reset form and refresh data
      setVolunteerFormData({
        name: '',
        email: '',
        role: 'volunteer',
        notes: ''
      });
      setShowVolunteerForm(false);
      
      if (onRefreshData) {
        await onRefreshData();
      }

      // Show success message
      alert(`Successfully added ${volunteerFormData.name} as a volunteer!`);

    } catch (error) {
      console.error('Error adding volunteer:', error);
      alert(`Error adding volunteer: ${error.message}`);
    } finally {
      setVolunteerAdding(false);
    }
  };

  const handleEditVolunteer = (volunteer) => {
    const currentName = getVolunteerName(volunteer);
    console.log('🔍 Opening edit modal for volunteer:', {
      volunteer,
      currentName,
      email: volunteer.email,
      role: volunteer.role
    });

    setEditFormData({
      name: currentName,
      email: volunteer.email,
      role: volunteer.role,
      notes: getAdminNotes(volunteer)
    });
    setShowEditModal(volunteer.email);
  };

  const handleUpdateVolunteer = async (e) => {
    e.preventDefault();
    try {
      setVolunteerUpdating(true);

      const updateData = {
        name: editFormData.name,
        role: editFormData.role,
        notes: editFormData.notes
      };

      console.log('🔄 Updating volunteer with data:', updateData);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/volunteers/${encodeURIComponent(editFormData.email)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      console.log('✅ Update response:', {
        status: response.status,
        result: result
      });

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update volunteer');
      }

      setShowEditModal(null);

      // Refresh volunteers list
      console.log('🔄 Refreshing volunteers list...');
      const refreshResult = await DashboardService.getVolunteersDirectory();
      console.log('📊 New volunteers data:', refreshResult);

      // Separate valid and invalid records
      const allVolunteers = refreshResult.volunteers || [];
      const validVolunteers = allVolunteers.filter(v => v.email);
      const invalidVolunteers = allVolunteers.filter(v => !v.email);

      console.log('📧 Filtered volunteers with emails:', validVolunteers);
      console.log('❌ Invalid records after update:', invalidVolunteers);

      setVolunteers(validVolunteers);
      setInvalidRecords(invalidVolunteers);

      if (onRefreshData) {
        await onRefreshData();
      }

      alert(`Successfully updated volunteer information`);

    } catch (error) {
      console.error('Error updating volunteer:', error);
      alert(`Error updating volunteer: ${error.message}`);
    } finally {
      setVolunteerUpdating(false);
    }
  };

  const handleRemoveVolunteer = async (email) => {
    try {
      console.log('🗑️ Removing volunteer:', email);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/volunteers/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      const result = await response.json();

      console.log('✅ Remove response:', {
        status: response.status,
        result: result
      });

      if (!response.ok) {
        throw new Error(result.message || 'Failed to remove volunteer');
      }

      setShowRemoveConfirm(null);

      // Refresh volunteers list
      console.log('🔄 Refreshing volunteers list after removal...');
      const refreshResult = await DashboardService.getVolunteersDirectory();
      console.log('📊 Volunteers after removal:', refreshResult.volunteers);

      // Separate valid and invalid records
      const allVolunteers = refreshResult.volunteers || [];
      const validVolunteers = allVolunteers.filter(v => v.email);
      const invalidVolunteers = allVolunteers.filter(v => !v.email);

      console.log('📧 Filtered volunteers with emails:', validVolunteers);
      console.log('❌ Invalid records after removal:', invalidVolunteers);

      setVolunteers(validVolunteers);
      setInvalidRecords(invalidVolunteers);

      if (onRefreshData) {
        await onRefreshData();
      }

      alert(`Successfully removed volunteer from whitelist`);

    } catch (error) {
      console.error('Error removing volunteer:', error);
      alert(`Error removing volunteer: ${error.message}`);
    }
  };

  const handleDeleteInvalidRecord = async (record) => {
    try {
      console.log('🗑️ Deleting invalid record:', record);

      let response;

      if (record.id && record.id !== null) {
        // Delete by ID if available
        const url = `${process.env.REACT_APP_API_URL}/admin/volunteers/invalid/${record.id}`;
        response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
      } else {
        // Delete by criteria for records without ID
        const criteriaUrl = `${process.env.REACT_APP_API_URL}/admin/volunteers/invalid/delete-by-criteria`;

        // Extract criteria from the record - only include non-null/non-empty values
        let criteria = {};

        // Only include role if it has a meaningful value
        if (record.role && record.role !== null) {
          criteria.role = record.role;
        }

        // Only include notes if it has meaningful content
        if (record.notes) {
          criteria.notes = typeof record.notes === 'string' ? record.notes : JSON.stringify(record.notes);
        }

        // Try to extract firstName/lastName if available and meaningful
        if (record.firstName && record.firstName !== 'Not set') {
          criteria.firstName = record.firstName;
        }
        if (record.lastName && record.lastName !== 'Not set') {
          criteria.lastName = record.lastName;
        }

        // If no criteria could be extracted, we can't safely delete
        if (Object.keys(criteria).length === 0) {
          throw new Error('Cannot delete record: No unique identifying criteria found');
        }

        console.log('🔍 Delete criteria:', criteria);

        response = await fetch(criteriaUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify(criteria)
        });
      }

      const result = await response.json();
      console.log('📊 Response data:', result);

      if (response.ok) {
        // Remove from local state - for criteria-based deletion, we might remove multiple records
        if (record.id) {
          setInvalidRecords(prev => prev.filter(r => r.id !== record.id));
        } else {
          // For criteria-based deletion, refresh the entire list
          const refreshResult = await DashboardService.getVolunteersDirectory();
          const allVolunteers = refreshResult.volunteers || [];
          const newInvalidRecords = allVolunteers.filter(v => !v.email);
          setInvalidRecords(newInvalidRecords);
        }

        alert(result.message || 'Invalid record(s) deleted successfully');
      } else {
        throw new Error(result.message || 'Failed to delete invalid record');
      }
    } catch (error) {
      console.error('Error deleting invalid record:', error);
      alert(`Error deleting record: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Volunteer Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Volunteer Management</h3>
          <button
            onClick={() => setShowVolunteerForm(!showVolunteerForm)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {showVolunteerForm ? 'Cancel' : 'Add Volunteer'}
          </button>
        </div>

        {showVolunteerForm && (
          <form onSubmit={handleAddVolunteer} className="border-t pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Volunteer Name *
                </label>
                <input
                  type="text"
                  required
                  value={volunteerFormData.name}
                  onChange={(e) => setVolunteerFormData({...volunteerFormData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={volunteerFormData.email}
                  onChange={(e) => setVolunteerFormData({...volunteerFormData, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="volunteer@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={volunteerFormData.role}
                  onChange={(e) => setVolunteerFormData({...volunteerFormData, role: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="volunteer">Volunteer</option>
                  <option value="nonprofit_admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={volunteerFormData.notes}
                  onChange={(e) => setVolunteerFormData({...volunteerFormData, notes: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Optional notes about this volunteer..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowVolunteerForm(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={volunteerAdding}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {volunteerAdding ? 'Adding...' : 'Add Volunteer'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Volunteer Directory */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Volunteer Directory</h3>
          <p className="text-sm text-gray-600 mt-1">
            {volunteersLoading ? 'Loading...' : `${volunteers.length} volunteers in your organization`}
          </p>
        </div>

        {volunteersError && (
          <div className="px-6 py-4 bg-red-50 border-b border-red-200">
            <p className="text-sm text-red-600">Error: {volunteersError}</p>
          </div>
        )}

        <div className="divide-y divide-gray-200">
          {volunteersLoading ? (
            <div className="px-6 py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading volunteers...</p>
            </div>
          ) : volunteers.length > 0 ? (
            volunteers.map((volunteer, index) => (
              <div
                key={volunteer.email || `volunteer-${index}`}
                onClick={() => handleVolunteerClick(volunteer)}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {getVolunteerName(volunteer).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {getVolunteerName(volunteer)}
                        </p>
                        <p className="text-sm text-gray-500">{volunteer.email}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        volunteer.role === 'nonprofit_admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {volunteer.role === 'nonprofit_admin' ? 'Admin' : 'Volunteer'}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        volunteer.lastLogin
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        Last login: {formatLastLogin(volunteer.lastLogin)}
                      </span>
                    </div>
                    {getAdminNotes(volunteer) && (
                      <p className="mt-2 text-sm text-gray-600">
                        Notes: {getAdminNotes(volunteer)}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditVolunteer(volunteer);
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('🔴 Remove button clicked for volunteer:', volunteer);
                        console.log('🔴 Email value:', volunteer.email);
                        if (!volunteer.email) {
                          alert('Cannot remove volunteer: email is missing');
                          return;
                        }
                        setShowRemoveConfirm(volunteer.email);
                      }}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center">
              <div className="text-gray-400 text-4xl mb-2">👥</div>
              <p className="text-gray-500 text-lg">No volunteers added yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Start by adding volunteers to your organization
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Quick Actions</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="text-left p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
            <div className="text-blue-600 text-xl mb-2">📧</div>
            <h5 className="font-medium text-gray-900">Send Newsletter</h5>
            <p className="text-sm text-gray-600">Email all volunteers with updates</p>
          </button>
          <button
            onClick={handleExportDirectory}
            className="text-left p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="text-green-600 text-xl mb-2">📊</div>
            <h5 className="font-medium text-gray-900">Export Directory</h5>
            <p className="text-sm text-gray-600">Download volunteer contact list</p>
          </button>
          <button className="text-left p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
            <div className="text-purple-600 text-xl mb-2">⚙️</div>
            <h5 className="font-medium text-gray-900">Manage Roles</h5>
            <p className="text-sm text-gray-600">Update volunteer permissions</p>
          </button>
        </div>
      </div>

      {/* Invalid Records Section */}
      {invalidRecords.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="text-red-600 text-xl mr-3">⚠️</div>
            <div>
              <h4 className="text-md font-medium text-red-900">Invalid Records</h4>
              <p className="text-sm text-red-700">
                {invalidRecords.length} record(s) found without email addresses. These records cannot be managed and should be cleaned up.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {invalidRecords.map((record, index) => (
              <div key={record.id || `invalid-${index}`} className="bg-white border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      Record ID: {record.id || 'Unknown'}
                    </p>
                    <div className="text-sm text-gray-600 mt-1">
                      {record.firstName && record.firstName !== 'Not set' && (
                        <span>Name: {record.firstName} {record.lastName}</span>
                      )}
                      {record.role && <span className="ml-3">Role: {record.role}</span>}
                      {record.notes && (
                        <div className="mt-1">
                          <span>Notes: {typeof record.notes === 'string' ? record.notes : JSON.stringify(record.notes)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      console.log('🔍 Invalid record data:', record);

                      const confirmMessage = record.id
                        ? 'Are you sure you want to permanently delete this invalid record? This action cannot be undone.'
                        : 'This record has no ID and will be deleted using criteria matching. This may delete multiple similar records. Are you sure you want to continue?';

                      if (window.confirm(confirmMessage)) {
                        handleDeleteInvalidRecord(record);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-red-100 rounded-lg">
            <p className="text-xs text-red-800">
              <strong>Note:</strong> Invalid records are caused by incomplete data imports or database inconsistencies.
              Records with IDs are deleted directly. Records without IDs are deleted using criteria matching and may remove similar records.
            </p>
          </div>
        </div>
      )}

      {/* Edit Volunteer Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Edit Volunteer
            </h3>
            <form onSubmit={handleUpdateVolunteer}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Volunteer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    disabled
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="volunteer">Volunteer</option>
                    <option value="nonprofit_admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes
                  </label>
                  <textarea
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Internal notes about this volunteer..."
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={volunteerUpdating}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {volunteerUpdating ? 'Updating...' : 'Update Volunteer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Remove Volunteer
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove <strong>{showRemoveConfirm}</strong> from the volunteer whitelist? 
              They will no longer be able to access the platform.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRemoveConfirm(null)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveVolunteer(showRemoveConfirm)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && selectedVolunteer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-2xl">
                      {getVolunteerName(selectedVolunteer).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {getVolunteerName(selectedVolunteer)}
                    </h2>
                    <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full mt-1 ${
                      selectedVolunteer.role === 'nonprofit_admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedVolunteer.role === 'nonprofit_admin' ? 'Admin' : 'Volunteer'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Profile Information */}
              <div className="space-y-6">
                {/* Contact Information Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="w-32 text-sm font-medium text-gray-600">Email:</div>
                      <div className="flex-1 text-sm text-gray-900">{selectedVolunteer.email}</div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-32 text-sm font-medium text-gray-600">Phone:</div>
                      <div className="flex-1 text-sm text-gray-900">
                        {selectedVolunteer.phone && selectedVolunteer.phone !== 'Not provided'
                          ? selectedVolunteer.phone
                          : 'Not provided'}
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-32 text-sm font-medium text-gray-600">Address:</div>
                      <div className="flex-1 text-sm text-gray-900 whitespace-pre-line">
                        {selectedVolunteer.address || 'Not provided'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Information Section */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Personal Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="w-32 text-sm font-medium text-gray-600">Birthday:</div>
                      <div className="flex-1 text-sm text-gray-900">
                        {formatBirthday(selectedVolunteer.birthday)}
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-32 text-sm font-medium text-gray-600">Last Login:</div>
                      <div className="flex-1 text-sm text-gray-900">
                        {formatLastLogin(selectedVolunteer.lastLogin)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Notes Section */}
                {getAdminNotes(selectedVolunteer) && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Admin Notes</h3>
                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {getAdminNotes(selectedVolunteer)}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    handleEditVolunteer(selectedVolunteer);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVolunteerManager;