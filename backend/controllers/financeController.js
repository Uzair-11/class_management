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

// GET /api/branches/:id/expenses — list expenses for a branch
const getBranchExpenses = async (req, res) => {
  const { id } = req.params;
  const { from, to } = req.query;

  try {
    let query = `
      SELECT id, branch_id, date, expense_type, description, amount
      FROM expenses
      WHERE branch_id = $1
    `;
    const params = [id];

    if (from) {
      params.push(from);
      query += ` AND date >= $${params.length}`;
    }

    if (to) {
      params.push(to);
      query += ` AND date <= $${params.length}`;
    }

    query += ` ORDER BY date DESC, id DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('getBranchExpenses error:', err);
    res.status(500).json({ message: 'Error fetching expenses', error: err.message });
  }
};

// POST /api/branches/:id/expenses — add expense
const createBranchExpense = async (req, res) => {
  const { id } = req.params; // branch_id
  const { date, expense_type, description, amount } = req.body;
  const user = req.user;

  if (user.role !== 'teacher' && user.role !== 'supervisor' && user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized to add expenses' });
  }

  const allowedTypes = ['electricity', 'building_repair', 'cleaning', 'other', 'machine_repair', 'machine_maintenance', 'machine_replacement'];
  if (!date || !expense_type || !amount || !allowedTypes.includes(expense_type)) {
    return res.status(400).json({ message: 'date, valid expense_type, and amount are required' });
  }

  const targetBranchId = parseInt(id);

  // Validate teacher owns this branch
  if (user.role === 'teacher') {
    const branchRes = await pool.query('SELECT teacher_id FROM branches WHERE id = $1', [targetBranchId]);
    if (branchRes.rows.length === 0 || branchRes.rows[0].teacher_id !== user.id) {
      return res.status(403).json({ message: 'You can only log expenses for your assigned branch' });
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO expenses (branch_id, date, expense_type, description, amount)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [targetBranchId, date, expense_type, description || null, parseFloat(amount)]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createBranchExpense error:', err);
    res.status(500).json({ message: 'Error creating expense', error: err.message });
  }
};

// GET /api/branches/:id/salaries — list salary records for a branch
const getBranchSalaries = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        s.id, s.employee_id, u.name AS employee_name, u.role AS employee_role,
        s.branch_id, s.month, s.amount, s.payment_status, s.payment_date
      FROM salaries s
      JOIN users u ON s.employee_id = u.id
      WHERE s.branch_id = $1
      ORDER BY s.month DESC, s.id DESC
    `;

    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error('getBranchSalaries error:', err);
    res.status(500).json({ message: 'Error fetching salaries', error: err.message });
  }
};

