import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/apiClient';

const Dashboard = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOverview = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiFetch('/api/reports/overview');
        const data = await res.json();
        if (res.ok) {
          setOverview(data);
        } else {
          setError(data.message || 'Failed to load dashboard overview');
        }
      } catch (err) {
        setError('Error connecting to backend server');
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [token]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
          🔄 Loading Dashboard Overview...
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
          Fetching real-time branch analytics, attendance scores, and financial statistics
        </p>
      </div>
    );
  }

  if (error) {
    return <div className="error-box">{error}</div>;
  }

  const role = user?.role;
  const isMultiBranch = role === 'admin' || role === 'supervisor' || role === 'amir';

  return (
    <div>
      <div className="header-row">
        <div>
          <h2>Executive Dashboard</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>
            Welcome back, <strong>{user?.name}</strong> [{role?.toUpperCase()}] &bull; Jamaat-e-Islami Hind Management Portal
          </p>
        </div>
      </div>

      {/* Role: Teacher Landing View */}
      {role === 'teacher' && overview?.branches.length > 0 && (
        <div>
          {overview.branches.map(b => (
            <div key={`tdb-${b.branch_id}`}>
              {/* Quick Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
                  <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>My Branch</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold', marginTop: '0.2rem' }}>{b.branch_name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Teacher: {b.teacher_name}</div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
                  <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>Active Students</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.2rem' }}>{b.student_count}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Currently enrolled</div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid var(--color-primary-dark)' }}>
                  <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>30-Day Attendance</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.2rem' }}>{b.attendance_percentage}%</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Average student score</div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
                  <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>Machine Attention</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.2rem' }}>
                    {(b.machine_counts.needs_maintenance || 0) + (b.machine_counts.under_repair || 0)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Needs maintenance or repair</div>
                </div>
              </div>

              {/* Quick Action Navigation Grid */}
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3>Quick Management Actions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  <Link to="/attendance" className="btn btn-black btn-mobile-full" style={{ height: 'auto', minHeight: '60px', flexDirection: 'column' }}>
                    <span>📋 Mark Attendance</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.8 }}>Daily class sheet</span>
                  </Link>

                  <Link to="/students" className="btn btn-mobile-full" style={{ height: 'auto', minHeight: '60px', flexDirection: 'column' }}>
                    <span>👩‍🎓 Manage Students</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-text-secondary)' }}>Directory & payments</span>
                  </Link>

                  <Link to="/machines" className="btn btn-mobile-full" style={{ height: 'auto', minHeight: '60px', flexDirection: 'column' }}>
                    <span>🧵 Machine Inventory</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-text-secondary)' }}>Log repairs & status</span>
                  </Link>

                  <Link to={`/branches/${b.branch_id}/finance`} className="btn btn-mobile-full" style={{ height: 'auto', minHeight: '60px', flexDirection: 'column' }}>
                    <span>📊 Branch Finance</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-text-secondary)' }}>Expenses & ledger</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role: Multi-Branch Overview (Admin / Supervisor / Amir) */}
      {isMultiBranch && overview && (
        <div>
          {/* Organization Wide Summary Top Cards (Admin only or multi-branch totals) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ borderTop: '4px solid var(--color-primary)' }}>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>Accessible Branches</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.2rem' }}>{overview.overall.total_branches}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Branches under jurisdiction</div>
            </div>

            <div className="card" style={{ borderTop: '4px solid var(--color-success)' }}>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>Total Active Students</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.2rem' }}>{overview.overall.total_students}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Enrolled across branches</div>
            </div>

            <div className="card" style={{ borderTop: '4px solid var(--color-primary-dark)' }}>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>Avg Attendance (30d)</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.2rem' }}>{overview.overall.avg_attendance_percentage}%</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Organization average</div>
            </div>

            <div className="card" style={{ borderTop: `4px solid ${overview.overall.total_organization_balance < 0 ? 'var(--color-danger)' : 'var(--color-success)'}` }}>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>Net Organization Balance</div>
              <div className={`badge-outline ${overview.overall.total_organization_balance < 0 ? 'status-critical' : 'status-good'}`} style={{ fontSize: '1.4rem', marginTop: '0.4rem' }}>
                {overview.overall.total_organization_balance < 0 ? `-₹${Math.abs(overview.overall.total_organization_balance)} (Shortfall)` : `+₹${overview.overall.total_organization_balance} (Surplus)`}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '0.3rem' }}>Combined organization ledger</div>
            </div>
          </div>

          {/* Multi-Branch Side-by-Side Table */}
          <div className="card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
              <h3>Branch Performance Oversight</h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link to="/reports/attendance" className="btn btn-sm btn-mobile-full">
                  📊 Attendance Report
                </Link>
                <Link to="/reports/fees" className="btn btn-sm btn-mobile-full">
                  💰 Fee Collection Report
                </Link>
              </div>
            </div>

            <div className="table-responsive">
              <table className="plain-table">
                <thead>
                  <tr>
                    <th>Branch Name</th>
                    <th>Teacher In-Charge</th>
                    <th>Students</th>
                    <th>Attendance (30d)</th>
                    <th>Balance Ledger</th>
                    <th>Machine Issues</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.branches.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center' }}>No assigned branches found</td>
                    </tr>
                  ) : (
                    overview.branches.map(b => {
                      const mIssues = (b.machine_counts.needs_maintenance || 0) + (b.machine_counts.under_repair || 0);
                      const attClass = b.attendance_percentage < 50 ? 'status-critical' : b.attendance_percentage < 80 ? 'status-warning' : 'status-good';
                      return (
                        <tr key={`bor-${b.branch_id}`}>
                          <td><strong>{b.branch_name}</strong></td>
                          <td>{b.teacher_name}</td>
                          <td><strong>{b.student_count}</strong> active</td>
                          <td>
                            <span className={`badge-outline ${attClass}`}>
                              {b.attendance_percentage}%
                            </span>
                          </td>
                          <td>
                            {b.balance < 0 ? (
                              <span className="badge-outline status-critical">
                                Shortfall: -₹{Math.abs(b.balance)}
                              </span>
                            ) : (
                              <span className="badge-outline status-good">
                                Surplus: ₹{b.balance}
                              </span>
                            )}
                          </td>
                          <td>
                            {mIssues > 0 ? (
                              <span className="badge-outline status-warning">
                                ⚠️ {mIssues} Issue{mIssues > 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="badge-outline status-good">
                                ✓ All Working
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <Link to={`/branches/${b.branch_id}`} className="btn btn-sm">
                                Details
                              </Link>
                              <Link to={`/branches/${b.branch_id}/finance`} className="btn btn-sm btn-black">
                                Finance
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
