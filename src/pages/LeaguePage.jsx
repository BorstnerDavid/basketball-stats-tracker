import { useParams, useNavigate, Link } from 'react-router-dom';
import { collection, doc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useCollection, useDoc } from '../lib/hooks.js';
import { fmtDate } from '../lib/stats.js';

export default function LeaguePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const league = useDoc(doc(db, 'leagues', id), [id]);
  const teams = useCollection(query(collection(db, 'teams'), where('leagueId', '==', id)), [id]);
  const matches = useCollection(
    query(collection(db, 'matches'), where('leagueId', '==', id), orderBy('date', 'desc')),
    [id]
  );
  const leaders = useCollection(
    query(collection(db, 'seasonStats'), where('leagueId', '==', id), orderBy('pts', 'desc'), limit(10)),
    [id]
  );

  if (league === undefined) return <p className="muted">League not found.</p>;
  if (!league) return <p className="muted">Loading…</p>;

  const standings = computeStandings(teams || [], matches || []);

  return (
    <>
      <div className="eyebrow">{league.country} · {league.tier} · {league.format}</div>
      <h1>{league.name}</h1>
      <p className="muted" style={{ marginBottom: 24 }}>Season {league.season}</p>

      <div className="grid cols-2">
        <section className="section">
          <div className="section-head"><h3>Standings</h3></div>
          <table>
            <thead><tr><th>#</th><th>Team</th><th className="num">W</th><th className="num">L</th><th className="num">+/-</th></tr></thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.id} className="clickable" onClick={() => nav(`/team/${s.id}`)}>
                  <td className="num">{i + 1}</td>
                  <td>{s.name}</td>
                  <td className="num">{s.w}</td>
                  <td className="num">{s.l}</td>
                  <td className="num">{s.diff > 0 ? `+${s.diff}` : s.diff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="section">
          <div className="section-head"><h3>Scoring leaders</h3></div>
          <table>
            <thead><tr><th>Player</th><th className="num">GP</th><th className="num">PTS</th><th className="num">PPG</th></tr></thead>
            <tbody>
              {leaders?.map((p) => (
                <tr key={p.id} className="clickable" onClick={() => nav(`/player/${p.playerId}`)}>
                  <td>{p.name}</td>
                  <td className="num">{p.games}</td>
                  <td className="num">{p.pts}</td>
                  <td className="num">{p.games ? (p.pts / p.games).toFixed(1) : '–'}</td>
                </tr>
              ))}
              {leaders?.length === 0 && <tr><td colSpan={4} className="muted">No stats yet.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>

      <section className="section">
        <div className="section-head"><h3>Games</h3></div>
        <table>
          <tbody>
            {matches?.map((m) => (
              <tr key={m.id} className="clickable" onClick={() => nav(`/match/${m.id}`)}>
                <td>{m.homeName} – {m.awayName}</td>
                <td className="num">
                  {m.status === 'final' && <strong>{m.homeScore} : {m.awayScore}</strong>}
                  {m.status === 'live' && <span className="badge-live"><span className="dot" />Live</span>}
                  {m.status === 'scheduled' && <span className="muted">{fmtDate(m.date)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="section">
        <div className="section-head"><h3>Teams</h3></div>
        <div className="grid cols-3">
          {teams?.map((t) => (
            <Link key={t.id} to={`/team/${t.id}`} className="card"><h3>{t.name}</h3></Link>
          ))}
        </div>
      </section>
    </>
  );
}

function computeStandings(teams, matches) {
  const rows = Object.fromEntries(teams.map((t) => [t.id, { id: t.id, name: t.name, w: 0, l: 0, diff: 0 }]));
  for (const m of matches) {
    if (m.status !== 'final') continue;
    const home = rows[m.homeTeamId];
    const away = rows[m.awayTeamId];
    if (!home || !away) continue;
    home.diff += m.homeScore - m.awayScore;
    away.diff += m.awayScore - m.homeScore;
    if (m.homeScore > m.awayScore) { home.w++; away.l++; } else { away.w++; home.l++; }
  }
  return Object.values(rows).sort((a, b) => b.w - a.w || b.diff - a.diff);
}
