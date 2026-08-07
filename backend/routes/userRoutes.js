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

// All routes are admin-only
router.use(authenticateToken, authorizeRoles('admin'));

router.get('/', getUsers);
router.post('/', sanitizeRequestBody, createUserSchema, createUser);
router.put('/:id', sanitizeRequestBody, updateUser);
router.delete('/:id', deactivateUser);

module.exports = router;