// POST /api/branches/:id/salaries — add salary record (Supervisor / Admin)
const createBranchSalary = async (req, res) => {
  const { id } = req.params; // branch_id
  const { employee_id, month, amount, payment_status = 'pending' } = req.body;
  const user = req.user;

  if (user.role !== 'supervisor' && user.role !== 'admin') {
    return res.status(403).json({ message: 'Only supervisors and admins can manage salaries' });
  }

  if (!employee_id || !month || !amount) {
    return res.status(400).json({ message: 'employee_id, month, and amount are required' });
  }

  const targetBranchId = parseInt(id);

  try {
    const formattedMonth = month.length === 7 ? `${month}-01` : month;
    const result = await pool.query(
      `INSERT INTO salaries (employee_id, branch_id, month, amount, payment_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [employee_id, targetBranchId, formattedMonth, parseFloat(amount), payment_status]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createBranchSalary error:', err);
    res.status(500).json({ message: 'Error creating salary record', error: err.message });
  }
};

// PUT /api/salaries/:id — update payment_status to 'paid' and set payment_date
const updateSalaryStatus = async (req, res) => {
  const { id } = req.params;
  const { payment_status = 'paid', payment_date } = req.body;
  const user = req.user;

  if (user.role !== 'supervisor' && user.role !== 'admin') {
    return res.status(403).json({ message: 'Only supervisors and admins can update salary payment status' });
  }

  try {
    const payDate = payment_date || new Date().toISOString().split('T')[0];
    const result = await pool.query(
      `UPDATE salaries
       SET payment_status = $1,
           payment_date = $2
       WHERE id = $3
       RETURNING *`,
      [payment_status, payDate, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error updating salary status', error: err.message });
  }
};

// GET /api/branches/:id/transactions — list branch_transactions (JIH support received / surplus returned)
const getBranchTransactions = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, branch_id, type, amount, date, reason
       FROM branch_transactions
       WHERE branch_id = $1
       ORDER BY date DESC, id DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching branch transactions', error: err.message });
  }
};

// POST /api/branches/:id/transactions — add a transaction (Supervisor / Admin)
const createBranchTransaction = async (req, res) => {
  const { id } = req.params;
  const { type, amount, date, reason, transaction_type } = req.body;
  const user = req.user;

  const txType = type || transaction_type;

  if (user.role !== 'supervisor' && user.role !== 'admin') {
    return res.status(403).json({ message: 'Only supervisors and admins can log JIH support transactions' });
  }

  const targetBranchId = parseInt(id);

  if (user.role === 'supervisor') {
    const mapRes = await pool.query(
      'SELECT 1 FROM supervisor_branch_map WHERE user_id = $1 AND branch_id = $2',
      [user.id, targetBranchId]
    );
    if (mapRes.rows.length === 0) {
      return res.status(403).json({ message: 'You are not assigned to this branch' });
    }
  }

  const validTypes = ['received_from_jih', 'returned_to_jih'];
  if (!txType || !amount || !validTypes.includes(txType)) {
    return res.status(400).json({ message: 'Valid type and amount are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO branch_transactions (branch_id, type, amount, date, reason)
       VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5)
       RETURNING *`,
      [id, type, parseFloat(amount), date || null, reason || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error creating branch transaction', error: err.message });
  }
};

// GET /api/branches/:id/finance — query branch_finance_summary VIEW and calculate expected support/surplus
const getBranchFinanceSummary = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  if (user.role === 'teacher') {
    const branchCheck = await pool.query('SELECT teacher_id FROM branches WHERE id = $1', [id]);
    if (branchCheck.rows.length === 0 || branchCheck.rows[0].teacher_id !== user.id) {
      return res.status(403).json({ message: 'You can only view financial details for your assigned branch' });
    }
  }

  try {
    // Query View
    const viewRes = await pool.query(
      `SELECT branch_id, branch_name, total_income, total_expenses, balance
       FROM branch_finance_summary
       WHERE branch_id = $1`,
      [id]
    );

    let summary = viewRes.rows[0];

    if (!summary) {
      // Fallback if branch has no records yet
      const bRes = await pool.query('SELECT name FROM branches WHERE id = $1', [id]);
      summary = {
        branch_id: parseInt(id),
        branch_name: bRes.rows.length > 0 ? bRes.rows[0].name : 'Branch',
        total_income: 0,
        total_expenses: 0,
        balance: 0
      };
    }

    // Convert string numeric fields from Postgres
    const income = parseFloat(summary.total_income || 0);
    const expenses = parseFloat(summary.total_expenses || 0);
    const balance = parseFloat(summary.balance || 0);

    // Fetch transactions
    const txRes = await pool.query(
      `SELECT id, type, amount, date, reason FROM branch_transactions WHERE branch_id = $1 ORDER BY date DESC`,
      [id]
    );

    // Fetch potential salary recipients (teacher + assigned supervisors)
    const teacherRes = await pool.query(
      `SELECT u.id, u.name, u.role FROM branches b JOIN users u ON b.teacher_id = u.id WHERE b.id = $1`,
      [id]
    );

    const supervisorRes = await pool.query(
      `SELECT u.id, u.name, u.role FROM supervisor_branch_map sbm JOIN users u ON sbm.user_id = u.id WHERE sbm.branch_id = $1`,
      [id]
    );

    const eligibleEmployees = [...teacherRes.rows, ...supervisorRes.rows];

    res.json({
      summary: {
        branch_id: summary.branch_id,
        branch_name: summary.branch_name,
        total_income: income,
        total_expenses: expenses,
        balance,
        expected_support_or_surplus: balance < 0 ? Math.abs(balance) : balance
      },
      transactions: txRes.rows,
      eligible_employees: eligibleEmployees
    });
  } catch (err) {
    console.error('getBranchFinanceSummary error:', err);
    res.status(500).json({ message: 'Error fetching branch finance summary', error: err.message });
  }
};

module.exports = {
  getBranchExpenses,
  createBranchExpense,
  getBranchSalaries,
  createBranchSalary,
  updateSalaryStatus,
  getBranchTransactions,
  createBranchTransaction,
  getBranchFinanceSummary
};
