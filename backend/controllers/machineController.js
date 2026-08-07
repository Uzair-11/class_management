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

// GET /api/machines?branch_id= — list machines for a branch
const getMachines = async (req, res) => {
  const { branch_id } = req.query;
  const user = req.user;

  try {
    const accessibleBranchIds = await getAccessibleBranchIds(user);
    let query = `
      SELECT 
        m.id, m.branch_id, b.name AS branch_name,
        m.machine_number, m.purchase_date, m.status
      FROM machines m
      JOIN branches b ON m.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (accessibleBranchIds !== null) {
      if (accessibleBranchIds.length === 0) {
        return res.json([]);
      }
      params.push(accessibleBranchIds);
      query += ` AND m.branch_id = ANY($${params.length})`;
    }

    if (branch_id) {
      params.push(parseInt(branch_id));
      query += ` AND m.branch_id = $${params.length}`;
    }

    query += ` ORDER BY m.id DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('getMachines error:', err);
    res.status(500).json({ message: 'Error fetching machines', error: err.message });
  }
};

// GET /api/machines/:id — single machine detail
const getMachineById = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        m.id, m.branch_id, b.name AS branch_name,
        m.machine_number, m.purchase_date, m.status
      FROM machines m
      JOIN branches b ON m.branch_id = b.id
      WHERE m.id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Machine not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching machine details', error: err.message });
  }
};

// POST /api/machines — add a machine
const createMachine = async (req, res) => {
  const { branch_id, machine_number, serial_number, purchase_date, status = 'working' } = req.body;
  const user = req.user;

  const num = machine_number || serial_number;

  if (user.role !== 'teacher' && user.role !== 'admin') {
    return res.status(403).json({ message: 'Only teachers and admins can add machines' });
  }

  if (!branch_id || !num) {
    return res.status(400).json({ message: 'branch_id and machine_number are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO machines (branch_id, machine_number, purchase_date, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [branch_id, num, purchase_date || null, status]
    );

    res.status(201).json({
      message: 'Machine added successfully',
      machine: result.rows[0]
    });
  } catch (err) {
    console.error('createMachine error:', err);
    res.status(500).json({ message: 'Error creating machine', error: err.message });
  }
};

// PUT /api/machines/:id — edit machine details or update status
const updateMachine = async (req, res) => {
  const { id } = req.params;
  const { machine_number, serial_number, purchase_date, status } = req.body;
  const user = req.user;

  const num = machine_number || serial_number;

  if (user.role !== 'teacher' && user.role !== 'admin') {
    return res.status(403).json({ message: 'Only teachers and admins can update machines' });
  }

  try {
    const result = await pool.query(
      `UPDATE machines
       SET machine_number = COALESCE($1, machine_number),
           purchase_date = COALESCE($2, purchase_date),
           status = COALESCE($3, status)
       WHERE id = $4
       RETURNING *`,
      [num, purchase_date, status, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Machine not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error updating machine', error: err.message });
  }
};

// GET /api/machines/:id/maintenance — maintenance history for one machine
const getMachineMaintenance = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, machine_id, date, description, cost, remarks
       FROM machine_maintenance
       WHERE machine_id = $1
       ORDER BY date DESC, id DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching maintenance history', error: err.message });
  }
};

// POST /api/machines/:id/maintenance — add a maintenance record and matching expense row
const addMachineMaintenance = async (req, res) => {
  const { id } = req.params; // machine_id
  const { date, description, cost, remarks, update_status } = req.body;
  const user = req.user;

  if (user.role !== 'teacher' && user.role !== 'admin') {
    return res.status(403).json({ message: 'Only teachers and admins can add maintenance records' });
  }

  if (!date || !description || cost === undefined) {
    return res.status(400).json({ message: 'date, description, and cost are required' });
  }

  const costVal = parseFloat(cost || 0);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch Machine & Branch info
    const machineRes = await client.query('SELECT id, branch_id, machine_number FROM machines WHERE id = $1', [id]);
    if (machineRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Machine not found' });
    }

    const machine = machineRes.rows[0];

    // 2. Insert into machine_maintenance
    const maintRes = await client.query(
      `INSERT INTO machine_maintenance (machine_id, date, description, cost, remarks)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, date, description, costVal, remarks || null]
    );

    // 3. Automatically insert matching row into expenses table
    await client.query(
      `INSERT INTO expenses (branch_id, date, expense_type, description, amount)
       VALUES ($1, $2, 'machine_maintenance', $3, $4)`,
      [machine.branch_id, date, `Maintenance for Machine #${machine.machine_number}: ${description}`, costVal]
    );

    // 4. Optionally update machine status if specified
    if (update_status) {
      await client.query('UPDATE machines SET status = $1 WHERE id = $2', [update_status, id]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Maintenance record added and matching branch expense logged successfully',
      maintenance: maintRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('addMachineMaintenance error:', err);
    res.status(500).json({ message: 'Error adding maintenance record', error: err.message });
  } finally {
    client.release();
  }
};

module.exports = {
  getMachines,
  getMachineById,
  createMachine,
  updateMachine,
  getMachineMaintenance,
  addMachineMaintenance
};
