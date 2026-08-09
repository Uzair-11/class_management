import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoImg from '../../../logo_reverse.png';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showManageDropdown, setShowManageDropdown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  const closeMenu = () => {
    setMenuOpen(false);
    setShowManageDropdown(false);
  };

  const handleLogout = () => {
    closeMenu();
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
        <div className="navbar-brand-group" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => { closeMenu(); navigate('/dashboard'); }}>
            <img src={logoImg} alt="Jamaat-e-Islami Hind Logo" className="navbar-logo" />
            <div className="navbar-brand">
              JIH Sewing System
            </div>
          </div>
          <button 
            className="mobile-only"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-primary-dark)' }}
          >
            ☰
          </button>
        </div>

        <div className={`navbar-links ${menuOpen ? 'mobile-menu' : 'desktop-menu'}`}>
          {/* Dashboard */}
          <Link 
            to="/dashboard" 
            className={`navbar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Dashboard
          </Link>

          {/* Students */}
          <Link 
            to="/students" 
            className={`navbar-link ${location.pathname.startsWith('/students') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Students
          </Link>

          {/* Attendance */}
          <Link 
            to="/attendance" 
            className={`navbar-link ${location.pathname.startsWith('/attendance') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Attendance
          </Link>

          {/* Leave Requests */}
          <Link 
            to="/leave-requests" 
            className={`navbar-link ${location.pathname.startsWith('/leave-requests') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Leaves
          </Link>

          {/* Machines */}
          <Link 
            to="/machines" 
            className={`navbar-link ${location.pathname.startsWith('/machines') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Machines
          </Link>

          {/* Holidays (Supervisor / Amir / Admin) */}
          {(role === 'supervisor' || role === 'amir' || role === 'admin') && (
            <Link 
              to="/holidays" 
              className={`navbar-link ${location.pathname.startsWith('/holidays') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              Holidays
            </Link>
          )}

          {/* Reports */}
          <Link 
            to="/reports/attendance" 
            className={`navbar-link ${location.pathname.startsWith('/reports') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Reports
          </Link>

          {/* Manage Dropdown (Branches, Courses, Users) */}
          {(role === 'supervisor' || role === 'amir' || role === 'admin') && (
            <div 
              className="nav-dropdown-container"
              onMouseEnter={() => !menuOpen && setShowManageDropdown(true)}
              onMouseLeave={() => !menuOpen && setShowManageDropdown(false)}
            >
              <button 
                className={`navbar-link ${isManageActive ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', width: menuOpen ? '100%' : 'auto', textAlign: 'left' }}
                onClick={() => setShowManageDropdown(!showManageDropdown)}
              >
                Manage ▾
              </button>

              {showManageDropdown && (
                <div className="nav-dropdown-menu">
                  <Link 
                    to="/branches" 
                    className="nav-dropdown-item"
                    onClick={closeMenu}
                  >
                    🏢 Branches
                  </Link>                  <Link 
                    to="/courses" 
                    className="nav-dropdown-item"
                    onClick={closeMenu}
                  >
                    📚 Courses
                  </Link>                  {role === 'admin' && (
                    <>
                      <Link 
                        to="/certificate-templates" 
                        className="nav-dropdown-item"
                        onClick={closeMenu}
                      >
                        🎓 Cert Templates
                      </Link>
                      <Link 
                        to="/users" 
                        className="nav-dropdown-item"
                        onClick={closeMenu}
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
            onClick={closeMenu}
          >
            {user.name}
          </Link>

          <button onClick={handleLogout} className="btn btn-sm" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', width: menuOpen ? '100%' : 'auto' }}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
