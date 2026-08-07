import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const StudentDetail = () => {
  const { id } = useParams();
  const { token, user } = useAuth();
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

  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

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

  const fetchStudentDetail = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/students/${id}`, {
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
        setError(data.message);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchExamAndCertificate = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/students/${id}/exam`, {
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
  };

  const fetchFeeCycles = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/students/${id}/fee-cycles`, {
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
  };

  const fetchAttendanceHistory = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/attendance/student/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAttendanceHistory(data);
      }
    } catch (err) {
      console.error('Error fetching attendance history:', err);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/leave-requests?student_id=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setLeaveRequests(await res.json());
      }
    } catch (err) {
      console.error('Error fetching leave requests:', err);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [cRes, bRes] = await Promise.all([
        fetch('http://localhost:5000/api/courses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/branches', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
      ]);

      if (cRes.ok) setCourses(await cRes.json());
      if (bRes && bRes.ok) setBranches(await bRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStudentDetail();
    fetchExamAndCertificate();
    fetchFeeCycles();
    fetchAttendanceHistory();
    fetchLeaveRequests();
    fetchDropdownData();
  }, [id, token]);

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    try {
      const res = await fetch(`http://localhost:5000/api/students/${id}`, {
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

      await fetch(`http://localhost:5000/api/students/${id}/status`, {
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

      setMsg('Student details updated successfully');
      setIsEditing(false);
      fetchStudentDetail();
      fetchFeeCycles();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRecordExam = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    try {
      const method = examData ? 'PUT' : 'POST';
      const res = await fetch(`http://localhost:5000/api/students/${id}/exam`, {
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

      setMsg(data.message);
      setIsEditingExam(false);
      fetchExamAndCertificate();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRecordCyclePayment = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (!selectedCycleId) {
      setError('Please select a fee cycle to record payment against');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/fee-cycles/${selectedCycleId}/payments`, {
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

      setMsg('Cycle payment recorded successfully');
      setPayAmount('');
      setSelectedCycleId('');
      fetchFeeCycles();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateLeaveRequest = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    try {
      const res = await fetch('http://localhost:5000/api/leave-requests', {
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

      setMsg('Leave request submitted successfully');
      setShowLeaveModal(false);
      setLeaveReason('');
      fetchLeaveRequests();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to void this payment?')) return;
    setError('');
    setMsg('');

    try {
      const res = await fetch(`http://localhost:5000/api/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to void payment');

      setMsg('Payment record voided successfully');
      fetchFeeCycles();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!student && !error) return <div>Loading student details...</div>;

  return (
    <div>
      <div className="header-row">
        <h2>Student Profile: {student?.name}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowLeaveModal(!showLeaveModal)} className="btn btn-black">
            📝 Request Leave
          </button>
          <button onClick={() => navigate('/students')} className="btn">
            &larr; Back to Students
          </button>
        </div>
      </div>

      {msg && <div style={{ border: '1px solid var(--color-primary)', padding: '0.5rem', marginBottom: '1rem', background: 'var(--color-primary-light)' }}>{msg}</div>}
      {error && <div className="error-box">{error}</div>}

      {/* Leave Request Form Modal/Card */}
      {showLeaveModal && (
        <div className="card" style={{ marginBottom: '1.5rem', borderTop: '4px solid var(--color-primary)' }}>
          <h3>Submit Student Leave Request</h3>
          <form onSubmit={handleCreateLeaveRequest} style={{ marginTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label>Date From *</label>
                <input
                  type="date"
                  className="form-input"
                  value={leaveFrom}
                  onChange={(e) => setLeaveFrom(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Date To *</label>
                <input
                  type="date"
                  className="form-input"
                  value={leaveTo}
                  onChange={(e) => setLeaveTo(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Reason for Leave *</label>
              <input
                type="text"
                className="form-input"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="e.g. Medical reasons / Family function"
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-black">
                Submit Leave Application
              </button>
              <button type="button" onClick={() => setShowLeaveModal(false)} className="btn">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Profile & Exam Column */}
        <div>
          {/* Information Card */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Student Information</h3>
              <button onClick={() => setIsEditing(!isEditing)} className="btn btn-sm">
                {isEditing ? 'Cancel Edit' : 'Edit Details'}
              </button>
            </div>

            {!isEditing ? (
              <div style={{ marginTop: '1rem', lineHeight: '1.8', fontSize: '0.9rem' }}>
                <p><strong>Name:</strong> {student?.name}</p>
                <p><strong>Phone:</strong> {student?.phone || 'Not provided'}</p>
                <p><strong>Address:</strong> {student?.address || 'Not provided'}</p>
                <p><strong>Branch:</strong> {student?.branch_name}</p>
                <p><strong>Course:</strong> {student?.course_name} ({student?.duration_months} Months)</p>
                <p><strong>Admission Date:</strong> {student?.admission_date ? new Date(student.admission_date).toLocaleDateString() : '-'}</p>
                <p><strong>Relief Config:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{student?.relief_type}</span> ({student?.relief_amount ? `₹${student.relief_amount}/mo` : 'No discount'})</p>
                <p><strong>Enrollment Status:</strong> <span className={`badge-outline ${student?.status === 'active' ? 'status-good' : 'status-critical'}`}>{student?.status}</span></p>
              </div>
            ) : (
              <form onSubmit={handleUpdateStudent} style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                  <label>Branch</label>
                  <select
                    className="form-select"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                  >
                    {branches.map(b => (
                      <option key={`eb-${b.id}`} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Course</label>
                  <select
                    className="form-select"
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
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
                  />
                </div>

                <div className="form-group">
                  <label>Enrollment Status</label>
                  <select
                    className="form-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="dropped">Dropped</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-black" style={{ marginTop: '0.5rem' }}>
                  Save Student Changes
                </button>
              </form>
            )}
          </div>

          {/* Examination & Certificate Card */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Examination & Certificate</h3>
              {examData && user?.role === 'admin' && (
                <button onClick={() => setIsEditingExam(!isEditingExam)} className="btn btn-sm">
                  {isEditingExam ? 'Cancel' : 'Edit Result'}
                </button>
              )}
            </div>

            {!examData || isEditingExam ? (
              <form onSubmit={handleRecordExam} style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label>Examination Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Marks (Optional)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={examMarks}
                      onChange={(e) => setExamMarks(e.target.value)}
                      placeholder="e.g. 85"
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Result *</label>
                    <select
                      className="form-select"
                      value={examResult}
                      onChange={(e) => setExamResult(e.target.value)}
                    >
                      <option value="pass">Pass</option>
                      <option value="fail">Fail</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn btn-black" style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>
                  {examData ? 'Update Examination Result' : 'Submit Result & Issue Certificate'}
                </button>
              </form>
            ) : (
              <div style={{ marginTop: '1rem', lineHeight: '1.8', fontSize: '0.9rem' }}>
                <p><strong>Exam Date:</strong> {new Date(examData.exam_date).toLocaleDateString()}</p>
                <p><strong>Marks:</strong> {examData.marks !== null ? examData.marks : 'N/A'}</p>
                <p><strong>Result:</strong> <span className={`badge-outline ${examData.result === 'pass' ? 'status-good' : 'status-critical'}`}>{examData.result}</span></p>
                
                {certData && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--color-border)' }}>
                    <p><strong>Certificate No:</strong> <code>{certData.certificate_number}</code></p>
                    <p><strong>Issue Date:</strong> {new Date(certData.issue_date).toLocaleDateString()}</p>
                    
                    <Link to={`/certificates/${certData.id}`} className="btn btn-black" style={{ display: 'inline-block', marginTop: '0.75rem', textDecoration: 'none', textAlign: 'center' }}>
                      🎓 View & Print Certificate
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Student Leave Request History Card */}
          <div className="card">
            <h3>Leave Requests History</h3>
            <div className="table-responsive" style={{ marginTop: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
              <table className="plain-table">
                <thead>
                  <tr>
                    <th>Dates</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center' }}>No leave requests submitted</td>
                    </tr>
                  ) : (
                    leaveRequests.map(lr => {
                      const stClass = lr.status === 'approved' ? 'status-good' : lr.status === 'rejected' ? 'status-critical' : 'status-warning';
                      return (
                        <tr key={`lr-${lr.id}`}>
                          <td>{new Date(lr.date_from).toLocaleDateString()} - {new Date(lr.date_to).toLocaleDateString()}</td>
                          <td>{lr.reason}</td>
                          <td>
                            <span className={`badge-outline ${stClass}`}>
                              {lr.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Monthly Fee Cycles & Payment Column */}
        <div>
          {/* Running Total Outstanding Header Card */}
          <div className="card" style={{ borderTop: `4px solid ${totalOutstanding > 0 ? 'var(--color-danger)' : 'var(--color-success)'}` }}>
            <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', fontWeight: 'bold' }}>Total Outstanding Dues</div>
            <div className={`badge-outline ${totalOutstanding > 0 ? 'status-critical' : 'status-good'}`} style={{ fontSize: '1.4rem', marginTop: '0.3rem' }}>
              {totalOutstanding > 0 ? `₹${totalOutstanding} Pending` : '✓ Fully Paid'}
            </div>
          </div>

          {/* Monthly Fee Cycles Table Card */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3>Monthly Fee Cycles</h3>
            <div className="table-responsive" style={{ marginTop: '1rem' }}>
              <table className="plain-table">
                <thead>
                  <tr>
                    <th>Cycle</th>
                    <th>Due Date</th>
                    <th>Final Fee</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {feeCycles.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center' }}>No monthly fee cycles generated yet</td>
                    </tr>
                  ) : (
                    feeCycles.map(c => {
                      const stClass = c.status === 'paid' ? 'status-good' : c.status === 'overdue' ? 'status-critical' : c.status === 'partial' ? 'status-warning' : 'status-warning';
                      const bal = parseFloat(c.balance);
                      return (
                        <tr key={`fc-${c.id}`}>
                          <td><strong>Month {c.cycle_number}</strong></td>
                          <td>{new Date(c.due_date).toLocaleDateString()}</td>
                          <td>₹{c.final_amount}</td>
                          <td>₹{c.amount_paid}</td>
                          <td><strong>₹{bal}</strong></td>
                          <td>
                            <span className={`badge-outline ${stClass}`}>
                              {c.status}
                            </span>
                          </td>
                          <td>
                            {bal > 0 && (user?.role === 'teacher' || user?.role === 'admin') ? (
                              <button 
                                onClick={() => {
                                  setSelectedCycleId(c.id.toString());
                                  setPayAmount(bal.toString());
                                }} 
                                className="btn btn-sm"
                              >
                                Pay
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Record Cycle Payment Form */}
          {(user?.role === 'teacher' || user?.role === 'admin') && selectedCycleId && (
            <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
              <h3>Record Cycle Payment</h3>
              <form onSubmit={handleRecordCyclePayment} style={{ marginTop: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Amount (₹) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      min="1"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Payment Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Payment Mode</label>
                    <select
                      className="form-select"
                      value={payMode}
                      onChange={(e) => setPayMode(e.target.value)}
                    >
                      <option value="cash">Cash</option>
                      <option value="online">Online / UPI</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-black" style={{ flex: 1, justifyContent: 'center' }}>
                    Submit Payment Entry
                  </button>
                  <button type="button" onClick={() => setSelectedCycleId('')} className="btn">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Payment Transactions Log */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3>Payment Transactions Log</h3>
            <div className="table-responsive" style={{ marginTop: '1rem', maxHeight: '180px', overflowY: 'auto' }}>
              <table className="plain-table">
                <thead>
                  <tr>
                    <th>Cycle</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Received By</th>
                    {user?.role === 'admin' && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={user?.role === 'admin' ? "6" : "5"} style={{ textAlign: 'center' }}>
                        No payments recorded yet
                      </td>
                    </tr>
                  ) : (
                    payments.map(p => (
                      <tr key={`pay-${p.id}`}>
                        <td>Month {p.cycle_number}</td>
                        <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                        <td><strong>₹{p.amount}</strong></td>
                        <td style={{ textTransform: 'uppercase' }}>{p.payment_mode}</td>
                        <td>{p.received_by_name || 'System'}</td>
                        {user?.role === 'admin' && (
                          <td>
                            <button onClick={() => handleDeletePayment(p.id)} className="btn btn-sm">
                              Void
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

          {/* Attendance History Card */}
          <div className="card">
            <h3>Attendance History Log</h3>
            {attendanceHistory ? (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-primary-light)', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Attendance Score (Leaves Excluded)</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{attendanceHistory.percentage}%</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.82rem' }}>
                    <div>Present: <strong>{attendanceHistory.present_count}</strong> | Absent: <strong>{attendanceHistory.absent_count}</strong></div>
                    <div>Approved Leaves: <strong>{attendanceHistory.leave_count}</strong></div>
                  </div>
                </div>

                <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <table className="plain-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Marked By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceHistory.history.length === 0 ? (
                        <tr>
                          <td colSpan="3" style={{ textAlign: 'center' }}>No attendance history recorded yet</td>
                        </tr>
                      ) : (
                        attendanceHistory.history.map(log => {
                          const stClass = log.status === 'present' ? 'status-good' : log.status === 'absent' ? 'status-critical' : 'badge-outline';
                          return (
                            <tr key={`ah-${log.id}`}>
                              <td>{new Date(log.date).toLocaleDateString()}</td>
                              <td>
                                <span className={`badge-outline ${stClass}`}>
                                  {log.status}
                                </span>
                              </td>
                              <td>{log.marked_by_name || 'System'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>Loading attendance log...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetail;
