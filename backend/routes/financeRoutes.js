const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getBranchExpenses,
  createBranchExpense,
  getBranchSalaries,
  createBranchSalary,
  updateSalaryStatus,
  getBranchTransactions,
  createBranchTransaction,
  getBranchFinanceSummary
} = require('../controllers/financeController');

const { sanitizeRequestBody, createExpenseSchema, createSalarySchema } = require('../middleware/validators');

router.get('/branches/:id/expenses', authenticateToken, getBranchExpenses);
router.post('/branches/:id/expenses', authenticateToken, sanitizeRequestBody, createExpenseSchema, createBranchExpense);

router.get('/branches/:id/salaries', authenticateToken, getBranchSalaries);
router.post('/branches/:id/salaries', authenticateToken, sanitizeRequestBody, createSalarySchema, createBranchSalary);
router.put('/salaries/:id', authenticateToken, updateSalaryStatus);

router.get('/branches/:id/transactions', authenticateToken, getBranchTransactions);
router.post('/branches/:id/transactions', authenticateToken, sanitizeRequestBody, createBranchTransaction);

router.get('/branches/:id/finance', authenticateToken, getBranchFinanceSummary);

module.exports = router;
