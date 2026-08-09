import { buildApiUrl } from '../utils/apiConfig';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Holidays = () => {
  const { token, user } = useAuth();

  const [holidays, setHolidays] = useState([]);
  const [branches, setBranches] = useState([]);

  // Filters
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('upcoming'); // 'all', 'upcoming', 'past'

  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [targetBranchId, setTargetBranchId] = useState(''); // '' means All Branches for admin

  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const fetchHolidays = async () => {
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
        else setError(data.message);
      }
    } catch (err) {
      console.error(err);
      setError('Error fetching holidays list');
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
    fetchHolidays();
    fetchBranches();
  }, [token, selectedBranchFilter]);

  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

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

      setMsg('Holiday declared successfully');
      setShowAddModal(false);
      setDate('');
      setReason('');
      setTargetBranchId('');
      fetchHolidays();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteHoliday = async (holidayId) => {
    if (!window.confirm('Are you sure you want to delete this holiday record?')) return;

    try {
      const res = await fetch(buildApiUrl(`/api/holidays/${holidayId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete holiday');

      setMsg('Holiday deleted successfully');
      fetchHolidays();
    } catch (err) {
      setError(err.message);
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
          <p style={{ fontSize: '0.85rem', color: '#666' }}>
            Declare global or branch-specific holidays and scheduled closures
          </p>
        </div>

        {(user?.role === 'admin' || user?.role === 'supervisor') && (
          <button onClick={() => setShowAddModal(!showAddModal)} className="btn btn-black">
            {showAddModal ? 'Cancel' : '+ Add Holiday'}
          </button>
        )}
      </div>

      {msg && <div style={{ border: '1px solid #000', padding: '0.5rem', marginBottom: '1rem', background: '#f0f0f0' }}>{msg}</div>}
      {error && <div className="error-box">{error}</div>}

      {/* Add Holiday Card */}
      {showAddModal && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>Declare New Holiday</h3>
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
                />
              </div>

              <div className="form-group">
                <label>Target Branch *</label>
                <select
                  className="form-select"
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(e.target.value)}
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
              />
            </div>

            <button type="submit" className="btn btn-black" style={{ marginTop: '0.5rem' }}>
              Declare Holiday
            </button>
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
            >
              <option value="">-- All Branches & Global --</option>
              {branches.map(b => (
                <option key={`hbf-${b.id}`} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Holidays List Table */}
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
            {filteredHolidays.length === 0 ? (
              <tr>
                <td colSpan={(user?.role === 'admin' || user?.role === 'supervisor') ? "4" : "3"} style={{ textAlign: 'center' }}>
                  No holiday records found for the selected criteria
                </td>
              </tr>
            ) : (
              filteredHolidays.map(h => (
                <tr key={`hol-${h.id}`}>
                  <td><strong>{new Date(h.date).toLocaleDateString()}</strong></td>
                  <td>{h.reason}</td>
                  <td>
                    {h.branch_id === null ? (
                      <span className="badge-outline" style={{ background: '#f0f0f0', fontWeight: 'bold' }}>
                        All Branches (Global)
                      </span>
                    ) : (
                      <span>{h.branch_name || `Branch #${h.branch_id}`}</span>
                    )}
                  </td>
                  {(user?.role === 'admin' || user?.role === 'supervisor') && (
                    <td>
                      <button onClick={() => handleDeleteHoliday(h.id)} className="btn btn-sm">
                        Remove
                      </button>
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

export default Holidays;
