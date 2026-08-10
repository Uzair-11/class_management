import { buildApiUrl } from '../utils/apiConfig';
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SkeletonLoader from '../components/common/SkeletonLoader';
import LoadingButton from '../components/common/LoadingButton';
import EmptyState from '../components/common/EmptyState';
import ErrorState, { InlineError } from '../components/common/ErrorState';

const Students = () => {
  const { token, user } = useAuth();
  const { showSuccess } = useToast();

  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [branchId, setBranchId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split('T')[0]);

  // Relief State
  const [reliefType, setReliefType] = useState('none');
  const [reliefAmount, setReliefAmount] = useState('0');

  const fetchStudents = useCallback(async (branchFilter = '') => {
    setLoading(true);
    setError('');
    try {
      const url = branchFilter 
        ? buildApiUrl(`/api/students?branch_id=${branchFilter}`) 
        : buildApiUrl('/api/students');
        
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok) setStudents(data);
        else setError(data.message || 'Failed to fetch students directory');
      } else {
        setError('Unexpected response from server');
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchMetadata = useCallback(async () => {
    try {
      const [cRes, bRes] = await Promise.all([
        fetch(buildApiUrl('/api/courses'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(buildApiUrl('/api/branches'), { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
      ]);

      if (cRes && cRes.ok) {
        const cData = await cRes.json();
        setCourses(cData);
        if (cData.length > 0) setCourseId(cData[0].id.toString());
      }

      if (bRes && bRes.ok) {
        const bData = await bRes.json();
        setBranches(bData);
        if (bData.length > 0) setBranchId(bData[0].id.toString());
      }
    } catch (err) {
      console.error('Metadata fetch error:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchStudents(selectedBranchFilter);
    fetchMetadata();
  }, [fetchStudents, fetchMetadata, selectedBranchFilter]);

  // Selected Course details for live fee calculation
  const selectedCourseObj = courses.find(c => c.id.toString() === courseId.toString());
  const originalFee = selectedCourseObj ? parseFloat(selectedCourseObj.fee) : 0;
  
  let computedRelief = 0;
  if (reliefType === 'full') {
    computedRelief = originalFee;
  } else if (reliefType === 'partial') {
    computedRelief = parseFloat(reliefAmount || 0);
  }

  const liveFinalFee = Math.max(0, originalFee - computedRelief);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setError('');

    if (computedRelief > originalFee) {
      setError('Relief amount cannot exceed original course fee');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(buildApiUrl('/api/students'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          phone,
          address,
          branch_id: branchId,
          course_id: courseId,
          admission_date: admissionDate,
          relief_type: reliefType,
          relief_amount: computedRelief
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to register student');

      showSuccess(`✓ Student "${name}" registered successfully!`);
      setShowAddModal(false);
      setName('');
      setPhone('');
      setAddress('');
      setReliefType('none');
      setReliefAmount('0');
      fetchStudents(selectedBranchFilter);
    } catch (err) {
      setError(err.message || 'Failed to register student');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter students by Search Query (Name/Phone)
  const filteredStudents = students.filter(s => {
    const nameMatch = s.name ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const phoneMatch = s.phone ? s.phone.includes(searchQuery) : false;
    return nameMatch || phoneMatch;
  });

  // Calculate Stat Card Metrics
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'active').length;
  const outstandingStudents = students.filter(s => {
    const bal = s.balance !== null && s.balance !== undefined ? parseFloat(s.balance) : parseFloat(s.final_fee || 0);
    return bal > 0;
  }).length;

  return (
    <div>
      <div className="header-row">
        <div>
          <h2>Students Directory</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Enrollment, course assignments, and fee status tracking
          </p>
        </div>
        <button onClick={() => setShowAddModal(!showAddModal)} className="btn btn-black btn-mobile-full">
          {showAddModal ? 'Cancel' : '+ Add Student'}
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>Total Students</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.2rem' }}>{totalStudents}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Registered in system</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>Active Students</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.2rem' }}>{activeStudents}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Currently enrolled</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>Outstanding Dues</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.2rem', color: 'var(--color-danger)' }}>{outstandingStudents}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Students with pending balance</div>
        </div>
      </div>

      {error && !loading && (
        <ErrorState
          error={error}
          title="Directory Couldn't Load"
          onRetry={() => fetchStudents(selectedBranchFilter)}
        />
      )}

      {/* Filter and Search Controls Row */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="student-search">Search by Student Name or Phone</label>
            <input
              id="student-search"
              type="text"
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type student name or phone..."
            />
          </div>

          {user?.role !== 'teacher' && (
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="branch-filter">Filter by Branch Location</label>
              <select
                id="branch-filter"
                className="form-select"
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
              >
                <option value="">-- All Accessible Branches --</option>
                {branches.map(b => (
                  <option key={`bf-${b.id}`} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Add Student Card */}
      {showAddModal && (
        <div className="card" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <h3>Register New Student</h3>
          {error && <InlineError message={error} onDismiss={() => setError('')} />}

          <form onSubmit={handleCreateStudent} style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label>Student Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ayesha Siddiqui"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contact phone"
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label>Branch *</label>
                <select
                  className="form-select"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  required
                  disabled={submitting}
                >
                  <option value="">-- Select Branch --</option>
                  {branches.length > 0 ? (
                    branches.map(b => (
                      <option key={`sb-${b.id}`} value={b.id}>{b.name}</option>
                    ))
                  ) : (
                    <option value="1">Central Branch</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Course *</label>
                <select
                  className="form-select"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  required
                  disabled={submitting}
                >
                  {courses.map(c => (
                    <option key={`sc-${c.id}`} value={c.id}>{c.name} (₹{c.fee})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Admission Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={admissionDate}
                  onChange={(e) => setAdmissionDate(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                className="form-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full residential address"
                disabled={submitting}
              />
            </div>

            {/* Relief Section */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Fee & Relief Setup</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label>Relief Type</label>
                  <select
                    className="form-select"
                    value={reliefType}
                    onChange={(e) => {
                      setReliefType(e.target.value);
                      if (e.target.value === 'none') setReliefAmount('0');
                    }}
                    disabled={submitting}
                  >
                    <option value="none">None (Full Fee)</option>
                    <option value="partial">Partial Relief</option>
                    <option value="full">Full Relief (Free)</option>
                  </select>
                </div>

                {reliefType === 'partial' && (
                  <div className="form-group">
                    <label>Relief Amount (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={reliefAmount}
                      onChange={(e) => setReliefAmount(e.target.value)}
                      min="0"
                      max={originalFee}
                      disabled={submitting}
                    />
                  </div>
                )}

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ color: 'var(--color-text-secondary)' }}>Live Fee Preview:</label>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                    Course Fee: ₹{originalFee} | Final Payable Fee: <u>₹{liveFinalFee}</u>
                  </div>
                </div>
              </div>
            </div>

            <LoadingButton
              type="submit"
              variant="black"
              loading={submitting}
              loadingText="Registering Student... ⟳"
              style={{ marginTop: '1rem' }}
            >
              Save & Register Student
            </LoadingButton>
          </form>
        </div>
      )}

      {/* Students Table or Skeleton / Empty State */}
      {loading ? (
        <SkeletonLoader type="table" rows={6} columns={8} />
      ) : students.length === 0 ? (
        <EmptyState
          type="no-data"
          title="No Students Registered Yet"
          message="No student admissions have been registered in this branch directory."
          actionText="+ Register First Student"
          onAction={() => setShowAddModal(true)}
        />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          type="no-results"
          title="No Students Match Search"
          message={`No student matching "${searchQuery}" was found.`}
          actionText="Reset Search"
          onAction={() => setSearchQuery('')}
        />
      ) : (
        <div className="table-responsive">
          <table className="plain-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Student Name</th>
                <th>Phone</th>
                <th>Branch</th>
                <th>Course</th>
                <th>Status</th>
                <th>Balance Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(s => {
                const bal = s.balance !== null && s.balance !== undefined ? parseFloat(s.balance) : parseFloat(s.final_fee || 0);
                return (
                  <tr key={`st-${s.id}`}>
                    <td>{s.id}</td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.phone || '-'}</td>
                    <td>{s.branch_name}</td>
                    <td>{s.course_name}</td>
                    <td>
                      <span className={`badge-outline ${s.status === 'active' ? 'status-good' : 'status-critical'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      {bal <= 0 ? (
                        <span className="badge-outline status-good">
                          ✓ FULLY PAID
                        </span>
                      ) : (
                        <span className="badge-outline status-warning">
                          ₹{bal} DUE
                        </span>
                      )}
                    </td>
                    <td>
                      <Link to={`/students/${s.id}`} className="btn btn-sm">
                        View / Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Students;
