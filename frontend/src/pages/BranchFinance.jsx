import { buildApiUrl } from '../utils/apiConfig';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BranchFinance = () => {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [financeData, setFinanceData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Add Expense State
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expType, setExpType] = useState('electricity');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');

  // Add Salary State
  const [salEmpId, setSalEmpId] = useState('');
  const [salMonth, setSalMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [salAmount, setSalAmount] = useState('');

  // Add Transaction State
  const [txType, setTxType] = useState('received_from_jih');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txReason, setTxReason] = useState('');

  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const fetchFinanceSummary = async () => {
    try {
      const res = await fetch(buildApiUrl(`/api/branches/${id}/finance`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setFinanceData(data.summary);
        setTransactions(data.transactions || []);
        setEmployees(data.eligible_employees || []);
        if (data.eligible_employees && data.eligible_employees.length > 0) {
          setSalEmpId(data.eligible_employees[0].id.toString());
        }
      }
    } catch (err) {
      console.error(err);
      setError('Error fetching branch finance summary');
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await fetch(buildApiUrl(`/api/branches/${id}/expenses`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setExpenses(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSalaries = async () => {
    try {
      const res = await fetch(buildApiUrl(`/api/branches/${id}/salaries`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setSalaries(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFinanceSummary();
    fetchExpenses();
    fetchSalaries();
  }, [id, token]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    try {
      const res = await fetch(buildApiUrl(`/api/branches/${id}/expenses`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: expDate,
          expense_type: expType,
          description: expDesc,
          amount: parseFloat(expAmount)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add expense');

      setMsg('Expense entry added successfully');
      setExpDesc('');
      setExpAmount('');
      fetchFinanceSummary();
      fetchExpenses();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddSalary = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    try {
      const res = await fetch(buildApiUrl(`/api/branches/${id}/salaries`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          employee_id: parseInt(salEmpId),
          month: salMonth,
          amount: parseFloat(salAmount),
          payment_status: 'pending'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add salary entry');

      setMsg('Salary entry added successfully');
      setSalAmount('');
      fetchFinanceSummary();
      fetchSalaries();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMarkSalaryPaid = async (salaryId) => {
    setError('');
    setMsg('');

    try {
      const res = await fetch(buildApiUrl(`/api/salaries/${salaryId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ payment_status: 'paid' })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update salary status');

      setMsg('Salary marked as PAID');
      fetchSalaries();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    try {
      const res = await fetch(buildApiUrl(`/api/branches/${id}/transactions`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: txType,
          amount: parseFloat(txAmount),
          date: txDate,
          reason: txReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to log JIH transaction');

      setMsg('JIH Accounting transaction logged successfully');
      setTxAmount('');
      setTxReason('');
      fetchFinanceSummary();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!financeData && !error) return <div>Loading branch financial ledger...</div>;

  const bal = financeData ? parseFloat(financeData.balance) : 0;

  return (
    <div>
      <div className="header-row">
        <div>
          <h2>Branch Finance Dashboard: {financeData?.branch_name}</h2>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>
            Fee collection, operating expenses, staff payouts, and JIH support accounting ledger
          </p>
        </div>
        <button onClick={() => navigate(`/branches/${id}`)} className="btn">
          &larr; Back to Branch Details
        </button>
      </div>

      {msg && <div style={{ border: '1px solid #000', padding: '0.5rem', marginBottom: '1rem', background: '#f0f0f0' }}>{msg}</div>}
      {error && <div className="error-box">{error}</div>}

      {/* Financial Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ border: '1px solid #000', padding: '1rem' }}>
          <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#555', fontWeight: 'bold' }}>Total Income</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', marginTop: '0.25rem' }}>₹{financeData?.total_income || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.2rem' }}>Student Fees collected</div>
        </div>

        <div className="card" style={{ border: '1px solid #000', padding: '1rem' }}>
          <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#555', fontWeight: 'bold' }}>Total Expenses</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', marginTop: '0.25rem' }}>₹{financeData?.total_expenses || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.2rem' }}>Operating, Machine & Repair</div>
        </div>

        <div className="card" style={{ border: '2px solid #000', padding: '1rem', background: '#f8f8f8' }}>
          <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#000', fontWeight: 'bold' }}>Branch Balance</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
            ₹{bal}
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginTop: '0.2rem' }}>
            {bal < 0 ? `(Shortfall JIH Cover: ₹${Math.abs(bal)})` : `(Surplus Available: ₹${bal})`}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Expenses Section */}
        <div>
          {/* Add Expense Form */}
          {(user?.role === 'teacher' || user?.role === 'supervisor' || user?.role === 'admin') && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3>Add Branch Expense</h3>
              <form onSubmit={handleAddExpense} style={{ marginTop: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Expense Type *</label>
                    <select
                      className="form-select"
                      value={expType}
                      onChange={(e) => setExpType(e.target.value)}
                    >
                      <option value="electricity">Electricity</option>
                      <option value="building_repair">Building Repair</option>
                      <option value="cleaning">Cleaning / Sanitation</option>
                      <option value="other">Other Operating</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      className="form-input"
                      value={expDesc}
                      onChange={(e) => setExpDesc(e.target.value)}
                      placeholder="e.g. Monthly power bill"
                    />
                  </div>

                  <div className="form-group">
                    <label>Amount (₹) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      min="1"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-black" style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>
                  Submit Expense Entry
                </button>
              </form>
            </div>
          )}

          {/* Expenses Log Table */}
          <div className="card">
            <h3>Operating Expenses Log</h3>
            <div className="table-responsive" style={{ marginTop: '1rem', maxHeight: '250px', overflowY: 'auto' }}>
              <table className="plain-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center' }}>No expenses recorded yet</td>
                    </tr>
                  ) : (
                    expenses.map(e => (
                      <tr key={`exp-${e.id}`}>
                        <td>{new Date(e.date).toLocaleDateString()}</td>
                        <td style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{e.expense_type?.replace(/_/g, ' ')}</td>
                        <td>{e.description || '-'}</td>
                        <td><strong>₹{e.amount}</strong></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Salaries & JIH Transactions Column */}
        <div>
          {/* Salaries Section */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3>Staff Salary Payouts</h3>
            
            {(user?.role === 'supervisor' || user?.role === 'admin') && (
              <form onSubmit={handleAddSalary} style={{ marginTop: '1rem', marginBottom: '1rem', borderBottom: '1px solid #000', paddingBottom: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Employee *</label>
                    <select
                      className="form-select"
                      value={salEmpId}
                      onChange={(e) => setSalEmpId(e.target.value)}
                      required
                    >
                      {employees.length > 0 ? (
                        employees.map(emp => (
                          <option key={`se-${emp.id}`} value={emp.id}>{emp.name} ({emp.role})</option>
                        ))
                      ) : (
                        <option value="">No assigned staff</option>
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Month *</label>
                    <input
                      type="month"
                      className="form-input"
                      value={salMonth}
                      onChange={(e) => setSalMonth(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Amount (₹) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={salAmount}
                      onChange={(e) => setSalAmount(e.target.value)}
                      min="1"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-black btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                  Record Salary Entry
                </button>
              </form>
            )}

            <div className="table-responsive" style={{ maxHeight: '180px', overflowY: 'auto' }}>
              <table className="plain-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Month</th>
                    <th>Amount</th>
                    <th>Status</th>
                    {(user?.role === 'supervisor' || user?.role === 'admin') && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {salaries.length === 0 ? (
                    <tr>
                      <td colSpan={user?.role === 'supervisor' || user?.role === 'admin' ? "5" : "4"} style={{ textAlign: 'center' }}>
                        No salary records logged
                      </td>
                    </tr>
                  ) : (
                    salaries.map(s => (
                      <tr key={`sal-${s.id}`}>
                        <td><strong>{s.employee_name}</strong></td>
                        <td>{s.month}</td>
                        <td>₹{s.amount}</td>
                        <td style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{s.payment_status}</td>
                        {(user?.role === 'supervisor' || user?.role === 'admin') && (
                          <td>
                            {s.payment_status === 'pending' ? (
                              <button onClick={() => handleMarkSalaryPaid(s.id)} className="btn btn-sm">
                                Mark Paid
                              </button>
                            ) : (
                              <span>Paid ({s.payment_date ? new Date(s.payment_date).toLocaleDateString() : '-'})</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* JIH Accounting Transactions */}
          <div className="card">
            <h3>JIH Support & Surplus Ledger</h3>
            <div style={{ border: '1px solid #000', padding: '0.5rem', background: '#f0f0f0', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              📌 ACCOUNTING NOTICE: These entries are for accounting purposes only. No actual funds are transferred within this system.
            </div>

            {(user?.role === 'supervisor' || user?.role === 'admin') && (
              <form onSubmit={handleAddTransaction} style={{ marginBottom: '1rem', borderBottom: '1px solid #000', paddingBottom: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Transaction Type *</label>
                    <select
                      className="form-select"
                      value={txType}
                      onChange={(e) => setTxType(e.target.value)}
                    >
                      <option value="received_from_jih">Received from JIH</option>
                      <option value="returned_to_jih">Returned to JIH</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Amount (₹) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      min="1"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Reason / Reference</label>
                  <input
                    type="text"
                    className="form-input"
                    value={txReason}
                    onChange={(e) => setTxReason(e.target.value)}
                    placeholder="e.g. Monthly operational support grant"
                  />
                </div>

                <button type="submit" className="btn btn-black btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                  Log JIH Transaction Entry
                </button>
              </form>
            )}

            <div className="table-responsive" style={{ maxHeight: '180px', overflowY: 'auto' }}>
              <table className="plain-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center' }}>No JIH transactions logged</td>
                    </tr>
                  ) : (
                    transactions.map(t => (
                      <tr key={`tx-${t.id}`}>
                        <td>{new Date(t.date).toLocaleDateString()}</td>
                        <td style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                          {t.type === 'received_from_jih' ? '+ Received' : '- Returned'}
                        </td>
                        <td><strong>₹{t.amount}</strong></td>
                        <td>{t.reason || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchFinance;
