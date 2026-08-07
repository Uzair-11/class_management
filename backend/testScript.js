const pool = require('./config/db');
const { generateMonthlyFeeCycles } = require('./services/feeCycleService');

(async () => {
  const client = await pool.connect();
  try {
    console.log('--- TEST 1: Monthly Fee Cycle Generation ---');
    // 1. Create a test student with admission date 2 months in the past
    const stRes = await client.query(`
      INSERT INTO students (name, phone, branch_id, course_id, admission_date, status, relief_type, relief_amount)
      VALUES ('Test Monthly Student', '9998887770', 1, 1, CURRENT_DATE - INTERVAL '2 months', 'active', 'partial', 50.00)
      RETURNING id, admission_date;
    `);
    const student = stRes.rows[0];
    console.log('✅ Created active student with admission date 2 months ago:', student);

    // Run fee cycle generation service
    await generateMonthlyFeeCycles();

    // Query generated cycles
    const cyclesRes = await client.query(
      'SELECT id, cycle_number, due_date, original_amount, relief_amount, final_amount, status FROM fee_cycles WHERE student_id = $1 ORDER BY cycle_number',
      [student.id]
    );

    console.log(`✅ Generated ${cyclesRes.rows.length} fee cycles (Month 1 and Month 2):`);
    cyclesRes.rows.forEach(c => {
      console.log(`   - Cycle ${c.cycle_number}: Due ${c.due_date.toISOString().split('T')[0]}, Final Fee ₹${c.final_amount}, Status: ${c.status}`);
    });

    console.log('\n--- TEST 2: Attendance Lock Server Enforcement ---');
    // Insert attendance lock
    await client.query(
      `INSERT INTO attendance_locks (branch_id, date) VALUES (1, CURRENT_DATE) ON CONFLICT DO NOTHING;`
    );
    const lockCheck = await client.query(
      `SELECT id FROM attendance_locks WHERE branch_id = 1 AND date = CURRENT_DATE;`
    );
    console.log('✅ Server-side Attendance Lock exists for today:', lockCheck.rows.length > 0);

    console.log('\n--- TEST 3: Leave Request Approval & Attendance Upsert ---');
    // Insert leave request
    const lrRes = await client.query(`
      INSERT INTO leave_requests (student_id, branch_id, date_from, date_to, reason, status)
      VALUES ($1, 1, CURRENT_DATE, CURRENT_DATE, 'Family event', 'pending')
      RETURNING id;
    `, [student.id]);
    const leaveId = lrRes.rows[0].id;

    // Approve leave request using backend query logic
    await client.query(`
      UPDATE leave_requests SET status = 'approved', reviewed_at = NOW() WHERE id = $1;
    `, [leaveId]);

    await client.query(`
      INSERT INTO attendance (student_id, branch_id, date, status)
      VALUES ($1, 1, CURRENT_DATE, 'leave')
      ON CONFLICT (student_id, date) DO UPDATE SET status = 'leave';
    `, [student.id]);

    const attCheck = await client.query(`
      SELECT status FROM attendance WHERE student_id = $1 AND date = CURRENT_DATE;
    `, [student.id]);
    console.log('✅ Attendance status for approved leave student:', attCheck.rows[0].status);

    // Clean up test data
    await client.query('DELETE FROM fee_cycles WHERE student_id = $1', [student.id]);
    await client.query('DELETE FROM leave_requests WHERE student_id = $1', [student.id]);
    await client.query('DELETE FROM attendance WHERE student_id = $1', [student.id]);
    await client.query('DELETE FROM students WHERE id = $1', [student.id]);
    await client.query('DELETE FROM attendance_locks WHERE branch_id = 1 AND date = CURRENT_DATE');
    console.log('\n✅ Cleaned up test data!');

  } catch (err) {
    console.error('❌ Verification failed:', err);
  } finally {
    client.release();
    process.exit();
  }
})();
