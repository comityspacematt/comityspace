import api from './api';

class DashboardService {
  // =============================
  // CORE DASHBOARD METHODS
  // =============================

  // Get main dashboard data (general)
  static async getDashboard() {
    try {
      const response = await api.get('/dashboard');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load dashboard');
    }
  }

  // Get volunteer dashboard data
  static async getVolunteerDashboard() {
    try {
      const response = await api.get('/dashboard/volunteer');
      return {
        success: true,
        data: response.data.dashboard
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load volunteer dashboard');
    }
  }

  // Get admin dashboard data
  static async getAdminDashboard() {
    try {
      const response = await api.get('/dashboard/admin');
      return {
        success: true,
        data: response.data.dashboard
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load admin dashboard');
    }
  }

  // Get volunteers directory
  static async getVolunteersDirectory() {
    try {
      console.log('🔍 Making API call to /dashboard/volunteers');
      const response = await api.get('/dashboard/volunteers');
      console.log('✅ API response received:', {
        status: response.status,
        dataKeys: Object.keys(response.data || {}),
        data: response.data
      });
      return {
        success: true,
        organization: response.data.organization,
        volunteers: response.data.volunteers
      };
    } catch (error) {
      console.error('❌ API call failed:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      throw new Error(error.response?.data?.message || 'Failed to load volunteers directory');
    }
  }

  // Get calendar events
  static async getCalendarEvents(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/dashboard/calendar?${queryParams}`);
      return {
        success: true,
        events: response.data.events,
        view: response.data.view
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load calendar events');
    }
  }

  // =============================
  // SUPER ADMIN METHODS
  // =============================

  // Get super admin dashboard data
  static async getSuperAdminDashboard() {
    try {
      const response = await api.get('/super-admin/dashboard');
      return {
        success: true,
        data: response.data.data  // Note: response.data.data because backend returns {success: true, data: {...}}
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load super admin dashboard');
    }
  }

  // Get all organizations (super admin only)
  static async getAllOrganizations() {
    try {
      const response = await api.get('/super-admin/organizations');
      return {
        success: true,
        organizations: response.data.organizations
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load organizations');
    }
  }

  // Create organization (super admin only)
  static async createOrganization(orgData) {
    try {
      const response = await api.post('/super-admin/organizations', orgData);
      return {
        success: true,
        message: response.data.message,
        organization: response.data.organization
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create organization');
    }
  }

  // Update organization (super admin only)
  static async updateOrganization(id, orgData) {
    try {
      const response = await api.put(`/super-admin/organizations/${id}`, orgData);
      return {
        success: true,
        message: response.data.message,
        organization: response.data.organization
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update organization');
    }
  }

  // Toggle organization status (super admin only)
  static async toggleOrganizationStatus(orgId, isActive) {
    try {
      const response = await api.put(`/super-admin/organizations/${orgId}/status`, {
        is_active: isActive
      });
      return {
        success: true,
        message: response.data.message,
        organization: response.data.organization
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to toggle organization status');
    }
  }

  // =============================
  // USER MANAGEMENT (SUPER ADMIN)
  // =============================

  // Get all users across organizations (super admin only)
  static async getAllUsers() {
    try {
      const response = await api.get('/super-admin/users');
      return {
        success: true,
        users: response.data.users
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load users');
    }
  }

  // Add user to organization (super admin only)
  static async addUserToOrganization(userData) {
    try {
      const response = await api.post('/super-admin/users', userData);
      return {
        success: true,
        message: response.data.message,
        user: response.data.user
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to add user to organization');
    }
  }

  // Update user role (super admin only)
  static async updateUserRole(email, role, organizationId) {
    try {
      const response = await api.put(`/super-admin/users/${encodeURIComponent(email)}/role`, {
        role,
        organizationId
      });
      return {
        success: true,
        message: response.data.message,
        user: response.data.user
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update user role');
    }
  }

  // Update user profile information (super admin only)
  static async updateUserProfile(email, userData) {
    try {
      const response = await api.put(`/super-admin/users/${encodeURIComponent(email)}`, userData);
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update user profile');
    }
  }

  // Remove user from organization (super admin only)
  static async removeUserFromOrganization(email) {
    try {
      const response = await api.delete(`/super-admin/users/${encodeURIComponent(email)}`);
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to remove user from organization');
    }
  }

  // Get users for specific organization (super admin only)
  static async getOrganizationUsers(organizationId) {
    try {
      const response = await api.get(`/super-admin/users/${organizationId}`);
      return {
        success: true,
        users: response.data.users
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load organization users');
    }
  }

  // =============================
  // TASK MANAGEMENT
  // =============================

  // Get user's tasks
  static async getMyTasks(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/tasks/my?${queryParams}`);
      return {
        success: true,
        tasks: response.data.tasks,
        pagination: response.data.pagination
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load tasks');
    }
  }

  // Update task status
  static async updateTaskStatus(taskId, status, completionNotes = null) {
    try {
      const response = await api.put(`/tasks/${taskId}/status`, {
        status,
        completionNotes
      });
      return {
        success: true,
        message: response.data.message,
        assignment: response.data.assignment
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update task status');
    }
  }

  // Get all tasks (admin view)
  static async getAllTasks(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/tasks?${queryParams}`);
      return {
        success: true,
        tasks: response.data.tasks
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load all tasks');
    }
  }

  // =============================
  // PROFILE AND USER MANAGEMENT
  // =============================

  // Update profile
  static async updateProfile(profileData) {
    try {
      const response = await api.put('/dashboard/profile', profileData);
      return {
        success: true,
        user: response.data.user,
        message: response.data.message
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update profile');
    }
  }

  // =============================
  // EVENTS AND CALENDAR
  // =============================

  // Get upcoming events for dashboard
  static async getUpcomingEvents(limit = 5) {
    try {
      const response = await api.get(`/calendar/upcoming?limit=${limit}`);
      return {
        success: true,
        events: response.data.events
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load upcoming events');
    }
  }

  // Create calendar event
  static async createEvent(eventData) {
    try {
      const response = await api.post('/calendar/events', eventData);
      return {
        success: true,
        message: response.data.message,
        event: response.data.event
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create event');
    }
  }

  // RSVP to event
  static async rsvpToEvent(eventId, status) {
    try {
      const response = await api.post(`/calendar/events/${eventId}/rsvp`, {
        status
      });
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to RSVP to event');
    }
  }

  // =============================
  // DOCUMENTS
  // =============================

  // Get recent documents for dashboard
  static async getRecentDocuments(limit = 5) {
    try {
      const response = await api.get(`/documents/recent?limit=${limit}`);
      return {
        success: true,
        documents: response.data.documents
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load recent documents');
    }
  }

  // =============================
  // ADMIN SPECIFIC METHODS
  // =============================

  // Add volunteer to whitelist (admin only)
  static async addVolunteerToWhitelist(volunteerData) {
    try {
      const response = await api.post('/admin/volunteers', volunteerData);
      return {
        success: true,
        message: response.data.message,
        volunteer: response.data.volunteer
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to add volunteer to whitelist');
    }
  }

  // Remove volunteer from whitelist (admin only)
  static async removeVolunteerFromWhitelist(email) {
    try {
      const response = await api.delete(`/admin/volunteers/${encodeURIComponent(email)}`);
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to remove volunteer from whitelist');
    }
  }

  // =============================
  // STATISTICS AND ANALYTICS
  // =============================

  // Get organization statistics
  static async getOrganizationStats() {
    try {
      const response = await api.get('/dashboard/stats');
      return {
        success: true,
        stats: response.data.stats
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load organization stats');
    }
  }

  // =============================
  // PASSWORD MANAGEMENT
  // =============================

  // Change organization password (admin only)
  static async changeOrganizationPassword(newPassword, confirmPassword) {
    try {
      const response = await api.post('/auth/change-org-password', {
        newPassword,
        confirmPassword
      });
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to change organization password');
    }
  }
}

export default DashboardService;