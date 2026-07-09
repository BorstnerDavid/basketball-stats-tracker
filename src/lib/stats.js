import { doc, writeBatch, increment } from 'firebase/firestore';

// Buttons shown to the referee. `points` marks scoring events.
export const STAT_TYPES = [
  { key: 'pts2', label: '+2 pts', points: 2 },
  { key: 'pts3', label: '+3 pts', points: 3 },
  { key: 'ft', label: '+1 FT', points: 1 },
  { key: 'reb', label: 'Reb' },
  { key: 'ast', label: 'Ast' },
  { key: 'stl', label: 'Stl' },
  { key: 'blk', label: 'Blk' },
  { key: 'to', label: 'TO' },
  { key: 'foul', label: 'Foul' },
];

export const BOX_COLS = [
  ['pts', 'PTS'], ['reb', 'REB'], ['ast', 'AST'],
  ['stl', 'STL'], ['blk', 'BLK'], ['to', 'TO'], ['fouls', 'PF'],
];

export function emptyLine(name, teamId, number) {
  return { name, teamId, number: number ?? '', pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0, fouls: 0 };
}

// Which box-score field an event type increments, and by how much.
export function eventDelta(type) {
  const t = STAT_TYPES.find((s) => s.key === type);
  if (t?.points) return { field: 'pts', amount: t.points, points: t.points };
  if (type === 'foul') return { field: 'fouls', amount: 1, points: 0 };
  return { field: type, amount: 1, points: 0 };
}

// Called once when a match is finalized: folds the box score into
// per-player season totals (seasonStats/{playerId_leagueId}).
export async function applyMatchToSeason(db, matchId, match) {
  if (match.statsApplied) return;
  const batch = writeBatch(db);
  const box = match.box || {};
  for (const [playerId, line] of Object.entries(box)) {
    const ref = doc(db, 'seasonStats', `${playerId}_${match.leagueId}`);
    batch.set(
      ref,
      {
        playerId,
        leagueId: match.leagueId,
        teamId: line.teamId,
        name: line.name,
        games: increment(1),
        pts: increment(line.pts || 0),
        reb: increment(line.reb || 0),
        ast: increment(line.ast || 0),
        stl: increment(line.stl || 0),
        blk: increment(line.blk || 0),
      },
      { merge: true }
    );
  }
  batch.update(doc(db, 'matches', matchId), { statsApplied: true });
  await batch.commit();
}

export function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
