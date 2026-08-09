import { buildApiUrl } from '../utils/apiConfig';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Compass, Target, Globe } from 'lucide-react';

const AmirDashboard = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(buildApiUrl('/api/dashboard/amir'), {
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
          <h2>Amir Leadership Dashboard</h2>
          <p style={{ color: 'var(--text-muted)' }}>High-level strategic oversight and regional planning</p>
        </div>
        <span className="badge badge-amir">AMIR ROLE</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card">
          <Target color="#8b5cf6" size={28} />
          <h3 style={{ marginTop: '0.5rem' }}>Strategic Goals</h3>
          <p style={{ color: 'var(--text-muted)' }}>{data?.data?.organizationalGoals || 'Loading...'}</p>
        </div>
        <div className="card">
          <Globe color="#8b5cf6" size={28} />
          <h3 style={{ marginTop: '0.5rem' }}>Active Regions</h3>
          <p style={{ color: 'var(--text-muted)' }}>{data?.data?.regionCount || 0} Jurisdictions</p>
        </div>
        <div className="card">
          <Compass color="#8b5cf6" size={28} />
          <h3 style={{ marginTop: '0.5rem' }}>Leadership Reports</h3>
          <p style={{ color: 'var(--text-muted)' }}>{data?.data?.leadershipReports || 0} Pending</p>
        </div>
      </div>
    </div>
  );
};

export default AmirDashboard;
