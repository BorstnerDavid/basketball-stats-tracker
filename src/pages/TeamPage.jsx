import { useParams, useNavigate, Link } from 'react-router-dom';
import { collection, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useCollection, useDoc } from '../lib/hooks.js';
import { fmtDate } from '../lib/stats.js';

export default function TeamPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const team = useDoc(doc(db, 'teams', id), [id]);
  const players = useCollection(
    query(collection(db, 'players'), where('teamId', '==', id), orderBy('number')),
    [id]
  );
  const home = useCollection(query(collection(db, 'matches'), where('homeTeamId', '==', id)), [id]);
  const away = useCollection(query(collection(db, 'matches'), where('awayTeamId', '==', id)), [id]);

  if (team === undefined) return <p className="muted">Team not found.</p>;
  if (!team) return <p className="muted">Loading…</p>;

  const games = [...(home || []), ...(away || [])].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <div className="eyebrow"><Link to={`/league/${team.leagueId}`}>← Back to league</Link></div>
      <h1>{team.name}</h1>

      <div className="grid cols-2" style={{ marginTop: 20 }}>
        <section className="section">
          <div className="section-head"><h3>Roster</h3></div>
          <table>
            <thead><tr><th className="num">#</th><th>Player</th><th>Pos</th></tr></thead>
            <tbody>
              {players?.map((p) => (
                <tr key={p.id} className="clickable" onClick={() => nav(`/player/${p.id}`)}>
                  <td className="num display">{p.number}</td>
                  <td>{p.name}</td>
                  <td className="muted">{p.position}</td>
                </tr>
              ))}
              {players?.length === 0 && <tr><td colSpan={3} className="muted">No players yet.</td></tr>}
            </tbody>
          </table>
        </section>

        <section className="section">
          <div className="section-head"><h3>Games</h3></div>
          <table>
            <tbody>
              {games.map((m) => (
                <tr key={m.id} className="clickable" onClick={() => nav(`/match/${m.id}`)}>
                  <td>{m.homeName} – {m.awayName}</td>
                  <td className="num">
                    {m.status === 'final' ? <strong>{m.homeScore} : {m.awayScore}</strong>
                      : m.status === 'live' ? <span className="badge-live"><span className="dot" />Live</span>
                      : <span className="muted">{fmtDate(m.date)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
