import { buildApiUrl } from '../utils/apiConfig';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SkeletonLoader from '../components/common/SkeletonLoader';
import LoadingButton from '../components/common/LoadingButton';
import EmptyState from '../components/common/EmptyState';
import ErrorState, { InlineError } from '../components/common/ErrorState';

const Courses = () => {
  const { token, user } = useAuth();
  const { showSuccess } = useToast();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const [name, setName] = useState('');
  const [fee, setFee] = useState('');
  const [durationMonths, setDurationMonths] = useState('3');

  const [editName, setEditName] = useState('');
  const [editFee, setEditFee] = useState('');
  const [editDurationMonths, setEditDurationMonths] = useState('3');

  const [error, setError] = useState('');

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(buildApiUrl('/api/courses'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok) setCourses(data);
        else setError(data.message || 'Failed to fetch courses');
      } else {
        setError('Unexpected server response');
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(buildApiUrl('/api/courses'), {
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

      showSuccess(`✓ Course "${name}" created successfully!`);
      setShowAddModal(false);
      setName('');
      setFee('');
      setDurationMonths('3');
      fetchCourses();
    } catch (err) {
      setError(err.message || 'Failed to create course');
    } finally {
      setSubmitting(false);
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
    setSubmitting(true);

    try {
      const res = await fetch(buildApiUrl(`/api/courses/${editingCourse.id}`), {
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

      showSuccess(`✓ Course "${editName}" updated successfully!`);
      setEditingCourse(null);
      fetchCourses();
    } catch (err) {
      setError(err.message || 'Failed to update course');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="header-row">
        <div>
          <h2>Course Management</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Curriculum offerings, tuition fee structure, and duration terms
          </p>
        </div>
        {user?.role === 'admin' && (
          <button onClick={() => { setShowAddModal(!showAddModal); setEditingCourse(null); }} className="btn btn-black">
            {showAddModal ? 'Cancel' : '+ Add Course'}
          </button>
        )}
      </div>

      {error && !loading && (
        <ErrorState
          error={error}
          title="Course Offerings Unavailable"
          onRetry={fetchCourses}
        />
      )}

      {/* Add Course Form */}
      {showAddModal && (
        <div className="card" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <h3>Create New Course</h3>
          {error && <InlineError message={error} onDismiss={() => setError('')} />}

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
                disabled={submitting}
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
                  disabled={submitting}
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
                  disabled={submitting}
                />
              </div>
            </div>

            <LoadingButton
              type="submit"
              variant="black"
              loading={submitting}
              loadingText="Saving Course... ⟳"
              style={{ marginTop: '0.5rem' }}
            >
              Save Course
            </LoadingButton>
          </form>
        </div>
      )}

      {/* Edit Course Form */}
      {editingCourse && (
        <div className="card" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Edit Course: {editingCourse.name}</h3>
            <button onClick={() => setEditingCourse(null)} className="btn btn-sm" disabled={submitting}>Cancel</button>
          </div>
          {error && <InlineError message={error} onDismiss={() => setError('')} />}

          <form onSubmit={handleUpdateCourse} style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label>Course Name</label>
              <input
                type="text"
                className="form-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                disabled={submitting}
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
                  disabled={submitting}
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
                  disabled={submitting}
                />
              </div>
            </div>

            <LoadingButton
              type="submit"
              variant="black"
              loading={submitting}
              loadingText="Saving Changes... ⟳"
              style={{ marginTop: '0.5rem' }}
            >
              Save Changes
            </LoadingButton>
          </form>
        </div>
      )}

      {/* Courses Table / Skeleton / Empty State */}
      <div className="card">
        {loading ? (
          <SkeletonLoader type="table" rows={4} columns={5} />
        ) : courses.length === 0 ? (
          <EmptyState
            type="no-data"
            title="No Courses Configured"
            message="No sewing course curricula have been created yet."
            actionText="+ Create First Course"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
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
                {courses.map(c => (
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
