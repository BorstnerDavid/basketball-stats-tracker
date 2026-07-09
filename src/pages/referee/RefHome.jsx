import { Link } from 'react-router-dom';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCollection } from '../../lib/hooks.js';
import { fmtDate } from '../../lib/stats.js';

export default function RefHome() {
  const { user } = useAuth();
  const matches = useCollection(
    query(collection(db, 'matches'), where('refereeUid', '==', user.uid), orderBy('date', 'desc')),
    [user.uid]
  );

  return (
    <>
      <h1>My games</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Games assigned to you. Open one to run the live scoring console.</p>
      <ul className="list-plain">
        {matches?.map((m) => (
          <li key={m.id}>
            <span>
              <strong>{m.homeName} – {m.awayName}</strong>
              <span className="muted"> · {fmtDate(m.date)}</span>
              {' '}<span className="badge">{m.status}</span>
            </span>
            {m.status !== 'final' && (
              <Link to={`/referee/live/${m.id}`}><button className="primary">{m.status === 'live' ? 'Resume' : 'Start scoring'}</button></Link>
            )}
          </li>
        ))}
        {matches?.length === 0 && <li className="muted">No games assigned to you yet.</li>}
      </ul>
    </>
  );
}
