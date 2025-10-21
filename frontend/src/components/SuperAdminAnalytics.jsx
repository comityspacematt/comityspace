import React, { useState, useEffect } from 'react';
import DashboardService from '../services/dashboardService';

const SuperAdminAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    try {
      console.log('📈 Fetching analytics data...');
      setLoading(true);
      setError('');
      
      const result = await DashboardService.getSuperAdminDashboard();
      console.log('📊 Analytics API response:', result);
      
      if (result.success && result.data) {
        setAnalyticsData(result.data);
        console.log('✅ Analytics loaded');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

  const formatPercentage = (num) => {
    if (num === undefined || num === null) return '0';
    return `+${num}%`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">System Analytics</h2>
        </div>
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">System Analytics</h2>
          <button
            onClick={fetchAnalytics}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            🔄 Retry
          </button>
        </div>
        <div className="p-12 text-center">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Analytics</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Analytics</h2>
          <p className="text-gray-600 mt-1">
            Platform performance and usage statistics
          </p>
        </div>
        <button
          onClick={() => {
            console.log('🔄 Manual refresh triggered');
            fetchAnalytics();
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          disabled={loading}
        >
          {loading ? 'Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Debug Info */}
      <div className="bg-gray-50 p-3 rounded-md text-xs text-gray-600">
        Last updated: {new Date().toLocaleTimeString()} | 
        Status: {loading ? 'Loading...' : error ? `Error: ${error}` : 'Ready'}
      </div>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-50">
              <div className="text-2xl">🏢</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Organizations</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(analyticsData?.stats?.total_organizations)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-50">
              <div className="text-2xl">👥</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(analyticsData?.stats?.total_users)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-50">
              <div className="text-2xl">📋</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(analyticsData?.stats?.total_tasks)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-50">
              <div className="text-2xl">📄</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(analyticsData?.stats?.total_documents)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">User Activity</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active This Week:</span>
              <span className="font-semibold text-green-600">
                {formatNumber(analyticsData?.analytics?.active_this_week)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Logins:</span>
              <span className="font-semibold">
                {formatNumber(analyticsData?.analytics?.total_logins)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">New This Month:</span>
              <span className="font-semibold text-blue-600">
                {formatNumber(analyticsData?.analytics?.new_this_month)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Task Completion</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Completed Tasks:</span>
              <span className="font-semibold text-green-600">
                {formatNumber(analyticsData?.analytics?.completed_tasks)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pending Tasks:</span>
              <span className="font-semibold text-orange-600">
                {formatNumber(analyticsData?.analytics?.pending_tasks)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Completion Rate:</span>
              <span className="font-semibold">
                {analyticsData?.analytics?.completed_tasks && analyticsData?.analytics?.pending_tasks
                  ? `${Math.round((analyticsData.analytics.completed_tasks / 
                      (analyticsData.analytics.completed_tasks + analyticsData.analytics.pending_tasks)) * 100)}%`
                  : '0%'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Growth</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Growth Rate:</span>
              <span className="font-semibold text-green-600">
                {formatPercentage(analyticsData?.analytics?.growth_rate)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Organizations:</span>
              <span className="font-semibold">
                {formatNumber(analyticsData?.organizations?.filter(org => org.is_active).length)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Avg Users per Org:</span>
              <span className="font-semibold">
                {analyticsData?.organizations?.length > 0
                  ? Math.round(analyticsData.stats.total_users / analyticsData.organizations.length)
                  : 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Organizations */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Top Organizations by User Count</h3>
        </div>
        <div className="p-6">
          {analyticsData?.organizations?.length > 0 ? (
            <div className="space-y-4">
              {analyticsData.organizations
                .sort((a, b) => (b.user_count || 0) - (a.user_count || 0))
                .slice(0, 5)
                .map((org, index) => (
                <div key={org.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{org.name}</h4>
                      <p className="text-sm text-gray-600">{org.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{org.user_count || 0} users</p>
                    <p className="text-sm text-gray-500">{org.task_count || 0} tasks</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No organizations to display</p>
          )}
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">System Health</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-2">🟢</div>
              <h4 className="font-medium text-gray-900">Database</h4>
              <p className="text-sm text-gray-600">Connected</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🟢</div>
              <h4 className="font-medium text-gray-900">API</h4>
              <p className="text-sm text-gray-600">Operational</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🟢</div>
              <h4 className="font-medium text-gray-900">Storage</h4>
              <p className="text-sm text-gray-600">Available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
              <div className="font-medium text-gray-900">📊 Export Analytics</div>
              <div className="text-sm text-gray-600">Download detailed reports</div>
            </button>
            <button className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
              <div className="font-medium text-gray-900">🔄 Refresh Cache</div>
              <div className="text-sm text-gray-600">Clear cached data</div>
            </button>
            <button className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
              <div className="font-medium text-gray-900">📝 Generate Report</div>
              <div className="text-sm text-gray-600">Create monthly summary</div>
            </button>
            <button className="w-full text-left p-3 border border-red-200 rounded-md hover:bg-red-50 transition-colors text-red-600">
              <div className="font-medium">🚨 Maintenance Mode</div>
              <div className="text-sm">Put platform offline</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminAnalytics;