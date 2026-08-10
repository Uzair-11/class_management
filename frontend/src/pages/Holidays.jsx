import { buildApiUrl } from '../utils/apiConfig';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SkeletonLoader from '../components/common/SkeletonLoader';
import LoadingButton from '../components/common/LoadingButton';
import EmptyState from '../components/common/EmptyState';
import ErrorState, { InlineError } from '../components/common/ErrorState';
import ConfirmModal from '../components/common/ConfirmModal';

const Holidays = () => {
  const { token, user } = useAuth();
  const { showSuccess } = useToast();

  const [holidays, setHolidays] = useState([]);
  const [branches, setBranches] = useState([]);

  // Filters
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('upcoming'); // 'all', 'upcoming', 'past'

  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [targetBranchId, setTargetBranchId] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Delete Confirm Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteHolidayId, setDeleteHolidayId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let url = buildApiUrl('/api/holidays');
      if (selectedBranchFilter) {
        url += `?branch_id=${selectedBranchFilter}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok) setHolidays(data);
        else setError(data.message || 'Failed to fetch holidays list');
      } else {
        setError('Unexpected server response');
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [token, selectedBranchFilter]);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl('/api/branches'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    fetchHolidays();
    fetchBranches();
  }, [fetchHolidays, fetchBranches]);

  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(buildApiUrl('/api/holidays'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date,
          reason,
          branch_id: targetBranchId === '' ? null : targetBranchId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to declare holiday');

      showSuccess('✓ Holiday declared successfully!');
      setShowAddModal(false);
      setDate('');
      setReason('');
      setTargetBranchId('');
      fetchHolidays();
    } catch (err) {
      setError(err.message || 'Failed to declare holiday');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteHoliday = (id) => {
    setDeleteHolidayId(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteHoliday = async () => {
    if (!deleteHolidayId) return;
    setError('');
    setDeleting(true);

    try {
      const res = await fetch(buildApiUrl(`/api/holidays/${deleteHolidayId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete holiday');

      showSuccess('✓ Holiday record removed successfully');
      setDeleteModalOpen(false);
      setDeleteHolidayId(null);
      fetchHolidays();
    } catch (err) {
      setError(err.message || 'Failed to delete holiday');
    } finally {
      setDeleting(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredHolidays = holidays.filter(h => {
    const holidayDateStr = h.date ? h.date.split('T')[0] : '';
    if (timeFilter === 'upcoming') {
      return holidayDateStr >= todayStr;
    } else if (timeFilter === 'past') {
      return holidayDateStr < todayStr;
    }
    return true; // 'all'
  });

  return (
    <div>
      <div className="header-row">
        <div>
          <h2>Holiday Management</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Declare global or branch-specific holidays and scheduled closures
          </p>
        </div>

        {(user?.role === 'admin' || user?.role === 'supervisor') && (
          <button onClick={() => setShowAddModal(!showAddModal)} className="btn btn-black">
            {showAddModal ? 'Cancel' : '+ Add Holiday'}
          </button>
        )}
      </div>

      {error && !loading && (
        <ErrorState
          error={error}
          title="Holidays Couldn't Be Loaded"
          onRetry={fetchHolidays}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Remove Holiday Declaration"
        message="Are you sure you want to remove this holiday entry? Classes will be re-enabled for attendance marking on this date."
        warningText="This action will delete the scheduled closure."
        confirmText="Remove Holiday"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDeleteHoliday}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeleteHolidayId(null);
        }}
      />

      {/* Add Holiday Card */}
      {showAddModal && (
        <div className="card" style={{ marginBottom: '1.5rem', borderTop: '4px solid var(--color-primary)' }}>
          <h3>Declare New Holiday</h3>
          {error && <InlineError message={error} onDismiss={() => setError('')} />}

          <form onSubmit={handleCreateHoliday} style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label>Holiday Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label>Target Branch *</label>
                <select
                  className="form-select"
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(e.target.value)}
                  disabled={submitting}
                >
                  {user?.role === 'admin' && (
                    <option value="">🌐 All Branches (Global Holiday)</option>
                  )}
                  {branches.map(b => (
                    <option key={`hb-${b.id}`} value={b.id}>🏢 {b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Reason / Title *</label>
              <input
                type="text"
                className="form-input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Eid-ul-Fitr / Maintenance Work"
                required
                disabled={submitting}
              />
            </div>

            <LoadingButton
              type="submit"
              variant="black"
              loading={submitting}
              loadingText="Declaring Holiday... ⟳"
              style={{ marginTop: '0.5rem' }}
            >
              Declare Holiday
            </LoadingButton>
          </form>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Time Range:</label>
            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              disabled={loading}
            >
              <option value="upcoming">Upcoming Holidays</option>
              <option value="past">Past Holidays</option>
              <option value="all">All Dates</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Filter by Branch:</label>
            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              disabled={loading}
            >
              <option value="">-- All Branches & Global --</option>
              {branches.map(b => (
                <option key={`hbf-${b.id}`} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Holidays List Table / Skeleton / Empty State */}
      <div className="card">
        {loading ? (
          <SkeletonLoader type="table" rows={4} columns={4} />
        ) : filteredHolidays.length === 0 ? (
          <EmptyState
            type={selectedBranchFilter || timeFilter !== 'all' ? 'no-results' : 'no-data'}
            title="No Holidays Found"
            message={selectedBranchFilter || timeFilter !== 'all' ? "No holiday records match your current filter selection." : "No holidays or closures have been declared yet."}
            actionText="Reset Filters"
            onAction={() => {
              setSelectedBranchFilter('');
              setTimeFilter('all');
            }}
          />
        ) : (
          <div className="table-responsive">
            <table className="plain-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Branch / Scope</th>
                  {(user?.role === 'admin' || user?.role === 'supervisor') && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {filteredHolidays.map(h => (
                  <tr key={`hol-${h.id}`}>
                    <td><strong>{new Date(h.date).toLocaleDateString()}</strong></td>
                    <td>{h.reason}</td>
                    <td>
                      {h.branch_id === null ? (
                        <span className="badge-outline" style={{ background: 'var(--color-primary-light)', fontWeight: 'bold' }}>
                          All Branches (Global)
                        </span>
                      ) : (
                        <span>{h.branch_name || `Branch #${h.branch_id}`}</span>
                      )}
                    </td>
                    {(user?.role === 'admin' || user?.role === 'supervisor') && (
                      <td>
                        <button onClick={() => confirmDeleteHoliday(h.id)} className="btn btn-sm btn-danger">
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Holidays;
