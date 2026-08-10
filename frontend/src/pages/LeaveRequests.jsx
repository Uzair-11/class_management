import { buildApiUrl } from '../utils/apiConfig';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SkeletonLoader from '../components/common/SkeletonLoader';
import LoadingButton from '../components/common/LoadingButton';
import EmptyState from '../components/common/EmptyState';
import ErrorState, { InlineError } from '../components/common/ErrorState';

const LeaveRequests = () => {
  const { token, user } = useAuth();
  const { showSuccess } = useToast();

  const [requests, setRequests] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [error, setError] = useState('');

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl('/api/branches'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setBranches(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  const fetchLeaveRequests = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let url = buildApiUrl('/api/leave-requests?');
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
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [token, selectedBranchFilter, selectedStatusFilter]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    fetchLeaveRequests();
  }, [fetchLeaveRequests]);

  const handleApprove = async (id) => {
    setError('');
    setReviewingId(id);
    try {
      const res = await fetch(buildApiUrl(`/api/leave-requests/${id}/approve`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to approve leave request');

      showSuccess('✓ Leave request approved successfully');
      fetchLeaveRequests();
    } catch (err) {
      setError(err.message || 'Failed to approve leave request');
    } finally {
      setReviewingId(null);
    }
  };

  const handleReject = async (id) => {
    setError('');
    setReviewingId(id);
    try {
      const res = await fetch(buildApiUrl(`/api/leave-requests/${id}/reject`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reject leave request');

      showSuccess('✓ Leave request rejected');
      fetchLeaveRequests();
    } catch (err) {
      setError(err.message || 'Failed to reject leave request');
    } finally {
      setReviewingId(null);
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

      {error && !loading && (
        <ErrorState
          error={error}
          title="Leave Requests Unavailable"
          onRetry={fetchLeaveRequests}
        />
      )}

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
                disabled={loading}
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
              disabled={loading}
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
          <SkeletonLoader type="table" rows={5} columns={8} />
        ) : requests.length === 0 ? (
          selectedBranchFilter || selectedStatusFilter ? (
            <EmptyState
              type="no-results"
              title="No Matching Leave Applications"
              message="No leave requests match the selected branch location or status filter."
              actionText="Clear Filters"
              onAction={() => {
                setSelectedBranchFilter('');
                setSelectedStatusFilter('');
              }}
            />
          ) : (
            <EmptyState
              type="no-data"
              title="No Leave Applications Submitted"
              message="There are currently no student leave applications recorded in the system."
            />
          )
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
                {requests.map(lr => {
                  const stClass = lr.status === 'approved' ? 'status-good' : lr.status === 'rejected' ? 'status-critical' : 'status-warning';
                  const isReviewing = reviewingId === lr.id;
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
                              <LoadingButton
                                variant="sm"
                                loading={isReviewing}
                                loadingText="... ⟳"
                                onClick={() => handleApprove(lr.id)}
                              >
                                Approve
                              </LoadingButton>
                              <LoadingButton
                                variant="danger"
                                className="btn-sm"
                                loading={isReviewing}
                                loadingText="... ⟳"
                                onClick={() => handleReject(lr.id)}
                              >
                                Reject
                              </LoadingButton>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Reviewed</span>
                          )}
                        </td>
                      )}
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

export default LeaveRequests;
