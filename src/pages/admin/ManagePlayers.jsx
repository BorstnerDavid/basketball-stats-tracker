import { useState } from 'react';
import { collection, addDoc, deleteDoc, updateDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { useCollection } from '../../lib/hooks.js';

const POSITIONS = ['G', 'F', 'C', 'PG', 'SG', 'SF', 'PF'];

export default function ManagePlayers() {
  const teams = useCollection(query(collection(db, 'teams'), orderBy('name')), []);
  const [teamId, setTeamId] = useState('');
  const players = useCollection(
    teamId ? query(collection(db, 'players'), where('teamId', '==', teamId), orderBy('number')) : null,
    [teamId]
  );
  const [form, setForm] = useState({ name: '', number: '', position: 'G' });
  const [editing, setEditing] = useState(null); // { id, name, number, position, teamId }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setE = (k) => (e) => setEditing({ ...editing, [k]: e.target.value });

  const add = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'players'), { ...form, number: Number(form.number), teamId });
    setForm({ name: '', number: '', position: form.position });
  };

  const save = async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, 'players', editing.id), {
      name: editing.name,
      number: Number(editing.number),
      position: editing.position,
      teamId: editing.teamId,
    });
    setEditing(null);
  };

  return (
    <>
      <h1>Players</h1>
      <div className="field" style={{ maxWidth: 340, margin: '20px 0' }}>
        <label>Team</label>
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          <option value="">Choose team…</option>
          {teams?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {teamId && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <form className="row" onSubmit={add}>
              <div className="field"><label>Name</label><input value={form.name} onChange={set('name')} required /></div>
              <div className="field"><label>Number</label><input type="number" min="0" max="99" value={form.number} onChange={set('number')} required /></div>
              <div className="field"><label>Position</label>
                <select value={form.position} onChange={set('position')}>{POSITIONS.map((p) => <option key={p}>{p}</option>)}</select>
              </div>
              <button className="primary">Add player</button>
            </form>
          </div>

          <ul className="list-plain">
            {players?.map((p) =>
              editing?.id === p.id ? (
                <li key={p.id}>
                  <form className="row" onSubmit={save} style={{ width: '100%' }}>
                    <div className="field"><label>Name</label><input value={editing.name} onChange={setE('name')} required /></div>
                    <div className="field"><label>Number</label><input type="number" min="0" max="99" value={editing.number} onChange={setE('number')} required /></div>
                    <div className="field"><label>Position</label>
                      <select value={editing.position} onChange={setE('position')}>{POSITIONS.map((x) => <option key={x}>{x}</option>)}</select>
                    </div>
                    <div className="field"><label>Team</label>
                      <select value={editing.teamId} onChange={setE('teamId')}>
                        {teams?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <button className="primary">Save</button>
                    <button type="button" className="ghost" onClick={() => setEditing(null)}>Cancel</button>
                  </form>
                </li>
              ) : (
                <li key={p.id}>
                  <span><strong className="display num">#{p.number}</strong> {p.name} <span className="muted">· {p.position}</span></span>
                  <span style={{ display: 'flex', gap: 8 }}>
                    <button className="ghost" onClick={() => setEditing({ id: p.id, name: p.name, number: p.number, position: p.position, teamId: p.teamId })}>Edit</button>
                    <button className="ghost" onClick={() => confirm(`Delete ${p.name}?`) && deleteDoc(doc(db, 'players', p.id))}>Delete</button>
                  </span>
                </li>
              )
            )}
          </ul>
        </>
      )}
    </>
  );
}
