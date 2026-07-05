import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { playClick } from './utils/sound';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import DriverDashboard from './components/Driver/DriverDashboard';
import PassengerView from './components/Passenger/PassengerView';
import AdminPanel from './components/Admin/AdminPanel';

function ProtectedRoute({ children, role }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && user?.role !== role) {
    return <Navigate to={`/${user?.role}`} replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={`/${user?.role}`} replace />;
  }

  return children;
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const handler = (e) => { if (e.target.closest('button')) playClick(); };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, []);

  return (
    <SocketProvider>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/admin" element={
          <ProtectedRoute role="admin"><AdminPanel /></ProtectedRoute>
        } />
        <Route path="/driver" element={
          <ProtectedRoute role="driver"><DriverDashboard /></ProtectedRoute>
        } />
        <Route path="/passenger" element={
          <ProtectedRoute role="passenger"><PassengerView /></ProtectedRoute>
        } />
        <Route path="/" element={
          !isAuthenticated ? <Navigate to="/login" /> :
          user?.role === 'driver' ? <Navigate to="/driver" /> :
          <Navigate to="/passenger" />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
}
