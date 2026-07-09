import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  collection, doc, query, where, writeBatch, updateDoc, increment,
} from 'firebase/firestore';
import { ref, update, set, remove, increment as rtIncrement } from 'firebase/database';
import { db, rtdb, auth } from '../../firebase.js';
import { useCollection, useDoc, useRtdb } from '../../lib/hooks.js';
import { STAT_TYPES, emptyLine, eventDelta, applyMatchToSeason } from '../../lib/stats.js';
import { livePath, liveRef, freshClock, clockRemaining, QUARTER_LENGTHS } from '../../lib/live.js';
import Clock from '../../components/Clock.jsx';

export default function LiveEntry() {
  const { matchId } = useParams();
  const nav = useNavigate();
  const match = useDoc(doc(db, 'matches', matchId), [matchId]);
  const live = useRtdb(match?.status === 'live' ? livePath(matchId) : null, [matchId, match?.status]);
  const homePlayers = useCollection(
    match ? query(collection(db, 'players'), where('teamId', '==', match.homeTeamId)) : null,
    [match?.homeTeamId]
  );
  const awayPlayers = useCollection(
    match ? query(collection(db, 'players'), where('teamId', '==', match.awayTeamId)) : null,
    [match?.awayTeamId]
  );

  const [selected, setSelected] = useState(null); // { id, name, number, teamId }
  const [undoStack, setUndoStack] = useState([]);
  const [qLength, setQLength] = useState(10 * 60000);
  const [busy, setBusy] = useState(false);

  if (!match) return <p className="muted">Loading…</p>;
  if (match.status === 'final') {
    return (
      <div className="card">
        <h3>Game finished</h3>
        <p className="muted">This game is final. <Link to={`/match/${matchId}`}>View the box score →</Link></p>
      </div>
    );
  }

  const matchRef = doc(db, 'matches', matchId);
  const clock = live?.clock;

  // First action: flip to live, seed the box score with both rosters, and
  // create the live feed node in the Realtime Database.
  const startGame = async () => {
    const box = {};
    for (const p of [...(homePlayers || []), ...(awayPlayers || [])]) {
      box[p.id] = emptyLine(p.name, p.teamId, p.number);
    }
    await updateDoc(matchRef, { status: 'live', box, period: 1 });
    await set(liveRef(matchId), {
      homeName: match.homeName,
      awayName: match.awayName,
      leagueId: match.leagueId,
      homeScore: 0,
      awayScore: 0,
      period: 1,
      box,
      clock: freshClock(qLength),
    });
  };

  // One referee tap = one Firestore batch (durable record: event + box/score
  // increments) mirrored by one RTDB update (what live viewers listen to).
  const record = async (type) => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const { field, amount, points } = eventDelta(type);
      const eventRef = doc(collection(db, 'matches', matchId, 'events'));
      const eventData = {
        playerId: selected.id,
        playerName: `#${selected.number} ${selected.name}`,
        teamId: selected.teamId,
        type,
        period: live?.period || match.period || 1,
        ts: Date.now(),
        createdBy: auth.currentUser.uid,
      };

      const batch = writeBatch(db);
      batch.set(eventRef, eventData);
      const fsUpdates = { [`box.${selected.id}.${field}`]: increment(amount) };
      const rtUpdates = {
        [`${livePath(matchId)}/box/${selected.id}/${field}`]: rtIncrement(amount),
        [`${livePath(matchId)}/events/${eventRef.id}`]: {
          playerName: eventData.playerName, type, period: eventData.period, ts: eventData.ts,
        },
      };
      if (points) {
        const scoreField = selected.teamId === match.homeTeamId ? 'homeScore' : 'awayScore';
        fsUpdates[scoreField] = increment(points);
        rtUpdates[`${livePath(matchId)}/${scoreField}`] = rtIncrement(points);
      }
      batch.update(matchRef, fsUpdates);
      await batch.commit();
      await update(ref(rtdb), rtUpdates);
      setUndoStack([...undoStack, { eventId: eventRef.id, pid: selected.id, teamId: selected.teamId, field, amount, points }]);
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    const last = undoStack[undoStack.length - 1];
    if (!last || busy) return;
    setBusy(true);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'matches', matchId, 'events', last.eventId));
      const fsUpdates = { [`box.${last.pid}.${last.field}`]: increment(-last.amount) };
      const rtUpdates = {
        [`${livePath(matchId)}/box/${last.pid}/${last.field}`]: rtIncrement(-last.amount),
        [`${livePath(matchId)}/events/${last.eventId}`]: null,
      };
      if (last.points) {
        const scoreField = last.teamId === match.homeTeamId ? 'homeScore' : 'awayScore';
        fsUpdates[scoreField] = increment(-last.points);
        rtUpdates[`${livePath(matchId)}/${scoreField}`] = rtIncrement(-last.points);
      }
      batch.update(matchRef, fsUpdates);
      await batch.commit();
      await update(ref(rtdb), rtUpdates);
      setUndoStack(undoStack.slice(0, -1));
    } finally {
      setBusy(false);
    }
  };

  // Clock is a stored snapshot: freeze the current remaining time, flip
  // running, stamp updatedAt. Clients tick it down locally.
  const toggleClock = () => {
    const remaining = clockRemaining(clock);
    return set(liveRef(matchId, 'clock'), {
      running: !clock?.running,
      remaining,
      length: clock?.length || qLength,
      updatedAt: Date.now(),
    });
  };

  const resetClock = () =>
    set(liveRef(matchId, 'clock'), freshClock(clock?.length || qLength));

  const nextQuarter = async () => {
    await updateDoc(matchRef, { period: increment(1) });
    await update(ref(rtdb), {
      [`${livePath(matchId)}/period`]: rtIncrement(1),
      [`${livePath(matchId)}/clock`]: freshClock(clock?.length || qLength),
    });
  };

  const finishGame = async () => {
    if (!confirm('End the game and lock the result?')) return;
    await updateDoc(matchRef, { status: 'final' });
    await applyMatchToSeason(db, matchId, { ...match, status: 'final' });
    await remove(liveRef(matchId));
    nav(`/match/${matchId}`);
  };

  const homeScore = live?.homeScore ?? match.homeScore;
  const awayScore = live?.awayScore ?? match.awayScore;

  return (
    <>
      <div className="scoreboard">
        <div className="team"><div className="name">{match.homeName}</div><div className="score num">{homeScore}</div></div>
        <div className="mid">
          {match.status === 'live'
            ? <>
                <span className="badge-live"><span className="dot" />Live</span>
                <div style={{ color: '#f2efe8', marginTop: 8 }}><Clock clock={clock} /></div>
                <div style={{ color: '#9a9a92', fontSize: '0.85rem' }}>Quarter {live?.period || 1}</div>
              </>
            : <span className="badge">Not started</span>}
        </div>
        <div className="team"><div className="name">{match.awayName}</div><div className="score num">{awayScore}</div></div>
      </div>

      {match.status === 'scheduled' && (
        <div className="card" style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ marginBottom: 12 }}>Starting the game seeds the box score with both rosters and puts the match live for everyone watching.</p>
          <div className="field" style={{ maxWidth: 200, margin: '0 auto 12px' }}>
            <label>Quarter length</label>
            <select value={qLength} onChange={(e) => setQLength(Number(e.target.value))}>
              {QUARTER_LENGTHS.map(([ms, label]) => <option key={ms} value={ms}>{label}</option>)}
            </select>
          </div>
          <button className="primary" onClick={startGame} disabled={!homePlayers || !awayPlayers}>Start game</button>
        </div>
      )}

      {match.status === 'live' && (
        <>
          <div className="card" style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Clock clock={clock} style={{ fontSize: '2rem' }} />
            <button className="primary" onClick={toggleClock}>{clock?.running ? 'Pause clock' : 'Start clock'}</button>
            <button className="ghost" onClick={resetClock}>Reset clock</button>
            <button className="ghost" onClick={nextQuarter}>Next quarter</button>
            <span style={{ flex: 1 }} />
            <button className="danger" onClick={finishGame}>End game</button>
          </div>

          <div className="grid cols-2" style={{ marginTop: 16 }}>
            <PlayerGrid title={match.homeName} players={homePlayers} selected={selected} onSelect={setSelected} />
            <PlayerGrid title={match.awayName} players={awayPlayers} selected={selected} onSelect={setSelected} />
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3>{selected ? `Record for #${selected.number} ${selected.name}` : 'Select a player above'}</h3>
            <div className="ref-stats" style={{ marginTop: 10 }}>
              {STAT_TYPES.map((s) => (
                <button key={s.key} className={s.points ? 'primary' : ''} disabled={!selected || busy} onClick={() => record(s.key)}>
                  {s.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="ghost" disabled={undoStack.length === 0 || busy} onClick={undo}>
                Undo last ({undoStack.length})
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function PlayerGrid({ title, players, selected, onSelect }) {
  return (
    <section>
      <div className="section-head"><h3>{title}</h3></div>
      <div className="ref-players">
        {players?.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`ref-player ${selected?.id === p.id ? 'selected' : ''}`}
            onClick={() => onSelect({ id: p.id, name: p.name, number: p.number, teamId: p.teamId })}
          >
            <div className="jersey num">#{p.number}</div>
            <div className="muted">{p.name}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
