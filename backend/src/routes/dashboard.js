const express = require('express');
const DashboardController = require('../controllers/dashboardController');
const { 
  authenticateToken, 
  requireVolunteer, 
  requireNonprofitAdmin,
  requireSameOrganization,
  validateOrganizationAccess
} = require('../middleware/auth');

const router = express.Router();

// All dashboard routes require authentication and organization validation
router.use(authenticateToken);
router.use(requireSameOrganization);
router.use(validateOrganizationAccess);

// GET /api/dashboard/volunteer - Get volunteer dashboard data
router.get('/volunteer', requireVolunteer, DashboardController.getVolunteerDashboard);

// GET /api/dashboard/admin - Get admin dashboard data
router.get('/admin', (req, res, next) => {
  console.log('🔍 Dashboard admin route hit!');
  next();
}, requireNonprofitAdmin, DashboardController.getAdminDashboard);

// GET /api/dashboard/volunteers - Get volunteers directory (for both volunteers and admins)
router.get('/volunteers', DashboardController.getVolunteersDirectory);

// GET /api/dashboard/calendar - Get calendar events
router.get('/calendar', requireVolunteer, DashboardController.getCalendarEvents);

module.exports = router;