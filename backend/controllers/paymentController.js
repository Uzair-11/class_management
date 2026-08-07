const pool = require('../config/db');
const { generateMonthlyFeeCycles } = require('../services/feeCycleService');

// GET /api/students/:id/fee-cycles — list all fee cycles for a student
const getStudentFeeCycles = async (req, res) => {
  const { id } = req.params;

  try {
    // Generate any pending monthly cycles first
    await generateMonthlyFeeCycles();

    const cyclesRes = await pool.query(
      `SELECT 
         fc.id,
         fc.student_id,
         fc.branch_id,
         fc.cycle_number,
         fc.due_date,
         fc.original_amount,
         fc.relief_amount,
         fc.final_amount,
         fc.amount_paid,
         (fc.final_amount - fc.amount_paid) AS balance,
         fc.status
       FROM fee_cycles fc
       WHERE fc.student_id = $1
       ORDER BY fc.cycle_number ASC`,
      [id]
    );

    let totalOutstanding = 0;
    cyclesRes.rows.forEach(c => {
      totalOutstanding += parseFloat(c.balance);
    });

    // Fetch payments history for this student
    const paymentsRes = await pool.query(
      `SELECT 
         fp.id,
         fp.fee_cycle_id,
         fc.cycle_number,
         fp.amount,
         fp.payment_date,
         fp.payment_mode,
         fp.received_by,
         u.name AS received_by_name
       FROM fee_payments fp
       JOIN fee_cycles fc ON fp.fee_cycle_id = fc.id
       LEFT JOIN users u ON fp.received_by = u.id
       WHERE fc.student_id = $1
       ORDER BY fp.payment_date DESC, fp.id DESC`,
      [id]
    );

    res.json({
      total_outstanding: totalOutstanding,
      cycles: cyclesRes.rows,
      payments: paymentsRes.rows
    });
  } catch (err) {
    console.error('getStudentFeeCycles error:', err);
    res.status(500).json({ message: 'Error fetching student fee cycles', error: err.message });
  }
};

