const pool = require('../config/db');
const { verifyBranchAccess } = require('../middleware/auth');

// In-memory dev fallbacks if PostgreSQL is unavailable
let mockBranches = [
  { id: 1, name: 'Central Branch', address: 'Main Street 101', teacher_id: 4, class_start_time: '15:00', class_end_time: '17:00', status: 'active' }
];

let mockAmirMap = [
  { user_id: 2, branch_id: 1 }
];

let mockSupervisorMap = [
  { user_id: 3, branch_id: 1 }
];

// GET /api/branches — list all branches with teacher name, assigned supervisor(s), assigned amir(s)
const getBranches = async (req, res) => {
  try {
    const query = `
      SELECT 
        b.id, b.name, b.address, b.class_start_time, b.class_end_time, b.status,
        b.teacher_id, u_t.name AS teacher_name,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', u_s.id, 'name', u_s.name)) 
          FILTER (WHERE u_s.id IS NOT NULL), '[]'
        ) AS supervisors,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', u_a.id, 'name', u_a.name)) 
          FILTER (WHERE u_a.id IS NOT NULL), '[]'
        ) AS amirs
      FROM branches b
      LEFT JOIN users u_t ON b.teacher_id = u_t.id
      LEFT JOIN supervisor_branch_map sbm ON b.id = sbm.branch_id
      LEFT JOIN users u_s ON sbm.user_id = u_s.id
      LEFT JOIN amir_branch_map abm ON b.id = abm.branch_id
      LEFT JOIN users u_a ON abm.user_id = u_a.id
      GROUP BY b.id, u_t.name
      ORDER BY b.id ASC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.warn('DB connection fallback for getBranches');
    // Fallback format
    const formatted = mockBranches.map(b => ({
      ...b,
      teacher_name: b.teacher_id ? 'Class Teacher' : 'Unassigned',
      supervisors: mockSupervisorMap.filter(m => m.branch_id === b.id).map(m => ({ id: m.user_id, name: 'Area Supervisor' })),
      amirs: mockAmirMap.filter(m => m.branch_id === b.id).map(m => ({ id: m.user_id, name: 'Amir Leader' }))
    }));
    res.json(formatted);
  }
};

// GET /api/branches/:id — single branch detail
const getBranchById = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        b.id, b.name, b.address, b.class_start_time, b.class_end_time, b.status,
        b.teacher_id, u_t.name AS teacher_name,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', u_s.id, 'name', u_s.name, 'phone', u_s.phone)) 
          FILTER (WHERE u_s.id IS NOT NULL), '[]'
        ) AS supervisors,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', u_a.id, 'name', u_a.name, 'phone', u_a.phone)) 
          FILTER (WHERE u_a.id IS NOT NULL), '[]'
        ) AS amirs
      FROM branches b
      LEFT JOIN users u_t ON b.teacher_id = u_t.id
      LEFT JOIN supervisor_branch_map sbm ON b.id = sbm.branch_id
      LEFT JOIN users u_s ON sbm.user_id = u_s.id
      LEFT JOIN amir_branch_map abm ON b.id = abm.branch_id
      LEFT JOIN users u_a ON abm.user_id = u_a.id
      WHERE b.id = $1
      GROUP BY b.id, u_t.name;
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Branch not found' });
    res.json(result.rows[0]);
  } catch (err) {
    const b = mockBranches.find(item => item.id === parseInt(id));
    if (!b) return res.status(404).json({ message: 'Branch not found' });
    res.json({
      ...b,
      teacher_name: 'Class Teacher',
      supervisors: mockSupervisorMap.filter(m => m.branch_id === b.id).map(m => ({ id: m.user_id, name: 'Area Supervisor', phone: '9000000003' })),
      amirs: mockAmirMap.filter(m => m.branch_id === b.id).map(m => ({ id: m.user_id, name: 'Amir Leader', phone: '9000000002' }))
    });
  }
};

// POST /api/branches — create branch
const createBranch = async (req, res) => {
  const { name, address, teacher_id, class_start_time, class_end_time } = req.body;
  if (!name) return res.status(400).json({ message: 'Branch name is required' });

  if (teacher_id) {
    const existing = await pool.query(
      `SELECT id, name FROM branches WHERE teacher_id = $1 AND status = 'active'`,
      [teacher_id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: `Teacher is already assigned to active branch '${existing.rows[0].name}'` });
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO branches (name, address, teacher_id, class_start_time, class_end_time)
       VALUES ($1, $2, $3, COALESCE($4, '15:00'::time), COALESCE($5, '17:00'::time))
       RETURNING *`,
      [name, address || null, teacher_id || null, class_start_time || '15:00', class_end_time || '17:00']
    );
    const newBranch = result.rows[0];

    // If created by an Amir, automatically map them in amir_branch_map
    if (req.user && req.user.role === 'amir') {
      await pool.query(
        `INSERT INTO amir_branch_map (user_id, branch_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [req.user.id, newBranch.id]
      );
    }

    res.status(201).json({ message: 'Branch created successfully', branch: newBranch });
  } catch (err) {
    const newBranch = {
      id: Date.now(),
      name,
      address,
      teacher_id: teacher_id ? parseInt(teacher_id) : null,
      class_start_time: class_start_time || '15:00',
      class_end_time: class_end_time || '17:00',
      status: 'active'
    };
    mockBranches.push(newBranch);
    if (req.user && req.user.role === 'amir') {
      mockAmirMap.push({ user_id: req.user.id, branch_id: newBranch.id });
    }
    res.status(201).json({ message: 'Branch created successfully', branch: newBranch });
  }
};

// PUT /api/branches/:id — edit branch details
const updateBranch = async (req, res) => {
  const { id } = req.params;
  const { name, address, teacher_id, class_start_time, class_end_time, status } = req.body;

  if (teacher_id) {
    const existing = await pool.query(
      `SELECT id, name FROM branches WHERE teacher_id = $1 AND id != $2 AND status = 'active'`,
      [teacher_id, id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: `Teacher is already assigned to active branch '${existing.rows[0].name}'` });
    }
  }

  try {
    const result = await pool.query(
      `UPDATE branches 
       SET name = $1,
           address = $2,
           teacher_id = $3,
           class_start_time = COALESCE($4, class_start_time),
           class_end_time = COALESCE($5, class_end_time),
           status = COALESCE($6, status)
       WHERE id = $7
       RETURNING *`,
      [name, address !== undefined ? address : null, teacher_id ? parseInt(teacher_id) : null, class_start_time || null, class_end_time || null, status || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Branch not found' });
    res.json(result.rows[0]);
  } catch (err) {
    const index = mockBranches.findIndex(b => b.id === parseInt(id));
    if (index === -1) return res.status(404).json({ message: 'Branch not found' });
    mockBranches[index] = {
      ...mockBranches[index],
      name: name || mockBranches[index].name,
      address: address !== undefined ? address : mockBranches[index].address,
      teacher_id: teacher_id !== undefined ? (teacher_id ? parseInt(teacher_id) : null) : mockBranches[index].teacher_id,
      class_start_time: class_start_time || mockBranches[index].class_start_time,
      class_end_time: class_end_time || mockBranches[index].class_end_time,
      status: status || mockBranches[index].status
    };
    res.json(mockBranches[index]);
  }
};

// POST /api/branches/:id/assign-supervisor
const assignSupervisor = async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ message: 'User ID is required' });

  if (req.user && req.user.role === 'amir') {
    const isOwner = await verifyBranchAccess(req.user, id);
    if (!isOwner) {
      return res.status(403).json({ message: 'Forbidden: You do not own this branch' });
    }
  }

  try {
    await pool.query(
      `INSERT INTO supervisor_branch_map (user_id, branch_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [user_id, id]
    );
    res.json({ message: 'Supervisor assigned successfully' });
  } catch (err) {
    mockSupervisorMap.push({ user_id: parseInt(user_id), branch_id: parseInt(id) });
    res.json({ message: 'Supervisor assigned successfully' });
  }
};

// DELETE /api/branches/:id/unassign-supervisor/:userId
const unassignSupervisor = async (req, res) => {
  const { id, userId } = req.params;

  if (req.user && req.user.role === 'amir') {
    const isOwner = await verifyBranchAccess(req.user, id);
    if (!isOwner) {
      return res.status(403).json({ message: 'Forbidden: You do not own this branch' });
    }
  }

  try {
    await pool.query(
      `DELETE FROM supervisor_branch_map WHERE branch_id = $1 AND user_id = $2`,
      [id, userId]
    );
    res.json({ message: 'Supervisor unassigned successfully' });
  } catch (err) {
    mockSupervisorMap = mockSupervisorMap.filter(m => !(m.branch_id === parseInt(id) && m.user_id === parseInt(userId)));
    res.json({ message: 'Supervisor unassigned successfully' });
  }
};

// POST /api/branches/:id/assign-amir
const assignAmir = async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ message: 'User ID is required' });

  try {
    await pool.query(
      `INSERT INTO amir_branch_map (user_id, branch_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [user_id, id]
    );
    res.json({ message: 'Amir assigned successfully' });
  } catch (err) {
    mockAmirMap.push({ user_id: parseInt(user_id), branch_id: parseInt(id) });
    res.json({ message: 'Amir assigned successfully' });
  }
};

// DELETE /api/branches/:id/unassign-amir/:userId
const unassignAmir = async (req, res) => {
  const { id, userId } = req.params;
  try {
    await pool.query(
      `DELETE FROM amir_branch_map WHERE branch_id = $1 AND user_id = $2`,
      [id, userId]
    );
    res.json({ message: 'Amir unassigned successfully' });
  } catch (err) {
    mockAmirMap = mockAmirMap.filter(m => !(m.branch_id === parseInt(id) && m.user_id === parseInt(userId)));
    res.json({ message: 'Amir unassigned successfully' });
  }
};

module.exports = {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  assignSupervisor,
  unassignSupervisor,
  assignAmir,
  unassignAmir
};
