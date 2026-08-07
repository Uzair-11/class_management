import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, Server, Activity } from 'lucide-react';

const AdminDashboard = () => {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/dashboard/admin', {
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
          <h2>System Administration Portal</h2>
          <p style={{ color: 'var(--text-muted)' }}>Full system governance and permission management</p>
        </div>
        <span className="badge badge-admin">ADMIN ROLE</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card">
          <Server color="#ef4444" size={28} />
          <h3 style={{ marginTop: '0.5rem' }}>System Status</h3>
          <p style={{ color: 'var(--text-muted)' }}>{data?.data?.systemStats || 'Checking...'}</p>
        </div>
        <div className="card">
          <Users color="#ef4444" size={28} />
          <h3 style={{ marginTop: '0.5rem' }}>Total Accounts</h3>
          <p style={{ color: 'var(--text-muted)' }}>{data?.data?.userCount || 0} Registered</p>
        </div>
        <div className="card">
          <Activity color="#ef4444" size={28} />
          <h3 style={{ marginTop: '0.5rem' }}>Security Audit</h3>
          <p style={{ color: 'var(--text-muted)' }}>{data?.data?.systemLogs || 'No issues'}</p>
        </div>
      </div>

      <div className="card">
        <h3>Admin Actions & Capabilities</h3>
        <ul style={{ marginTop: '1rem', marginLeft: '1.2rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
          <li>Manage global users across all roles (Admin, Amir, Supervisor, Teacher)</li>
          <li>Configure database connections and environment parameters</li>
          <li>Inspect real-time authentication logs & RBAC policy definitions</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;
