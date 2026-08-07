const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse
} = require('../controllers/courseController');

// All authenticated users can view courses
router.get('/', authenticateToken, getCourses);
router.get('/:id', authenticateToken, getCourseById);

// Admin-only endpoints to manage courses
router.post('/', authenticateToken, authorizeRoles('admin'), createCourse);
router.put('/:id', authenticateToken, authorizeRoles('admin'), updateCourse);

module.exports = router;
