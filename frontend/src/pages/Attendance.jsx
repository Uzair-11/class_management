import { buildApiUrl } from '../utils/apiConfig';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SkeletonLoader from '../components/common/SkeletonLoader';
import LoadingButton from '../components/common/LoadingButton';
import ErrorState, { InlineError } from '../components/common/ErrorState';
import ConfirmModal from '../components/common/ConfirmModal';

const Attendance = () => {
  const { token, user } = useAuth();
  const { showSuccess } = useToast();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const [attendanceSheet, setAttendanceSheet] = useState(null);
  const [records, setRecords] = useState({}); // { student_id: 'present' | 'absent' }

  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayReason, setHolidayReason] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const [loadingSheet, setLoadingSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);

  // Fetch branches available to user
  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl('/api/branches'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
        if (data.length > 0) {
          setSelectedBranchId(data[0].id.toString());
        } else {
          setSelectedBranchId('1');
        }
      } else {
        setSelectedBranchId('1');
      }
    } catch (err) {
      setSelectedBranchId('1');
    }
  }, [token]);

  // Fetch daily attendance sheet for selected branch + date
  const fetchAttendanceSheet = useCallback(async () => {
    if (!selectedBranchId || !date) return;
    setLoadingSheet(true);
    setError('');
    setSummary(null);

    try {
      const res = await fetch(buildApiUrl(`/api/attendance?branch_id=${selectedBranchId}&date=${date}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok) {
          setIsLocked(Boolean(data.locked));

          if (data.is_holiday) {
            setIsHoliday(true);
            setHolidayReason(data.holiday_reason);
            setAttendanceSheet([]);
          } else {
            setIsHoliday(false);
            setHolidayReason('');
            setAttendanceSheet(data.students);

            // Populate records state
            const initialRecs = {};
            data.students.forEach(s => {
              initialRecs[s.student_id] = s.status || '';
            });
            setRecords(initialRecs);
          }
        } else {
          setError(data.message || 'Failed to load attendance sheet');
        }
      } else {
        setError('Unexpected server response');
      }
    } catch (err) {
      setError('Error loading attendance sheet. Please try again.');
    } finally {
      setLoadingSheet(false);
    }
  }, [selectedBranchId, date, token]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (selectedBranchId) {
      fetchAttendanceSheet();
    }
  }, [selectedBranchId, date, fetchAttendanceSheet]);

  const handleToggleStatus = (studentId, statusValue) => {
    if (isLocked && user?.role !== 'admin') return;
    setRecords(prev => ({
      ...prev,
      [studentId]: statusValue
    }));
  };

  const handleSaveAttendance = async (e, lockImmediately = false) => {
    if (e) e.preventDefault();
    setError('');
    setSummary(null);

    const payloadRecords = Object.keys(records)
      .filter(stId => records[stId] !== '')
      .map(stId => ({
        student_id: parseInt(stId),
        status: records[stId]
      }));

    if (payloadRecords.length === 0) {
      setError('Please mark at least one student as Present or Absent before saving');
      return;
    }

    if (lockImmediately) setLocking(true);
    else setSaving(true);

    try {
      const res = await fetch(buildApiUrl('/api/attendance'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          branch_id: selectedBranchId,
          date,
          records: payloadRecords,
          is_locked: lockImmediately
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save attendance');

      showSuccess(`✓ ${data.message || 'Attendance sheet saved successfully!'}`);
      setSummary(data.summary);
      setIsLocked(data.is_locked);
      setLockConfirmOpen(false);
      fetchAttendanceSheet();
    } catch (err) {
      setError(err.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
      setLocking(false);
    }
  };

  const handleToggleLock = async (newLockState) => {
    setError('');
    try {
      const res = await fetch(buildApiUrl('/api/attendance/lock'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          branch_id: selectedBranchId,
          date,
          is_locked: newLockState
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update lock status');

      showSuccess(`✓ ${data.message || 'Sheet lock status updated'}`);
      setIsLocked(newLockState);
      fetchAttendanceSheet();
    } catch (err) {
      setError(err.message || 'Failed to update lock status');
    }
  };

  const canEdit = (user?.role === 'teacher' || user?.role === 'admin') && (!isLocked || user?.role === 'admin');

  return (
    <div>
      <div className="header-row">
        <div>
          <h2>Daily Attendance Management</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Daily class sheet, holiday banners, and attendance lock controls
          </p>
        </div>
      </div>

      {error && <InlineError message={error} onDismiss={() => setError('')} />}

      {/* Lock Confirmation Modal */}
      <ConfirmModal
        isOpen={lockConfirmOpen}
        title="Lock & Finalize Attendance"
        message={`Are you sure you want to lock the attendance sheet for ${date}? Once locked, modifying attendance records will be restricted.`}
        warningText="Finalizing will freeze this date's records."
        confirmText="Save & Lock Sheet"
        confirmVariant="primary"
        loading={locking}
        onConfirm={() => handleSaveAttendance(null, true)}
        onCancel={() => setLockConfirmOpen(false)}
      />

      {/* Date & Branch Controls */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Attendance Date</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loadingSheet || saving || locking}
            />
          </div>

          {user?.role !== 'teacher' && (
            <div className="form-group" style={{ margin: 0 }}>
              <label>Select Branch</label>
              <select
                className="form-select"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={loadingSheet || saving || locking}
              >
                {branches.length > 0 ? (
                  branches.map(b => (
                    <option key={`ab-${b.id}`} value={b.id}>{b.name}</option>
                  ))
                ) : (
                  <option value="1">Central Branch</option>
                )}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Locked Status Indicator Banner */}
      {isLocked && !isHoliday && (
        <div className="card status-warning" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <strong>🔒 ATTENDANCE LOCKED</strong>
            <div style={{ fontSize: '0.85rem' }}>
              Attendance for {date} is locked and finalized. Modifying records is disabled.
            </div>
          </div>
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <button onClick={() => handleToggleLock(false)} className="btn btn-sm">
              Unlock Sheet
            </button>
          )}
        </div>
      )}

      {/* Holiday Banner Notice */}
      {isHoliday ? (
        <div className="card status-warning" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <h3>🌴 SCHEDULED HOLIDAY NOTICE</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '1.05rem', fontWeight: 'bold' }}>
            Cannot mark attendance: "{holidayReason}" is a scheduled holiday for this date.
          </p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
            Class sheet and attendance submission controls are disabled on holidays.
          </p>
        </div>
      ) : loadingSheet ? (
        <SkeletonLoader type="table" rows={6} columns={4} />
      ) : (
        <div>
          {/* Summary Banner after saving */}
          {summary && (
            <div className="card status-good" style={{ marginBottom: '1rem' }}>
              <h4>Day Summary ({summary.date}):</h4>
              <p style={{ marginTop: '0.3rem', fontSize: '0.9rem' }}>
                Present: <strong>{summary.present}</strong> | Absent: <strong>{summary.absent}</strong> | Total Processed: <strong>{summary.total}</strong>
              </p>
            </div>
          )}

          {/* Student List Sheet */}
          <form onSubmit={(e) => handleSaveAttendance(e, false)}>
            <div className="table-responsive">
              <table className="plain-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Student Name</th>
                    <th>Phone</th>
                    <th>Attendance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceSheet && attendanceSheet.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No active students enrolled in this branch</td>
                    </tr>
                  ) : (
                    attendanceSheet && attendanceSheet.map(s => {
                      const currentStatus = records[s.student_id];
                      return (
                        <tr key={`att-${s.student_id}`} style={{ backgroundColor: currentStatus ? 'transparent' : 'rgba(0,0,0,0.01)' }}>
                          <td>{s.student_id}</td>
                          <td><strong>{s.student_name}</strong></td>
                          <td>{s.student_phone || '-'}</td>
                          <td>
                            {currentStatus === 'leave' ? (
                              <span className="badge-outline" style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#2563EB', borderColor: 'rgba(59, 130, 246, 0.3)', fontWeight: 'bold' }}>
                                🏖️ ON APPROVED LEAVE
                              </span>
                            ) : canEdit ? (
                              <div>
                                {!currentStatus ? (
                                  /* Unselected Row State: Neutral Outlined Buttons */
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                      type="button"
                                      className="btn btn-sm"
                                      style={{ minWidth: '85px', borderColor: 'var(--color-border)' }}
                                      onClick={() => handleToggleStatus(s.student_id, 'present')}
                                      disabled={saving || locking}
                                    >
                                      ✓ Present
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm"
                                      style={{ minWidth: '85px', borderColor: 'var(--color-border)' }}
                                      onClick={() => handleToggleStatus(s.student_id, 'absent')}
                                      disabled={saving || locking}
                                    >
                                      ✗ Absent
                                    </button>
                                  </div>
                                ) : (
                                  /* Selected Row State */
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                    <span 
                                      className={`badge-outline ${currentStatus === 'present' ? 'status-good' : 'status-critical'}`} 
                                      style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem', fontWeight: 'bold' }}
                                    >
                                      {currentStatus === 'present' ? '✓ PRESENT' : '✗ ABSENT'}
                                    </span>
                                    <button
                                      type="button"
                                      className="btn btn-sm"
                                      style={{ 
                                        padding: '0.2rem 0.55rem', 
                                        fontSize: '0.78rem', 
                                        minHeight: '28px', 
                                        color: 'var(--color-text-secondary)',
                                        borderColor: 'var(--color-border)',
                                        background: 'var(--color-surface)'
                                      }}
                                      onClick={() => handleToggleStatus(s.student_id, '')}
                                      title="Change selection for this student"
                                      disabled={saving || locking}
                                    >
                                      ✏️ Change
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className={`badge-outline ${currentStatus === 'present' ? 'status-good' : currentStatus === 'absent' ? 'status-critical' : ''}`}>
                                {currentStatus ? currentStatus.toUpperCase() : 'NOT MARKED'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {canEdit && attendanceSheet && attendanceSheet.length > 0 && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <LoadingButton
                  type="submit"
                  variant="black"
                  loading={saving}
                  loadingText="Saving Attendance... ⟳"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Save Attendance
                </LoadingButton>
                <button 
                  type="button" 
                  onClick={(e) => {
                    e.preventDefault();
                    setLockConfirmOpen(true);
                  }} 
                  className="btn" 
                  style={{ flex: 1, justifyContent: 'center', border: '1px solid var(--color-primary)', fontWeight: 'bold' }}
                  disabled={saving || locking}
                >
                  🔒 Save & Lock Attendance
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default Attendance;
