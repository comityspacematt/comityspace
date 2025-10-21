import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardService from '../services/dashboardService';

// Import the components
import SuperAdminOrgManager from '../components/SuperAdminOrgManager';
import SuperAdminUserManager from '../components/SuperAdminUserManager';

const SuperAdminDashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Get active tab from URL
  const getActiveTabFromURL = () => {
    const path = location.pathname;
    if (path === '/super-admin' || path === '/super-admin/overview') return 'overview';
    if (path === '/super-admin/organizations') return 'organizations';
    if (path === '/super-admin/users') return 'users';
    if (path === '/super-admin/analytics') return 'analytics';
    return 'overview'; // default
  };

  const [activeTab, setActiveTab] = useState(getActiveTabFromURL());
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOverviewData = async () => {
    try {
      console.log('📊 Fetching overview data...');
      setLoading(true);
      setError('');
      
      const result = await DashboardService.getSuperAdminDashboard();
      console.log('✅ Overview API response:', result);
      
      if (result.success && result.data) {
        setOverviewData(result.data);
        console.log('📈 Overview data loaded');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Error fetching overview:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Sync activeTab with URL changes and redirect if needed
  useEffect(() => {
    const currentTab = getActiveTabFromURL();
    setActiveTab(currentTab);

    // Redirect base /super-admin to /super-admin/overview
    if (location.pathname === '/super-admin') {
      navigate('/super-admin/overview', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchOverviewData();
    }
  }, [activeTab]);

  // Handle tab navigation
  const handleTabClick = (tabId) => {
    const routes = {
      overview: '/super-admin/overview',
      organizations: '/super-admin/organizations',
      users: '/super-admin/users',
      analytics: '/super-admin/analytics'
    };
    navigate(routes[tabId] || '/super-admin/overview');
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

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'organizations', label: 'Organizations', icon: '🏢' },
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'analytics', label: 'Analytics', icon: '📈' }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <div className="ml-4 text-sm text-gray-500">
                Welcome back, {user?.firstName || user?.email}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Last login: {formatDate(user?.lastLogin)}
              </div>
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

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading overview...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="text-red-400 text-xl mr-3">⚠️</div>
                  <div>
                    <h3 className="text-red-800 font-medium">Error Loading Dashboard</h3>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                    <button
                      onClick={fetchOverviewData}
                      className="text-red-800 underline text-sm mt-2 hover:text-red-900"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            ) : overviewData ? (
              <>
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                      <div className="text-3xl mr-4">🏢</div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Total Organizations</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(overviewData.stats?.total_organizations)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                      <div className="text-3xl mr-4">👥</div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Total Users</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(overviewData.stats?.total_users)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                      <div className="text-3xl mr-4">📋</div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(overviewData.stats?.total_tasks)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                      <div className="text-3xl mr-4">📄</div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Total Documents</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(overviewData.stats?.total_documents)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">🚀 Recent Activity</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Active This Week</span>
                        <span className="font-medium">
                          {formatNumber(overviewData.analytics?.active_this_week)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Logins</span>
                        <span className="font-medium">
                          {formatNumber(overviewData.analytics?.total_logins)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">New This Month</span>
                        <span className="font-medium">
                          {formatNumber(overviewData.analytics?.new_this_month)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">✅ Task Progress</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completed Tasks</span>
                        <span className="font-medium text-green-600">
                          {formatNumber(overviewData.analytics?.completed_tasks)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pending Tasks</span>
                        <span className="font-medium text-yellow-600">
                          {formatNumber(overviewData.analytics?.pending_tasks)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completion Rate</span>
                        <span className="font-medium">
                          {overviewData.analytics?.completed_tasks && overviewData.stats?.total_tasks
                            ? `${Math.round((overviewData.analytics.completed_tasks / overviewData.stats.total_tasks) * 100)}%`
                            : '0%'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">🏆 Top Organizations</h3>
                    <div className="space-y-2">
                      {overviewData.analytics?.top_organizations?.slice(0, 4).map((org, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-600 truncate">{org.name}</span>
                          <span className="font-medium">{org.user_count} users</span>
                        </div>
                      )) || (
                        <p className="text-gray-500 text-sm">No data available</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent Organizations */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Recent Organizations</h3>
                  </div>
                  <div className="p-6">
                    {overviewData.organizations && overviewData.organizations.length > 0 ? (
                      <div className="space-y-4">
                        {overviewData.organizations.slice(0, 5).map((org) => (
                          <div key={org.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <h4 className="font-medium text-gray-900">{org.name}</h4>
                              <p className="text-sm text-gray-600">{org.description}</p>
                              <p className="text-xs text-gray-500">
                                Created: {formatDate(org.created_at)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                org.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {org.is_active ? 'Active' : 'Inactive'}
                              </span>
                              <span className="text-sm text-gray-500">
                                {org.user_count || 0} users
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No organizations found</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                <p className="text-gray-600">Click refresh to load overview data</p>
                <button
                  onClick={fetchOverviewData}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Load Data
                </button>
              </div>
            )}
          </div>
        )}

        {/* Organizations Tab - Now renders the actual component */}
        {activeTab === 'organizations' && (
          <SuperAdminOrgManager />
        )}

        {/* Users Tab - Now renders the actual component */}
        {activeTab === 'users' && (
          <SuperAdminUserManager />
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-3">📈 System Analytics</h3>
              <p className="text-purple-700 mb-4">
                Advanced analytics and reporting features coming soon.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900">User Growth</h4>
                  <p className="text-sm text-gray-600">Track user registration trends</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900">Platform Usage</h4>
                  <p className="text-sm text-gray-600">Monitor feature adoption</p>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900">Performance Metrics</h4>
                  <p className="text-sm text-gray-600">System health indicators</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;