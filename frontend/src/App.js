import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import VolunteerDashboard from './pages/VolunteerDashboard';
import VolunteersDirectory from './pages/VolunteersDirectory';
import MyTasks from './pages/MyTasks';
import Calendar from './pages/Calendar';
import Documents from './pages/Documents';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard'; // Import the new component
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, allowedUserTypes = [] }) => {
  const { isAuthenticated, userType, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedUserTypes.length > 0 && !allowedUserTypes.includes(userType)) {
    // Redirect to appropriate dashboard if user type not allowed
    const dashboardPath = getDashboardPathForUserType(userType);
    return <Navigate to={dashboardPath} replace />;
  }

  return children;
};

// Helper function to get dashboard path
const getDashboardPathForUserType = (userType) => {
  switch (userType) {
    case 'super_admin':
      return '/super-admin';
    case 'nonprofit_admin':
      return '/admin-dashboard';
    case 'volunteer':
      return '/dashboard';
    default:
      return '/login';
  }
};

// Main App Component
function AppContent() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      
      {/* Protected Routes */}
      <Route
        path="/super-admin"
        element={
          <ProtectedRoute allowedUserTypes={['super_admin']}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/super-admin/overview"
        element={
          <ProtectedRoute allowedUserTypes={['super_admin']}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/super-admin/organizations"
        element={
          <ProtectedRoute allowedUserTypes={['super_admin']}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/super-admin/users"
        element={
          <ProtectedRoute allowedUserTypes={['super_admin']}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/super-admin/analytics"
        element={
          <ProtectedRoute allowedUserTypes={['super_admin']}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin-dashboard"
        element={
          <ProtectedRoute allowedUserTypes={['nonprofit_admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin-dashboard/overview"
        element={
          <ProtectedRoute allowedUserTypes={['nonprofit_admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin-dashboard/tasks"
        element={
          <ProtectedRoute allowedUserTypes={['nonprofit_admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin-dashboard/events"
        element={
          <ProtectedRoute allowedUserTypes={['nonprofit_admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin-dashboard/documents"
        element={
          <ProtectedRoute allowedUserTypes={['nonprofit_admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin-dashboard/volunteers"
        element={
          <ProtectedRoute allowedUserTypes={['nonprofit_admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute allowedUserTypes={['volunteer']}>
            <VolunteerDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/volunteers" 
        element={
          <ProtectedRoute allowedUserTypes={['volunteer', 'nonprofit_admin']}>
            <VolunteersDirectory />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/my-tasks" 
        element={
          <ProtectedRoute allowedUserTypes={['volunteer']}>
            <MyTasks />
          </ProtectedRoute>
        } 
      />
      
      <Route
        path="/calendar"
        element={
          <ProtectedRoute allowedUserTypes={['volunteer', 'nonprofit_admin']}>
            <Calendar />
          </ProtectedRoute>
        }
      />

      <Route
        path="/documents"
        element={
          <ProtectedRoute allowedUserTypes={['volunteer', 'nonprofit_admin']}>
            <Documents />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedUserTypes={['volunteer', 'nonprofit_admin']}>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Default Redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* 404 Route */}
      <Route 
        path="*" 
        element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900">404</h1>
              <p className="text-gray-600 mt-2">Page not found</p>
              <a 
                href="/" 
                className="mt-4 inline-block bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Go Home
              </a>
            </div>
          </div>
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;