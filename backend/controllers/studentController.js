const pool = require('../config/db');
const { verifyBranchAccess } = require('../middleware/auth');

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
        s.relief_type, s.relief_amount,
        COALESCE(SUM(fc.final_amount), 0) AS total_final_fee,
        COALESCE(SUM(fc.amount_paid), 0) AS amount_paid,
        COALESCE(SUM(fc.final_amount) - SUM(fc.amount_paid), 0) AS balance
      FROM students s
      JOIN branches b ON s.branch_id = b.id
      JOIN courses c ON s.course_id = c.id
      LEFT JOIN fee_cycles fc ON s.id = fc.student_id
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

    query += ` GROUP BY s.id, b.name, c.name, c.fee, s.relief_type, s.relief_amount`;
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
        s.relief_type, s.relief_amount,
        COALESCE(SUM(fc.final_amount), 0) AS total_final_fee,
        COALESCE(SUM(fc.amount_paid), 0) AS amount_paid,
        COALESCE(SUM(fc.final_amount) - SUM(fc.amount_paid), 0) AS balance
      FROM students s
      JOIN branches b ON s.branch_id = b.id
      JOIN courses c ON s.course_id = c.id
      LEFT JOIN fee_cycles fc ON s.id = fc.student_id
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

    query += ` GROUP BY s.id, b.name, c.name, c.fee, c.duration_months, s.relief_type, s.relief_amount`;

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
    relief_type = 'none', relief_amount = 0
  } = req.body;

  if (!name || !branch_id || !course_id) {
    return res.status(400).json({ message: 'Name, branch, and course are required' });
  }

  // Branch access/ownership check
  if (req.user) {
    const hasAccess = await verifyBranchAccess(req.user, branch_id);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Forbidden: Cannot register student in a branch you do not own/access' });
    }
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

    // Create first fee_cycle row for this student (cycle 1)
    const admissionDate = newStudent.admission_date || new Date();
    const dueDate = new Date(admissionDate);
    dueDate.setMonth(dueDate.getMonth() + 1);

    await client.query(
      `INSERT INTO fee_cycles (student_id, branch_id, cycle_number, due_date, original_amount, relief_amount, amount_paid, status)
       VALUES ($1, $2, 1, $3, $4, $5, 0, 'pending')
       ON CONFLICT (student_id, cycle_number) DO NOTHING`,
      [newStudent.id, branch_id, dueDate.toISOString().split('T')[0], originalFee, finalReliefAmount]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Student registered successfully',
      student: newStudent
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createStudent error:', err);
    res.status(500).json({ message: 'Server error during student creation', error: err.message });
  } finally {
    client.release();
  }
};

