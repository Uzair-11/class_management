import React from 'react';
import { useAuth } from '../context/AuthContext';

const DashboardPlaceholder = () => {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-container">
      <h2>Dashboard Placeholder</h2>
      <hr style={{ margin: '1rem 0', borderColor: '#000000' }} />
      <p style={{ marginBottom: '0.5rem' }}>
        <strong>Logged In User:</strong> {user?.name}
      </p>
      <p style={{ marginBottom: '0.5rem' }}>
        <strong>Role:</strong> {user?.role}
      </p>
      <p style={{ marginBottom: '0.5rem' }}>
        <strong>Phone:</strong> {user?.phone}
      </p>
      
      <button onClick={logout} className="btn-logout">
        Sign Out
      </button>
    </div>
  );
};

export default DashboardPlaceholder;
