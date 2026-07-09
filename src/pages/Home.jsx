import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useCollection, useRtdb } from '../lib/hooks.js';
import { fmtDate } from '../lib/stats.js';
import Clock from '../components/Clock.jsx';

export default function Home() {
  const nav = useNavigate();
  // All currently live games stream from the Realtime Database live/ node.
  const liveMap = useRtdb('live', []);
  const live = liveMap ? Object.entries(liveMap).map(([id, m]) => ({ id, ...m })) : null;
  const upcoming = useCollection(
    query(collection(db, 'matches'), where('status', '==', 'scheduled'), orderBy('date', 'asc'), limit(8)),
    []
  );
  const recent = useCollection(
    query(collection(db, 'matches'), where('status', '==', 'final'), orderBy('date', 'desc'), limit(8)),
    []
  );
  const leagues = useCollection(query(collection(db, 'leagues'), orderBy('name')), []);
  const news = useCollection(query(collection(db, 'news'), orderBy('publishedAt', 'desc'), limit(3)), []);

  return (
    <>
      {live?.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Live now</h2></div>
          <div className="grid cols-2">
            {live.map((m) => (
              <Link key={m.id} to={`/match/${m.id}`} className="scoreboard">
                <div className="team"><div className="name">{m.homeName}</div><div className="score num">{m.homeScore}</div></div>
                <div className="mid">
                  <span className="badge-live"><span className="dot" />Live</span>
                  <div style={{ color: '#f2efe8', marginTop: 6 }}><Clock clock={m.clock} style={{ fontSize: '1.1rem' }} /></div>
                  <div style={{ color: '#9a9a92', fontSize: '0.8rem' }}>Q{m.period || 1}</div>
                </div>
                <div className="team"><div className="name">{m.awayName}</div><div className="score num">{m.awayScore}</div></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head"><h2>Leagues</h2></div>
        {leagues === null && <p className="muted">Loading…</p>}
        {leagues?.length === 0 && <p className="muted">No leagues yet.</p>}
        <div className="grid cols-3">
          {leagues?.map((l) => (
            <Link key={l.id} to={`/league/${l.id}`} className="card">
              <div className="eyebrow">{l.country} · {l.tier}</div>
              <h3>{l.name}</h3>
              <p className="muted">{l.format} · {l.season}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid cols-2">
        <section className="section">
          <div className="section-head"><h3>Upcoming</h3></div>
          <MatchList matches={upcoming} nav={nav} empty="No scheduled games." />
        </section>
        <section className="section">
          <div className="section-head"><h3>Latest results</h3></div>
          <MatchList matches={recent} nav={nav} empty="No finished games yet." showScore />
        </section>
      </div>

      <section className="section">
        <div className="section-head"><h2>News</h2><Link to="/news" className="muted">All news →</Link></div>
        <div className="grid cols-3">
          {news?.map((n) => (
            <Link key={n.id} to={`/news/${n.id}`} className="card news-card">
              {n.imageUrl && <img src={n.imageUrl} alt="" />}
              <div className="body">
                <div className="eyebrow">{fmtDate(n.publishedAt)}</div>
                <h3>{n.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export function MatchList({ matches, nav, empty, showScore }) {
  if (matches === null) return <p className="muted">Loading…</p>;
  if (matches.length === 0) return <p className="muted">{empty}</p>;
  return (
    <table>
      <tbody>
        {matches.map((m) => (
          <tr key={m.id} className="clickable" onClick={() => nav(`/match/${m.id}`)}>
            <td>{m.homeName} – {m.awayName}</td>
            {showScore ? (
              <td className="num"><strong>{m.homeScore} : {m.awayScore}</strong></td>
            ) : (
              <td className="num muted">{fmtDate(m.date)}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
