const pool = require('../config/db');

// Helper to retrieve supervisor mapped branch IDs
const getSupervisorBranchIds = async (userId) => {
  const res = await pool.query('SELECT branch_id FROM supervisor_branch_map WHERE user_id = $1', [userId]);
  return res.rows.map(r => r.branch_id);
};

// GET /api/holidays?branch_id=&from=&to= — list holidays
const getHolidays = async (req, res) => {
  const { branch_id, from, to } = req.query;

  try {
    let query = `
      SELECT 
        h.id, h.date, h.reason, h.branch_id,
        b.name AS branch_name
      FROM holidays h
      LEFT JOIN branches b ON h.branch_id = b.id
      WHERE 1=1
    `;

    const params = [];

    if (branch_id) {
      params.push(parseInt(branch_id));
      query += ` AND (h.branch_id = $${params.length} OR h.branch_id IS NULL)`;
    }

    if (from) {
      params.push(from);
      query += ` AND h.date >= $${params.length}`;
    }

    if (to) {
      params.push(to);
      query += ` AND h.date <= $${params.length}`;
    }

    query += ` ORDER BY h.date DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('getHolidays error:', err);
    res.status(500).json({ message: 'Error fetching holidays', error: err.message });
  }
};

// POST /api/holidays — declare a holiday
const createHoliday = async (req, res) => {
  const { date, reason, branch_id } = req.body;
  const user = req.user;

  if (user.role !== 'admin' && user.role !== 'supervisor') {
    return res.status(403).json({ message: 'Only admins and supervisors can declare holidays' });
  }

  if (!date || !reason) {
    return res.status(400).json({ message: 'Date and reason are required' });
  }

  const targetBranchId = (branch_id === null || branch_id === undefined || branch_id === '') ? null : parseInt(branch_id);

  // Supervisor permission checks
  if (user.role === 'supervisor') {
    if (targetBranchId === null) {
      return res.status(403).json({ message: 'Supervisors cannot declare global holidays across all branches' });
    }
    const supervisorBranches = await getSupervisorBranchIds(user.id);
    if (!supervisorBranches.includes(targetBranchId)) {
      return res.status(403).json({ message: 'You can only declare holidays for branches assigned to you' });
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO holidays (date, reason, branch_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [date, reason, targetBranchId]
    );

    res.status(201).json({
      message: 'Holiday declared successfully',
      holiday: result.rows[0]
    });
  } catch (err) {
    console.error('createHoliday error:', err);
    res.status(500).json({ message: 'Error declaring holiday', error: err.message });
  }
};

// DELETE /api/holidays/:id — delete a holiday
const deleteHoliday = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  if (user.role !== 'admin' && user.role !== 'supervisor') {
    return res.status(403).json({ message: 'Only admins and supervisors can delete holidays' });
  }

  try {
    const checkRes = await pool.query('SELECT branch_id FROM holidays WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    const holidayBranchId = checkRes.rows[0].branch_id;

    if (user.role === 'supervisor') {
      if (holidayBranchId === null) {
        return res.status(403).json({ message: 'Supervisors cannot delete global holidays' });
      }
      const supervisorBranches = await getSupervisorBranchIds(user.id);
      if (!supervisorBranches.includes(holidayBranchId)) {
        return res.status(403).json({ message: 'You can only delete holidays for your assigned branches' });
      }
    }

    await pool.query('DELETE FROM holidays WHERE id = $1', [id]);
    res.json({ message: 'Holiday deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting holiday', error: err.message });
  }
};

module.exports = {
  getHolidays,
  createHoliday,
  deleteHoliday
};
