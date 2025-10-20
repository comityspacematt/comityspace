const express = require('express');
const TasksController = require('../controllers/tasksController');
const { 
  authenticateToken, 
  requireVolunteer, 
  requireNonprofitAdmin,
  requireSameOrganization,
  validateOrganizationAccess
} = require('../middleware/auth');

const router = express.Router();

// All task routes require authentication and organization validation
router.use(authenticateToken);
router.use(requireSameOrganization);
router.use(validateOrganizationAccess);

// GET /api/tasks/my - Get current user's assigned tasks with filtering
router.get('/my', requireVolunteer, TasksController.getMyTasks);

// GET /api/tasks/:taskId - Get task details
router.get('/:taskId', requireVolunteer, TasksController.getTaskDetails);

// PUT /api/tasks/:taskId/status - Update task assignment status
router.put('/:taskId/status', requireVolunteer, TasksController.updateTaskStatus);

// POST /api/tasks - Create new task (admin only)
router.post('/', requireNonprofitAdmin, TasksController.createTask);

// GET /api/tasks - Get all tasks (admin view)
router.get('/', requireNonprofitAdmin, TasksController.getAllTasks);

// PUT /api/tasks/:taskId - Update task (admin only)
router.put('/:taskId', requireNonprofitAdmin, TasksController.updateTask);

// DELETE /api/tasks/:taskId - Delete task (admin only)
router.delete('/:taskId', requireNonprofitAdmin, TasksController.deleteTask);

// POST /api/tasks/:taskId/complete - Admin completes task for volunteer
router.post('/:taskId/complete', requireNonprofitAdmin, TasksController.completeTaskForVolunteer);

module.exports = router;