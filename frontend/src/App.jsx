import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import AttendanceReport from './pages/AttendanceReport';
import FeesReport from './pages/FeesReport';
import LeaveRequests from './pages/LeaveRequests';
import CertificateTemplates from './pages/CertificateTemplates';
import Branches from './pages/Branches';
import BranchDetail from './pages/BranchDetail';
import BranchFinance from './pages/BranchFinance';
import Users from './pages/Users';
import Students from './pages/Students';
import StudentDetail from './pages/StudentDetail';
import CertificateView from './pages/CertificateView';
import Courses from './pages/Courses';
import Attendance from './pages/Attendance';
import Holidays from './pages/Holidays';
import Machines from './pages/Machines';
import MachineDetail from './pages/MachineDetail';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

import ForcePasswordChangeModal from './components/ForcePasswordChangeModal';

function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <ForcePasswordChangeModal />
      <div className="page-container">
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          
          {/* Attendance & Holidays & Leaves */}
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <Attendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave-requests"
            element={
              <ProtectedRoute>
                <LeaveRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/holidays"
            element={
              <ProtectedRoute allowedRoles={['supervisor', 'amir', 'admin']}>
                <Holidays />
              </ProtectedRoute>
            }
          />

          {/* Reports */}
          <Route
            path="/reports/attendance"
            element={
              <ProtectedRoute>
                <AttendanceReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/fees"
            element={
              <ProtectedRoute>
                <FeesReport />
              </ProtectedRoute>
            }
          />

          {/* Machines */}
          <Route
            path="/machines"
            element={
              <ProtectedRoute>
                <Machines />
              </ProtectedRoute>
            }
          />
          <Route
            path="/machines/:id"
            element={
              <ProtectedRoute>
                <MachineDetail />
              </ProtectedRoute>
            }
          />

          {/* Students & Certificates */}
          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <Students />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/:id"
            element={
              <ProtectedRoute>
                <StudentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificates/:id"
            element={
              <ProtectedRoute>
                <CertificateView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <Courses />
              </ProtectedRoute>
            }
          />

          {/* Branches & Finance (Supervisor / Amir / Admin) */}
          <Route
            path="/branches"
            element={
              <ProtectedRoute allowedRoles={['supervisor', 'amir', 'admin']}>
                <Branches />
              </ProtectedRoute>
            }
          />
          <Route
            path="/branches/:id"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'supervisor', 'amir', 'admin']}>
                <BranchDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/branches/:id/finance"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'supervisor', 'amir', 'admin']}>
                <BranchFinance />
              </ProtectedRoute>
            }
          />

          {/* Users & Templates (Admin Only) */}
          <Route
            path="/certificate-templates"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CertificateTemplates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Users />
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </div>
      <Footer />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

