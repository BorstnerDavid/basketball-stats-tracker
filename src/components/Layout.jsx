import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth, logout } from '../context/AuthContext.jsx';

export default function Layout() {
  const { user, role } = useAuth();
  return (
    <>
      <nav className="nav">
        <Link to="/" className="brand">HoopStats</Link>
        <NavLink to="/" end>Scores</NavLink>
        <NavLink to="/news">News</NavLink>
        <span className="spacer" />
        {role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        {(role === 'referee' || role === 'admin') && <NavLink to="/referee">Referee</NavLink>}
        {user ? (
          <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Sign out</a>
        ) : (
          <NavLink to="/login">Sign in</NavLink>
        )}
      </nav>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}
