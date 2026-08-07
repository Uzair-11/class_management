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

// GET /api/reports/attendance?branch_id=&from=&to=
const getAttendanceReport = async (req, res) => {
  const { branch_id, from, to } = req.query;
  const user = req.user;

  try {
    const accessibleBranchIds = await getAccessibleBranchIds(user);
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = to || new Date().toISOString().split('T')[0];

    let branchCondition = '';
    const params = [fromDate, toDate];

    if (accessibleBranchIds !== null) {
      if (accessibleBranchIds.length === 0) return res.json({ summary: [], students: [] });
      params.push(accessibleBranchIds);
      branchCondition += ` AND s.branch_id = ANY($${params.length})`;
    }

    if (branch_id) {
      params.push(parseInt(branch_id));
      branchCondition += ` AND s.branch_id = $${params.length}`;
    }

    const query = `
      SELECT 
        s.id AS student_id,
        s.name AS student_name,
        s.branch_id,
        b.name AS branch_name,
        c.name AS course_name,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) AS present_days,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) AS absent_days,
        COUNT(a.id) AS total_days,
        ROUND(
          (COUNT(CASE WHEN a.status = 'present' THEN 1 END)::numeric / NULLIF(COUNT(a.id), 0)) * 100, 
          1
        ) AS attendance_percentage
      FROM students s
      JOIN branches b ON s.branch_id = b.id
      JOIN courses c ON s.course_id = c.id
      LEFT JOIN attendance a ON s.id = a.student_id AND a.date >= $1 AND a.date <= $2
      WHERE s.status = 'active' ${branchCondition}
      GROUP BY s.id, s.name, s.branch_id, b.name, c.name
      ORDER BY b.name, s.name
    `;

    const result = await pool.query(query, params);
    res.json({
      from: fromDate,
      to: toDate,
      students: result.rows
    });
  } catch (err) {
    console.error('getAttendanceReport error:', err);
    res.status(500).json({ message: 'Error generating attendance report', error: err.message });
  }
};

// GET /api/reports/fees?branch_id=
const getFeesReport = async (req, res) => {
  const { branch_id } = req.query;
  const user = req.user;

  try {
    const accessibleBranchIds = await getAccessibleBranchIds(user);
    let branchCondition = '';
    const params = [];

    if (accessibleBranchIds !== null) {
      if (accessibleBranchIds.length === 0) return res.json({ summary: {}, courses: [] });
      params.push(accessibleBranchIds);
      branchCondition += ` AND s.branch_id = ANY($${params.length})`;
    }

    if (branch_id) {
      params.push(parseInt(branch_id));
      branchCondition += ` AND s.branch_id = $${params.length}`;
    }

    const query = `
      SELECT 
        c.id AS course_id,
        c.name AS course_name,
        COUNT(s.id) AS student_count,
        COALESCE(SUM(sf.final_fee), 0) AS total_final_fee,
        COALESCE(SUM(sf.amount_paid), 0) AS total_amount_paid,
        COALESCE(SUM(sf.final_fee - sf.amount_paid), 0) AS total_balance
      FROM courses c
      LEFT JOIN students s ON c.id = s.course_id AND s.status = 'active' ${branchCondition}
      LEFT JOIN student_fees sf ON s.id = sf.student_id
      GROUP BY c.id, c.name
      ORDER BY c.id
    `;

    const courseRes = await pool.query(query, params);

    let overallFinal = 0;
    let overallPaid = 0;
    let overallBalance = 0;

    courseRes.rows.forEach(r => {
      overallFinal += parseFloat(r.total_final_fee);
      overallPaid += parseFloat(r.total_amount_paid);
      overallBalance += parseFloat(r.total_balance);
    });

    res.json({
      summary: {
        total_final_fee: overallFinal,
        total_amount_paid: overallPaid,
        total_balance: overallBalance
      },
      courses: courseRes.rows
    });
  } catch (err) {
    console.error('getFeesReport error:', err);
    res.status(500).json({ message: 'Error generating fee report', error: err.message });
  }
};

// GET /api/reports/overview — role-aware dashboard summary
const getOverviewReport = async (req, res) => {
  const user = req.user;

  try {
    const accessibleBranchIds = await getAccessibleBranchIds(user);
    let branchQuery = 'SELECT b.id, b.name, u.name AS teacher_name FROM branches b LEFT JOIN users u ON b.teacher_id = u.id';
    const params = [];

    if (accessibleBranchIds !== null) {
      if (accessibleBranchIds.length === 0) return res.json({ role: user.role, overall: {}, branches: [] });
      params.push(accessibleBranchIds);
      branchQuery += ` WHERE b.id = ANY($1)`;
    }

    branchQuery += ' ORDER BY b.id';
    const branchRes = await pool.query(branchQuery, params);
    const branches = branchRes.rows;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const branchData = await Promise.all(
      branches.map(async (b) => {
        // 1. Student count
        const stRes = await pool.query('SELECT COUNT(*) FROM students WHERE branch_id = $1 AND status = \'active\'', [b.id]);
        const studentCount = parseInt(stRes.rows[0].count);

        // 2. Attendance % last 30 days
        const attRes = await pool.query(
          `SELECT 
             COUNT(CASE WHEN a.status = 'present' THEN 1 END) AS present_count,
             COUNT(a.id) AS total_count
           FROM attendance a
           JOIN students s ON a.student_id = s.id
           WHERE s.branch_id = $1 AND a.date >= $2`,
          [b.id, thirtyDaysAgo]
        );

        const presentCount = parseInt(attRes.rows[0].present_count || 0);
        const totalCount = parseInt(attRes.rows[0].total_count || 0);
        const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

        // 3. Finance balance
        const finRes = await pool.query('SELECT balance FROM branch_finance_summary WHERE branch_id = $1', [b.id]);
        const balance = finRes.rows.length > 0 ? parseFloat(finRes.rows[0].balance || 0) : 0;

        // 4. Machine status counts
        const mchRes = await pool.query(
          `SELECT status, COUNT(*) FROM machines WHERE branch_id = $1 GROUP BY status`,
          [b.id]
        );

        const machineCounts = {
          working: 0,
          needs_maintenance: 0,
          under_repair: 0,
          out_of_service: 0
        };

        mchRes.rows.forEach(r => {
          machineCounts[r.status] = parseInt(r.count);
        });

        return {
          branch_id: b.id,
          branch_name: b.name,
          teacher_name: b.teacher_name || 'Unassigned',
          student_count: studentCount,
          attendance_percentage: attendancePercentage,
          balance,
          machine_counts: machineCounts
        };
      })
    );

    // Compute Overall Org Stats
    let totalStudents = 0;
    let totalBalance = 0;
    let sumAtt = 0;

    branchData.forEach(bd => {
      totalStudents += bd.student_count;
      totalBalance += bd.balance;
      sumAtt += bd.attendance_percentage;
    });

    const avgAtt = branchData.length > 0 ? Math.round(sumAtt / branchData.length) : 0;

    res.json({
      role: user.role,
      overall: {
        total_branches: branchData.length,
        total_students: totalStudents,
        avg_attendance_percentage: avgAtt,
        total_organization_balance: totalBalance
      },
      branches: branchData
    });
  } catch (err) {
    console.error('getOverviewReport error:', err);
    res.status(500).json({ message: 'Error loading dashboard overview', error: err.message });
  }
};

module.exports = {
  getAttendanceReport,
  getFeesReport,
  getOverviewReport
};
