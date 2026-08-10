const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  assignSupervisor,
  unassignSupervisor,
  assignAmir,
  unassignAmir
} = require('../controllers/branchController');

const { sanitizeRequestBody, createBranchSchema } = require('../middleware/validators');

// Read routes accessible to authenticated users; write actions admin-only
router.get('/', authenticateToken, getBranches);
router.get('/:id', authenticateToken, getBranchById);

router.post('/', authenticateToken, authorizeRoles('admin', 'amir'), sanitizeRequestBody, createBranchSchema, createBranch);
router.put('/:id', authenticateToken, authorizeRoles('admin'), sanitizeRequestBody, updateBranch);
router.post('/:id/assign-supervisor', authenticateToken, authorizeRoles('admin', 'amir'), assignSupervisor);
router.delete('/:id/unassign-supervisor/:userId', authenticateToken, authorizeRoles('admin', 'amir'), unassignSupervisor);
router.delete('/:id/supervisors/:userId', authenticateToken, authorizeRoles('admin', 'amir'), unassignSupervisor);
router.post('/:id/assign-amir', authenticateToken, authorizeRoles('admin'), assignAmir);
router.delete('/:id/unassign-amir/:userId', authenticateToken, authorizeRoles('admin'), unassignAmir);
router.delete('/:id/amirs/:userId', authenticateToken, authorizeRoles('admin'), unassignAmir);

module.exports = router;
