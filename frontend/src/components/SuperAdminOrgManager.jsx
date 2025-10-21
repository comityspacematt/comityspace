import React, { useState, useEffect } from 'react';
import DashboardService from '../services/dashboardService';

const SuperAdminOrgManager = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Create/Edit form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    phone: '',
    address: '',
    password: '',
    nonprofitAdminEmail: '',
    nonprofitAdminNotes: ''
  });

  const fetchOrganizations = async () => {
    try {
      console.log('🏢 Fetching organizations...');
      setLoading(true);
      setError('');
      
      const result = await DashboardService.getAllOrganizations();
      console.log('📊 Organizations API response:', result);
      
      if (result.success && result.organizations) {
        setOrganizations(result.organizations);
        console.log('✅ Organizations loaded:', result.organizations.length);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Error fetching organizations:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleCreateOrganization = async (e) => {
    e.preventDefault();
    
    try {
      console.log('🚀 Starting organization creation...');
      console.log('📝 Form data:', formData);
      
      setSubmitting(true);
      setError(''); // Clear any previous errors
      
      // Validate required fields on frontend
      if (!formData.name?.trim()) {
        throw new Error('Organization name is required');
      }
      
      if (!formData.password?.trim()) {
        throw new Error('Password is required');
      }
      
      if (formData.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Log authentication check
      const token = localStorage.getItem('accessToken');
      console.log('🔑 Auth token exists:', !!token);
      console.log('🔑 Token preview:', token ? token.substring(0, 20) + '...' : 'None');
      
      // Prepare the data for submission
      const submitData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        website: formData.website?.trim() || '',
        phone: formData.phone?.trim() || '',
        address: formData.address?.trim() || '',
        password: formData.password,
        nonprofitAdminEmail: formData.nonprofitAdminEmail?.trim() || '',
        nonprofitAdminNotes: formData.nonprofitAdminNotes?.trim() || ''
      };
      
      console.log('📤 Sending data to API:', submitData);
      
      const result = await DashboardService.createOrganization(submitData);
      
      console.log('✅ API Response:', result);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to create organization');
      }
      
      // Success! Reset form and refresh list
      console.log('🎉 Organization created successfully!');
      
      setFormData({
        name: '',
        description: '',
        website: '',
        phone: '',
        address: '',
        password: '',
        nonprofitAdminEmail: '',
        nonprofitAdminNotes: ''
      });
      
      setShowCreateForm(false);
      await fetchOrganizations();
      
      // Show success message
      alert(`✅ Organization "${result.organization?.name || formData.name}" created successfully!`);
      
    } catch (error) {
      console.error('❌ Organization creation error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      
      // Show detailed error to user
      let errorMessage = error.message;
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to create organizations.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      setError(errorMessage);
      alert(`❌ Error: ${errorMessage}`);
      
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateOrganization = async (e) => {
    e.preventDefault();
    try {
      console.log('🔄 Updating organization:', editingOrg.id, formData);
      setSubmitting(true);
      
      const result = await DashboardService.updateOrganization(editingOrg.id, formData);
      console.log('✅ Organization updated:', result);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update organization');
      }
      
      // Reset form and refresh list
      setEditingOrg(null);
      setFormData({
        name: '',
        description: '',
        website: '',
        phone: '',
        address: '',
        password: '',
        nonprofitAdminEmail: '',
        nonprofitAdminNotes: ''
      });
      await fetchOrganizations();
      alert('Organization updated successfully!');
      
    } catch (error) {
      console.error('❌ Error updating organization:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (org) => {
    const newStatus = !org.is_active;
    const confirmMessage = `Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} ${org.name}?`;
    
    if (window.confirm(confirmMessage)) {
      try {
        console.log('🔄 Toggling organization status:', org.id, newStatus);
        
        const result = await DashboardService.toggleOrganizationStatus(org.id, newStatus);
        console.log('✅ Status toggled:', result);
        
        await fetchOrganizations();
        alert(`Organization ${newStatus ? 'activated' : 'deactivated'} successfully!`);
        
      } catch (error) {
        console.error('❌ Error toggling status:', error);
        alert(`Error: ${error.message}`);
      }
    }
  };

  const handleEdit = (org) => {
    setEditingOrg(org);
    setFormData({
      name: org.name || '',
      description: org.description || '',
      website: org.website || '',
      phone: org.phone || '',
      address: org.address || '',
      password: '', // Don't pre-fill password for security
      nonprofitAdminEmail: '',
      nonprofitAdminNotes: ''
    });
  };

  const handleCancelEdit = () => {
    setEditingOrg(null);
    setShowCreateForm(false);
    setError(''); // Clear any errors
    setFormData({
      name: '',
      description: '',
      website: '',
      phone: '',
      address: '',
      password: '',
      nonprofitAdminEmail: '',
      nonprofitAdminNotes: ''
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Organization Management</h2>
        </div>
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Organization Management</h2>
          <p className="text-gray-600 mt-1">
            Manage all organizations in the system ({organizations.length} total)
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              console.log('🔄 Manual refresh triggered');
              fetchOrganizations();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            disabled={loading}
          >
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
          <button
            onClick={() => {
              console.log('➕ Create button clicked, current state:', showCreateForm);
              setShowCreateForm(!showCreateForm);
              setError(''); // Clear any previous errors
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {showCreateForm ? 'Cancel' : '➕ Create Organization'}
          </button>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-gray-50 p-3 rounded-md text-xs text-gray-600">
        Last updated: {new Date().toLocaleTimeString()} | 
        Total organizations: {organizations.length} | 
        Status: {loading ? 'Loading...' : error ? `Error: ${error}` : 'Ready'} |
        Form showing: {showCreateForm ? 'Yes' : 'No'} |
        Auth token: {localStorage.getItem('accessToken') ? 'Present' : 'Missing'}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-red-400 text-xl mr-3">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <button
                onClick={() => setError('')}
                className="text-red-800 underline text-sm mt-2 hover:text-red-900"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Organization Form */}
      {(showCreateForm || editingOrg) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            {editingOrg ? 'Edit Organization' : 'Create New Organization'}
          </h3>
          <form onSubmit={editingOrg ? handleUpdateOrganization : handleCreateOrganization} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name * 
                  <span className="text-red-500 text-xs ml-1">(Required)</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    console.log('📝 Name changed:', e.target.value);
                    setFormData({...formData, name: e.target.value});
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Local Food Bank"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://example.org"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shared Password * 
                  <span className="text-red-500 text-xs ml-1">(Min 8 characters)</span>
                </label>
                <input
                  type="password"
                  required={!editingOrg}
                  minLength="8"
                  value={formData.password}
                  onChange={(e) => {
                    console.log('🔒 Password changed, length:', e.target.value.length);
                    setFormData({...formData, password: e.target.value});
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={editingOrg ? "Leave blank to keep current" : "Organization password"}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                rows="3"
                placeholder="Brief description of the organization..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                rows="2"
                placeholder="Organization address..."
              />
            </div>

            {!editingOrg && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nonprofit Admin Email
                    <span className="text-gray-500 text-xs ml-1">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.nonprofitAdminEmail}
                    onChange={(e) => setFormData({...formData, nonprofitAdminEmail: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="admin@organization.org"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes
                    <span className="text-gray-500 text-xs ml-1">(Optional)</span>
                  </label>
                  <textarea
                    value={formData.nonprofitAdminNotes}
                    onChange={(e) => setFormData({...formData, nonprofitAdminNotes: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows="2"
                    placeholder="Notes about the admin contact..."
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                disabled={submitting}
              >
                {submitting 
                  ? '⏳ Saving...' 
                  : editingOrg 
                    ? '✅ Update Organization' 
                    : '➕ Create Organization'
                }
              </button>
            </div>
            
            {/* Debug info for form */}
            <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
              <strong>Debug Info:</strong><br/>
              Name: "{formData.name}" | Password length: {formData.password.length} | 
              Submitting: {submitting ? 'Yes' : 'No'}
            </div>
          </form>
        </div>
      )}

      {/* Organizations List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Organizations</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {organizations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {loading ? 'Loading organizations...' : 'No organizations found'}
            </div>
          ) : (
            organizations.map((org) => (
              <div key={org.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-lg font-medium text-gray-900">{org.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        org.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {org.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {org.description && (
                      <p className="text-gray-600 mt-1">{org.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      {org.website && (
                        <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                          🌐 Website
                        </a>
                      )}
                      {org.phone && <span>📞 {org.phone}</span>}
                      <span>👥 {org.user_count || 0} users</span>
                      <span>📋 {org.task_count || 0} tasks</span>
                      <span>📄 {org.document_count || 0} docs</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Created: {formatDate(org.created_at)} | Updated: {formatDate(org.updated_at)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(org)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(org)}
                      className={`text-sm font-medium ${
                        org.is_active 
                          ? 'text-red-600 hover:text-red-800' 
                          : 'text-green-600 hover:text-green-800'
                      }`}
                    >
                      {org.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminOrgManager;