import React, { createContext, useContext, useState, useEffect } from 'react';
import AuthService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(null);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (AuthService.isLoggedIn()) {
          // Try to get fresh user data
          const result = await AuthService.getCurrentUser();
          setUser(result.user);
          setUserType(result.userType);
          setPermissions(AuthService.getUserPermissions());
        } else {
          // Check if there's stored data to use temporarily
          const storedData = AuthService.getStoredUser();
          if (storedData) {
            setUser(storedData.user);
            setUserType(storedData.userType);
            setPermissions(AuthService.getUserPermissions());
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // If there's an error, user might need to login again
        await logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      const result = await AuthService.login(email, password);
      
      if (result.success) {
        setUser(result.user);
        setUserType(result.userType);
        setPermissions(AuthService.getUserPermissions());
        
        return {
          success: true,
          message: result.message,
          userType: result.userType
        };
      }
      
      return { success: false, message: result.message };
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Login failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);
      await AuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setUserType(null);
      setPermissions(null);
      setLoading(false);
    }
  };

  // Update profile function
  const updateProfile = async (profileData) => {
    try {
      const result = await AuthService.updateProfile(profileData);
      if (result.success) {
        setUser(result.user);
        return result;
      }
      return result;
    } catch (error) {
      throw error;
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const result = await AuthService.getCurrentUser();
      setUser(result.user);
      setUserType(result.userType);
      setPermissions(AuthService.getUserPermissions());
      return result;
    } catch (error) {
      console.error('Refresh user error:', error);
      throw error;
    }
  };

  // Check if user is authenticated
  const isAuthenticated = AuthService.isLoggedIn() && user;

  // Get dashboard path based on user type
  const getDashboardPath = () => {
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

  const value = {
    // State
    user,
    userType,
    loading,
    permissions,
    isAuthenticated,
    
    // Actions
    login,
    logout,
    updateProfile,
    refreshUser,
    getDashboardPath,
    
    // Utilities
    checkEmail: AuthService.checkEmail,
    changeOrganizationPassword: AuthService.changeOrganizationPassword,
    getAllOrganizations: AuthService.getAllOrganizations,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};