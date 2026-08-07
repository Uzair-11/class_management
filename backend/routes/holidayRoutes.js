const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getHolidays,
  createHoliday,
  deleteHoliday
} = require('../controllers/holidayController');

const { sanitizeRequestBody, createHolidaySchema } = require('../middleware/validators');

router.get('/holidays', authenticateToken, getHolidays);
router.post('/holidays', authenticateToken, sanitizeRequestBody, createHolidaySchema, createHoliday);
router.delete('/holidays/:id', authenticateToken, deleteHoliday);

module.exports = router;
