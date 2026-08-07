import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Courses = () => {
  const { token, user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const [name, setName] = useState('');
  const [fee, setFee] = useState('');
  const [durationMonths, setDurationMonths] = useState('3');

  const [editName, setEditName] = useState('');
  const [editFee, setEditFee] = useState('');
  const [editDurationMonths, setEditDurationMonths] = useState('3');

  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const fetchCourses = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok) setCourses(data);
        else setError(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [token]);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    try {
      const res = await fetch('http://localhost:5000/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          fee: parseFloat(fee),
          duration_months: parseInt(durationMonths)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create course');

      setMsg('Course created successfully!');
      setShowAddModal(false);
      setName('');
      setFee('');
      setDurationMonths('3');
      fetchCourses();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditClick = (c) => {
    setEditingCourse(c);
    setEditName(c.name);
    setEditFee(c.fee);
    setEditDurationMonths(c.duration_months);
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    try {
      const res = await fetch(`http://localhost:5000/api/courses/${editingCourse.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          fee: parseFloat(editFee),
          duration_months: parseInt(editDurationMonths)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update course');

      setMsg('Course updated successfully!');
      setEditingCourse(null);
      fetchCourses();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="header-row">
        <div>
          <h2>Course Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>
            Curriculum offerings, tuition fee structure, and duration terms
          </p>
        </div>
        {user?.role === 'admin' && (
          <button onClick={() => { setShowAddModal(!showAddModal); setEditingCourse(null); }} className="btn btn-black">
            {showAddModal ? 'Cancel' : '+ Add Course'}
          </button>
        )}
      </div>

      {msg && <div style={{ border: '1px solid #000', padding: '0.5rem', marginBottom: '1rem', background: '#f0f0f0' }}>{msg}</div>}
      {error && <div className="error-box">{error}</div>}

      {/* Add Course Form */}
      {showAddModal && (
        <div className="card">
          <h3>Create New Course</h3>
          <form onSubmit={handleCreateCourse} style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label>Course Name *</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Advanced Embroidery Course"
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Tuition Fee (₹) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="e.g. 450"
                  required
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label>Duration (Months)</label>
                <input
                  type="number"
                  className="form-input"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  min="1"
                  max="24"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-black" style={{ marginTop: '0.5rem' }}>
              Save Course
            </button>
          </form>
        </div>
      )}

      {/* Edit Course Form */}
      {editingCourse && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Edit Course: {editingCourse.name}</h3>
            <button onClick={() => setEditingCourse(null)} className="btn btn-sm">Close</button>
          </div>
          <form onSubmit={handleUpdateCourse} style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label>Course Name</label>
              <input
                type="text"
                className="form-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Tuition Fee (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  value={editFee}
                  onChange={(e) => setEditFee(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label>Duration (Months)</label>
                <input
                  type="number"
                  className="form-input"
                  value={editDurationMonths}
                  onChange={(e) => setEditDurationMonths(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-black" style={{ marginTop: '0.5rem' }}>
              Save Changes
            </button>
          </form>
        </div>
      )}

      {/* Courses Table */}
      <div className="table-responsive">
        <table className="plain-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Course Name</th>
              <th>Tuition Fee</th>
              <th>Duration</th>
              {user?.role === 'admin' && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {courses.length === 0 ? (
              <tr>
                <td colSpan={user?.role === 'admin' ? "5" : "4"} style={{ textAlign: 'center' }}>No courses found</td>
              </tr>
            ) : (
              courses.map(c => (
                <tr key={`crs-${c.id}`}>
                  <td>{c.id}</td>
                  <td><strong>{c.name}</strong></td>
                  <td>₹{c.fee}</td>
                  <td>{c.duration_months} Months</td>
                  {user?.role === 'admin' && (
                    <td>
                      <button onClick={() => handleEditClick(c)} className="btn btn-sm">
                        Edit
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

export default Courses;
