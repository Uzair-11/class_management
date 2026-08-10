import { buildApiUrl } from '../utils/apiConfig';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import SkeletonLoader from '../components/common/SkeletonLoader';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

const AttendanceReport = () => {
  const { token, user } = useAuth();

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [fromDate, setFromDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState('attendance_percentage');
  const [sortOrder, setSortOrder] = useState('desc');

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

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let url = buildApiUrl(`/api/reports/attendance?from=${fromDate}&to=${toDate}`);
      if (selectedBranchId) url += `&branch_id=${selectedBranchId}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setStudents(data.students || []);
      } else {
        setError(data.message || 'Failed to load attendance report');
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, selectedBranchId, token]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedStudents = [...students].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (valA === null || valA === undefined) valA = 0;
    if (valB === null || valB === undefined) valB = 0;

    if (typeof valA === 'string') {
      return sortOrder === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    return sortOrder === 'asc' ? parseFloat(valA) - parseFloat(valB) : parseFloat(valB) - parseFloat(valA);
  });

  return (
    <div>
      <div className="header-row">
        <div>
          <h2>Student Attendance Performance Report</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>
            Attendance percentages and present/absent tallies over custom date ranges
          </p>
        </div>
      </div>

      {error && !loading && (
        <ErrorState
          error={error}
          title="Attendance Report Unavailable"
          onRetry={fetchReport}
        />
      )}

      {/* Date Range & Branch Filters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>From Date</label>
            <input
              type="date"
              className="form-input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>To Date</label>
            <input
              type="date"
              className="form-input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              disabled={loading}
            />
          </div>

          {user?.role !== 'teacher' && (
            <div className="form-group" style={{ margin: 0 }}>
              <label>Filter by Branch</label>
              <select
                className="form-select"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={loading}
              >
                <option value="">-- All Accessible Branches --</option>
                {branches.map(b => (
                  <option key={`arb-${b.id}`} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Report Table / Skeleton / Empty State */}
      <div className="card">
        {loading ? (
          <SkeletonLoader type="table" rows={6} columns={7} />
        ) : sortedStudents.length === 0 ? (
          <EmptyState
            type="no-data"
            title="No Attendance Data Found"
            message="No attendance sessions were recorded for the selected date range and branch filter."
          />
        ) : (
          <div className="table-responsive">
            <table className="plain-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('student_name')} style={{ cursor: 'pointer' }}>
                    Student Name {sortField === 'student_name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('branch_name')} style={{ cursor: 'pointer' }}>
                    Branch {sortField === 'branch_name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>Course</th>
                  <th onClick={() => handleSort('present_days')} style={{ cursor: 'pointer' }}>
                    Present Days {sortField === 'present_days' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('absent_days')} style={{ cursor: 'pointer' }}>
                    Absent Days {sortField === 'absent_days' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('total_days')} style={{ cursor: 'pointer' }}>
                    Total Classes {sortField === 'total_days' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('attendance_percentage')} style={{ cursor: 'pointer' }}>
                    Attendance Score {sortField === 'attendance_percentage' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map(st => {
                  const score = st.attendance_percentage !== null ? parseFloat(st.attendance_percentage) : 0;
                  return (
                    <tr key={`arst-${st.student_id}`}>
                      <td><strong>{st.student_name}</strong></td>
                      <td>{st.branch_name}</td>
                      <td>{st.course_name}</td>
                      <td><strong style={{ color: 'var(--color-success)' }}>{st.present_days}</strong></td>
                      <td><strong style={{ color: 'var(--color-danger)' }}>{st.absent_days}</strong></td>
                      <td>{st.total_days}</td>
                      <td>
                        <span className={`badge-outline ${score >= 75 ? 'badge-success' : 'badge-warning'}`}>
                          {st.attendance_percentage !== null ? `${st.attendance_percentage}%` : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceReport;
