import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const LeaveRequests = () => {
  const { token, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const fetchBranches = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/branches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setBranches(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeaveRequests = async () => {
    setLoading(true);
    setError('');

    try {
      let url = 'http://localhost:5000/api/leave-requests?';
      if (selectedBranchFilter) url += `&branch_id=${selectedBranchFilter}`;
      if (selectedStatusFilter) url += `&status=${selectedStatusFilter}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRequests(data);
      } else {
        setError(data.message || 'Failed to fetch leave requests');
      }
    } catch (err) {
      setError('Error connecting to leave requests service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [token]);

  useEffect(() => {
    fetchLeaveRequests();
  }, [token, selectedBranchFilter, selectedStatusFilter]);

  const handleApprove = async (id) => {
    setError('');
    setMsg('');
    try {
      const res = await fetch(`http://localhost:5000/api/leave-requests/${id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to approve leave request');

      setMsg(data.message);
      fetchLeaveRequests();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReject = async (id) => {
    setError('');
    setMsg('');
    try {
      const res = await fetch(`http://localhost:5000/api/leave-requests/${id}/reject`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reject leave request');

      setMsg(data.message);
      fetchLeaveRequests();
    } catch (err) {
      setError(err.message);
    }
  };

  const canReview = user?.role === 'teacher' || user?.role === 'supervisor' || user?.role === 'admin';

  return (
    <div>
      <div className="header-row">
        <div>
          <h2>Student Leave Applications</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Review, approve, and reject student leave requests across branches
          </p>
        </div>
      </div>

      {msg && <div style={{ border: '1px solid var(--color-primary)', padding: '0.5rem', marginBottom: '1rem', background: 'var(--color-primary-light)' }}>{msg}</div>}
      {error && <div className="error-box">{error}</div>}

      {/* Filter Row */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {user?.role !== 'teacher' && (
            <div className="form-group" style={{ margin: 0 }}>
              <label>Filter by Branch Location</label>
              <select
                className="form-select"
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
              >
                <option value="">-- All Accessible Branches --</option>
                {branches.map(b => (
                  <option key={`lrb-${b.id}`} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label>Filter by Application Status</label>
            <select
              className="form-select"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
            >
              <option value="">-- All Statuses --</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leave Applications Table */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>🔄 Loading Leave Applications...</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="plain-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Branch</th>
                  <th>Date Range</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                  <th>Reviewed By</th>
                  {canReview && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={canReview ? "8" : "7"} style={{ textAlign: 'center', padding: '2rem' }}>
                      No leave applications found
                    </td>
                  </tr>
                ) : (
                  requests.map(lr => {
                    const stClass = lr.status === 'approved' ? 'status-good' : lr.status === 'rejected' ? 'status-critical' : 'status-warning';
                    return (
                      <tr key={`lr-${lr.id}`}>
                        <td><strong>{lr.student_name}</strong></td>
                        <td>{lr.branch_name}</td>
                        <td>{new Date(lr.date_from).toLocaleDateString()} - {new Date(lr.date_to).toLocaleDateString()}</td>
                        <td>{lr.reason}</td>
                        <td>
                          <span className={`badge-outline ${stClass}`}>
                            {lr.status}
                          </span>
                        </td>
                        <td>{new Date(lr.requested_at).toLocaleDateString()}</td>
                        <td>{lr.reviewed_by_name || '-'}</td>
                        {canReview && (
                          <td>
                            {lr.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button onClick={() => handleApprove(lr.id)} className="btn btn-sm status-good">
                                  Approve
                                </button>
                                <button onClick={() => handleReject(lr.id)} className="btn btn-sm status-critical">
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Reviewed</span>
                            )}
                          </td>
                        )}
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

export default LeaveRequests;
