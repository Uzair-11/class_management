import { buildApiUrl } from '../utils/apiConfig';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import SkeletonLoader from '../components/common/SkeletonLoader';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

const FeesReport = () => {
  const { token, user } = useAuth();

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl('/api/branches'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setBranches(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  const fetchFeesReport = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let url = buildApiUrl('/api/reports/fees');
      if (selectedBranchId) url += `?branch_id=${selectedBranchId}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setReportData(data);
      } else {
        setError(data.message || 'Failed to load fee collection report');
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, token]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    fetchFeesReport();
  }, [fetchFeesReport]);

  return (
    <div>
      <div className="header-row">
        <div>
          <h2>Fee Collection & Balance Report</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>
            Course-wise breakdown of total fees, collections, and outstanding student balances
          </p>
        </div>
      </div>

      {error && !loading && (
        <ErrorState
          error={error}
          title="Fee Collection Report Unavailable"
          onRetry={fetchFeesReport}
        />
      )}

      {/* Branch Filter */}
      {user?.role !== 'teacher' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ fontWeight: '600', fontSize: '0.88rem' }}>Filter by Branch Location:</label>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '240px' }}
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              disabled={loading}
            >
              <option value="">-- All Accessible Branches --</option>
              {branches.map(b => (
                <option key={`frb-${b.id}`} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div>
          <SkeletonLoader type="dashboard" rows={3} style={{ marginBottom: '1.5rem' }} />
          <SkeletonLoader type="table" rows={4} columns={5} />
        </div>
      ) : reportData && (
        <div>
          {/* Top Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ borderTop: '4px solid var(--color-primary)' }}>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>Total Payable Fee</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.2rem' }}>₹{reportData.summary.total_final_fee}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Net expected student fees</div>
            </div>

            <div className="card" style={{ borderTop: '4px solid var(--color-success)' }}>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>Total Collected</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.2rem', color: 'var(--color-success)' }}>₹{reportData.summary.total_amount_paid}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Payments received to date</div>
            </div>

            <div className="card" style={{ borderTop: '4px solid var(--color-danger)' }}>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>Total Outstanding Balance</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.2rem', color: 'var(--color-danger)' }}>₹{reportData.summary.total_balance}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Pending student dues</div>
            </div>
          </div>

          {/* Course Breakdown Table */}
          <div className="card">
            <h3>Course-wise Fee Ledger</h3>
            {reportData.courses.length === 0 ? (
              <EmptyState
                type="no-data"
                title="No Fee Records Available"
                message="No student enrollments or fee transactions exist for this branch filter."
              />
            ) : (
              <div className="table-responsive" style={{ marginTop: '1rem' }}>
                <table className="plain-table">
                  <thead>
                    <tr>
                      <th>Course Name</th>
                      <th>Enrolled Active Students</th>
                      <th>Total Payable Fees</th>
                      <th>Total Amount Collected</th>
                      <th>Outstanding Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.courses.map(c => (
                      <tr key={`frc-${c.course_id}`}>
                        <td><strong>{c.course_name}</strong></td>
                        <td><strong>{c.student_count}</strong> students</td>
                        <td>₹{c.total_final_fee}</td>
                        <td style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>₹{c.total_amount_paid}</td>
                        <td style={{ color: parseFloat(c.total_balance) > 0 ? 'var(--color-danger)' : 'inherit', fontWeight: 'bold' }}>
                          ₹{c.total_balance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeesReport;
