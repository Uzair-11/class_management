import { buildApiUrl } from '../utils/apiConfig';
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SkeletonLoader from '../components/common/SkeletonLoader';
import LoadingButton from '../components/common/LoadingButton';
import EmptyState from '../components/common/EmptyState';
import ErrorState, { InlineError } from '../components/common/ErrorState';

const Machines = () => {
  const { token, user } = useAuth();
  const { showSuccess } = useToast();

  const [machines, setMachines] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [machineNumber, setMachineNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [status, setStatus] = useState('working');
  const [targetBranchId, setTargetBranchId] = useState('');

  const [error, setError] = useState('');

  const fetchMachines = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let url = buildApiUrl('/api/machines');
      if (selectedBranchFilter) {
        url += `?branch_id=${selectedBranchFilter}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok) setMachines(data);
        else setError(data.message || 'Failed to fetch machines inventory');
      } else {
        setError('Unexpected response from server');
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
        if (data.length > 0) setTargetBranchId(data[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    fetchMachines();
    fetchBranches();
  }, [fetchMachines, fetchBranches]);

  const handleCreateMachine = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(buildApiUrl('/api/machines'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          branch_id: targetBranchId,
          machine_number: machineNumber,
          purchase_date: purchaseDate || null,
          status
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add machine');

      showSuccess(`✓ Machine "${machineNumber}" added to inventory successfully!`);
      setShowAddModal(false);
      setMachineNumber('');
      setPurchaseDate('');
      setStatus('working');
      fetchMachines();
    } catch (err) {
      setError(err.message || 'Failed to add machine');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (st) => {
    const labels = {
      working: { text: 'WORKING', class: 'badge-success' },
      under_repair: { text: 'UNDER REPAIR', class: 'badge-warning' },
      needs_maintenance: { text: 'NEEDS MAINTENANCE', class: 'badge-warning' },
      replaced: { text: 'REPLACED', class: 'badge-warning' },
      out_of_service: { text: 'OUT OF SERVICE', class: 'badge-danger' }
    };
    const config = labels[st] || { text: st, class: '' };
    return (
      <span className={`badge-outline ${config.class}`}>
        {config.text}
      </span>
    );
  };

  return (
    <div>
      <div className="header-row">
        <div>
          <h2>Sewing Machine Inventory</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Equipment tracking, maintenance logs, and operational statuses
          </p>
        </div>

        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <button onClick={() => setShowAddModal(!showAddModal)} className="btn btn-black">
            {showAddModal ? 'Cancel' : '+ Add Machine'}
          </button>
        )}
      </div>

      {error && !loading && (
        <ErrorState
          error={error}
          title="Machine Inventory Unavailable"
          onRetry={fetchMachines}
        />
      )}

      {/* Add Machine Card */}
      {showAddModal && (
        <div className="card" style={{ marginBottom: '1.5rem', borderTop: '4px solid var(--color-primary)' }}>
          <h3>Add New Machine</h3>
          {error && <InlineError message={error} onDismiss={() => setError('')} />}

          <form onSubmit={handleCreateMachine} style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label>Machine Number / Tag *</label>
                <input
                  type="text"
                  className="form-input"
                  value={machineNumber}
                  onChange={(e) => setMachineNumber(e.target.value)}
                  placeholder="e.g. MCH-001"
                  required
                  disabled={submitting}
                />
              </div>

              {user?.role !== 'teacher' && (
                <div className="form-group">
                  <label>Branch *</label>
                  <select
                    className="form-select"
                    value={targetBranchId}
                    onChange={(e) => setTargetBranchId(e.target.value)}
                    required
                    disabled={submitting}
                  >
                    {branches.map(b => (
                      <option key={`mb-${b.id}`} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Purchase Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label>Initial Status</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={submitting}
                >
                  <option value="working">Working</option>
                  <option value="needs_maintenance">Needs Maintenance</option>
                  <option value="under_repair">Under Repair</option>
                  <option value="replaced">Replaced</option>
                  <option value="out_of_service">Out of Service</option>
                </select>
              </div>
            </div>

            <LoadingButton
              type="submit"
              variant="black"
              loading={submitting}
              loadingText="Saving Machine to Inventory... ⟳"
              style={{ marginTop: '0.5rem' }}
            >
              Save Machine to Inventory
            </LoadingButton>
          </form>
        </div>
      )}

      {/* Branch Filter Dropdown */}
      {user?.role !== 'teacher' && (
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontWeight: '600', fontSize: '0.85rem' }}>Filter by Branch:</label>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '200px' }}
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            disabled={loading}
          >
            <option value="">-- All Accessible Branches --</option>
            {branches.map(b => (
              <option key={`mbf-${b.id}`} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Machines Table / Skeleton / Empty State */}
      {loading ? (
        <SkeletonLoader type="table" rows={5} columns={6} />
      ) : machines.length === 0 ? (
        selectedBranchFilter ? (
          <EmptyState
            type="no-results"
            title="No Machines Found for Branch"
            message="No equipment records match the selected branch filter."
            actionText="Clear Branch Filter"
            onAction={() => setSelectedBranchFilter('')}
          />
        ) : (
          <EmptyState
            type="no-data"
            title="No Machines in Inventory"
            message="No equipment or sewing machines have been added to the system inventory yet."
            actionText="+ Add First Machine"
            onAction={() => setShowAddModal(true)}
          />
        )
      ) : (
        <div className="table-responsive">
          <table className="plain-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Machine Number</th>
                <th>Branch</th>
                <th>Purchase Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {machines.map(m => (
                <tr key={`mch-${m.id}`}>
                  <td>{m.id}</td>
                  <td><strong>{m.machine_number}</strong></td>
                  <td>{m.branch_name}</td>
                  <td>{m.purchase_date ? new Date(m.purchase_date).toLocaleDateString() : '-'}</td>
                  <td>{getStatusBadge(m.status)}</td>
                  <td>
                    <Link to={`/machines/${m.id}`} className="btn btn-sm">
                      Manage / Maintenance
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

export default Machines;
