import { buildApiUrl } from '../utils/apiConfig';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BranchDetail = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [branch, setBranch] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [amirs, setAmirs] = useState([]);

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
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const fetchBranchDetail = async () => {
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
        setError(data.message);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchDropdownUsers = async () => {
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
  };

  useEffect(() => {
    fetchBranchDetail();
    fetchDropdownUsers();
  }, [id, token]);

  const handleUpdateBranch = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
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
      setMsg('Branch details updated successfully');
      fetchBranchDetail();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAssignSupervisor = async (e) => {
    e.preventDefault();
    if (!selectedSupervisor) return;
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
        setSelectedSupervisor('');
        fetchBranchDetail();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnassignSupervisor = async (userId) => {
    try {
      const res = await fetch(buildApiUrl(`/api/branches/${id}/unassign-supervisor/${userId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchBranchDetail();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignAmir = async (e) => {
    e.preventDefault();
    if (!selectedAmir) return;
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
        setSelectedAmir('');
        fetchBranchDetail();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnassignAmir = async (userId) => {
    try {
      const res = await fetch(buildApiUrl(`/api/branches/${id}/unassign-amir/${userId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchBranchDetail();
    } catch (err) {
      console.error(err);
    }
  };

  if (!branch && !error) return <div>Loading branch details...</div>;

  return (
    <div>
      <div className="header-row">
        <div>
          <h2>Branch Details: {branch?.name}</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to={`/branches/${id}/finance`} className="btn btn-black">
            📊 Branch Finance Dashboard
          </Link>
          <button onClick={() => navigate('/branches')} className="btn">
            &larr; Back to Branches
          </button>
        </div>
      </div>

      {msg && <div style={{ border: '1px solid #000', padding: '0.5rem', marginBottom: '1rem', background: '#f0f0f0' }}>{msg}</div>}
      {error && <div className="error-box">{error}</div>}

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
              />
            </div>

            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                className="form-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
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
                <label>Start Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={classStartTime}
                  onChange={(e) => setClassStartTime(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>End Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={classEndTime}
                  onChange={(e) => setClassEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Branch Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <button type="submit" className="btn btn-black" style={{ marginTop: '0.5rem' }}>
              Update Branch Info
            </button>
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
                  <li key={`sup-${s.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', padding: '0.4rem 0' }}>
                    <span>{s.name} ({s.phone || 'No phone'})</span>
                    <button onClick={() => handleUnassignSupervisor(s.id)} className="btn btn-sm">
                      Remove
                    </button>
                  </li>
                ))
              ) : (
                <li style={{ color: '#666', fontSize: '0.85rem' }}>No supervisor assigned</li>
              )}
            </ul>

            <form onSubmit={handleAssignSupervisor} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <select
                className="form-select"
                value={selectedSupervisor}
                onChange={(e) => setSelectedSupervisor(e.target.value)}
              >
                <option value="">-- Select Supervisor --</option>
                {supervisors.map(s => (
                  <option key={`sup-opt-${s.id}`} value={s.id}>{s.name} ({s.phone})</option>
                ))}
              </select>
              <button type="submit" className="btn btn-black btn-sm">
                Assign
              </button>
            </form>
          </div>

          {/* Amirs Mapping */}
          <div className="card">
            <h3>Assigned Amirs</h3>
            <ul style={{ listStyle: 'none', margin: '0.75rem 0' }}>
              {branch?.amirs && branch.amirs.length > 0 ? (
                branch.amirs.map((a, idx) => (
                  <li key={`amir-${a.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', padding: '0.4rem 0' }}>
                    <span>{a.name} ({a.phone || 'No phone'})</span>
                    <button onClick={() => handleUnassignAmir(a.id)} className="btn btn-sm">
                      Remove
                    </button>
                  </li>
                ))
              ) : (
                <li style={{ color: '#666', fontSize: '0.85rem' }}>No amir assigned</li>
              )}
            </ul>

            <form onSubmit={handleAssignAmir} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <select
                className="form-select"
                value={selectedAmir}
                onChange={(e) => setSelectedAmir(e.target.value)}
              >
                <option value="">-- Select Amir --</option>
                {amirs.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.phone})</option>
                ))}
              </select>
              <button type="submit" className="btn btn-black btn-sm">
                Assign
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchDetail;
