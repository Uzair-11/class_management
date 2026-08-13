import { buildApiUrl } from '../utils/apiConfig';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SkeletonLoader from '../components/common/SkeletonLoader';
import LoadingButton from '../components/common/LoadingButton';
import ErrorState, { InlineError } from '../components/common/ErrorState';
import ConfirmModal from '../components/common/ConfirmModal';

const BranchDetail = () => {
  const { id } = useParams();
  const { token, user } = useAuth();
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  const [branch, setBranch] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [amirs, setAmirs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [assigningSup, setAssigningSup] = useState(false);
  const [assigningAmir, setAssigningAmir] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingBranch, setDeletingBranch] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [classStartTime, setClassStartTime] = useState('');
  const [classEndTime, setClassEndTime] = useState('');
  const [status, setStatus] = useState('active');

  // Mapping state
  const [selectedSupervisor, setSelectedSupervisor] = useState('');
  const [selectedAmir, setSelectedAmir] = useState('');
  const [error, setError] = useState('');

  const fetchBranchDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(buildApiUrl(`/api/branches/${id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setBranch(data);
        setName(data.name || '');
        setAddress(data.address || '');
        setTeacherId(data.teacher_id || '');
        setClassStartTime(data.class_start_time || '');
        setClassEndTime(data.class_end_time || '');
        setStatus(data.status || 'active');
      } else {
        setError(data.message || 'Failed to fetch branch details');
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  const fetchDropdownUsers = useCallback(async () => {
    try {
      const [tRes, sRes, aRes] = await Promise.all([
        fetch(buildApiUrl('/api/users?role=teacher'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(buildApiUrl('/api/users?role=supervisor'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(buildApiUrl('/api/users?role=amir'), { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (tRes.ok) setTeachers(await tRes.json());
      if (sRes.ok) setSupervisors(await sRes.json());
      if (aRes.ok) setAmirs(await aRes.json());
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    fetchBranchDetail();
    fetchDropdownUsers();
  }, [fetchBranchDetail, fetchDropdownUsers]);

  const handleUpdateBranch = async (e) => {
    e.preventDefault();
    setError('');
    setUpdating(true);

    try {
      const res = await fetch(buildApiUrl(`/api/branches/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          address,
          teacher_id: teacherId || null,
          class_start_time: classStartTime,
          class_end_time: classEndTime,
          status
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');

      showSuccess('✓ Branch details updated successfully!');
      fetchBranchDetail();
    } catch (err) {
      setError(err.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteBranch = async () => {
    setDeletingBranch(true);
    setError('');

    try {
      const res = await fetch(buildApiUrl(`/api/branches/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete branch');

      showSuccess(`✓ Branch "${branch?.name}" deleted successfully`);
      navigate('/branches');
    } catch (err) {
      setError(err.message || 'Failed to delete branch');
    } finally {
      setDeletingBranch(false);
    }
  };

  const handleAssignSupervisor = async (e) => {
    e.preventDefault();
    if (!selectedSupervisor) return;
    setAssigningSup(true);
    setError('');

    try {
      const res = await fetch(buildApiUrl(`/api/branches/${id}/assign-supervisor`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: selectedSupervisor })
      });
      if (res.ok) {
        showSuccess('✓ Supervisor assigned successfully');
        setSelectedSupervisor('');
        fetchBranchDetail();
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Failed to assign supervisor');
      }
    } catch (err) {
      setError(err.message || 'Failed to assign supervisor');
    } finally {
      setAssigningSup(false);
    }
  };

  const handleUnassignSupervisor = async (userId) => {
    setError('');
    try {
      const res = await fetch(buildApiUrl(`/api/branches/${id}/unassign-supervisor/${userId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showSuccess('✓ Supervisor unassigned');
        fetchBranchDetail();
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Failed to unassign supervisor');
      }
    } catch (err) {
      setError(err.message || 'Failed to unassign supervisor');
    }
  };

  const handleAssignAmir = async (e) => {
    e.preventDefault();
    if (!selectedAmir) return;
    setAssigningAmir(true);
    setError('');

    try {
      const res = await fetch(buildApiUrl(`/api/branches/${id}/assign-amir`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: selectedAmir })
      });
      if (res.ok) {
        showSuccess('✓ Amir assigned successfully');
        setSelectedAmir('');
        fetchBranchDetail();
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Failed to assign amir');
      }
    } catch (err) {
      setError(err.message || 'Failed to assign amir');
    } finally {
      setAssigningAmir(false);
    }
  };

  const handleUnassignAmir = async (userId) => {
    setError('');
    try {
      const res = await fetch(buildApiUrl(`/api/branches/${id}/unassign-amir/${userId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showSuccess('✓ Amir unassigned');
        fetchBranchDetail();
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Failed to unassign amir');
      }
    } catch (err) {
      setError(err.message || 'Failed to unassign amir');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="header-row">
          <h2>Branch Details</h2>
        </div>
        <SkeletonLoader type="detail" />
      </div>
    );
  }

  if (error && !branch) {
    return (
      <div>
        <div className="header-row">
          <h2>Branch Details</h2>
        </div>
        <ErrorState
          error={error}
          title="Branch Details Unavailable"
          onRetry={fetchBranchDetail}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="header-row">
        <div>
          <h2>Branch Details: {branch?.name}</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to={`/branches/${id}/finance`} className="btn btn-black">
            📊 Branch Finance Dashboard
          </Link>
          {user?.role === 'admin' && (
            <button onClick={() => setDeleteModalOpen(true)} className="btn btn-danger">
              🗑️ Delete Branch
            </button>
          )}
          <button onClick={() => navigate('/branches')} className="btn">
            &larr; Back to Branches
          </button>
        </div>
      </div>

      {error && <InlineError message={error} onDismiss={() => setError('')} />}

      {/* Delete Branch Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Branch Location"
        message={`Are you sure you want to permanently delete branch "${branch?.name}"?`}
        warningText="This will delete all enrolled students, attendance records, fee cycles, machine inventory, and financial ledgers associated with this branch."
        confirmText="Delete Branch & All Data"
        confirmVariant="danger"
        loading={deletingBranch}
        onConfirm={handleDeleteBranch}
        onCancel={() => setDeleteModalOpen(false)}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Branch Edit Card */}
        <div className="card">
          <h3>Edit Branch Information</h3>
          <form onSubmit={handleUpdateBranch} style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label>Branch Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={updating}
              />
            </div>

            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                className="form-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={updating}
              />
            </div>

            <div className="form-group">
              <label>Assigned Teacher</label>
              <select
                className="form-select"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                disabled={updating}
              >
                <option value="">-- Select Teacher --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.phone})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Start Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={classStartTime}
                  onChange={(e) => setClassStartTime(e.target.value)}
                  disabled={updating}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>End Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={classEndTime}
                  onChange={(e) => setClassEndTime(e.target.value)}
                  disabled={updating}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Branch Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={updating}
              >
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <LoadingButton
              type="submit"
              variant="black"
              loading={updating}
              loadingText="Updating Branch Info... ⟳"
              style={{ marginTop: '0.5rem' }}
            >
              Update Branch Info
            </LoadingButton>
          </form>
        </div>

        {/* Mappings Card */}
        <div>
          {/* Supervisors Mapping */}
          <div className="card">
            <h3>Assigned Supervisors</h3>
            <ul style={{ listStyle: 'none', margin: '0.75rem 0' }}>
              {branch?.supervisors && branch.supervisors.length > 0 ? (
                branch.supervisors.map((s, idx) => (
                  <li key={`sup-${s.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', padding: '0.4rem 0' }}>
                    <span>{s.name} ({s.phone || 'No phone'})</span>
                    <button onClick={() => handleUnassignSupervisor(s.id)} className="btn btn-sm btn-danger">
                      Remove
                    </button>
                  </li>
                ))
              ) : (
                <li style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>No supervisor assigned</li>
              )}
            </ul>

            <form onSubmit={handleAssignSupervisor} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <select
                className="form-select"
                value={selectedSupervisor}
                onChange={(e) => setSelectedSupervisor(e.target.value)}
                disabled={assigningSup}
              >
                <option value="">-- Select Supervisor --</option>
                {supervisors.map(s => (
                  <option key={`sup-opt-${s.id}`} value={s.id}>{s.name} ({s.phone})</option>
                ))}
              </select>
              <LoadingButton
                type="submit"
                variant="black"
                className="btn-sm"
                loading={assigningSup}
                loadingText="... ⟳"
              >
                Assign
              </LoadingButton>
            </form>
          </div>

          {/* Amirs Mapping */}
          <div className="card">
            <h3>Assigned Amirs</h3>
            <ul style={{ listStyle: 'none', margin: '0.75rem 0' }}>
              {branch?.amirs && branch.amirs.length > 0 ? (
                branch.amirs.map((a, idx) => (
                  <li key={`amir-${a.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', padding: '0.4rem 0' }}>
                    <span>{a.name} ({a.phone || 'No phone'})</span>
                    <button onClick={() => handleUnassignAmir(a.id)} className="btn btn-sm btn-danger">
                      Remove
                    </button>
                  </li>
                ))
              ) : (
                <li style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>No amir assigned</li>
              )}
            </ul>

            <form onSubmit={handleAssignAmir} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <select
                className="form-select"
                value={selectedAmir}
                onChange={(e) => setSelectedAmir(e.target.value)}
                disabled={assigningAmir}
              >
                <option value="">-- Select Amir --</option>
                {amirs.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.phone})</option>
                ))}
              </select>
              <LoadingButton
                type="submit"
                variant="black"
                className="btn-sm"
                loading={assigningAmir}
                loadingText="... ⟳"
              >
                Assign
              </LoadingButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchDetail;
