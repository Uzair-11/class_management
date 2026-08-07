const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getCourses,
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  updateStudentStatus
} = require('../controllers/studentController');

const { sanitizeRequestBody, createStudentSchema, updateStudentSchema } = require('../middleware/validators');

// Course route
router.get('/courses', authenticateToken, getCourses);

// Student routes
router.get('/students', authenticateToken, getStudents);
router.get('/students/:id', authenticateToken, getStudentById);
router.post('/students', authenticateToken, sanitizeRequestBody, createStudentSchema, createStudent);
router.put('/students/:id', authenticateToken, sanitizeRequestBody, updateStudentSchema, updateStudent);
router.put('/students/:id/status', authenticateToken, updateStudentStatus);

module.exports = router;
