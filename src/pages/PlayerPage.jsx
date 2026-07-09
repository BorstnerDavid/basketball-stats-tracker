import { useParams, Link } from 'react-router-dom';
import { collection, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useCollection, useDoc } from '../lib/hooks.js';

export default function PlayerPage() {
  const { id } = useParams();
  const player = useDoc(doc(db, 'players', id), [id]);
  const team = useDoc(player?.teamId ? doc(db, 'teams', player.teamId) : null, [player?.teamId]);
  const seasons = useCollection(
    query(collection(db, 'seasonStats'), where('playerId', '==', id)),
    [id]
  );

  if (player === undefined) return <p className="muted">Player not found.</p>;
  if (!player) return <p className="muted">Loading…</p>;

  return (
    <>
      <div className="eyebrow">
        {team ? <Link to={`/team/${team.id}`}>{team.name}</Link> : '—'} · #{player.number} · {player.position}
      </div>
      <h1>{player.name}</h1>

      <section className="section" style={{ marginTop: 20 }}>
        <div className="section-head"><h3>Season totals</h3></div>
        <table>
          <thead>
            <tr><th>League</th><th className="num">GP</th><th className="num">PTS</th><th className="num">REB</th><th className="num">AST</th><th className="num">STL</th><th className="num">BLK</th><th className="num">PPG</th></tr>
          </thead>
          <tbody>
            {seasons?.map((s) => (
              <tr key={s.id}>
                <td><LeagueName id={s.leagueId} /></td>
                <td className="num">{s.games}</td>
                <td className="num">{s.pts}</td>
                <td className="num">{s.reb}</td>
                <td className="num">{s.ast}</td>
                <td className="num">{s.stl}</td>
                <td className="num">{s.blk}</td>
                <td className="num"><strong>{s.games ? (s.pts / s.games).toFixed(1) : '–'}</strong></td>
              </tr>
            ))}
            {seasons?.length === 0 && <tr><td colSpan={8} className="muted">No recorded stats yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}

function LeagueName({ id }) {
  const league = useDoc(doc(db, 'leagues', id), [id]);
  return <Link to={`/league/${id}`}>{league?.name || '…'}</Link>;
}
