const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAttendanceReport,
  getFeesReport,
  getOverviewReport
} = require('../controllers/reportController');

router.get('/reports/attendance', authenticateToken, getAttendanceReport);
router.get('/reports/fees', authenticateToken, getFeesReport);
router.get('/reports/overview', authenticateToken, getOverviewReport);

module.exports = router;
