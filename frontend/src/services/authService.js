import api from './api';

class AuthService {
  // Login user (handles all 3 user types)
  static async login(email, password) {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { success, user, tokens, userType, message } = response.data;

      if (success) {
        // Store tokens and user info
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userType', userType);

        return {
          success: true,
          user,
          userType,
          message
        };
      }

      return { success: false, message: 'Login failed' };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  // Logout user
  static async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Even if logout API fails, clear local storage
      console.error('Logout API error:', error);
    } finally {
      // Clear all stored data
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userType');
    }
  }

  // Get current user info
  static async getCurrentUser() {
    try {
      const response = await api.get('/auth/me');
      const { user, userType, organizationId } = response.data;

      // Update stored user info
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userType', userType);

      return {
        success: true,
        user,
        userType,
        organizationId
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get user info');
    }
  }

  // Check if user is logged in
  static isLoggedIn() {
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');
    return !!(token && user);
  }

  // Get stored user info
  static getStoredUser() {
    try {
      const user = localStorage.getItem('user');
      const userType = localStorage.getItem('userType');
      return user ? { user: JSON.parse(user), userType } : null;
    } catch (error) {
      return null;
    }
  }

  // Check if email is whitelisted
  static async checkEmail(email) {
    try {
      const response = await api.get(`/auth/check-email/${email}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to check email');
    }
  }

  // Update user profile
  static async updateProfile(profileData) {
    try {
      const response = await api.put('/users/profile', profileData);
      const { user } = response.data;

      // Update stored user info
      localStorage.setItem('user', JSON.stringify(user));

      return {
        success: true,
        user,
        message: response.data.message
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update profile');
    }
  }

  // Change organization password (admin only)
  static async changeOrganizationPassword(newPassword, confirmPassword, organizationId = null) {
    try {
      const response = await api.post('/auth/change-org-password', {
        newPassword,
        confirmPassword,
        organizationId
      });

      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to change password');
    }
  }

  // Get all organizations (super admin only)
  static async getAllOrganizations() {
    try {
      const response = await api.get('/auth/organizations');
      return {
        success: true,
        organizations: response.data.organizations
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get organizations');
    }
  }

  // Get user permissions
  static getUserPermissions() {
    const storedData = this.getStoredUser();
    if (!storedData) return null;

    const { userType } = storedData;
    
    return {
      isSuperAdmin: userType === 'super_admin',
      isNonprofitAdmin: userType === 'nonprofit_admin',
      isVolunteer: userType === 'volunteer',
      canManageOrganization: userType === 'super_admin' || userType === 'nonprofit_admin',
      canManageUsers: userType === 'super_admin' || userType === 'nonprofit_admin',
      canAssignTasks: userType === 'super_admin' || userType === 'nonprofit_admin',
      canUploadDocuments: userType === 'super_admin' || userType === 'nonprofit_admin',
      canCreateEvents: userType === 'super_admin' || userType === 'nonprofit_admin',
      canCompleteOwnTasks: true,
      canViewDashboard: true,
      canUpdateProfile: userType !== 'super_admin'
    };
  }
}

export default AuthService;