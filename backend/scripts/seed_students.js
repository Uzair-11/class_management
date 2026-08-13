const pool = require('../config/db');

const studentData = [
  { name: 'Keheksha', admission_date: '2026-04-20' },
  { name: 'Sofiya', admission_date: '2026-04-11' },
  { name: 'Zunera', admission_date: '2026-04-02' },
  { name: 'Atika', admission_date: '2026-04-02' },
  { name: 'Safiya', admission_date: '2026-04-20' },
  { name: 'Khansa', admission_date: '2026-05-02' },
  { name: 'Rumana', admission_date: '2026-06-04' },
  { name: 'Aamena', admission_date: '2026-05-24' },
  { name: 'Uzin', admission_date: '2026-04-26' },
  { name: 'Gulnaz', admission_date: '2026-05-13' },
  { name: 'Nuzra', admission_date: '2026-06-05' },
  { name: 'Mahek', admission_date: '2026-05-05' },
  { name: 'Ummehani', admission_date: '2026-06-08' },
  { name: 'Rusda', admission_date: '2026-05-05' },
  { name: 'Ayesha', admission_date: '2026-05-05' },
  { name: 'Maheksimra', admission_date: '2026-06-08' },
  { name: 'Naurin', admission_date: '2026-06-08' },
  { name: 'Saleha', admission_date: '2026-06-10' },
  { name: 'Jazel', admission_date: '2026-06-12' },
  { name: 'Lamha', admission_date: '2026-06-12' },
  { name: 'Farheen', admission_date: '2026-06-16' },
  { name: 'Afeefa', admission_date: '2026-06-16' },
  { name: 'Alfiva', admission_date: '2026-06-19' },
  { name: 'Kehekshah', admission_date: '2026-06-25' },
  { name: 'Saima', admission_date: '2026-06-25' }
];

// Calculate Due Date string adding 1 month directly to YYYY-MM-DD
function addOneMonth(dateStr) {
  const parts = dateStr.split('-');
  let year = parseInt(parts[0]);
  let month = parseInt(parts[1]) + 1; // add 1 month
  let day = parts[2];
  if (month > 12) {
    month = 1;
    year += 1;
  }
  const monthStr = month < 10 ? `0${month}` : `${month}`;
  return `${year}-${monthStr}-${day}`;
}

async function seedStudents() {
  const client = await pool.connect();
  try {
    console.log('Resetting and seeding exact student records...');
    
    // Clean existing students to avoid duplicates
    await client.query('DELETE FROM fee_payments');
    await client.query('DELETE FROM fee_cycles');
    await client.query('DELETE FROM attendance');
    await client.query('DELETE FROM leave_requests');
    await client.query('DELETE FROM examinations');
    await client.query('DELETE FROM certificates');
    await client.query('DELETE FROM students');

    // Fetch default branch and course
    const branchRes = await client.query('SELECT id, name FROM branches ORDER BY id ASC LIMIT 1');
    const courseRes = await client.query('SELECT id, name, fee FROM courses ORDER BY id ASC LIMIT 1');

    if (branchRes.rows.length === 0 || courseRes.rows.length === 0) {
      throw new Error('Default branch or course not found in database.');
    }

    const branch = branchRes.rows[0];
    const course = courseRes.rows[0];
    const courseFee = parseFloat(course.fee);

    let insertedCount = 0;

    for (const item of studentData) {
      await client.query('BEGIN');

      // Insert Student
      const studentRes = await client.query(
        `INSERT INTO students (name, branch_id, course_id, admission_date, relief_type, relief_amount, status)
         VALUES ($1, $2, $3, $4::date, 'none', 0, 'active')
         RETURNING id, name, admission_date::text`,
        [item.name, branch.id, course.id, item.admission_date]
      );

      const student = studentRes.rows[0];
      const dueDate = addOneMonth(item.admission_date);

      // Create Fee Cycle 1
      await client.query(
        `INSERT INTO fee_cycles (student_id, branch_id, cycle_number, due_date, original_amount, relief_amount, amount_paid, status)
         VALUES ($1, $2, 1, $3::date, $4, 0, 0, 'pending')
         ON CONFLICT (student_id, cycle_number) DO NOTHING`,
        [student.id, branch.id, dueDate, courseFee]
      );

      await client.query('COMMIT');
      insertedCount++;
      console.log(`[${insertedCount}/${studentData.length}] Seeded student: ${student.name} | Admission Date: ${student.admission_date} | Fee Due: ${dueDate}`);
    }

    console.log(`\n🎉 Successfully seeded all ${insertedCount} students with exact admission dates & fee cycles!`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during student seeding:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedStudents();
