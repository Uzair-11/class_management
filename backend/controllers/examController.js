const pool = require('../config/db');

// Helper to generate unique certificate number: {BRANCH_CODE}-{YEAR}-{SEQ}
const generateCertificateNumber = async (client, branchId, examDate) => {
  const branchRes = await client.query('SELECT name FROM branches WHERE id = $1', [branchId]);
  const branchName = branchRes.rows.length > 0 ? branchRes.rows[0].name : 'BRN';
  const branchCode = branchName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'JIH';

  const year = new Date(examDate).getFullYear();

  const maxIdRes = await client.query(`SELECT COALESCE(MAX(id), 0) AS max_id FROM certificates`);
  const seq = parseInt(maxIdRes.rows[0].max_id) + 1;
  const seqPadded = String(seq).padStart(4, '0');

  return `${branchCode}-${year}-${seqPadded}`;
};

// GET /api/students/:id/exam — return examination & certificate records
const getStudentExamDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const examRes = await pool.query(
      'SELECT id, exam_date, marks, result FROM examinations WHERE student_id = $1 LIMIT 1',
      [id]
    );

    const certRes = await pool.query(
      'SELECT id, certificate_number, issue_date FROM certificates WHERE student_id = $1 LIMIT 1',
      [id]
    );

    res.json({
      examination: examRes.rows[0] || null,
      certificate: certRes.rows[0] || null
    });
  } catch (err) {
    console.error('getStudentExamDetails error:', err);
    res.status(500).json({ message: 'Error fetching exam details', error: err.message });
  }
};

// POST /api/students/:id/exam — record exam result & issue certificate
const createExamAndCertificate = async (req, res) => {
  const { id } = req.params; // student_id
  const { exam_date, marks, result } = req.body;
  const user = req.user;

  if (user.role !== 'teacher' && user.role !== 'admin') {
    return res.status(403).json({ message: 'Only class teachers and admins can record exam results' });
  }

  if (!exam_date || !result) {
    return res.status(400).json({ message: 'exam_date and result (pass/fail) are required' });
  }

  if (result !== 'pass' && result !== 'fail') {
    return res.status(400).json({ message: 'Result must be either "pass" or "fail"' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check if exam already recorded
    const checkRes = await client.query('SELECT id FROM examinations WHERE student_id = $1', [id]);
    if (checkRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'An examination record already exists for this student' });
    }

    // 2. Fetch student and branch info
    const studentRes = await client.query(
      'SELECT id, branch_id FROM students WHERE id = $1',
      [id]
    );

    if (studentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Student not found' });
    }

    const student = studentRes.rows[0];

    // Teacher branch ownership validation
    if (user.role === 'teacher') {
      const branchRes = await client.query('SELECT teacher_id FROM branches WHERE id = $1', [student.branch_id]);
      if (branchRes.rows.length === 0 || branchRes.rows[0].teacher_id !== user.id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ message: 'You can only record exam results for your branch students' });
      }
    }

    // 3. Insert Examination
    const examInsertRes = await client.query(
      `INSERT INTO examinations (student_id, exam_date, marks, result)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, exam_date, marks !== undefined && marks !== '' ? parseFloat(marks) : null, result]
    );

    // 4. Generate Certificate Number and Insert Certificate
    const certNumber = await generateCertificateNumber(client, student.branch_id, exam_date);

    const certInsertRes = await client.query(
      `INSERT INTO certificates (student_id, certificate_number, issue_date)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, certNumber, exam_date]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Exam result recorded and certificate issued successfully',
      examination: examInsertRes.rows[0],
      certificate: certInsertRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createExamAndCertificate error:', err);
    res.status(500).json({ message: 'Error recording examination', error: err.message });
  } finally {
    client.release();
  }
};

// PUT /api/students/:id/exam — edit exam result (Admin only)
const updateExam = async (req, res) => {
  const { id } = req.params;
  const { exam_date, marks, result } = req.body;
  const user = req.user;

  if (user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can edit exam results' });
  }

  try {
    const updateRes = await pool.query(
      `UPDATE examinations
       SET exam_date = COALESCE($1, exam_date),
           marks = $2,
           result = COALESCE($3, result)
       WHERE student_id = $4
       RETURNING *`,
      [exam_date || null, marks !== undefined && marks !== '' ? parseFloat(marks) : null, result || null, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ message: 'Examination record not found' });
    }

    res.json({
      message: 'Examination record updated successfully',
      examination: updateRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ message: 'Error updating examination', error: err.message });
  }
};

// GET /api/certificates/:id — fetch single certificate details for printing
const getCertificateById = async (req, res) => {
  const { id } = req.params; // certificate_id

  try {
    const query = `
      SELECT 
        c.id AS certificate_id,
        c.certificate_number,
        c.issue_date,
        s.id AS student_id,
        s.name AS student_name,
        s.phone AS student_phone,
        b.name AS branch_name,
        b.address AS branch_address,
        crs.name AS course_name,
        crs.duration_months,
        ex.result AS exam_result,
        ex.marks AS exam_marks
      FROM certificates c
      JOIN students s ON c.student_id = s.id
      JOIN branches b ON s.branch_id = b.id
      JOIN courses crs ON s.course_id = crs.id
      LEFT JOIN examinations ex ON s.id = ex.student_id
      WHERE c.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('getCertificateById error:', err);
    res.status(500).json({ message: 'Error fetching certificate', error: err.message });
  }
};

module.exports = {
  getStudentExamDetails,
  createExamAndCertificate,
  updateExam,
  getCertificateById
};
