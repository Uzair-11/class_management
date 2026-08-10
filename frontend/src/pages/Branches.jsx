import { buildApiUrl } from '../utils/apiConfig';
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SkeletonLoader from '../components/common/SkeletonLoader';
import LoadingButton from '../components/common/LoadingButton';
import EmptyState from '../components/common/EmptyState';
import ErrorState, { InlineError } from '../components/common/ErrorState';

const Branches = () => {
  const { token } = useAuth();
  const { showSuccess } = useToast();

  const [branches, setBranches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [classStartTime, setClassStartTime] = useState('15:00');
  const [classEndTime, setClassEndTime] = useState('17:00');

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(buildApiUrl('/api/branches'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok) setBranches(data);
        else setError(data.message || 'Failed to fetch branches');
      } else {
        setError(`Server returned ${res.status}: ${res.statusText}. Please verify backend configuration.`);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl('/api/users?role=teacher'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setTeachers(data);
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    fetchBranches();
    fetchTeachers();
  }, [fetchBranches, fetchTeachers]);

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(buildApiUrl('/api/branches'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          address,
          teacher_id: teacherId || null,
          class_start_time: classStartTime,
          class_end_time: classEndTime
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create branch');

      showSuccess(`✓ Branch "${name}" created successfully!`);
      setShowAddModal(false);
      setName('');
      setAddress('');
      setTeacherId('');
      fetchBranches();
    } catch (err) {
      setError(err.message || 'Failed to create branch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="header-row">
        <div>
          <h2>Branches Management</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Manage training centers, teachers, and assigned leadership</p>
        </div>
        <button onClick={() => setShowAddModal(!showAddModal)} className="btn btn-black">
          {showAddModal ? 'Cancel' : '+ Add Branch'}
        </button>
      </div>

      {error && !loading && (
        <ErrorState
          error={error}
          title="Branches Couldn't Be Loaded"
          onRetry={fetchBranches}
        />
      )}

      {showAddModal && (
        <div className="card" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <h3>Create New Branch</h3>
          {error && <InlineError message={error} onDismiss={() => setError('')} />}

          <form onSubmit={handleCreateBranch} style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label>Branch Name *</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. City Center Branch"
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                className="form-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address"
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label>Assigned Teacher</label>
              <select
                className="form-select"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                disabled={submitting}
              >
                <option value="">-- Select Teacher --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.phone})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Class Start Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={classStartTime}
                  onChange={(e) => setClassStartTime(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Class End Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={classEndTime}
                  onChange={(e) => setClassEndTime(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <LoadingButton
              type="submit"
              variant="black"
              loading={submitting}
              loadingText="Saving Branch... ⟳"
              style={{ marginTop: '0.5rem' }}
            >
              Save Branch
            </LoadingButton>
          </form>
        </div>
      )}

      {loading ? (
        <SkeletonLoader type="table" rows={5} columns={8} />
      ) : branches.length === 0 ? (
        <EmptyState
          type="no-data"
          title="No Branches Configured"
          message="No operational branches or training centers exist in the system."
          actionText="+ Create First Branch"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="table-responsive">
          <table className="plain-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Branch Name</th>
                <th>Teacher</th>
                <th>Supervisor(s)</th>
                <th>Amir(s)</th>
                <th>Timing</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {branches.map(b => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td><strong>{b.name}</strong></td>
                  <td>{b.teacher_name || 'Unassigned'}</td>
                  <td>
                    {b.supervisors && b.supervisors.length > 0 ? (
                      b.supervisors.map((s, idx) => <span key={`s-${b.id}-${s.id || idx}`} className="badge-outline">{s.name}</span>)
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    {b.amirs && b.amirs.length > 0 ? (
                      b.amirs.map((a, idx) => <span key={`a-${b.id}-${a.id || idx}`} className="badge-outline">{a.name}</span>)
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{b.class_start_time} - {b.class_end_time}</td>
                  <td style={{ textTransform: 'uppercase' }}>{b.status}</td>
                  <td>
                    <Link to={`/branches/${b.id}`} className="btn btn-sm">
                      Manage / Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Branches;
