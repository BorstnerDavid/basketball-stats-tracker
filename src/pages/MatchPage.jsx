import { useParams, Link } from 'react-router-dom';
import { collection, doc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useCollection, useDoc, useRtdb } from '../lib/hooks.js';
import { BOX_COLS, STAT_TYPES, fmtDate } from '../lib/stats.js';
import { livePath } from '../lib/live.js';
import Clock from '../components/Clock.jsx';

export default function MatchPage() {
  const { id } = useParams();
  const match = useDoc(doc(db, 'matches', id), [id]);
  const isLive = match?.status === 'live';

  // Live games stream from the Realtime Database (bandwidth-billed, so the
  // tiny score/box updates are nearly free even with many viewers). Finished
  // games read their durable record from Firestore.
  const live = useRtdb(isLive ? livePath(id) : null, [id, isLive]);
  const finalEvents = useCollection(
    match?.status === 'final'
      ? query(collection(db, 'matches', id, 'events'), orderBy('ts', 'desc'), limit(25))
      : null,
    [id, match?.status]
  );

  if (match === undefined) return <p className="muted">Match not found.</p>;
  if (!match) return <p className="muted">Loading…</p>;

  const homeScore = isLive ? (live?.homeScore ?? 0) : match.homeScore;
  const awayScore = isLive ? (live?.awayScore ?? 0) : match.awayScore;
  const period = isLive ? (live?.period ?? 1) : match.period;
  const boxSource = isLive ? live?.box : match.box;

  const box = Object.entries(boxSource || {}).map(([pid, line]) => ({ pid, ...line }));
  const homeLines = box.filter((l) => l.teamId === match.homeTeamId).sort((a, b) => (b.pts || 0) - (a.pts || 0));
  const awayLines = box.filter((l) => l.teamId === match.awayTeamId).sort((a, b) => (b.pts || 0) - (a.pts || 0));

  const events = isLive
    ? Object.entries(live?.events || {}).map(([eid, e]) => ({ id: eid, ...e })).sort((a, b) => b.ts - a.ts).slice(0, 25)
    : finalEvents || [];

  return (
    <>
      <div className="eyebrow"><Link to={`/league/${match.leagueId}`}>← League page</Link></div>
      <div className="scoreboard" style={{ marginTop: 8 }}>
        <div className="team">
          <div className="name">{match.homeName}</div>
          <div className="score num">{homeScore}</div>
        </div>
        <div className="mid">
          {isLive && <>
            <span className="badge-live"><span className="dot" />Live</span>
            <div style={{ color: '#f2efe8', marginTop: 8 }}><Clock clock={live?.clock} /></div>
            <div style={{ color: '#9a9a92', fontSize: '0.85rem' }}>Quarter {period}</div>
          </>}
          {match.status === 'final' && <span className="badge">Final</span>}
          {match.status === 'scheduled' && <span className="badge">{fmtDate(match.date)}</span>}
        </div>
        <div className="team">
          <div className="name">{match.awayName}</div>
          <div className="score num">{awayScore}</div>
        </div>
      </div>

      {box.length > 0 && (
        <div className="grid cols-2" style={{ marginTop: 24 }}>
          <BoxTable title={match.homeName} lines={homeLines} />
          <BoxTable title={match.awayName} lines={awayLines} />
        </div>
      )}

      {match.status !== 'scheduled' && (
        <section className="section" style={{ marginTop: 24 }}>
          <div className="section-head"><h3>Play by play</h3></div>
          <ul className="list-plain">
            {events.map((e) => (
              <li key={e.id}>
                <span>{e.playerName} · {STAT_TYPES.find((s) => s.key === e.type)?.label || e.type}</span>
                <span className="muted">Q{e.period}</span>
              </li>
            ))}
            {events.length === 0 && <li className="muted">No events yet.</li>}
          </ul>
        </section>
      )}
    </>
  );
}

function BoxTable({ title, lines }) {
  return (
    <section>
      <div className="section-head"><h3>{title}</h3></div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr><th>Player</th>{BOX_COLS.map(([k, label]) => <th key={k} className="num">{label}</th>)}</tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.pid}>
                <td><Link to={`/player/${l.pid}`}>#{l.number} {l.name}</Link></td>
                {BOX_COLS.map(([k]) => <td key={k} className="num">{l[k] || 0}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
