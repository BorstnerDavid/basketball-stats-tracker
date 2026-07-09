import { useState } from 'react';
import { collection, addDoc, deleteDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { useCollection } from '../../lib/hooks.js';

const TIERS = ['1st tier', '2nd tier', '3rd tier', 'Youth', 'Amateur'];
const FORMATS = ['Round robin', 'Playoffs', 'Groups + playoffs', 'Cup / knockout'];

export default function ManageLeagues() {
  const leagues = useCollection(query(collection(db, 'leagues'), orderBy('name')), []);
  const blank = { name: '', country: '', tier: TIERS[0], format: FORMATS[0], season: '2026/27' };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null); // { id, ...fields }
  const set = (state, setter) => (k) => (e) => setter({ ...state, [k]: e.target.value });
  const setF = set(form, setForm);
  const setE = set(editing, setEditing);

  const add = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'leagues'), form);
    setForm({ ...form, name: '' });
  };

  const save = async (e) => {
    e.preventDefault();
    const { id, ...fields } = editing;
    await updateDoc(doc(db, 'leagues', id), fields);
    setEditing(null);
  };

  const fieldSet = (v, on) => (
    <>
      <div className="field"><label>Name</label><input value={v.name} onChange={on('name')} required /></div>
      <div className="field"><label>Country</label><input value={v.country} onChange={on('country')} required /></div>
      <div className="field"><label>Tier</label>
        <select value={v.tier} onChange={on('tier')}>{TIERS.map((t) => <option key={t}>{t}</option>)}</select>
      </div>
      <div className="field"><label>Format</label>
        <select value={v.format} onChange={on('format')}>{FORMATS.map((f) => <option key={f}>{f}</option>)}</select>
      </div>
      <div className="field"><label>Season</label><input value={v.season} onChange={on('season')} required /></div>
    </>
  );

  return (
    <>
      <h1>Leagues</h1>
      <div className="card" style={{ margin: '20px 0' }}>
        <form className="row" onSubmit={add}>
          {fieldSet(form, setF)}
          <button className="primary">Add league</button>
        </form>
      </div>

      <ul className="list-plain">
        {leagues?.map((l) =>
          editing?.id === l.id ? (
            <li key={l.id}>
              <form className="row" onSubmit={save} style={{ width: '100%' }}>
                {fieldSet(editing, setE)}
                <button className="primary">Save</button>
                <button type="button" className="ghost" onClick={() => setEditing(null)}>Cancel</button>
              </form>
            </li>
          ) : (
            <li key={l.id}>
              <span><strong>{l.name}</strong> <span className="muted">· {l.country} · {l.tier} · {l.format} · {l.season}</span></span>
              <span style={{ display: 'flex', gap: 8 }}>
                <button className="ghost" onClick={() => setEditing({ id: l.id, name: l.name, country: l.country, tier: l.tier, format: l.format, season: l.season })}>Edit</button>
                <button className="ghost" onClick={() => confirm(`Delete ${l.name}?`) && deleteDoc(doc(db, 'leagues', l.id))}>Delete</button>
              </span>
            </li>
          )
        )}
      </ul>
    </>
  );
}
