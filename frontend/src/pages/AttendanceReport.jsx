import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

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

  const fetchBranches = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/branches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setBranches(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setError('');

    try {
      let url = `http://localhost:5000/api/reports/attendance?from=${fromDate}&to=${toDate}`;
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
      setError('Error fetching report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [token]);

  useEffect(() => {
    fetchReport();
  }, [token, selectedBranchId, fromDate, toDate]);

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
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>To Date</label>
            <input
              type="date"
              className="form-input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          {user?.role !== 'teacher' && (
            <div className="form-group" style={{ margin: 0 }}>
              <label>Filter by Branch</label>
              <select
                className="form-select"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
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

      {error && <div className="error-box">{error}</div>}

      {/* Report Table */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>🔄 Generating Attendance Report...</div>
          </div>
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
                {sortedStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                      No attendance records found for the selected date range and branch filter.
                    </td>
                  </tr>
                ) : (
                  sortedStudents.map(st => {
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
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceReport;
