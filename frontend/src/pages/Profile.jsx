import { buildApiUrl } from '../utils/apiConfig';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { token, user } = useAuth();

  const [profileData, setProfileData] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Eye Toggle States
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [passErr, setPassErr] = useState('');

  const fetchProfile = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/auth/me'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setProfileData(data.user);
        setName(data.user.name || '');
        setEmail(data.user.email || '');
        setPhone(data.user.phone || '');
      } else {
        setProfileErr(data.message);
      }
    } catch (err) {
      setProfileErr(err.message);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileErr('');

    try {
      const res = await fetch(buildApiUrl('/api/auth/profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, phone })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');

      setProfileMsg('Profile updated successfully!');
      fetchProfile();
    } catch (err) {
      setProfileErr(err.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassMsg('');
    setPassErr('');

    if (newPassword !== confirmPassword) {
      setPassErr('New password and confirm password do not match');
      return;
    }

    try {
      const res = await fetch(buildApiUrl('/api/auth/change-password'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to change password');

      setPassMsg('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPassErr(err.message);
    }
  };

  return (
    <div>
      <div className="header-row">
        <div>
          <h2>User Account Profile</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>
            Manage your personal account details, system access role, and security credentials
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Personal Info Card */}
        <div className="card">
          <h3>Personal Details</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            Update your primary contact information
          </p>

          {profileMsg && <div style={{ border: '1px solid var(--color-primary)', padding: '0.5rem', marginBottom: '1rem', background: '#E2E6F8' }}>{profileMsg}</div>}
          {profileErr && <div className="error-box">{profileErr}</div>}

          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="text"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. user@example.com"
              />
            </div>

            <div className="form-group">
              <label>System Role & Permissions</label>
              <div style={{ padding: '0.65rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '8px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                🛡️ {profileData?.role || user?.role} ACCESS
              </div>
            </div>

            <button type="submit" className="btn btn-black" style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>
              Save Profile Changes
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="card">
          <h3>Security & Password</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            Update your password to keep your portal account secure
          </p>

          {passMsg && <div style={{ border: '1px solid var(--color-success)', padding: '0.5rem', marginBottom: '1rem', background: 'rgba(46,125,50,0.1)', color: 'var(--color-success)' }}>{passMsg}</div>}
          {passErr && <div className="error-box">{passErr}</div>}

          <form onSubmit={handleChangePassword}>
            {/* Current Password Field */}
            <div className="form-group">
              <label>Current Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '2.5rem' }}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    color: 'var(--color-text-secondary)',
                    padding: '0.2rem'
                  }}
                  title={showCurrentPass ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPass ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div className="form-group">
              <label>New Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '2.5rem' }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  minLength="6"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    color: 'var(--color-text-secondary)',
                    padding: '0.2rem'
                  }}
                  title={showNewPass ? 'Hide password' : 'Show password'}
                >
                  {showNewPass ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="form-group">
              <label>Confirm New Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '2.5rem' }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    color: 'var(--color-text-secondary)',
                    padding: '0.2rem'
                  }}
                  title={showConfirmPass ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPass ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-black" style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
