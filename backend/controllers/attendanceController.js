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

// GET /api/attendance?branch_id=&date= — list attendance for a branch on a given date
const getAttendance = async (req, res) => {
  const { branch_id, date } = req.query;
  const user = req.user;

  if (!branch_id || !date) {
    return res.status(400).json({ message: 'branch_id and date query parameters are required' });
  }

  try {
    const accessibleBranchIds = await getAccessibleBranchIds(user);
    const targetBranchId = parseInt(branch_id);

    if (accessibleBranchIds !== null && !accessibleBranchIds.includes(targetBranchId)) {
      return res.status(403).json({ message: 'Access denied to this branch attendance' });
    }

    // 1. Check for Holiday
    const holidayRes = await pool.query(
      `SELECT reason FROM holidays WHERE date = $1 AND (branch_id = $2 OR branch_id IS NULL) LIMIT 1`,
      [date, targetBranchId]
    );

    if (holidayRes.rows.length > 0) {
      return res.json({
        is_holiday: true,
        holiday_reason: holidayRes.rows[0].reason || 'Scheduled Holiday',
        locked: true,
        students: []
      });
    }

    // 2. Check for Attendance Lock in attendance_locks table
    const lockRes = await pool.query(
      'SELECT id FROM attendance_locks WHERE branch_id = $1 AND date = $2 LIMIT 1',
      [targetBranchId, date]
    );
    const isLocked = lockRes.rows.length > 0;

    // 3. Fetch all active students in the branch with existing attendance OR approved leave
    const query = `
      SELECT 
        s.id AS student_id,
        s.name AS student_name,
        s.phone AS student_phone,
        a.id AS attendance_id,
        COALESCE(
          a.status::text, 
          CASE WHEN lr.id IS NOT NULL THEN 'leave' ELSE NULL END
        ) AS status,
        a.marked_by
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND a.date = $1
      LEFT JOIN leave_requests lr 
        ON s.id = lr.student_id 
        AND lr.status = 'approved' 
        AND $1::date BETWEEN lr.date_from AND lr.date_to
      WHERE s.branch_id = $2 AND s.status = 'active'
      ORDER BY s.id ASC;
    `;

    const result = await pool.query(query, [date, targetBranchId]);

    res.json({
      is_holiday: false,
      locked: isLocked,
      date,
      branch_id: targetBranchId,
      students: result.rows.map(row => ({
        student_id: row.student_id,
        student_name: row.student_name,
        student_phone: row.student_phone,
        status: row.status || null
      }))
    });
  } catch (err) {
    console.error('getAttendance error:', err);
    res.status(500).json({ message: 'Error fetching attendance', error: err.message });
  }
};

