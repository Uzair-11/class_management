const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Hash for 'Admin@123'
const DEFAULT_HASH = '$2b$10$0Mswo0g6eu2k0.1FBUdJuervtajj54EPJDPwBIx2Q85HArcqjnmui';

// Pre-seeded users requested by specification
const mockUsers = [
  { id: 1, name: 'System Admin', phone: '9000000001', email: 'admin@example.com', password_hash: DEFAULT_HASH, role: 'admin', status: 'active' },
  { id: 2, name: 'Amir Leader', phone: '9000000002', email: 'amir@example.com', password_hash: DEFAULT_HASH, role: 'amir', status: 'active' },
  { id: 3, name: 'Area Supervisor', phone: '9000000003', email: 'supervisor@example.com', password_hash: DEFAULT_HASH, role: 'supervisor', status: 'active' },
  { id: 4, name: 'Class Teacher', phone: '9000000004', email: 'teacher@example.com', password_hash: DEFAULT_HASH, role: 'teacher', status: 'active' }
];

const crypto = require('crypto');

// Generate 15-minute access token
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, name: user.name, phone: user.phone, role: user.role },
    process.env.JWT_SECRET || 'super_secret_jwt_key_jih_2026',
    { expiresIn: '15m' }
  );
};

// Generate 7-day refresh token and store hashed token in refresh_tokens table
const createAndStoreRefreshToken = async (user, res) => {
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const salt = await bcrypt.genSalt(10);
  const tokenHash = await bcrypt.hash(rawRefreshToken, salt);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  try {
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );
  } catch (err) {
    console.warn('Could not persist refresh token to DB:', err.message);
  }

  // Set httpOnly cookie
  res.cookie('refresh_token', rawRefreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return rawRefreshToken;
};

// In-memory failed login tracking per phone number
const failedAttempts = new Map();

