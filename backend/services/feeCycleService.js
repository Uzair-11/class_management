const pool = require('../config/db');

/**
 * Generates any missing monthly fee cycles for all active students up to the current date.
 * 
 * Logic:
 * - A cycle for month N (N = 1, 2, 3...) becomes due when current_date >= admission_date + N months.
 * - Month 0 (at admission itself) is excluded.
 * - Active students only; completed/dropped students receive no new cycles.
 * - Applies the standing relief_type & relief_amount configured on the student profile.
 * - Updates status to 'overdue' for any unpaid/partially paid cycles whose due_date has passed.
 */
const generateMonthlyFeeCycles = async () => {
  try {
    // 1. Fetch all active students with course fee info
    const studentsRes = await pool.query(`
      SELECT 
        s.id AS student_id,
        s.branch_id,
        s.admission_date,
        s.relief_type,
        s.relief_amount,
        c.fee AS original_course_fee
      FROM students s
      JOIN courses c ON s.course_id = c.id
      WHERE s.status = 'active'
    `);

    const today = new Date();

    for (const student of studentsRes.rows) {
      const admissionDate = new Date(student.admission_date);
      const originalFee = parseFloat(student.original_course_fee);
      
      // Calculate relief amount to apply per cycle
      let cycleRelief = 0;
      if (student.relief_type === 'full') {
        cycleRelief = originalFee;
      } else if (student.relief_type === 'partial') {
        cycleRelief = parseFloat(student.relief_amount || 0);
      }

      let cycleNumber = 1;

      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      while (true) {
        // Compute due_date = admission_date + N months
        const dueDate = new Date(admissionDate);
        dueDate.setMonth(dueDate.getMonth() + cycleNumber);

        // Stop if the due date for this cycle is strictly in the future
        if (dueDate > todayStart) {
          break;
        }

        const year = dueDate.getFullYear();
        const month = String(dueDate.getMonth() + 1).padStart(2, '0');
        const day = String(dueDate.getDate()).padStart(2, '0');
        const dueDateStr = `${year}-${month}-${day}`;

        // Insert cycle if it doesn't exist yet
        await pool.query(
          `INSERT INTO fee_cycles (
             student_id, branch_id, cycle_number, due_date, original_amount, relief_amount, status
           )
           VALUES ($1, $2, $3, $4, $5, $6, 'pending')
           ON CONFLICT (student_id, cycle_number) DO NOTHING`,
          [student.student_id, student.branch_id, cycleNumber, dueDateStr, originalFee, cycleRelief]
        );

        cycleNumber++;
      }
    }

    // 2. Mark cycles 'overdue' if due_date < CURRENT_DATE and balance is unpaid
    await pool.query(`
      UPDATE fee_cycles
      SET status = 'overdue'
      WHERE due_date < CURRENT_DATE
        AND status IN ('pending', 'partial')
        AND amount_paid < final_amount
    `);

  } catch (err) {
    console.error('Error generating monthly fee cycles:', err);
  }
};

module.exports = {
  generateMonthlyFeeCycles
};
