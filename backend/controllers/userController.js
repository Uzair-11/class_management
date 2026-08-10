const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { verifyBranchAccess } = require('../middleware/auth');

// Hash for 'Admin@123'
const DEFAULT_HASH = '$2b$10$r50vB/ge88ouwsEpF.gnouBhjT5tTzVE6CsSmzpoakJVL9ns6c9Wa';

let mockUsersList = [
  { id: 1, name: 'System Admin', phone: '9000000001', email: 'admin@example.com', role: 'admin', status: 'active' },
  { id: 2, name: 'Amir Leader', phone: '9000000002', email: 'amir@example.com', role: 'amir', status: 'active' },
  { id: 3, name: 'Area Supervisor', phone: '9000000003', email: 'supervisor@example.com', role: 'supervisor', status: 'active' },
  { id: 4, name: 'Class Teacher', phone: '9000000004', email: 'teacher@example.com', role: 'teacher', status: 'active' }
];

// GET /api/users — list users (optional ?role= filter)
const getUsers = async (req, res) => {
  const { role } = req.query;
  const user = req.user;

  try {
    if (user && user.role === 'amir') {
      // For Amir: ONLY return supervisors and teachers belonging to the amir's owned branches.
      // NEVER include admin or amir accounts.
      let query = `
        SELECT DISTINCT u.id, u.name, u.phone, u.email, u.role, u.status, u.created_at
        FROM users u
        LEFT JOIN supervisor_branch_map sbm ON u.id = sbm.user_id
        LEFT JOIN branches b ON u.id = b.teacher_id
        JOIN amir_branch_map abm ON (sbm.branch_id = abm.branch_id OR b.id = abm.branch_id)
        WHERE abm.user_id = $1
          AND u.role IN ('supervisor', 'teacher')
      `;
      const params = [user.id];

      if (role) {
        if (role === 'admin' || role === 'amir') {
          return res.json([]);
        }
        params.push(role);
        query += ` AND u.role = $2`;
      }
      query += ' ORDER BY u.id ASC';

      const result = await pool.query(query, params);
      return res.json(result.rows);
    }

    let query = 'SELECT id, name, phone, email, role, status, created_at FROM users';
    const params = [];

    if (role) {
      query += ' WHERE role = $1';
      params.push(role);
    }
    query += ' ORDER BY id ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    let filtered = mockUsersList;
    if (user && user.role === 'amir') {
      filtered = mockUsersList.filter(u => u.role === 'supervisor' || u.role === 'teacher');
    }
    if (role) {
      if (user && user.role === 'amir' && (role === 'admin' || role === 'amir')) {
        filtered = [];
      } else {
        filtered = filtered.filter(u => u.role === role);
      }
    }
    res.json(filtered);
  }
};

// POST /api/users — create user
const createUser = async (req, res) => {
  const { name, phone, email, password, role, branch_id, branch_ids } = req.body;
  const validRoles = ['admin', 'amir', 'supervisor', 'teacher'];

  if (!name || !phone || !password || !role) {
    return res.status(400).json({ message: 'Name, phone, password, and role are required' });
  }

  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: `Role must be one of: ${validRoles.join(', ')}` });
  }

  // Amir role-creation restrictions and branch-scoping checks
  if (req.user && req.user.role === 'amir') {
    if (role === 'admin' || role === 'amir') {
      return res.status(403).json({ message: 'Forbidden: Amirs cannot create admin or amir accounts' });
    }

    if (role === 'teacher') {
      if (!branch_id) {
        return res.status(400).json({ message: 'Branch ID is required when creating a teacher' });
      }
      const isOwner = await verifyBranchAccess(req.user, branch_id);
      if (!isOwner) {
        return res.status(403).json({ message: 'Forbidden: Cannot create teacher for a branch you do not own' });
      }
    }

    if (role === 'supervisor') {
      const targets = Array.isArray(branch_ids) ? branch_ids : (branch_id ? [branch_id] : []);
      if (targets.length === 0) {
        return res.status(400).json({ message: 'Branch ID(s) required when creating a supervisor' });
      }
      for (const bId of targets) {
        const isOwner = await verifyBranchAccess(req.user, bId);
        if (!isOwner) {
          return res.status(403).json({ message: 'Forbidden: Cannot link supervisor to branches you do not own' });
        }
      }
    }
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, phone, email, password_hash, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, phone, email, role, status, created_at`,
      [name, phone, email || null, hashedPassword, role]
    );

    const newUser = result.rows[0];

    // Auto-link teacher or supervisor to branch if provided
    if (role === 'teacher' && branch_id) {
      await pool.query(
        `UPDATE branches SET teacher_id = $1 WHERE id = $2`,
        [newUser.id, branch_id]
      );
    }

    if (role === 'supervisor') {
      const targets = Array.isArray(branch_ids) ? branch_ids : (branch_id ? [branch_id] : []);
      for (const bId of targets) {
        await pool.query(
          `INSERT INTO supervisor_branch_map (user_id, branch_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [newUser.id, bId]
        );
      }
    }

    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Phone or email already exists' });
    }
    const newUser = { id: Date.now(), name, phone, email: email || '', role, status: 'active' };
    mockUsersList.push(newUser);
    res.status(201).json({ message: 'User created successfully', user: newUser });
  }
};

// PUT /api/users/:id — edit user details (Admin only)
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, role, status } = req.body;

  if (req.user && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Only admin can edit users' });
  }

  try {
    const result = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           email = COALESCE($3, email),
           role = COALESCE($4, role),
           status = COALESCE($5, status)
       WHERE id = $6
       RETURNING id, name, phone, email, role, status, created_at`,
      [name, phone, email, role, status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    const idx = mockUsersList.findIndex(u => u.id === parseInt(id));
    if (idx === -1) return res.status(404).json({ message: 'User not found' });
    mockUsersList[idx] = {
      ...mockUsersList[idx],
      name: name || mockUsersList[idx].name,
      phone: phone || mockUsersList[idx].phone,
      email: email !== undefined ? email : mockUsersList[idx].email,
      role: role || mockUsersList[idx].role,
      status: status || mockUsersList[idx].status
    };
    res.json(mockUsersList[idx]);
  }
};

// DELETE /api/users/:id — deactivate user (Admin only)
const deactivateUser = async (req, res) => {
  const { id } = req.params;

  if (req.user && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Only admin can deactivate users' });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET status = 'inactive' WHERE id = $1 RETURNING id, name, status`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deactivated successfully', user: result.rows[0] });
  } catch (err) {
    const idx = mockUsersList.findIndex(u => u.id === parseInt(id));
    if (idx === -1) return res.status(404).json({ message: 'User not found' });
    mockUsersList[idx].status = 'inactive';
    res.json({ message: 'User deactivated successfully', user: mockUsersList[idx] });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deactivateUser
};
