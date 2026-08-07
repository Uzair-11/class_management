const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getMachines,
  getMachineById,
  createMachine,
  updateMachine,
  getMachineMaintenance,
  addMachineMaintenance
} = require('../controllers/machineController');

const { sanitizeRequestBody, createMachineSchema } = require('../middleware/validators');

router.get('/machines', authenticateToken, getMachines);
router.get('/machines/:id', authenticateToken, getMachineById);
router.post('/machines', authenticateToken, sanitizeRequestBody, createMachineSchema, createMachine);
router.put('/machines/:id', authenticateToken, sanitizeRequestBody, updateMachine);
router.get('/machines/:id/maintenance', authenticateToken, getMachineMaintenance);
router.post('/machines/:id/maintenance', authenticateToken, sanitizeRequestBody, addMachineMaintenance);

module.exports = router;
