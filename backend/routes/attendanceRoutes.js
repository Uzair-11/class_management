const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAttendance,
  postAttendance,
  lockAttendance,
  getStudentAttendanceHistory
} = require('../controllers/attendanceController');

const { sanitizeRequestBody, postAttendanceSchema } = require('../middleware/validators');

router.get('/attendance', authenticateToken, getAttendance);
router.post('/attendance', authenticateToken, sanitizeRequestBody, postAttendanceSchema, postAttendance);
router.post('/attendance/lock', authenticateToken, lockAttendance);
router.get('/attendance/student/:id', authenticateToken, getStudentAttendanceHistory);

module.exports = router;
