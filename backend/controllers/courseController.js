const pool = require('../config/db');

// GET /api/courses — list all courses
const getCourses = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, fee, duration_months FROM courses ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching courses', error: err.message });
  }
};

// GET /api/courses/:id — single course detail
const getCourseById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT id, name, fee, duration_months FROM courses WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Course not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching course', error: err.message });
  }
};

// POST /api/courses — create a new course (Admin only)
const createCourse = async (req, res) => {
  const { name, fee, duration_months } = req.body;

  if (!name || fee === undefined || fee === null) {
    return res.status(400).json({ message: 'Course name and fee are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO courses (name, fee, duration_months) 
       VALUES ($1, $2, COALESCE($3, 3)) 
       RETURNING *`,
      [name, fee, duration_months || 3]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error creating course', error: err.message });
  }
};

// PUT /api/courses/:id — edit course details (Admin only)
const updateCourse = async (req, res) => {
  const { id } = req.params;
  const { name, fee, duration_months } = req.body;

  try {
    const result = await pool.query(
      `UPDATE courses 
       SET name = COALESCE($1, name),
           fee = COALESCE($2, fee),
           duration_months = COALESCE($3, duration_months)
       WHERE id = $4
       RETURNING *`,
      [name, fee, duration_months, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Course not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error updating course', error: err.message });
  }
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse
};
