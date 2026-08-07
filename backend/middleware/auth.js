const jwt = require('jsonwebtoken');

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token missing' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_jih_2026', (err, user) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to authorize specific roles
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}] roles` 
      });
    }
    next();
  };
};

const pool = require('../config/db');

// Helper to retrieve allowed branch IDs based on user role
const getAccessibleBranchIds = async (user) => {
  if (user.role === 'admin') {
    return null; // Null indicates full access to all branches
  }
  
  if (user.role === 'teacher') {
    const res = await pool.query('SELECT id FROM branches WHERE teacher_id = $1', [user.id]);
    return res.rows.map(r => r.id);
  }

  if (user.role === 'supervisor') {
    const res = await pool.query('SELECT branch_id FROM supervisor_branch_map WHERE user_id = $1', [user.id]);
    return res.rows.map(r => r.branch_id);
  }

  if (user.role === 'amir') {
    const res = await pool.query('SELECT branch_id FROM amir_branch_map WHERE user_id = $1', [user.id]);
    return res.rows.map(r => r.branch_id);
  }

  return [];
};

// Reusable scope checker
const verifyBranchAccess = async (user, resourceBranchId) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!resourceBranchId) return false;

  const targetId = parseInt(resourceBranchId);
  const allowedBranchIds = await getAccessibleBranchIds(user);
  if (allowedBranchIds === null) return true;
  return allowedBranchIds.includes(targetId);
};

module.exports = { authenticateToken, authorizeRoles, getAccessibleBranchIds, verifyBranchAccess };
