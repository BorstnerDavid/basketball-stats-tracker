import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Protected({ roles }) {
  const { user, role, loading } = useAuth();
  if (loading) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(role)) {
    return (
      <div className="card">
        <h3>No access</h3>
        <p className="muted">Your account doesn't have permission for this area.</p>
      </div>
    );
  }
  return <Outlet />;
}
