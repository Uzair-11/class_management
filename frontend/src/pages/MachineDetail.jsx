import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MachineDetail = () => {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [machine, setMachine] = useState(null);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);

  // Machine Edit Form State
  const [isEditing, setIsEditing] = useState(false);
  const [machineNumber, setMachineNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [status, setStatus] = useState('working');

  // Maintenance Record Form State
  const [maintDate, setMaintDate] = useState(new Date().toISOString().split('T')[0]);
  const [maintDesc, setMaintDesc] = useState('');
  const [maintCost, setMaintCost] = useState('0');
  const [maintRemarks, setMaintRemarks] = useState('');
  const [suggestedStatus, setSuggestedStatus] = useState('');

  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const fetchMachineDetail = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/machines/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMachine(data);
        setMachineNumber(data.machine_number || '');
        setPurchaseDate(data.purchase_date ? data.purchase_date.split('T')[0] : '');
        setStatus(data.status || 'working');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchMaintenanceLogs = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/machines/${id}/maintenance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMaintenanceLogs(data);
      }
    } catch (err) {
      console.error('Error fetching maintenance history:', err);
    }
  };

  useEffect(() => {
    fetchMachineDetail();
    fetchMaintenanceLogs();
  }, [id, token]);

  const handleUpdateMachine = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    try {
      const res = await fetch(`http://localhost:5000/api/machines/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          machine_number: machineNumber,
          purchase_date: purchaseDate || null,
          status
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update machine');

      setMsg('Machine parameters updated successfully');
      setIsEditing(false);
      fetchMachineDetail();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddMaintenance = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    const costVal = parseFloat(maintCost || 0);

    try {
      const res = await fetch(`http://localhost:5000/api/machines/${id}/maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: maintDate,
          description: maintDesc,
          cost: costVal,
          remarks: maintRemarks,
          update_status: suggestedStatus || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to record maintenance');

      setMsg(`✅ ${data.message}`);
      setMaintDesc('');
      setMaintCost('0');
      setMaintRemarks('');
      setSuggestedStatus('');
      fetchMachineDetail();
      fetchMaintenanceLogs();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!machine && !error) return <div>Loading machine details...</div>;

  return (
    <div>
      <div className="header-row">
        <h2>Machine Details: {machine?.machine_number}</h2>
        <button onClick={() => navigate('/machines')} className="btn">
          &larr; Back to Inventory
        </button>
      </div>

      {msg && <div style={{ border: '1px solid #000', padding: '0.75rem', marginBottom: '1rem', background: '#f0f0f0', fontWeight: '500' }}>{msg}</div>}
      {error && <div className="error-box">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Machine Info Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Machine Parameters</h3>
            {(user?.role === 'teacher' || user?.role === 'admin') && (
              <button onClick={() => setIsEditing(!isEditing)} className="btn btn-sm">
                {isEditing ? 'Cancel Edit' : 'Edit Info'}
              </button>
            )}
          </div>

          {!isEditing ? (
            <div style={{ marginTop: '1rem', lineHeight: '1.8', fontSize: '0.9rem' }}>
              <p><strong>Machine Number / Tag:</strong> {machine?.machine_number}</p>
              <p><strong>Branch Location:</strong> {machine?.branch_name}</p>
              <p><strong>Purchase Date:</strong> {machine?.purchase_date ? new Date(machine.purchase_date).toLocaleDateString() : 'Not specified'}</p>
              <p>
                <strong>Operational Status:</strong>{' '}
                <span className="badge-outline" style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {machine?.status?.replace(/_/g, ' ')}
                </span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleUpdateMachine} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Machine Tag / Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={machineNumber}
                  onChange={(e) => setMachineNumber(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Purchase Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="working">Working</option>
                  <option value="needs_maintenance">Needs Maintenance</option>
                  <option value="under_repair">Under Repair</option>
                  <option value="replaced">Replaced</option>
                  <option value="out_of_service">Out of Service</option>
                </select>
              </div>

              <button type="submit" className="btn btn-black" style={{ marginTop: '0.5rem' }}>
                Save Parameters
              </button>
            </form>
          )}
        </div>

        {/* Maintenance Column */}
        <div>
          {/* Add Maintenance Form */}
          {(user?.role === 'teacher' || user?.role === 'admin') && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3>Add Maintenance Record</h3>
              <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>
                Note: Cost entries will automatically log a matching expense entry for branch finance.
              </p>

              <form onSubmit={handleAddMaintenance} style={{ marginTop: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={maintDate}
                      onChange={(e) => setMaintDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Cost (₹) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={maintCost}
                      onChange={(e) => setMaintCost(e.target.value)}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Maintenance Description *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={maintDesc}
                    onChange={(e) => setMaintDesc(e.target.value)}
                    placeholder="e.g. Motor replacement & oil servicing"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Remarks / Vendor</label>
                  <input
                    type="text"
                    className="form-input"
                    value={maintRemarks}
                    onChange={(e) => setMaintRemarks(e.target.value)}
                    placeholder="Optional technician notes"
                  />
                </div>

                {/* Status Update Prompt */}
                <div className="form-group" style={{ background: '#f8f8f8', padding: '0.5rem', border: '1px solid #000' }}>
                  <label style={{ fontSize: '0.8rem' }}>Update Machine Status (Optional):</label>
                  <select
                    className="form-select"
                    value={suggestedStatus}
                    onChange={(e) => setSuggestedStatus(e.target.value)}
                  >
                    <option value="">-- Keep Current ({machine?.status?.replace(/_/g, ' ')}) --</option>
                    <option value="working">Set to Working</option>
                    <option value="under_repair">Set to Under Repair</option>
                    <option value="needs_maintenance">Set to Needs Maintenance</option>
                    <option value="out_of_service">Set to Out of Service</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-black" style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>
                  Submit Maintenance Entry
                </button>
              </form>
            </div>
          )}

          {/* Maintenance History Table */}
          <div className="card">
            <h3>Maintenance History</h3>
            <div className="table-responsive" style={{ marginTop: '1rem', maxHeight: '250px', overflowY: 'auto' }}>
              <table className="plain-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Cost</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center' }}>No maintenance records logged for this machine</td>
                    </tr>
                  ) : (
                    maintenanceLogs.map(log => (
                      <tr key={`mlog-${log.id}`}>
                        <td>{new Date(log.date).toLocaleDateString()}</td>
                        <td><strong>{log.description}</strong></td>
                        <td>₹{log.cost}</td>
                        <td>{log.remarks || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MachineDetail;
