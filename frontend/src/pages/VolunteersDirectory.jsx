import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardService from '../services/dashboardService';
import VolunteerNav from '../components/VolunteerNav';

const VolunteersDirectory = () => {
  const { user, logout } = useAuth();
  const [volunteersData, setVolunteersData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Load volunteers directory
  useEffect(() => {
    console.log('🔍 VolunteersDirectory component mounted, loading data...');
    const loadVolunteers = async () => {
      try {
        setLoading(true);
        console.log('📞 Calling DashboardService.getVolunteersDirectory()');
        const result = await DashboardService.getVolunteersDirectory();
        console.log('📊 Result received:', result);
        setVolunteersData(result);
      } catch (error) {
        console.error('Volunteers directory error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadVolunteers();
  }, []);

  // Filter volunteers based on search and role
  const filteredVolunteers = volunteersData?.volunteers?.filter(volunteer => {
    const firstName = volunteer.firstName || '';
    const lastName = volunteer.lastName || '';
    const email = volunteer.email || '';

    const matchesSearch = searchTerm === '' ||
      firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === 'all' || volunteer.role === filterRole;

    return matchesSearch && matchesRole;
  }) || [];

  // Format last login date - currently not used but kept for future use
  // const formatLastLogin = (dateString) => {
  //   if (!dateString) return 'Never';
  //   const date = new Date(dateString);
  //   const now = new Date();
  //   const diffTime = Math.abs(now - date);
  //   const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  //
  //   if (diffDays === 1) return 'Today';
  //   if (diffDays <= 7) return `${diffDays} days ago`;
  //   if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  //   return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  // };

  // Format join date - currently not used but kept for future use
  // const formatJoinDate = (dateString) => {
  //   if (!dateString) return 'Unknown';
  //   const date = new Date(dateString);
  //   return date.toLocaleDateString('en-US', {
  //     month: 'short',
  //     day: 'numeric',
  //     year: 'numeric'
  //   });
  // };

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'nonprofit_admin':
        return 'bg-purple-100 text-purple-800';
      case 'volunteer':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get role display name
  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'nonprofit_admin':
        return 'Admin';
      case 'volunteer':
        return 'Volunteer';
      default:
        return role;
    }
  };

  // Handle volunteer click to show profile
  const handleVolunteerClick = (volunteer) => {
    setSelectedVolunteer(volunteer);
    setShowProfileModal(true);
  };

  // Format birthday for display
  const formatBirthday = (birthday) => {
    if (!birthday) return 'Not provided';
    // Parse YYYY-MM-DD as local date to avoid timezone issues
    const [year, month, day] = birthday.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading volunteers directory...</p>
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
          <Link
            to="/dashboard"
            className="mt-4 inline-block bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { organization, volunteers } = volunteersData || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <VolunteerNav currentPage="Volunteers" />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Organization Header */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{organization?.name}</h2>
                {organization?.description && (
                  <p className="text-gray-600 mt-1">{organization.description}</p>
                )}
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary-600">
                  {volunteers?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Total Volunteers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Search */}
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search volunteers by name or email..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Role Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Filter by role:</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Roles</option>
                  <option value="nonprofit_admin">Admins</option>
                  <option value="volunteer">Volunteers</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Volunteers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVolunteers.length > 0 ? (
            filteredVolunteers.map((volunteer, index) => (
              <div
                key={volunteer.id || index}
                onClick={() => handleVolunteerClick(volunteer)}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-medium text-lg">
                          {volunteer.firstName.charAt(0)}{volunteer.lastName.charAt(0)}
                        </span>
                      </div>
                      
                    </div>

                    {/* Role Badge */}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(volunteer.role)}`}>
                      {getRoleDisplayName(volunteer.role)}
                    </span>
                  </div>

                  {/* Name */}
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {volunteer.firstName} {volunteer.lastName}
                    </h3>
                    {volunteer.firstName === 'Not set' && volunteer.lastName === 'Not set' && (
                      <p className="text-sm text-gray-500">Profile not completed</p>
                    )}
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-gray-600 break-all">{volunteer.email}</span>
                    </div>

                    {volunteer.phone && volunteer.phone !== 'Not provided' && (
                      <div className="flex items-center space-x-2">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="text-sm text-gray-600">{volunteer.phone}</span>
                      </div>
                    )}
                  </div>


                  {/* Admin Notes (only shown to admins) */}
                  {volunteer.notes && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Note:</span> {volunteer.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full">
              <div className="text-center py-12">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No volunteers found</h3>
                <p className="text-gray-600">
                  {searchTerm || filterRole !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'No volunteers have been added to this organization yet'
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        {volunteers && volunteers.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Directory Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {volunteers.length}
                  </div>
                  <div className="text-sm text-gray-600">Total People</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {volunteers.filter(v => v.role === 'nonprofit_admin').length}
                  </div>
                  <div className="text-sm text-gray-600">Admins</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {volunteers.filter(v => v.role === 'volunteer').length}
                  </div>
                  <div className="text-sm text-gray-600">Volunteers</div>
                </div>
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
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-bold text-2xl">
                        {selectedVolunteer.firstName.charAt(0)}{selectedVolunteer.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedVolunteer.firstName} {selectedVolunteer.lastName}
                      </h2>
                      <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full mt-1 ${getRoleBadgeColor(selectedVolunteer.role)}`}>
                        {getRoleDisplayName(selectedVolunteer.role)}
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
                    </div>
                  </div>

                  {/* Admin Notes Section */}
                  {selectedVolunteer.notes && (
                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Admin Notes</h3>
                      <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                        {selectedVolunteer.notes}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VolunteersDirectory;