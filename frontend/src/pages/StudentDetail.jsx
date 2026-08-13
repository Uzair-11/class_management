import { buildApiUrl } from '../utils/apiConfig';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SkeletonLoader from '../components/common/SkeletonLoader';
import LoadingButton from '../components/common/LoadingButton';
import ErrorState, { InlineError } from '../components/common/ErrorState';
import ConfirmModal from '../components/common/ConfirmModal';

const StudentDetail = () => {
  const { id } = useParams();
  const { token, user } = useAuth();
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [feeCycles, setFeeCycles] = useState([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [payments, setPayments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);

  // Exam & Certificate State
  const [examData, setExamData] = useState(null);
  const [certData, setCertData] = useState(null);
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [examMarks, setExamMarks] = useState('');
  const [examResult, setExamResult] = useState('pass');
  const [isEditingExam, setIsEditingExam] = useState(false);

  const [loadingStudent, setLoadingStudent] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [submittingExam, setSubmittingExam] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');

  // Payment Form State (per cycle)
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState('cash');

  // Leave Request Form State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveFrom, setLeaveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [leaveTo, setLeaveTo] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');

  // Edit Student Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [branchId, setBranchId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [status, setStatus] = useState('active');

  // Void payment modal confirmation
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidPaymentId, setVoidPaymentId] = useState(null);
  const [voidingPayment, setVoidingPayment] = useState(false);

  // Delete student modal confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState(false);

  const fetchStudentDetail = useCallback(async () => {
    setLoadingStudent(true);
    setError('');
    try {
      const res = await fetch(buildApiUrl(`/api/students/${id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setStudent(data);
        setName(data.name || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setBranchId(data.branch_id ? data.branch_id.toString() : '');
        setCourseId(data.course_id ? data.course_id.toString() : '');
        setAdmissionDate(data.admission_date ? data.admission_date.split('T')[0] : '');
        setStatus(data.status || 'active');
      } else {
        setError(data.message || 'Failed to load student profile');
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoadingStudent(false);
    }
  }, [id, token]);

  const fetchExamAndCertificate = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl(`/api/students/${id}/exam`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setExamData(data.examination);
        setCertData(data.certificate);
        if (data.examination) {
          setExamDate(data.examination.exam_date ? data.examination.exam_date.split('T')[0] : '');
          setExamMarks(data.examination.marks !== null ? data.examination.marks.toString() : '');
          setExamResult(data.examination.result || 'pass');
        }
      }
    } catch (err) {
      console.error('Error fetching exam data:', err);
    }
  }, [id, token]);

  const fetchFeeCycles = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl(`/api/students/${id}/fee-cycles`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFeeCycles(data.cycles || []);
        setTotalOutstanding(data.total_outstanding || 0);
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error('Error fetching fee cycles:', err);
    }
  }, [id, token]);

  const fetchAttendanceHistory = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl(`/api/attendance/student/${id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAttendanceHistory(data);
      }
    } catch (err) {
      console.error('Error fetching attendance history:', err);
    }
  }, [id, token]);

  const fetchLeaveRequests = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl(`/api/leave-requests?student_id=${id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setLeaveRequests(await res.json());
      }
    } catch (err) {
      console.error('Error fetching leave requests:', err);
    }
  }, [id, token]);

  const fetchDropdownData = useCallback(async () => {
    try {
      const [cRes, bRes] = await Promise.all([
        fetch(buildApiUrl('/api/courses'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(buildApiUrl('/api/branches'), { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
      ]);

      if (cRes && cRes.ok) setCourses(await cRes.json());
      if (bRes && bRes.ok) setBranches(await bRes.json());
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    fetchStudentDetail();
    fetchExamAndCertificate();
    fetchFeeCycles();
    fetchAttendanceHistory();
    fetchLeaveRequests();
    fetchDropdownData();
  }, [fetchStudentDetail, fetchExamAndCertificate, fetchFeeCycles, fetchAttendanceHistory, fetchLeaveRequests, fetchDropdownData]);

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    setError('');
    setUpdatingProfile(true);

    try {
      const res = await fetch(buildApiUrl(`/api/students/${id}`), {
        method: 'PUT',
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
          admission_date: admissionDate
        })
      });

      await fetch(buildApiUrl(`/api/students/${id}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Update failed');
      }

      showSuccess('✓ Student details updated successfully');
      setIsEditing(false);
      fetchStudentDetail();
      fetchFeeCycles();
    } catch (err) {
      setError(err.message || 'Failed to update student profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleDeleteStudent = async () => {
    setDeletingStudent(true);
    setError('');
    try {
      const res = await fetch(buildApiUrl(`/api/students/${id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete student');

      showSuccess(`✓ Student "${student?.name}" deleted successfully`);
      navigate('/students');
    } catch (err) {
      setError(err.message || 'Failed to delete student');
    } finally {
      setDeletingStudent(false);
    }
  };

  const handleRecordExam = async (e) => {
    e.preventDefault();
    setError('');
    setSubmittingExam(true);

    try {
      const method = examData ? 'PUT' : 'POST';
      const res = await fetch(buildApiUrl(`/api/students/${id}/exam`), {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          exam_date: examDate,
          marks: examMarks !== '' ? parseFloat(examMarks) : null,
          result: examResult
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit exam result');

      showSuccess(`✓ ${data.message || 'Exam result recorded successfully'}`);
      setIsEditingExam(false);
      fetchExamAndCertificate();
    } catch (err) {
      setError(err.message || 'Failed to submit exam result');
    } finally {
      setSubmittingExam(false);
    }
  };

  const handleRecordCyclePayment = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedCycleId) {
      setError('Please select a fee cycle to record payment against');
      return;
    }

    setSubmittingPayment(true);

    try {
      const res = await fetch(buildApiUrl(`/api/fee-cycles/${selectedCycleId}/payments`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(payAmount),
          payment_date: payDate,
          payment_mode: payMode
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Cycle payment recording failed');

      showSuccess(`✓ Payment of ₹${payAmount} recorded successfully!`);
      setPayAmount('');
      setSelectedCycleId('');
      fetchFeeCycles();
    } catch (err) {
      setError(err.message || 'Cycle payment recording failed');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleCreateLeaveRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSubmittingLeave(true);

    try {
      const res = await fetch(buildApiUrl('/api/leave-requests'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          student_id: id,
          date_from: leaveFrom,
          date_to: leaveTo,
          reason: leaveReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit leave request');

      showSuccess('✓ Leave request submitted successfully');
      setShowLeaveModal(false);
      setLeaveReason('');
      fetchLeaveRequests();
    } catch (err) {
      setError(err.message || 'Failed to submit leave request');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const confirmVoidPayment = (paymentId) => {
    setVoidPaymentId(paymentId);
    setVoidModalOpen(true);
  };

  const handleVoidPayment = async () => {
    if (!voidPaymentId) return;
    setError('');
    setVoidingPayment(true);

    try {
      const res = await fetch(buildApiUrl(`/api/payments/${voidPaymentId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to void payment');

      showSuccess('✓ Payment record voided successfully');
      setVoidModalOpen(false);
      setVoidPaymentId(null);
      fetchFeeCycles();
    } catch (err) {
      setError(err.message || 'Failed to void payment');
    } finally {
      setVoidingPayment(false);
    }
  };

  if (loadingStudent) {
    return (
      <div>
        <div className="header-row">
          <h2>Student Profile</h2>
        </div>
        <SkeletonLoader type="detail" />
      </div>
    );
  }

  if (error && !student) {
    return (
      <div>
        <div className="header-row">
          <h2>Student Profile</h2>
        </div>
        <ErrorState
          error={error}
          title="Profile Couldn't Be Loaded"
          onRetry={fetchStudentDetail}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="header-row">
        <h2>Student Profile: {student?.name}</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setShowLeaveModal(!showLeaveModal)} className="btn btn-black">
            📝 Request Leave
          </button>
          {user?.role !== 'amir' && (
            <button onClick={() => setDeleteModalOpen(true)} className="btn btn-danger">
              🗑️ Delete Student
            </button>
          )}
          <button onClick={() => navigate('/students')} className="btn">
            &larr; Back to Students
          </button>
        </div>
      </div>

      {error && <InlineError message={error} onDismiss={() => setError('')} />}

      {/* Delete Student Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Student Profile"
        message={`Are you sure you want to permanently delete student "${student?.name}"?`}
        warningText="This action will permanently delete all associated fee cycles, payment receipts, attendance logs, and certificates."
        confirmText="Delete Student Profile"
        confirmVariant="danger"
        loading={deletingStudent}
        onConfirm={handleDeleteStudent}
        onCancel={() => setDeleteModalOpen(false)}
      />

      {/* Void Payment Modal */}
      <ConfirmModal
        isOpen={voidModalOpen}
        title="Void Fee Payment Record"
        message="Are you sure you want to void this payment transaction? This will restore the outstanding fee balance for this cycle."
        warningText="This action will alter the financial ledger audit log."
        confirmText="Void Payment"
        confirmVariant="danger"
        loading={voidingPayment}
        onConfirm={handleVoidPayment}
        onCancel={() => {
          setVoidModalOpen(false);
          setVoidPaymentId(null);
        }}
      />

      {/* Leave Request Form Modal/Card */}
      {showLeaveModal && (
        <div className="card" style={{ marginBottom: '1.5rem', borderTop: '4px solid var(--color-primary)' }}>
          <h3>Submit Student Leave Request</h3>
          <form onSubmit={handleCreateLeaveRequest} style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label>From Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={leaveFrom}
                  onChange={(e) => setLeaveFrom(e.target.value)}
                  required
                  disabled={submittingLeave}
                />
              </div>

              <div className="form-group">
                <label>To Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={leaveTo}
                  onChange={(e) => setLeaveTo(e.target.value)}
                  required
                  disabled={submittingLeave}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Reason for Absence *</label>
                <input
                  type="text"
                  className="form-input"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="e.g. Medical illness or family event"
                  required
                  disabled={submittingLeave}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <LoadingButton
                type="submit"
                variant="black"
                loading={submittingLeave}
                loadingText="Submitting Leave... ⟳"
              >
                Submit Leave Application
              </LoadingButton>
              <button type="button" onClick={() => setShowLeaveModal(false)} className="btn" disabled={submittingLeave}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Top Main Student Profile Details Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Personal & Admission Details</h3>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="btn btn-sm">
              ✏️ Edit Profile
            </button>
          ) : (
            <button onClick={() => setIsEditing(false)} className="btn btn-sm">
              Cancel Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleUpdateStudent}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={updatingProfile}
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={updatingProfile}
                />
              </div>

              <div className="form-group">
                <label>Branch *</label>
                <select
                  className="form-select"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  required
                  disabled={updatingProfile}
                >
                  {branches.map(b => (
                    <option key={`eb-${b.id}`} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Course *</label>
                <select
                  className="form-select"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  required
                  disabled={updatingProfile}
                >
                  {courses.map(c => (
                    <option key={`ec-${c.id}`} value={c.id}>{c.name} (₹{c.fee})</option>
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
                  disabled={updatingProfile}
                />
              </div>

              <div className="form-group">
                <label>Enrollment Status</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={updatingProfile}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive / Dropped</option>
                  <option value="completed">Course Completed</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                className="form-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={updatingProfile}
              />
            </div>

            <LoadingButton
              type="submit"
              variant="black"
              loading={updatingProfile}
              loadingText="Saving Profile... ⟳"
              style={{ marginTop: '0.5rem' }}
            >
              Save Profile Changes
            </LoadingButton>
          </form>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Full Name</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 'bold' }}>{student?.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Phone</div>
              <div style={{ fontSize: '1rem' }}>{student?.phone || 'Not provided'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Branch</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{student?.branch_name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Enrolled Course</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{student?.course_name} (₹{student?.course_fee})</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Status</div>
              <span className={`badge-outline ${student?.status === 'active' ? 'status-good' : 'status-critical'}`}>
                {student?.status}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Total Fee Balance</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: totalOutstanding > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {totalOutstanding > 0 ? `₹${totalOutstanding} Pending` : '✓ Fully Paid'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fee Payment Cycles Ledger Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Fee Payment Cycles Ledger</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          Monthly breakdown and installment payment collection
        </p>

        {/* Record Payment Form */}
        <form onSubmit={handleRecordCyclePayment} style={{ background: 'var(--color-primary-light)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <h4 style={{ marginBottom: '0.5rem', fontSize: '0.92rem' }}>💰 Record Fee Payment</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Select Fee Cycle *</label>
              <select
                className="form-select"
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                required
                disabled={submittingPayment}
              >
                <option value="">-- Choose Pending Cycle --</option>
                {feeCycles.filter(c => parseFloat(c.due_amount) > 0).map(c => (
                  <option key={`fc-opt-${c.id}`} value={c.id}>
                    Cycle #{c.cycle_number} ({c.month_year}) - Due: ₹{c.due_amount}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Payment Amount (₹) *</label>
              <input
                type="number"
                className="form-input"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Amount paid"
                min="1"
                required
                disabled={submittingPayment}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Payment Date</label>
              <input
                type="date"
                className="form-input"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                disabled={submittingPayment}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Payment Mode</label>
              <select
                className="form-select"
                value={payMode}
                onChange={(e) => setPayMode(e.target.value)}
                disabled={submittingPayment}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI / GPay</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          <LoadingButton
            type="submit"
            variant="black"
            loading={submittingPayment}
            loadingText="Recording Payment... ⟳"
            style={{ marginTop: '0.75rem' }}
          >
            Submit Payment Receipt
          </LoadingButton>
        </form>

        {/* Cycles Table */}
        <div className="table-responsive">
          <table className="plain-table">
            <thead>
              <tr>
                <th>Cycle #</th>
                <th>Month</th>
                <th>Cycle Fee</th>
                <th>Paid Amount</th>
                <th>Due Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {feeCycles.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>No fee cycles generated</td>
                </tr>
              ) : (
                feeCycles.map(c => (
                  <tr key={`fc-${c.id}`}>
                    <td>Cycle #{c.cycle_number}</td>
                    <td><strong>{c.month_year}</strong></td>
                    <td>₹{c.amount}</td>
                    <td style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>₹{c.paid_amount}</td>
                    <td style={{ color: c.due_amount > 0 ? 'var(--color-danger)' : 'var(--color-text-secondary)', fontWeight: 'bold' }}>₹{c.due_amount}</td>
                    <td>
                      <span className={`badge-outline ${c.status === 'paid' ? 'status-good' : c.status === 'partial' ? 'status-warning' : 'status-critical'}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Payment Receipts Audit History */}
        {payments.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h4>Payment Receipts History</h4>
            <div className="table-responsive" style={{ marginTop: '0.5rem' }}>
              <table className="plain-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Cycle Month</th>
                    <th>Amount Paid</th>
                    <th>Mode</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={`pay-${p.id}`}>
                      <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                      <td>{p.month_year || '-'}</td>
                      <td><strong>₹{p.amount}</strong></td>
                      <td style={{ textTransform: 'uppercase' }}>{p.payment_mode}</td>
                      <td>
                        <button onClick={() => confirmVoidPayment(p.id)} className="btn btn-sm btn-danger">
                          Void
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Course Examination & Certification Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Course Examination & Certification</h3>
        
        {examData ? (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Exam Date</div>
                <div style={{ fontWeight: 'bold' }}>{new Date(examData.exam_date).toLocaleDateString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Marks Scored</div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{examData.marks !== null ? `${examData.marks}%` : 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Exam Result</div>
                <span className={`badge-outline ${examData.result === 'pass' ? 'status-good' : 'status-critical'}`}>
                  {examData.result?.toUpperCase()}
                </span>
              </div>
              <button onClick={() => setIsEditingExam(!isEditingExam)} className="btn btn-sm">
                ✏️ Edit Marks
              </button>
            </div>

            {/* Certificate View Button */}
            {certData ? (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--color-primary-light)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>📜 Certificate Issued</strong>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                    Certificate #{certData.certificate_number} &bull; Issued on {new Date(certData.issue_date).toLocaleDateString()}
                  </div>
                </div>
                <Link to={`/certificates/${id}`} className="btn btn-black btn-sm">
                  View & Print Certificate
                </Link>
              </div>
            ) : examData.result === 'pass' ? (
              <div style={{ marginTop: '1rem' }}>
                <Link to={`/certificates/${id}`} className="btn btn-black">
                  🎓 Generate & Issue Course Certificate
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ marginTop: '0.5rem' }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>No examination record logged for this student yet.</p>
            {!isEditingExam && (
              <button onClick={() => setIsEditingExam(true)} className="btn btn-black" style={{ marginTop: '0.75rem' }}>
                + Record Final Examination Marks
              </button>
            )}
          </div>
        )}

        {/* Record/Edit Exam Form */}
        {isEditingExam && (
          <form onSubmit={handleRecordExam} style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
            <h4>Record Examination Score</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
              <div className="form-group">
                <label>Exam Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  required
                  disabled={submittingExam}
                />
              </div>

              <div className="form-group">
                <label>Marks Scored (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={examMarks}
                  onChange={(e) => setExamMarks(e.target.value)}
                  placeholder="e.g. 85"
                  min="0"
                  max="100"
                  disabled={submittingExam}
                />
              </div>

              <div className="form-group">
                <label>Final Result *</label>
                <select
                  className="form-select"
                  value={examResult}
                  onChange={(e) => setExamResult(e.target.value)}
                  disabled={submittingExam}
                >
                  <option value="pass">PASS</option>
                  <option value="fail">FAIL</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <LoadingButton
                type="submit"
                variant="black"
                loading={submittingExam}
                loadingText="Submitting Exam Result... ⟳"
              >
                Save Exam Record
              </LoadingButton>
              <button type="button" onClick={() => setIsEditingExam(false)} className="btn" disabled={submittingExam}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Attendance History Summary */}
      {attendanceHistory && (
        <div className="card">
          <h3>Attendance Record Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginTop: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Total Classes</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{attendanceHistory.summary?.total_classes || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Classes Attended</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--color-success)' }}>{attendanceHistory.summary?.present || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Absences</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--color-danger)' }}>{attendanceHistory.summary?.absent || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Attendance Rate</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{attendanceHistory.summary?.percentage || 0}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetail;
