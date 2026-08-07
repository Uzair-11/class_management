const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getStudentFeeCycles,
  recordCyclePayment,
  getBranchOverdueFeeCycles,
  deletePayment
} = require('../controllers/paymentController');

router.get('/students/:id/fee-cycles', authenticateToken, getStudentFeeCycles);
router.post('/fee-cycles/:id/payments', authenticateToken, recordCyclePayment);
router.get('/branches/:id/fee-cycles', authenticateToken, getBranchOverdueFeeCycles);
router.delete('/payments/:id', authenticateToken, deletePayment);

module.exports = router;
