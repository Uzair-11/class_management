const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Admin only route
router.get('/admin', authenticateToken, authorizeRoles('admin'), (req, res) => {
  res.json({
    message: 'Welcome to the Admin Portal',
    data: { systemStats: 'Healthy', userCount: 142, systemLogs: 'All clear' }
  });
});

// Amir route (accessible by Admin and Amir)
router.get('/amir', authenticateToken, authorizeRoles('admin', 'amir'), (req, res) => {
  res.json({
    message: 'Welcome to the Amir Leadership Dashboard',
    data: { organizationalGoals: 'Q3 Targets Met', regionCount: 8, leadershipReports: 12 }
  });
});

// Supervisor route (accessible by Admin, Amir, Supervisor)
router.get('/supervisor', authenticateToken, authorizeRoles('admin', 'amir', 'supervisor'), (req, res) => {
  res.json({
    message: 'Welcome to the Supervisor Portal',
    data: { activeCenters: 24, assignedTeachers: 56, monthlyAudit: 'Completed' }
  });
});

// Teacher route (accessible by all roles)
router.get('/teacher', authenticateToken, authorizeRoles('admin', 'amir', 'supervisor', 'teacher'), (req, res) => {
  res.json({
    message: 'Welcome to the Teacher Workstation',
    data: { activeClasses: 4, totalStudents: 85, upcomingLessons: ['Math 101', 'Science 202'] }
  });
});

module.exports = router;
