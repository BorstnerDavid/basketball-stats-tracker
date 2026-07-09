import { ref } from 'firebase/database';
import { rtdb } from '../firebase.js';

// The live feed lives at live/{matchId} in the Realtime Database:
// { homeName, awayName, leagueId, homeScore, awayScore, period,
//   clock: { running, remaining, length, updatedAt },
//   box: { playerId: {...line} },
//   events: { eventId: { playerName, type, period, ts } } }
// It exists only while a game is live; the referee deletes it at the buzzer.
// Firestore stays the durable record.

export const livePath = (matchId, sub = '') => `live/${matchId}${sub ? `/${sub}` : ''}`;
export const liveRef = (matchId, sub = '') => ref(rtdb, livePath(matchId, sub));

export const QUARTER_LENGTHS = [
  [5 * 60000, '5 min'],
  [8 * 60000, '8 min'],
  [10 * 60000, '10 min'],
  [12 * 60000, '12 min'],
];

export function freshClock(lengthMs, running = false) {
  return { running, remaining: lengthMs, length: lengthMs, updatedAt: Date.now() };
}

// The clock is stored as a snapshot (remaining at updatedAt) so nobody has to
// write to the database every second - each client ticks it down locally.
export function clockRemaining(clock, now = Date.now()) {
  if (!clock) return 0;
  const base = clock.remaining ?? 0;
  if (!clock.running) return Math.max(0, base);
  return Math.max(0, base - (now - (clock.updatedAt || now)));
}

export function fmtClock(ms) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
