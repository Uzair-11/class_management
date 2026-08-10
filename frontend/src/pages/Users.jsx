import { buildApiUrl } from '../utils/apiConfig';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Users = () => {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

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

  const fetchUsers = async () => {
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
        setError(`Server returned ${res.status}: ${res.statusText}. Please restart your backend server.`);
      }
    } catch (err) {
      console.error(err);
      setError('Network error connecting to backend server');
    }
  };

  const fetchBranches = async () => {
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
  };

  useEffect(() => {
    fetchUsers();
    fetchBranches();
  }, [token]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
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

      setMsg('User created successfully');
      setShowAddModal(false);
      setName('');
      setPhone('');
      setPassword('');
      setRole('teacher');
      setBranchId('');
      fetchUsers();
    } catch (err) {
      setError(err.message);
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
    setMsg('');
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

      setMsg('User details updated');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeactivate = async (userId) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) return;
    try {
      const res = await fetch(buildApiUrl(`/api/users/${userId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const isAmir = user?.role === 'amir';
  const isAdmin = user?.role === 'admin';

  return (
    <div>
      <div className="header-row">
        <div>
          <h2>User Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>Account and role management for accessible training branches</p>
        </div>
        <button onClick={() => { setShowAddModal(!showAddModal); setEditingUser(null); }} className="btn btn-black">
          {showAddModal ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {msg && <div style={{ border: '1px solid #000', padding: '0.5rem', marginBottom: '1rem', background: '#f0f0f0' }}>{msg}</div>}
      {error && <div className="error-box">{error}</div>}

      {/* Add User Modal/Card */}
      {showAddModal && (
        <div className="card">
          <h3>Add New User</h3>
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
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
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
              >
                <option value="">-- Select Branch --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn btn-black" style={{ marginTop: '0.5rem' }}>
              Create User Account
            </button>
          </form>
        </div>
      )}

      {/* Edit User Modal/Card (Admin Only) */}
      {editingUser && isAdmin && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Edit User: {editingUser.name}</h3>
            <button onClick={() => setEditingUser(null)} className="btn btn-sm">Close</button>
          </div>
          <form onSubmit={handleUpdateUser} style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                className="form-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
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
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select className="form-select" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                <option value="admin">Admin</option>
                <option value="amir">Amir</option>
                <option value="supervisor">Supervisor</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select className="form-select" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <button type="submit" className="btn btn-black" style={{ marginTop: '0.5rem' }}>
              Save User Changes
            </button>
          </form>
        </div>
      )}

      {/* Users Table */}
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
            {users.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? "6" : "5"} style={{ textAlign: 'center' }}>No users found</td>
              </tr>
            ) : (
              users.map(u => (
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
                        <button onClick={() => handleDeactivate(u.id)} className="btn btn-sm">
                          Deactivate
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
