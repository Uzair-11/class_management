const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  getUsers,
  createUser,
  updateUser,
  deactivateUser
} = require('../controllers/userController');

const { sanitizeRequestBody, createUserSchema } = require('../middleware/validators');

// GET and POST /api/users accessible to admin and amir; PUT and DELETE stay admin-only
router.get('/', authenticateToken, authorizeRoles('admin', 'amir'), getUsers);
router.post('/', authenticateToken, authorizeRoles('admin', 'amir'), sanitizeRequestBody, createUserSchema, createUser);
router.put('/:id', authenticateToken, authorizeRoles('admin'), sanitizeRequestBody, updateUser);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), deactivateUser);

module.exports = router;
