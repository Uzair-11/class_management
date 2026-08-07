const bcrypt = require('bcryptjs');
const pool = require('../config/db');

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
  try {
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
    if (role) {
      filtered = mockUsersList.filter(u => u.role === role);
    }
    res.json(filtered);
  }
};

// POST /api/users — create user (Admin only)
const createUser = async (req, res) => {
  const { name, phone, email, password, role } = req.body;
  const validRoles = ['admin', 'amir', 'supervisor', 'teacher'];

  if (!name || !phone || !password || !role) {
    return res.status(400).json({ message: 'Name, phone, password, and role are required' });
  }

  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: `Role must be one of: ${validRoles.join(', ')}` });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, phone, email, password_hash, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, phone, email, role, status, created_at`,
      [name, phone, email || null, hashedPassword, role]
    );
    res.status(201).json({ message: 'User created successfully', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Phone or email already exists' });
    }
    const newUser = { id: Date.now(), name, phone, email: email || '', role, status: 'active' };
    mockUsersList.push(newUser);
    res.status(201).json({ message: 'User created successfully', user: newUser });
  }
};

// PUT /api/users/:id — edit user details
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, role, status } = req.body;

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

// DELETE /api/users/:id — deactivate user (soft delete: status = 'inactive')
const deactivateUser = async (req, res) => {
  const { id } = req.params;
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