// POST /api/auth/login
const login = async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ message: 'Phone and password are required' });
  }

  // Check lockout status
  const attemptRecord = failedAttempts.get(phone) || { count: 0, lockUntil: 0 };
  if (attemptRecord.lockUntil > Date.now()) {
    const minutesLeft = Math.ceil((attemptRecord.lockUntil - Date.now()) / (60 * 1000));
    return res.status(429).json({ message: `Account temporarily locked due to repeated failed logins. Please try again in ${minutesLeft} minutes.` });
  }

  try {
    let user;
    try {
      const result = await pool.query(
        'SELECT id, name, phone, email, password_hash, role, status, must_change_password FROM users WHERE phone = $1',
        [phone]
      );
      user = result.rows[0];
    } catch (dbErr) {
      user = mockUsers.find(u => u.phone === phone);
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid phone number or password' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ message: 'Account is inactive' });
    }

    let isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      const newCount = attemptRecord.count + 1;
      if (newCount >= 5) {
        failedAttempts.set(phone, { count: newCount, lockUntil: Date.now() + 15 * 60 * 1000 }); // Lock 15 min
        return res.status(429).json({ message: 'Too many failed login attempts. Account temporarily locked for 15 minutes.' });
      } else {
        failedAttempts.set(phone, { count: newCount, lockUntil: 0 });
      }
      return res.status(401).json({ message: 'Invalid phone number or password' });
    }

    // Reset failed count on success
    failedAttempts.delete(phone);

    const accessToken = generateAccessToken(user);
    const rawRefreshToken = await createAndStoreRefreshToken(user, res);

    res.json({
      token: accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        must_change_password: !!user.must_change_password
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login', error: err.message });
  }
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  // Accept token from cookie (same-origin) OR from request body (cross-origin production)
  const rawRefreshToken = req.cookies?.refresh_token || req.body?.refreshToken;

  if (!rawRefreshToken) {
    return res.status(401).json({ message: 'Refresh token missing' });
  }

  try {
    const tokensRes = await pool.query(
      `SELECT rt.id, rt.user_id, rt.token_hash, rt.expires_at, rt.revoked, u.name, u.phone, u.email, u.role, u.status, u.must_change_password
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.revoked = false AND rt.expires_at > now()
       ORDER BY rt.id DESC`
    );

    let matchingRow = null;
    for (const row of tokensRes.rows) {
      const isMatch = await bcrypt.compare(rawRefreshToken, row.token_hash);
      if (isMatch) {
        matchingRow = row;
        break;
      }
    }

    if (!matchingRow || matchingRow.status !== 'active') {
      res.clearCookie('refresh_token');
      return res.status(401).json({ message: 'Invalid or revoked refresh token' });
    }

    // Issue new access token
    const newAccessToken = generateAccessToken({
      id: matchingRow.user_id,
      name: matchingRow.name,
      phone: matchingRow.phone,
      role: matchingRow.role
    });

    res.json({
      token: newAccessToken,
      user: {
        id: matchingRow.user_id,
        name: matchingRow.name,
        phone: matchingRow.phone,
        email: matchingRow.email,
        role: matchingRow.role,
        must_change_password: !!matchingRow.must_change_password
      }
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(401).json({ message: 'Failed to refresh token' });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  const rawRefreshToken = req.cookies?.refresh_token;

  if (rawRefreshToken) {
    try {
      const tokensRes = await pool.query(
        `SELECT id, token_hash FROM refresh_tokens WHERE revoked = false`
      );

      for (const row of tokensRes.rows) {
        const isMatch = await bcrypt.compare(rawRefreshToken, row.token_hash);
        if (isMatch) {
          await pool.query('UPDATE refresh_tokens SET revoked = true WHERE id = $1', [row.id]);
          break;
        }
      }
    } catch (err) {
      console.warn('Could not revoke refresh token in DB:', err.message);
    }
  }

  res.clearCookie('refresh_token');
  res.json({ message: 'Logged out successfully' });
};

// GET /api/auth/me — return current authenticated user profile
const getMe = async (req, res) => {
  try {
    let user;
    try {
      const result = await pool.query(
        'SELECT id, name, phone, email, role, status, must_change_password FROM users WHERE id = $1',
        [req.user.id]
      );
      user = result.rows[0];
    } catch (dbErr) {
      user = mockUsers.find(u => u.id === req.user.id);
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user profile', error: err.message });
  }
};

// PUT /api/auth/profile — update profile (name, email, phone)
const updateProfile = async (req, res) => {
  const { name, email, phone } = req.body;
  const userId = req.user.id;

  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  try {
    let updatedUser;
    try {
      const result = await pool.query(
        `UPDATE users
         SET name = $1,
             email = $2,
             phone = COALESCE($3, phone)
         WHERE id = $4
         RETURNING id, name, phone, email, role, status, must_change_password`,
        [name, email || null, phone || null, userId]
      );
      updatedUser = result.rows[0];
    } catch (dbErr) {
      // Fallback for mock environment
      const mUser = mockUsers.find(u => u.id === userId);
      if (mUser) {
        mUser.name = name;
        if (email) mUser.email = email;
        if (phone) mUser.phone = phone;
        updatedUser = mUser;
      }
    }

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newToken = generateAccessToken(updatedUser);

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
      token: newToken
    });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ message: 'Error updating profile', error: err.message });
  }
};

// POST /api/auth/change-password — update user password and clear must_change_password
const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  const userId = req.user.id;

  if (!current_password || !new_password) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters long' });
  }

  try {
    let user;
    try {
      const userRes = await pool.query('SELECT id, password_hash FROM users WHERE id = $1', [userId]);
      user = userRes.rows[0];
    } catch (dbErr) {
      user = mockUsers.find(u => u.id === userId);
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let isMatch = await bcrypt.compare(current_password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(new_password, salt);

    try {
      await pool.query('UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2', [newHash, userId]);
    } catch (dbErr) {
      user.password_hash = newHash;
      user.must_change_password = false;
    }

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('changePassword error:', err);
    res.status(500).json({ message: 'Error changing password', error: err.message });
  }
};

module.exports = {
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
  changePassword
};
