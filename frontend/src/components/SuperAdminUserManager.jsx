import React, { useState, useEffect } from 'react';
import DashboardService from '../services/dashboardService';

const SuperAdminUserManager = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [selectedUserOrg, setSelectedUserOrg] = useState('all');
  const [selectedUserRole, setSelectedUserRole] = useState('all');
  
  // Add user form
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    role: 'volunteer',
    organizationId: '',
    notes: ''
  });

  // Edit user form
  const [showEditUserForm, setShowEditUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserData, setEditUserData] = useState({
    email: '',
    role: 'volunteer',
    organizationId: '',
    notes: '',
    firstName: '',
    lastName: '',
    phone: ''
  });

  const fetchAllUsers = async () => {
    try {
      console.log('👥 Fetching all users...');
      setLoading(true);
      setError('');
      
      const result = await DashboardService.getAllUsers();
      console.log('📊 Users API response:', result);
      
      if (result.success && result.users) {
        setAllUsers(result.users);
        console.log('✅ Users loaded:', result.users.length);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const result = await DashboardService.getSuperAdminDashboard();
      if (result.success && result.data && result.data.organizations) {
        setOrganizations(result.data.organizations);
      }
    } catch (error) {
      console.error('Error fetching organizations for dropdown:', error);
    }
  };

  useEffect(() => {
    fetchAllUsers();
    fetchOrganizations();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      console.log('➕ Adding user:', newUserData);
      
      const result = await DashboardService.addUserToOrganization(newUserData);
      console.log('✅ User added:', result);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to add user');
      }
      
      // Reset form
      setNewUserData({
        email: '',
        role: 'volunteer',
        organizationId: '',
        notes: ''
      });
      setShowAddUserForm(false);
      
      // Refresh users list
      await fetchAllUsers();
      alert('User added successfully!');
      
    } catch (error) {
      console.error('❌ Error adding user:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const parseUserNotes = (notes) => {
    if (!notes) return { adminNotes: '', firstName: '', lastName: '', volunteerName: '' };
    try {
      if (typeof notes === 'string') {
        return JSON.parse(notes);
      }
      return notes;
    } catch (e) {
      return { adminNotes: notes, firstName: '', lastName: '', volunteerName: '' };
    }
  };

  const handleEditUser = (userItem) => {
    const parsedNotes = parseUserNotes(userItem.notes);

    setEditingUser(userItem);
    setEditUserData({
      email: userItem.email,
      role: userItem.role,
      organizationId: userItem.organization_id,
      notes: parsedNotes.adminNotes || '',
      firstName: parsedNotes.firstName || userItem.first_name || '',
      lastName: parsedNotes.lastName || userItem.last_name || '',
      phone: userItem.phone || ''
    });
    setShowEditUserForm(true);
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    try {
      console.log('✏️ Saving user edits:', editUserData);

      // Use the new comprehensive update endpoint
      await DashboardService.updateUserProfile(editingUser.email, {
        role: editUserData.role,
        organizationId: editingUser.organization_id,
        notes: editUserData.notes,
        firstName: editUserData.firstName,
        lastName: editUserData.lastName,
        phone: editUserData.phone
      });

      // Reset form and close modal
      setShowEditUserForm(false);
      setEditingUser(null);

      // Refresh users list
      await fetchAllUsers();
      alert('User updated successfully!');

    } catch (error) {
      console.error('❌ Error updating user:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteUser = async (email, organizationName) => {
    const confirmMessage = `Are you sure you want to permanently delete ${email} from ${organizationName}?\n\nThis action cannot be undone and will remove the user from the system entirely.`;

    if (window.confirm(confirmMessage)) {
      try {
        console.log('🗑️ Deleting user:', email);

        await DashboardService.removeUserFromOrganization(email);

        // Refresh users list
        await fetchAllUsers();
        alert('User deleted successfully!');

      } catch (error) {
        console.error('❌ Error deleting user:', error);
        alert(`Error: ${error.message}`);
      }
    }
  };


  const handleUpdateUserRole = async (email, newRole, organizationId) => {
    try {
      console.log('🔄 Updating user role:', { email, newRole, organizationId });
      
      await DashboardService.updateUserRole(email, newRole, organizationId);
      
      // Refresh users list
      await fetchAllUsers();
      alert('User role updated successfully!');
      
    } catch (error) {
      console.error('❌ Error updating user role:', error);
      alert(`Error: ${error.message}`);
    }
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

  // Filter users based on selected organization and role
  const filteredUsers = allUsers.filter(userItem => {
    const orgMatch = selectedUserOrg === 'all' || userItem.organization_id === parseInt(selectedUserOrg);
    const roleMatch = selectedUserRole === 'all' || userItem.role === selectedUserRole;
    return orgMatch && roleMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-1">
            Manage users across all organizations ({filteredUsers.length} of {allUsers.length} shown)
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              console.log('🔄 Manual refresh triggered');
              fetchAllUsers();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            disabled={loading}
          >
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
          <button
            onClick={() => setShowAddUserForm(!showAddUserForm)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {showAddUserForm ? 'Cancel' : '➕ Add User'}
          </button>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-gray-50 p-3 rounded-md text-xs text-gray-600">
        Last updated: {new Date().toLocaleTimeString()} | 
        Total users: {allUsers.length} | 
        Filtered: {filteredUsers.length} | 
        Status: {loading ? 'Loading...' : error ? `Error: ${error}` : 'Ready'}
      </div>

      {/* Edit User Form */}
      {showEditUserForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Edit User</h3>
          <form onSubmit={handleSaveEditUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (read-only)
                </label>
                <input
                  type="email"
                  value={editUserData.email}
                  readOnly
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization (read-only)
                </label>
                <input
                  type="text"
                  value={editingUser?.organization_name || ''}
                  readOnly
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  required
                  value={editUserData.role}
                  onChange={(e) => setEditUserData({...editUserData, role: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="volunteer">Volunteer</option>
                  <option value="nonprofit_admin">Nonprofit Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={editUserData.firstName}
                  onChange={(e) => setEditUserData({...editUserData, firstName: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="First name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={editUserData.lastName}
                  onChange={(e) => setEditUserData({...editUserData, lastName: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Last name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editUserData.phone}
                  onChange={(e) => setEditUserData({...editUserData, phone: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone number"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes
                </label>
                <textarea
                  value={editUserData.notes}
                  onChange={(e) => setEditUserData({...editUserData, notes: e.target.value})}
                  rows="3"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Admin notes about this user..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowEditUserForm(false);
                  setEditingUser(null);
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add User Form */}
      {showAddUserForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Add User to Organization</h3>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization *
                </label>
                <select
                  required
                  value={newUserData.organizationId}
                  onChange={(e) => setNewUserData({...newUserData, organizationId: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Organization</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  required
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="volunteer">Volunteer</option>
                  <option value="nonprofit_admin">Nonprofit Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={newUserData.notes}
                  onChange={(e) => setNewUserData({...newUserData, notes: e.target.value})}
                  rows="3"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Notes about this user..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddUserForm(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Add User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Organization
            </label>
            <select
              value={selectedUserOrg}
              onChange={(e) => setSelectedUserOrg(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Organizations</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Role
            </label>
            <select
              value={selectedUserRole}
              onChange={(e) => setSelectedUserRole(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="nonprofit_admin">Nonprofit Admin</option>
              <option value="volunteer">Volunteer</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedUserOrg('all');
                setSelectedUserRole('all');
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            All Users ({filteredUsers.length})
          </h3>
        </div>
        <div className="overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading users...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="text-red-600 text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Users</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button 
                onClick={fetchAllUsers}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((userItem) => (
                    <tr key={`${userItem.email}-${userItem.organization_id}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {(() => {
                              const parsedNotes = parseUserNotes(userItem.notes);
                              const firstName = parsedNotes.firstName || userItem.first_name || '';
                              const lastName = parsedNotes.lastName || userItem.last_name || '';
                              const fullName = `${firstName} ${lastName}`.trim();
                              return fullName || userItem.email;
                            })()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {userItem.email}
                          </div>
                          {(() => {
                            const parsedNotes = parseUserNotes(userItem.notes);
                            if (parsedNotes.adminNotes) {
                              return (
                                <div className="text-sm text-gray-400">
                                  {parsedNotes.adminNotes}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {userItem.organization_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={userItem.role}
                          onChange={(e) => handleUpdateUserRole(
                            userItem.email, 
                            e.target.value, 
                            userItem.organization_id
                          )}
                          className={`text-sm rounded-full px-3 py-1 font-semibold border-0 cursor-pointer ${
                            userItem.role === 'nonprofit_admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          <option value="volunteer">Volunteer</option>
                          <option value="nonprofit_admin">Nonprofit Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {userItem.last_login ? formatDate(userItem.last_login) : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-3 justify-end">
                          <button
                            onClick={() => handleEditUser(userItem)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Edit user details"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(userItem.email, userItem.organization_name)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete user permanently"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600 mb-4">
                {allUsers.length === 0 
                  ? 'No users exist yet. Add some users to get started.' 
                  : 'No users match the selected filters.'}
              </p>
              {allUsers.length === 0 && (
                <button
                  onClick={() => setShowAddUserForm(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Add First User
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminUserManager;