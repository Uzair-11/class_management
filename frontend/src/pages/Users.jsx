import { buildApiUrl } from '../utils/apiConfig';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SkeletonLoader from '../components/common/SkeletonLoader';
import LoadingButton from '../components/common/LoadingButton';
import EmptyState from '../components/common/EmptyState';
import ErrorState, { InlineError } from '../components/common/ErrorState';
import ConfirmModal from '../components/common/ConfirmModal';

const Users = () => {
  const { token, user } = useAuth();
  const { showSuccess } = useToast();

  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');

  // Add user form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('teacher');
  const [branchId, setBranchId] = useState('');

  // Edit user form
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('teacher');
  const [editStatus, setEditStatus] = useState('active');

  // Deactivate Modal state
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivateUserId, setDeactivateUserId] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(buildApiUrl('/api/users'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok) setUsers(data);
        else setError(data.message || 'Failed to fetch users');
      } else {
        setError(`Server returned ${res.status}: ${res.statusText}. Please verify backend configuration.`);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

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
    fetchUsers();
    fetchBranches();
  }, [fetchUsers, fetchBranches]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(buildApiUrl('/api/users'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name, 
          phone, 
          password, 
          role,
          branch_id: branchId ? parseInt(branchId) : undefined,
          branch_ids: branchId ? [parseInt(branchId)] : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create user');

      showSuccess(`✓ User account for "${name}" created successfully!`);
      setShowAddModal(false);
      setName('');
      setPhone('');
      setPassword('');
      setRole('teacher');
      setBranchId('');
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (u) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditPhone(u.phone);
    setEditRole(u.role);
    setEditStatus(u.status);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(buildApiUrl(`/api/users/${editingUser.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          role: editRole,
          status: editStatus
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update user');

      showSuccess(`✓ User "${editName}" updated successfully`);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeactivate = (userId) => {
    setDeactivateUserId(userId);
    setDeactivateModalOpen(true);
  };

  const handleDeactivate = async () => {
    if (!deactivateUserId) return;
    setError('');
    setDeactivating(true);

    try {
      const res = await fetch(buildApiUrl(`/api/users/${deactivateUserId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showSuccess('✓ User account deactivated successfully');
        setDeactivateModalOpen(false);
        setDeactivateUserId(null);
        fetchUsers();
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Failed to deactivate user');
      }
    } catch (err) {
      setError(err.message || 'Failed to deactivate user');
    } finally {
      setDeactivating(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div>
      <div className="header-row">
        <div>
          <h2>User Management</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Account and role management for accessible training branches</p>
        </div>
        <button onClick={() => { setShowAddModal(!showAddModal); setEditingUser(null); }} className="btn btn-black">
          {showAddModal ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {error && !loading && (
        <ErrorState
          error={error}
          title="User Accounts Unavailable"
          onRetry={fetchUsers}
        />
      )}

      {/* Deactivate Confirmation Modal */}
      <ConfirmModal
        isOpen={deactivateModalOpen}
        title="Deactivate User Account"
        message="Are you sure you want to deactivate this user account? The user will no longer be able to sign in."
        warningText="Account access will be suspended."
        confirmText="Deactivate Account"
        confirmVariant="danger"
        loading={deactivating}
        onConfirm={handleDeactivate}
        onCancel={() => {
          setDeactivateModalOpen(false);
          setDeactivateUserId(null);
        }}
      />

      {/* Add User Modal/Card */}
      {showAddModal && (
        <div className="card" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <h3>Add New User</h3>
          {error && <InlineError message={error} onDismiss={() => setError('')} />}

          <form onSubmit={handleCreateUser} style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fatima Sheikh"
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="text"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)} disabled={submitting}>
                {isAdmin && <option value="admin">Admin</option>}
                {isAdmin && <option value="amir">Amir</option>}
                <option value="supervisor">Supervisor</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            <div className="form-group">
              <label>Assigned Branch *</label>
              <select 
                className="form-select" 
                value={branchId} 
                onChange={(e) => setBranchId(e.target.value)}
                required
                disabled={submitting}
              >
                <option value="">-- Select Branch --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <LoadingButton
              type="submit"
              variant="black"
              loading={submitting}
              loadingText="Creating Account... ⟳"
              style={{ marginTop: '0.5rem' }}
            >
              Create User Account
            </LoadingButton>
          </form>
        </div>
      )}

      {/* Edit User Modal/Card (Admin Only) */}
      {editingUser && isAdmin && (
        <div className="card" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Edit User: {editingUser.name}</h3>
            <button onClick={() => setEditingUser(null)} className="btn btn-sm" disabled={submitting}>Cancel</button>
          </div>
          {error && <InlineError message={error} onDismiss={() => setError('')} />}

          <form onSubmit={handleUpdateUser} style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                className="form-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                className="form-input"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select className="form-select" value={editRole} onChange={(e) => setEditRole(e.target.value)} disabled={submitting}>
                <option value="admin">Admin</option>
                <option value="amir">Amir</option>
                <option value="supervisor">Supervisor</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select className="form-select" value={editStatus} onChange={(e) => setEditStatus(e.target.value)} disabled={submitting}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <LoadingButton
              type="submit"
              variant="black"
              loading={submitting}
              loadingText="Saving User Changes... ⟳"
              style={{ marginTop: '0.5rem' }}
            >
              Save User Changes
            </LoadingButton>
          </form>
        </div>
      )}

      {/* Users Table / Skeleton / Empty State */}
      <div className="card">
        {loading ? (
          <SkeletonLoader type="table" rows={5} columns={6} />
        ) : users.length === 0 ? (
          <EmptyState
            type="no-data"
            title="No Users Registered"
            message="No staff or administrative user accounts exist in the system."
            actionText="+ Create User Account"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <div className="table-responsive">
            <table className="plain-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.phone}</td>
                    <td style={{ textTransform: 'uppercase' }}>{u.role}</td>
                    <td style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{u.status}</td>
                    {isAdmin && (
                      <td>
                        <button onClick={() => handleEditClick(u)} className="btn btn-sm" style={{ marginRight: '0.4rem' }}>
                          Edit
                        </button>
                        {u.status === 'active' && (
                          <button onClick={() => confirmDeactivate(u.id)} className="btn btn-sm btn-danger">
                            Deactivate
                          </button>
                        )}
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

export default Users;
