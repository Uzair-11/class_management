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

// GET /api/courses — list courses
const getCourses = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, fee, duration_months FROM courses ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching courses', error: err.message });
  }
};

// GET /api/students — list students filtered by role/branch access
const getStudents = async (req, res) => {
  const { branch_id } = req.query;
  const user = req.user;

  try {
    const accessibleBranchIds = await getAccessibleBranchIds(user);

    let query = `
      SELECT 
        s.id, s.name, s.phone, s.address, s.admission_date, s.status,
        s.branch_id, b.name AS branch_name,
        s.course_id, c.name AS course_name, c.fee AS course_fee,
        sf.original_fee, sf.relief_type, sf.relief_amount, sf.final_fee, sf.amount_paid,
        (sf.final_fee - sf.amount_paid) AS balance
      FROM students s
      JOIN branches b ON s.branch_id = b.id
      JOIN courses c ON s.course_id = c.id
      LEFT JOIN student_fees sf ON s.id = sf.student_id
      WHERE 1=1
    `;

    const params = [];

    // Enforce role-based branch filtering
    if (accessibleBranchIds !== null) {
      if (accessibleBranchIds.length === 0) {
        return res.json([]); // User has no assigned branches
      }
      params.push(accessibleBranchIds);
      query += ` AND s.branch_id = ANY($${params.length})`;
    }

    // Optional branch_id query param filter (for admin/amir/supervisor)
    if (branch_id) {
      params.push(parseInt(branch_id));
      query += ` AND s.branch_id = $${params.length}`;
    }

    query += ` ORDER BY s.id DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('getStudents error:', err);
    res.status(500).json({ message: 'Error fetching students', error: err.message });
  }
};

// GET /api/students/:id — student detail
const getStudentById = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  try {
    const accessibleBranchIds = await getAccessibleBranchIds(user);

    let query = `
      SELECT 
        s.id, s.name, s.phone, s.address, s.admission_date, s.status,
        s.branch_id, b.name AS branch_name,
        s.course_id, c.name AS course_name, c.fee AS course_fee, c.duration_months,
        sf.id AS fee_id, sf.original_fee, sf.relief_type, sf.relief_amount, sf.relief_percentage, sf.final_fee, sf.amount_paid,
        (sf.final_fee - sf.amount_paid) AS balance
      FROM students s
      JOIN branches b ON s.branch_id = b.id
      JOIN courses c ON s.course_id = c.id
      LEFT JOIN student_fees sf ON s.id = sf.student_id
      WHERE s.id = $1
    `;

    const params = [id];

    if (accessibleBranchIds !== null) {
      if (accessibleBranchIds.length === 0) {
        return res.status(403).json({ message: 'Access denied to this student' });
      }
      params.push(accessibleBranchIds);
      query += ` AND s.branch_id = ANY($2)`;
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching student details', error: err.message });
  }
};

// POST /api/students — create a student & matching student_fees row
const createStudent = async (req, res) => {
  const {
    name, phone, address, branch_id, course_id, admission_date,
    relief_type = 'none', relief_amount = 0, relief_percentage
  } = req.body;

  if (!name || !branch_id || !course_id) {
    return res.status(400).json({ message: 'Name, branch, and course are required' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Fetch target course fee
    const courseRes = await client.query('SELECT fee FROM courses WHERE id = $1', [course_id]);
    if (courseRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid course selected' });
    }

    const originalFee = parseFloat(courseRes.rows[0].fee);
    let finalReliefAmount = parseFloat(relief_amount || 0);

    if (relief_type === 'full') {
      finalReliefAmount = originalFee;
    } else if (relief_type === 'none') {
      finalReliefAmount = 0;
    }

    if (finalReliefAmount < 0 || finalReliefAmount > originalFee) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Relief amount cannot exceed original course fee' });
    }

    // Insert Student
    const studentRes = await client.query(
      `INSERT INTO students (name, phone, address, branch_id, course_id, admission_date, relief_type, relief_amount, status)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), $7, $8, 'active')
       RETURNING *`,
      [name, phone || null, address || null, branch_id, course_id, admission_date || null, relief_type, finalReliefAmount]
    );

    const newStudent = studentRes.rows[0];

    // Insert Student Fee
    const feeRes = await client.query(
      `INSERT INTO student_fees (student_id, original_fee, relief_type, relief_amount, relief_percentage)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [newStudent.id, originalFee, relief_type, finalReliefAmount, relief_percentage || null]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Student registered successfully',
      student: newStudent,
      fee: feeRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createStudent error:', err);
    res.status(500).json({ message: 'Server error during student creation', error: err.message });
  } finally {
    client.release();
  }
};

// PUT /api/students/:id — edit student details
const updateStudent = async (req, res) => {
  const { id } = req.params;
  const { name, phone, address, branch_id, course_id, admission_date } = req.body;

  try {
    const result = await pool.query(
      `UPDATE students
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           address = COALESCE($3, address),
           branch_id = COALESCE($4, branch_id),
           course_id = COALESCE($5, course_id),
           admission_date = COALESCE($6, admission_date)
       WHERE id = $7
       RETURNING *`,
      [name, phone, address, branch_id, course_id, admission_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error updating student', error: err.message });
  }
};

// PUT /api/students/:id/status — change student status
const updateStudentStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['active', 'completed', 'dropped'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const result = await pool.query(
      `UPDATE students SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error updating status', error: err.message });
  }
};

module.exports = {
  getCourses,
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  updateStudentStatus
};