// POST /api/students/bulk-upload — Bulk register students from CSV / Array
const bulkUploadStudents = async (req, res) => {
  const { students: studentList } = req.body;
  const user = req.user;

  if (!Array.isArray(studentList) || studentList.length === 0) {
    return res.status(400).json({ message: 'No student records provided for bulk upload' });
  }

  const accessibleBranchIds = await getAccessibleBranchIds(user);
  
  // Pre-fetch courses and branches maps for name resolution
  const [coursesRes, branchesRes] = await Promise.all([
    pool.query('SELECT id, name, fee FROM courses'),
    pool.query('SELECT id, name FROM branches')
  ]);

  const coursesByName = {};
  const coursesById = {};
  coursesRes.rows.forEach(c => {
    coursesByName[c.name.trim().toLowerCase()] = c;
    coursesById[c.id] = c;
  });

  const branchesByName = {};
  const branchesById = {};
  branchesRes.rows.forEach(b => {
    branchesByName[b.name.trim().toLowerCase()] = b;
    branchesById[b.id] = b;
  });

  let successCount = 0;
  const failedRows = [];
  const createdStudents = [];

  for (let i = 0; i < studentList.length; i++) {
    const item = studentList[i];
    const rowNum = i + 1;

    try {
      const name = item.name ? item.name.trim() : '';
      if (!name) {
        failedRows.push({ row: rowNum, name: item.name || 'Unnamed', reason: 'Student name is required' });
        continue;
      }

      // Resolve branch
      let branch = null;
      if (item.branch_id) {
        branch = branchesById[item.branch_id];
      } else if (item.branch_name) {
        branch = branchesByName[item.branch_name.trim().toLowerCase()];
      }

      if (!branch) {
        failedRows.push({ row: rowNum, name, reason: `Branch '${item.branch_name || item.branch_id}' not found` });
        continue;
      }

      // Check role permissions for branch
      if (accessibleBranchIds !== null && !accessibleBranchIds.includes(branch.id)) {
        failedRows.push({ row: rowNum, name, reason: `Access denied to branch '${branch.name}'` });
        continue;
      }

      // Resolve course
      let course = null;
      if (item.course_id) {
        course = coursesById[item.course_id];
      } else if (item.course_name) {
        course = coursesByName[item.course_name.trim().toLowerCase()];
      }

      if (!course) {
        failedRows.push({ row: rowNum, name, reason: `Course '${item.course_name || item.course_id}' not found` });
        continue;
      }

      const originalFee = parseFloat(course.fee);
      let reliefType = (item.relief_type || 'none').toLowerCase();
      let reliefAmount = parseFloat(item.relief_amount || 0);

      if (reliefType === 'full') {
        reliefAmount = originalFee;
      } else if (reliefType === 'none') {
        reliefAmount = 0;
      }

      if (reliefAmount < 0 || reliefAmount > originalFee) {
        failedRows.push({ row: rowNum, name, reason: `Relief amount (₹${reliefAmount}) cannot exceed course fee (₹${originalFee})` });
        continue;
      }

      // Insert Student & Fee Cycle in client transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const studentRes = await client.query(
          `INSERT INTO students (name, phone, address, branch_id, course_id, admission_date, relief_type, relief_amount, status)
           VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), $7, $8, 'active')
           RETURNING *`,
          [name, item.phone || null, item.address || null, branch.id, course.id, item.admission_date || null, reliefType, reliefAmount]
        );
        const newStudent = studentRes.rows[0];

        const admissionDate = newStudent.admission_date || new Date();
        const dueDate = new Date(admissionDate);
        dueDate.setMonth(dueDate.getMonth() + 1);

        await client.query(
          `INSERT INTO fee_cycles (student_id, branch_id, cycle_number, due_date, original_amount, relief_amount, amount_paid, status)
           VALUES ($1, $2, 1, $3, $4, $5, 0, 'pending')
           ON CONFLICT (student_id, cycle_number) DO NOTHING`,
          [newStudent.id, branch.id, dueDate.toISOString().split('T')[0], originalFee, reliefAmount]
        );

        await client.query('COMMIT');
        successCount++;
        createdStudents.push(newStudent);
      } catch (rowErr) {
        await client.query('ROLLBACK');
        failedRows.push({ row: rowNum, name, reason: rowErr.message });
      } finally {
        client.release();
      }
    } catch (err) {
      failedRows.push({ row: rowNum, name: item.name || `Row ${rowNum}`, reason: err.message });
    }
  }

  res.status(200).json({
    message: `Bulk upload finished: ${successCount} registered successfully, ${failedRows.length} failed`,
    successCount,
    failedCount: failedRows.length,
    failedRows,
    createdStudents
  });
};

// PUT /api/students/:id — edit student details
const updateStudent = async (req, res) => {
  const { id } = req.params;
  const { name, phone, address, branch_id, course_id, admission_date } = req.body;

  if (req.user && req.user.role === 'amir') {
    return res.status(403).json({ message: 'Forbidden: Amirs cannot edit student records' });
  }

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

  if (req.user && req.user.role === 'amir') {
    return res.status(403).json({ message: 'Forbidden: Amirs cannot change student status' });
  }

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

// DELETE /api/students/:id — delete student record and all dependencies
const deleteStudent = async (req, res) => {
  const { id } = req.params;

  if (req.user && req.user.role === 'amir') {
    return res.status(403).json({ message: 'Forbidden: Amirs cannot delete student records' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `DELETE FROM fee_payments WHERE fee_cycle_id IN (SELECT id FROM fee_cycles WHERE student_id = $1)`,
      [id]
    );
    await client.query(`DELETE FROM fee_cycles WHERE student_id = $1`, [id]);
    await client.query(`DELETE FROM attendance WHERE student_id = $1`, [id]);
    await client.query(`DELETE FROM leave_requests WHERE student_id = $1`, [id]);
    await client.query(`DELETE FROM examinations WHERE student_id = $1`, [id]);
    await client.query(`DELETE FROM certificates WHERE student_id = $1`, [id]);

    const result = await client.query(`DELETE FROM students WHERE id = $1 RETURNING *`, [id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Student not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Student record deleted successfully', student: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('deleteStudent error:', err);
    res.status(500).json({ message: 'Error deleting student', error: err.message });
  } finally {
    client.release();
  }
};

module.exports = {
  getCourses,
  getStudents,
  getStudentById,
  createStudent,
  bulkUploadStudents,
  updateStudent,
  updateStudentStatus,
  deleteStudent
};
