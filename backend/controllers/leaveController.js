const pool = require('../config/db');

// Helper to retrieve allowed branch IDs based on user role
const getAccessibleBranchIds = async (user) => {
  if (user.role === 'admin') return null;

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

// POST /api/leave-requests — submit a leave request
const createLeaveRequest = async (req, res) => {
  const { student_id, date_from, date_to, reason } = req.body;
  const user = req.user;

  if (!student_id || !date_from || !date_to || !reason) {
    return res.status(400).json({ message: 'student_id, date_from, date_to, and reason are required' });
  }

  try {
    const studentRes = await pool.query('SELECT branch_id FROM students WHERE id = $1', [student_id]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const branchId = studentRes.rows[0].branch_id;

    const result = await pool.query(
      `INSERT INTO leave_requests (student_id, branch_id, date_from, date_to, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [student_id, branchId, date_from, date_to, reason]
    );

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leave_request: result.rows[0]
    });
  } catch (err) {
    console.error('createLeaveRequest error:', err);
    res.status(500).json({ message: 'Error submitting leave request', error: err.message });
  }
};

// GET /api/leave-requests?branch_id=&status=&student_id= — list leave requests
const getLeaveRequests = async (req, res) => {
  const { branch_id, status, student_id } = req.query;
  const user = req.user;

  try {
    const accessibleBranchIds = await getAccessibleBranchIds(user);
    let whereConditions = [];
    const params = [];

    if (accessibleBranchIds !== null) {
      if (accessibleBranchIds.length === 0) return res.json([]);
      params.push(accessibleBranchIds);
      whereConditions.push(`lr.branch_id = ANY($${params.length})`);
    }

    if (branch_id) {
      params.push(parseInt(branch_id));
      whereConditions.push(`lr.branch_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      whereConditions.push(`lr.status = $${params.length}`);
    }

    if (student_id) {
      params.push(parseInt(student_id));
      whereConditions.push(`lr.student_id = $${params.length}`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        lr.id,
        lr.student_id,
        s.name AS student_name,
        lr.branch_id,
        b.name AS branch_name,
        lr.date_from,
        lr.date_to,
        lr.reason,
        lr.status,
        lr.requested_at,
        lr.reviewed_by,
        u.name AS reviewed_by_name,
        lr.reviewed_at
      FROM leave_requests lr
      JOIN students s ON lr.student_id = s.id
      JOIN branches b ON lr.branch_id = b.id
      LEFT JOIN users u ON lr.reviewed_by = u.id
      ${whereClause}
      ORDER BY lr.requested_at DESC
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('getLeaveRequests error:', err);
    res.status(500).json({ message: 'Error fetching leave requests', error: err.message });
  }
};

// PUT /api/leave-requests/:id/approve — approve leave request and upsert 'leave' attendance records
const approveLeaveRequest = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  if (user.role !== 'teacher' && user.role !== 'supervisor' && user.role !== 'admin') {
    return res.status(403).json({ message: 'Only teachers, supervisors, and admins can approve leave requests' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const lrRes = await client.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
    if (lrRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const lr = lrRes.rows[0];

    // Check teacher jurisdiction
    if (user.role === 'teacher') {
      const branchRes = await client.query('SELECT teacher_id FROM branches WHERE id = $1', [lr.branch_id]);
      if (branchRes.rows.length === 0 || branchRes.rows[0].teacher_id !== user.id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ message: 'You can only approve leave requests for your branch' });
      }
    }

    // 1. Update leave_requests status
    await client.query(
      `UPDATE leave_requests
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW()
       WHERE id = $2`,
      [user.id, id]
    );

    // 2. Iterate date_from to date_to range
    const curr = new Date(lr.date_from);
    const end = new Date(lr.date_to);

    while (curr <= end) {
      const year = curr.getFullYear();
      const month = String(curr.getMonth() + 1).padStart(2, '0');
      const day = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // Check if scheduled holiday for this date
      const holidayRes = await client.query(
        'SELECT id FROM holidays WHERE date = $1 AND (branch_id = $2 OR branch_id IS NULL) LIMIT 1',
        [dateStr, lr.branch_id]
      );

      if (holidayRes.rows.length === 0) {
        // Upsert attendance with status = 'leave' (Leave approval overrides attendance lock as a correction workflow)
        await client.query(
          `INSERT INTO attendance (student_id, branch_id, date, status, marked_by)
           VALUES ($1, $2, $3, 'leave', $4)
           ON CONFLICT (student_id, date)
           DO UPDATE SET status = 'leave', marked_by = EXCLUDED.marked_by`,
          [lr.student_id, lr.branch_id, dateStr, user.id]
        );
      }

      curr.setDate(curr.getDate() + 1);
    }

    await client.query('COMMIT');
    res.json({ message: 'Leave request approved and attendance updated to Leave successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('approveLeaveRequest error:', err);
    res.status(500).json({ message: 'Error approving leave request', error: err.message });
  } finally {
    client.release();
  }
};

// PUT /api/leave-requests/:id/reject — reject leave request
const rejectLeaveRequest = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  if (user.role !== 'teacher' && user.role !== 'supervisor' && user.role !== 'admin') {
    return res.status(403).json({ message: 'Only teachers, supervisors, and admins can reject leave requests' });
  }

  try {
    const lrRes = await pool.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
    if (lrRes.rows.length === 0) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const lr = lrRes.rows[0];

    if (user.role === 'teacher') {
      const branchRes = await pool.query('SELECT teacher_id FROM branches WHERE id = $1', [lr.branch_id]);
      if (branchRes.rows.length === 0 || branchRes.rows[0].teacher_id !== user.id) {
        return res.status(403).json({ message: 'You can only reject leave requests for your branch' });
      }
    }

    await pool.query(
      `UPDATE leave_requests
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW()
       WHERE id = $2`,
      [user.id, id]
    );

    res.json({ message: 'Leave request rejected' });
  } catch (err) {
    console.error('rejectLeaveRequest error:', err);
    res.status(500).json({ message: 'Error rejecting leave request', error: err.message });
  }
};

module.exports = {
  createLeaveRequest,
  getLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest
};
