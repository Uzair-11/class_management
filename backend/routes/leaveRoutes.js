const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  createLeaveRequest,
  getLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest
} = require('../controllers/leaveController');

const { sanitizeRequestBody, createLeaveSchema } = require('../middleware/validators');

router.post('/leave-requests', authenticateToken, sanitizeRequestBody, createLeaveSchema, createLeaveRequest);
router.get('/leave-requests', authenticateToken, getLeaveRequests);
router.put('/leave-requests/:id/approve', authenticateToken, approveLeaveRequest);
router.put('/leave-requests/:id/reject', authenticateToken, rejectLeaveRequest);

module.exports = router;
