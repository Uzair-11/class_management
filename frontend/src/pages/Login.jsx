import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingButton from '../components/common/LoadingButton';
import { InlineError } from '../components/common/ErrorState';
import logoImg from '../../../logo_reverse.png';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedUser = await login(phone, password);
      showSuccess(`Welcome back, ${loggedUser?.name || 'User'}!`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please verify your phone number and password.');
    } finally {
      setLoading(false);
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

        {error && <InlineError message={error} onDismiss={() => setError('')} />}

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
              disabled={loading}
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
                disabled={loading}
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
                disabled={loading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <LoadingButton
            type="submit"
            variant="black"
            loading={loading}
            loadingText="Signing In to Portal... ⟳"
            style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center' }}
          >
            Sign In to Portal
          </LoadingButton>
        </form>

        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', fontSize: '0.78rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
          <div>Jamaat-e-Islami Hind &bull; Official NGO Portal</div>
          <div style={{ fontSize: '0.70rem', color: 'rgba(0, 0, 0, 0.45)', marginTop: '0.25rem', fontWeight: 400 }}>
            System built by Axiom Technologies
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
