import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, Building, UserCheck } from 'lucide-react';

const SupervisorDashboard = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/dashboard/supervisor', {
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
          <h2>Supervisor Operations Console</h2>
          <p style={{ color: 'var(--text-muted)' }}>Operational oversight and center management</p>
        </div>
        <span className="badge badge-supervisor">SUPERVISOR ROLE</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <Building color="#3b82f6" size={28} />
          <h3 style={{ marginTop: '0.5rem' }}>Active Centers</h3>
          <p style={{ color: 'var(--text-muted)' }}>{data?.data?.activeCenters || 0} Managed</p>
        </div>
        <div className="card">
          <UserCheck color="#3b82f6" size={28} />
          <h3 style={{ marginTop: '0.5rem' }}>Assigned Teachers</h3>
          <p style={{ color: 'var(--text-muted)' }}>{data?.data?.assignedTeachers || 0} Members</p>
        </div>
        <div className="card">
          <ClipboardList color="#3b82f6" size={28} />
          <h3 style={{ marginTop: '0.5rem' }}>Monthly Audits</h3>
          <p style={{ color: 'var(--text-muted)' }}>{data?.data?.monthlyAudit || 'Pending'}</p>
        </div>
      </div>
    </div>
  );
};

export default SupervisorDashboard;
