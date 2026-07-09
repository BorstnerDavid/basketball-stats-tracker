import { useState } from 'react';
import { collection, addDoc, deleteDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { useCollection } from '../../lib/hooks.js';
import { applyMatchToSeason, fmtDate } from '../../lib/stats.js';

// ISO string → value for <input type="datetime-local">
function toLocalInput(iso) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function ManageMatches() {
  const leagues = useCollection(query(collection(db, 'leagues'), orderBy('name')), []);
  const teams = useCollection(query(collection(db, 'teams'), orderBy('name')), []);
  const referees = useCollection(collection(db, 'users'), []);
  const matches = useCollection(query(collection(db, 'matches'), orderBy('date', 'desc')), []);

  const [form, setForm] = useState({ leagueId: '', homeTeamId: '', awayTeamId: '', date: '', refereeUid: '' });
  const [editing, setEditing] = useState(null); // { id, date, refereeUid }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const teamsInLeague = teams?.filter((t) => t.leagueId === form.leagueId) || [];

  const saveEdit = async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, 'matches', editing.id), {
      date: new Date(editing.date).toISOString(),
      refereeUid: editing.refereeUid,
    });
    setEditing(null);
  };

  const add = async (e) => {
    e.preventDefault();
    if (form.homeTeamId === form.awayTeamId) return alert('Pick two different teams.');
    const home = teams.find((t) => t.id === form.homeTeamId);
    const away = teams.find((t) => t.id === form.awayTeamId);
    await addDoc(collection(db, 'matches'), {
      ...form,
      date: new Date(form.date).toISOString(),
      homeName: home.name,
      awayName: away.name,
      status: 'scheduled',
      homeScore: 0,
      awayScore: 0,
      period: 1,
      box: {},
      statsApplied: false,
    });
    setForm({ ...form, homeTeamId: '', awayTeamId: '', date: '' });
  };

  return (
    <>
      <h1>Matches</h1>
      <div className="card" style={{ margin: '20px 0' }}>
        <form className="row" onSubmit={add}>
          <div className="field"><label>League</label>
            <select value={form.leagueId} onChange={set('leagueId')} required>
              <option value="">Choose…</option>
              {leagues?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Home team</label>
            <select value={form.homeTeamId} onChange={set('homeTeamId')} required>
              <option value="">Choose…</option>
              {teamsInLeague.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Away team</label>
            <select value={form.awayTeamId} onChange={set('awayTeamId')} required>
              <option value="">Choose…</option>
              {teamsInLeague.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Tip-off</label><input type="datetime-local" value={form.date} onChange={set('date')} required /></div>
          <div className="field"><label>Referee</label>
            <select value={form.refereeUid} onChange={set('refereeUid')} required>
              <option value="">Choose…</option>
              {referees?.filter((u) => u.role === 'referee' || u.role === 'admin').map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </div>
          <button className="primary">Schedule</button>
        </form>
      </div>

      <table>
        <thead><tr><th>Game</th><th>Date</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {matches?.map((m) => editing?.id === m.id ? (
            <tr key={m.id}>
              <td>{m.homeName} – {m.awayName}</td>
              <td colSpan={3}>
                <form className="row" onSubmit={saveEdit}>
                  <div className="field"><label>Tip-off</label>
                    <input type="datetime-local" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} required />
                  </div>
                  <div className="field"><label>Referee</label>
                    <select value={editing.refereeUid} onChange={(e) => setEditing({ ...editing, refereeUid: e.target.value })} required>
                      {referees?.filter((u) => u.role === 'referee' || u.role === 'admin').map((u) => (
                        <option key={u.id} value={u.id}>{u.name || u.email}</option>
                      ))}
                    </select>
                  </div>
                  <button className="primary">Save</button>
                  <button type="button" className="ghost" onClick={() => setEditing(null)}>Cancel</button>
                </form>
              </td>
            </tr>
          ) : (
            <tr key={m.id}>
              <td>{m.homeName} – {m.awayName} {m.status !== 'scheduled' && <strong className="num">({m.homeScore}:{m.awayScore})</strong>}</td>
              <td className="muted">{fmtDate(m.date)}</td>
              <td>
                <span className="badge">{m.status}</span>
                {m.status === 'final' && (m.statsApplied
                  ? <span className="ok" style={{ marginLeft: 8 }}>Stats applied</span>
                  : <button style={{ marginLeft: 8 }} onClick={() => applyMatchToSeason(db, m.id, m)}>Apply to season stats</button>)}
              </td>
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                {m.status === 'scheduled' && (
                  <button className="ghost" style={{ marginRight: 8 }}
                    onClick={() => setEditing({ id: m.id, date: toLocalInput(m.date), refereeUid: m.refereeUid })}>
                    Edit
                  </button>
                )}
                <button className="ghost" onClick={() => confirm('Delete this match?') && deleteDoc(doc(db, 'matches', m.id))}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
