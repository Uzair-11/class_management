import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, GraduationCap, Calendar } from 'lucide-react';

const TeacherDashboard = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/dashboard/teacher', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((resData) => setData(resData))
      .catch(console.error);
  }, [token]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Teacher Class Workstation</h2>
          <p style={{ color: 'var(--text-muted)' }}>Classroom sessions and student tracking</p>
        </div>
        <span className="badge badge-teacher">TEACHER ROLE</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <BookOpen color="#10b981" size={28} />
          <h3 style={{ marginTop: '0.5rem' }}>Active Classes</h3>
          <p style={{ color: 'var(--text-muted)' }}>{data?.data?.activeClasses || 0} Courses</p>
        </div>
        <div className="card">
          <GraduationCap color="#10b981" size={28} />
          <h3 style={{ marginTop: '0.5rem' }}>Total Students</h3>
          <p style={{ color: 'var(--text-muted)' }}>{data?.data?.totalStudents || 0} Enrolled</p>
        </div>
        <div className="card">
          <Calendar color="#10b981" size={28} />
          <h3 style={{ marginTop: '0.5rem' }}>Upcoming Lessons</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            {data?.data?.upcomingLessons ? data.data.upcomingLessons.join(', ') : 'None'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
