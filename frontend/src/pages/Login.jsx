import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoImg from '../../../logo_reverse.png';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(phone, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src={logoImg} alt="Jamaat-e-Islami Hind Logo" style={{ height: '58px', width: 'auto', marginBottom: '1rem' }} />
          <h1 style={{ fontSize: '1.65rem', color: 'var(--color-primary-dark)', marginBottom: '0.25rem' }}>
            Sewing Classes Management
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>
            Sign in with your phone number and password
          </p>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              type="text"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9000000001"
              required
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label htmlFor="password" style={{ margin: 0 }}>Password</label>
              <a 
                href="#forgot" 
                onClick={(e) => { e.preventDefault(); alert('Please contact your Branch Administrator or System Admin to reset your password.'); }}
                style={{ fontSize: '0.78rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '600' }}
              >
                Forgot password?
              </a>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingRight: '2.5rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
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
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-black" style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center' }}>
            Sign In to Portal
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', fontSize: '0.78rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
          Jamaat-e-Islami Hind &bull; Official NGO Portal
        </div>
      </div>
    </div>
  );
};

export default Login;
