import { useState } from 'react';
import { collection, addDoc, deleteDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { useCollection } from '../../lib/hooks.js';

export default function ManageTeams() {
  const leagues = useCollection(query(collection(db, 'leagues'), orderBy('name')), []);
  const teams = useCollection(query(collection(db, 'teams'), orderBy('name')), []);
  const [name, setName] = useState('');
  const [leagueId, setLeagueId] = useState('');
  const [editing, setEditing] = useState(null); // { id, name, leagueId }

  const add = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'teams'), { name, leagueId });
    setName('');
  };

  // Team names are denormalized onto match documents (homeName/awayName),
  // so a rename also patches every match the team appears in.
  const save = async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, 'teams', editing.id), { name: editing.name, leagueId: editing.leagueId });
    const { getDocs, where, writeBatch } = await import('firebase/firestore');
    const batch = writeBatch(db);
    const [asHome, asAway] = await Promise.all([
      getDocs(query(collection(db, 'matches'), where('homeTeamId', '==', editing.id))),
      getDocs(query(collection(db, 'matches'), where('awayTeamId', '==', editing.id))),
    ]);
    asHome.forEach((m) => batch.update(m.ref, { homeName: editing.name }));
    asAway.forEach((m) => batch.update(m.ref, { awayName: editing.name }));
    await batch.commit();
    setEditing(null);
  };

  const leagueName = (id) => leagues?.find((l) => l.id === id)?.name || '—';

  const leagueSelect = (value, onChange) => (
    <select value={value} onChange={onChange} required>
      <option value="">Choose league…</option>
      {leagues?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
    </select>
  );

  return (
    <>
      <h1>Teams</h1>
      <div className="card" style={{ margin: '20px 0' }}>
        <form className="row" onSubmit={add}>
          <div className="field"><label>Team name</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="field"><label>League</label>{leagueSelect(leagueId, (e) => setLeagueId(e.target.value))}</div>
          <button className="primary">Add team</button>
        </form>
      </div>

      <ul className="list-plain">
        {teams?.map((t) =>
          editing?.id === t.id ? (
            <li key={t.id}>
              <form className="row" onSubmit={save} style={{ width: '100%' }}>
                <div className="field"><label>Team name</label><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required /></div>
                <div className="field"><label>League</label>{leagueSelect(editing.leagueId, (e) => setEditing({ ...editing, leagueId: e.target.value }))}</div>
                <button className="primary">Save</button>
                <button type="button" className="ghost" onClick={() => setEditing(null)}>Cancel</button>
              </form>
            </li>
          ) : (
            <li key={t.id}>
              <span><strong>{t.name}</strong> <span className="muted">· {leagueName(t.leagueId)}</span></span>
              <span style={{ display: 'flex', gap: 8 }}>
                <button className="ghost" onClick={() => setEditing({ id: t.id, name: t.name, leagueId: t.leagueId })}>Edit</button>
                <button className="ghost" onClick={() => confirm(`Delete ${t.name}?`) && deleteDoc(doc(db, 'teams', t.id))}>Delete</button>
              </span>
            </li>
          )
        )}
      </ul>
    </>
  );
}