// POST /api/attendance — submit/upsert attendance for a branch on a given date (Teacher or Admin)
const postAttendance = async (req, res) => {
  const { branch_id, date, records } = req.body;
  const user = req.user;

  if (user.role !== 'teacher' && user.role !== 'admin') {
    return res.status(403).json({ message: 'Only class teachers and admins can mark attendance' });
  }

  if (!branch_id || !date || !Array.isArray(records)) {
    return res.status(400).json({ message: 'branch_id, date, and records array are required' });
  }

  const targetBranchId = parseInt(branch_id);

  if (user.role === 'teacher') {
    const branchRes = await pool.query('SELECT teacher_id FROM branches WHERE id = $1', [targetBranchId]);
    if (branchRes.rows.length === 0 || branchRes.rows[0].teacher_id !== user.id) {
      return res.status(403).json({ message: 'You can only mark attendance for your assigned branch' });
    }
  }

  // ENFORCE SERVER-SIDE LOCK CHECK
  const lockCheck = await pool.query(
    'SELECT id FROM attendance_locks WHERE branch_id = $1 AND date = $2 LIMIT 1',
    [targetBranchId, date]
  );

  if (lockCheck.rows.length > 0) {
    return res.status(403).json({ message: `Attendance for ${date} is locked and cannot be edited` });
  }

  // Check for Holiday
  const holidayRes = await pool.query(
    `SELECT reason FROM holidays WHERE date = $1 AND (branch_id = $2 OR branch_id IS NULL) LIMIT 1`,
    [date, targetBranchId]
  );

  if (holidayRes.rows.length > 0) {
    const reason = holidayRes.rows[0].reason || 'Holiday';
    return res.status(400).json({ message: `Cannot mark attendance: "${reason}" is a holiday` });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;

    for (const rec of records) {
      if (!rec.student_id || !rec.status) continue;

      if (rec.status === 'present') presentCount++;
      if (rec.status === 'absent') absentCount++;
      if (rec.status === 'leave') leaveCount++;

      await client.query(
        `INSERT INTO attendance (student_id, branch_id, date, status, marked_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (student_id, date)
         DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`,
        [rec.student_id, targetBranchId, date, rec.status, user.id]
      );
    }

    await client.query('COMMIT');

    res.json({
      message: 'Attendance saved successfully',
      locked: false,
      summary: {
        date,
        total: records.length,
        present: presentCount,
        absent: absentCount,
        leave: leaveCount
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('postAttendance error:', err);
    res.status(500).json({ message: 'Error saving attendance', error: err.message });
  } finally {
    client.release();
  }
};

// POST /api/attendance/lock — lock attendance for a branch + date
const lockAttendance = async (req, res) => {
  const { branch_id, date } = req.body;
  const user = req.user;

  if (user.role !== 'teacher' && user.role !== 'admin') {
    return res.status(403).json({ message: 'Only class teachers and admins can lock attendance' });
  }

  if (!branch_id || !date) {
    return res.status(400).json({ message: 'branch_id and date are required' });
  }

  try {
    const targetBranchId = parseInt(branch_id);

    const existingLock = await pool.query(
      'SELECT id FROM attendance_locks WHERE branch_id = $1 AND date = $2',
      [targetBranchId, date]
    );

    if (existingLock.rows.length > 0) {
      return res.status(400).json({ message: 'Attendance is already locked for this date' });
    }

    await pool.query(
      `INSERT INTO attendance_locks (branch_id, date, locked_by)
       VALUES ($1, $2, $3)`,
      [targetBranchId, date, user.id]
    );

    res.json({
      message: 'Attendance sheet locked successfully',
      locked: true,
      is_locked: true
    });
  } catch (err) {
    console.error('lockAttendance error:', err);
    res.status(500).json({ message: 'Error locking attendance', error: err.message });
  }
};

// GET /api/attendance/student/:id — full attendance history for one student excluding leave from percentage
const getStudentAttendanceHistory = async (req, res) => {
  const { id } = req.params;

  try {
    const historyRes = await pool.query(
      `SELECT 
         a.id, a.date, a.status, a.marked_by, u.name AS marked_by_name
       FROM attendance a
       LEFT JOIN users u ON a.marked_by = u.id
       WHERE a.student_id = $1
       ORDER BY a.date DESC`,
      [id]
    );

    const logs = historyRes.rows;
    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;

    logs.forEach(l => {
      if (l.status === 'present') presentCount++;
      if (l.status === 'absent') absentCount++;
      if (l.status === 'leave') leaveCount++;
    });

    const evaluatedDays = presentCount + absentCount; // Exclude leave from denominator
    const percentage = evaluatedDays > 0 ? ((presentCount / evaluatedDays) * 100).toFixed(1) : 0;

    res.json({
      total_days: logs.length,
      evaluated_days: evaluatedDays,
      present_count: presentCount,
      absent_count: absentCount,
      leave_count: leaveCount,
      percentage: parseFloat(percentage),
      history: logs
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching student attendance history', error: err.message });
  }
};

module.exports = {
  getAttendance,
  postAttendance,
  lockAttendance,
  getStudentAttendanceHistory
};
