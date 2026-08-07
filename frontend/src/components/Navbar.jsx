import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoImg from '../../../logo_reverse.png';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showManageDropdown, setShowManageDropdown] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const role = user.role;
  const isManageActive = 
    location.pathname.startsWith('/branches') || 
    location.pathname.startsWith('/courses') || 
    location.pathname === '/users';

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo and Brand Title on single line */}
        <div className="navbar-brand-group" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <img src={logoImg} alt="Jamaat-e-Islami Hind Logo" className="navbar-logo" />
          <div className="navbar-brand">
            JIH Sewing System
          </div>
        </div>

        <div className="navbar-links">
          {/* Dashboard */}
          <Link 
            to="/dashboard" 
            className={`navbar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
          >
            Dashboard
          </Link>

          {/* Students */}
          <Link 
            to="/students" 
            className={`navbar-link ${location.pathname.startsWith('/students') ? 'active' : ''}`}
          >
            Students
          </Link>

          {/* Attendance */}
          <Link 
            to="/attendance" 
            className={`navbar-link ${location.pathname.startsWith('/attendance') ? 'active' : ''}`}
          >
            Attendance
          </Link>

          {/* Leave Requests */}
          <Link 
            to="/leave-requests" 
            className={`navbar-link ${location.pathname.startsWith('/leave-requests') ? 'active' : ''}`}
          >
            Leaves
          </Link>

          {/* Machines */}
          <Link 
            to="/machines" 
            className={`navbar-link ${location.pathname.startsWith('/machines') ? 'active' : ''}`}
          >
            Machines
          </Link>

          {/* Holidays (Supervisor / Amir / Admin) */}
          {(role === 'supervisor' || role === 'amir' || role === 'admin') && (
            <Link 
              to="/holidays" 
              className={`navbar-link ${location.pathname.startsWith('/holidays') ? 'active' : ''}`}
            >
              Holidays
            </Link>
          )}

          {/* Reports */}
          <Link 
            to="/reports/attendance" 
            className={`navbar-link ${location.pathname.startsWith('/reports') ? 'active' : ''}`}
          >
            Reports
          </Link>

          {/* Manage Dropdown (Branches, Courses, Users) */}
          {(role === 'supervisor' || role === 'amir' || role === 'admin') && (
            <div 
              className="nav-dropdown-container"
              onMouseEnter={() => setShowManageDropdown(true)}
              onMouseLeave={() => setShowManageDropdown(false)}
            >
              <button 
                className={`navbar-link ${isManageActive ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => setShowManageDropdown(!showManageDropdown)}
              >
                Manage ▾
              </button>

              {showManageDropdown && (
                <div className="nav-dropdown-menu">
                  <Link 
                    to="/branches" 
                    className="nav-dropdown-item"
                    onClick={() => setShowManageDropdown(false)}
                  >
                    🏢 Branches
                  </Link>                  <Link 
                    to="/courses" 
                    className="nav-dropdown-item"
                    onClick={() => setShowManageDropdown(false)}
                  >
                    📚 Courses
                  </Link>                  {role === 'admin' && (
                    <>
                      <Link 
                        to="/certificate-templates" 
                        className="nav-dropdown-item"
                        onClick={() => setShowManageDropdown(false)}
                      >
                        🎓 Cert Templates
                      </Link>
                      <Link 
                        to="/users" 
                        className="nav-dropdown-item"
                        onClick={() => setShowManageDropdown(false)}
                      >
                        👥 Users
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Profile */}
          <Link 
            to="/profile" 
            className={`navbar-link ${location.pathname === '/profile' ? 'active' : ''}`}
            style={{ fontWeight: 'bold' }}
          >
            {user.name}
          </Link>

          <button onClick={handleLogout} className="btn btn-sm" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
