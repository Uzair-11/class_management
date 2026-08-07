import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Branches = () => {
  const { token } = useAuth();
  const [branches, setBranches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [classStartTime, setClassStartTime] = useState('15:00');
  const [classEndTime, setClassEndTime] = useState('17:00');

  const fetchBranches = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/branches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok) setBranches(data);
        else setError(data.message || 'Failed to fetch branches');
      } else {
        setError(`Server returned ${res.status}: ${res.statusText}. Please restart your backend server.`);
      }
    } catch (err) {
      console.error(err);
      setError('Network error connecting to backend server');
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/users?role=teacher', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setTeachers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchTeachers();
  }, [token]);

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/branches', {
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

      setShowAddModal(false);
      setName('');
      setAddress('');
      setTeacherId('');
      fetchBranches();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="header-row">
        <div>
          <h2>Branches Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>Manage training centers, teachers, and assigned leadership</p>
        </div>
        <button onClick={() => setShowAddModal(!showAddModal)} className="btn btn-black">
          {showAddModal ? 'Cancel' : '+ Add Branch'}
        </button>
      </div>

      {showAddModal && (
        <div className="card">
          <h3>Create New Branch</h3>
          {error && <div className="error-box" style={{ marginTop: '0.5rem' }}>{error}</div>}
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
              />
            </div>

            <div className="form-group">
              <label>Assigned Teacher</label>
              <select
                className="form-select"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
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
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Class End Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={classEndTime}
                  onChange={(e) => setClassEndTime(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-black" style={{ marginTop: '0.5rem' }}>
              Save Branch
            </button>
          </form>
        </div>
      )}

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
            {branches.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center' }}>No branches found</td>
              </tr>
            ) : (
              branches.map(b => (
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Branches;
