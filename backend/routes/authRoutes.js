const express = require('express');
const router = express.Router();
const { login, refresh, logout, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const { sanitizeRequestBody, authLoginSchema } = require('../middleware/validators');

router.post('/login', sanitizeRequestBody, authLoginSchema, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticateToken, getMe);
router.put('/profile', authenticateToken, sanitizeRequestBody, updateProfile);
router.put('/change-password', authenticateToken, changePassword);

module.exports = router;