// POST /api/fee-cycles/:id/payments — record a payment against a specific cycle
const recordCyclePayment = async (req, res) => {
  const { id } = req.params; // fee_cycle_id
  const { amount, payment_date, payment_mode } = req.body;
  const user = req.user;

  if (user.role !== 'teacher' && user.role !== 'admin') {
    return res.status(403).json({ message: 'Only class teachers and admins can record payments' });
  }

  const payAmount = parseFloat(amount);
  if (isNaN(payAmount) || payAmount <= 0) {
    return res.status(400).json({ message: 'Payment amount must be greater than 0' });
  }

  const validModes = ['cash', 'online', 'other'];
  const mode = validModes.includes(payment_mode) ? payment_mode : 'cash';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Fetch fee_cycle record
    const cycleRes = await client.query(
      `SELECT fc.id, fc.student_id, fc.branch_id, fc.final_amount, fc.amount_paid, fc.due_date
       FROM fee_cycles fc
       WHERE fc.id = $1`,
      [id]
    );

    if (cycleRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Fee cycle record not found' });
    }

    const cycleRow = cycleRes.rows[0];

    // Role check for teacher
    if (user.role === 'teacher') {
      const branchCheck = await client.query('SELECT teacher_id FROM branches WHERE id = $1', [cycleRow.branch_id]);
      if (branchCheck.rows.length === 0 || branchCheck.rows[0].teacher_id !== user.id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ message: 'You can only record payments for students in your branch' });
      }
    }

    const currentPaid = parseFloat(cycleRow.amount_paid || 0);
    const finalAmount = parseFloat(cycleRow.final_amount);
    const remainingBalance = finalAmount - currentPaid;

    if (payAmount > remainingBalance + 0.01) { // 0.01 tolerance for floating precision
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        message: `Payment of ₹${payAmount} exceeds remaining balance of ₹${remainingBalance} for this cycle` 
      });
    }

    // Insert payment
    await client.query(
      `INSERT INTO fee_payments (fee_cycle_id, amount, payment_date, payment_mode, received_by)
       VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, $5)`,
      [cycleRow.id, payAmount, payment_date || null, mode, user.id]
    );

    // Update fee_cycles.amount_paid and status
    const sumRes = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_paid FROM fee_payments WHERE fee_cycle_id = $1`,
      [cycleRow.id]
    );

    const newTotalPaid = parseFloat(sumRes.rows[0].total_paid);
    const dueDate = new Date(cycleRow.due_date);
    const today = new Date();

    let newStatus = 'pending';
    if (newTotalPaid >= finalAmount) {
      newStatus = 'paid';
    } else if (newTotalPaid > 0) {
      newStatus = 'partial';
    } else if (dueDate < today) {
      newStatus = 'overdue';
    }

    await client.query(
      `UPDATE fee_cycles SET amount_paid = $1, status = $2 WHERE id = $3`,
      [newTotalPaid, newStatus, cycleRow.id]
    );

    await client.query('COMMIT');

    const updatedCycleRes = await client.query('SELECT * FROM fee_cycles WHERE id = $1', [cycleRow.id]);

    res.status(201).json({
      message: 'Cycle payment recorded successfully',
      amount_paid: newTotalPaid,
      balance: finalAmount - newTotalPaid,
      status: newStatus,
      cycle: updatedCycleRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('recordCyclePayment error:', err);
    res.status(500).json({ message: 'Error recording cycle payment', error: err.message });
  } finally {
    client.release();
  }
};

// GET /api/branches/:id/fee-cycles?status=overdue — list overdue cycles for a branch
const getBranchOverdueFeeCycles = async (req, res) => {
  const { id } = req.params; // branch_id
  const { status } = req.query;

  try {
    await generateMonthlyFeeCycles();

    let statusCondition = "fc.status = 'overdue'";
    if (status) {
      statusCondition = "fc.status = $2";
    }

    const params = [id];
    if (status) params.push(status);

    const query = `
      SELECT 
        fc.id AS fee_cycle_id,
        fc.cycle_number,
        fc.due_date,
        fc.final_amount,
        fc.amount_paid,
        (fc.final_amount - fc.amount_paid) AS balance,
        fc.status,
        s.id AS student_id,
        s.name AS student_name,
        s.phone AS student_phone
      FROM fee_cycles fc
      JOIN students s ON fc.student_id = s.id
      WHERE fc.branch_id = $1 AND ${statusCondition}
      ORDER BY fc.due_date ASC, s.name ASC
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('getBranchOverdueFeeCycles error:', err);
    res.status(500).json({ message: 'Error fetching branch fee cycles', error: err.message });
  }
};

// DELETE /api/payments/:id — void/delete a payment (Admin only)
const deletePayment = async (req, res) => {
  const { id } = req.params; // payment_id
  const user = req.user;

  if (user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can delete or void payment records' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const payRes = await client.query(
      'SELECT id, fee_cycle_id FROM fee_payments WHERE id = $1',
      [id]
    );

    if (payRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Payment record not found' });
    }

    const cycleId = payRes.rows[0].fee_cycle_id;

    // Delete payment row
    await client.query('DELETE FROM fee_payments WHERE id = $1', [id]);

    // Recompute total amount_paid for fee_cycle
    const sumRes = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_paid FROM fee_payments WHERE fee_cycle_id = $1`,
      [cycleId]
    );

    const newTotalPaid = parseFloat(sumRes.rows[0].total_paid);

    const cycleRes = await client.query('SELECT final_amount, due_date FROM fee_cycles WHERE id = $1', [cycleId]);
    const cycleRow = cycleRes.rows[0];
    const finalAmount = parseFloat(cycleRow.final_amount);
    const dueDate = new Date(cycleRow.due_date);
    const today = new Date();

    let newStatus = 'pending';
    if (newTotalPaid >= finalAmount) {
      newStatus = 'paid';
    } else if (newTotalPaid > 0) {
      newStatus = 'partial';
    } else if (dueDate < today) {
      newStatus = 'overdue';
    }

    await client.query(
      `UPDATE fee_cycles SET amount_paid = $1, status = $2 WHERE id = $3`,
      [newTotalPaid, newStatus, cycleId]
    );

    await client.query('COMMIT');

    res.json({ message: 'Payment deleted and cycle balance recomputed successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('deletePayment error:', err);
    res.status(500).json({ message: 'Error deleting payment', error: err.message });
  } finally {
    client.release();
  }
};

module.exports = {
  getStudentFeeCycles,
  recordCyclePayment,
  getBranchOverdueFeeCycles,
  deletePayment
};
