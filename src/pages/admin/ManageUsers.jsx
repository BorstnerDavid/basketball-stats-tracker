import { useState } from 'react';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db, rtdb, firebaseConfig } from '../../firebase.js';
import { useCollection } from '../../lib/hooks.js';

// Creating a user with the client SDK normally signs that user in, which
// would log the admin out. Trick: create the account on a SECONDARY Firebase
// app instance, then immediately sign it out. No Cloud Functions needed.
async function createReferee(email, password, name) {
  const secondary = getApps().find((a) => a.name === 'secondary')
    || initializeApp(firebaseConfig, 'secondary');
  const secAuth = getAuth(secondary);
  const cred = await createUserWithEmailAndPassword(secAuth, email, password);
  const uid = cred.user.uid;
  await signOut(secAuth);
  await deleteApp(secondary).catch(() => {});
  // The admin (still signed in on the primary app) writes the role in BOTH
  // databases: Firestore drives firestore.rules, the RTDB roles/ node drives
  // database.rules.json (RTDB rules can't read Firestore documents).
  await setDoc(doc(db, 'users', uid), { email, name, role: 'referee' });
  await set(ref(rtdb, `roles/${uid}`), 'referee');
}

async function changeRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role });
  await set(ref(rtdb, `roles/${uid}`), role);
}

export default function ManageUsers() {
  const users = useCollection(collection(db, 'users'), []);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [msg, setMsg] = useState({ ok: '', error: '' });
  const [busy, setBusy] = useState(false);
  const set_ = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg({ ok: '', error: '' });
    try {
      await createReferee(form.email, form.password, form.name);
      setMsg({ ok: `Referee account created for ${form.email}.`, error: '' });
      setForm({ name: '', email: '', password: '' });
    } catch (err) {
      setMsg({ ok: '', error: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1>Users</h1>
      <div className="card" style={{ margin: '20px 0' }}>
        <h3>Create referee account</h3>
        <form className="row" onSubmit={add}>
          <div className="field"><label>Name</label><input value={form.name} onChange={set_('name')} required /></div>
          <div className="field"><label>Email</label><input type="email" value={form.email} onChange={set_('email')} required /></div>
          <div className="field"><label>Password</label><input type="text" minLength={6} value={form.password} onChange={set_('password')} required /></div>
          <button className="primary" disabled={busy}>Create referee</button>
        </form>
        {msg.ok && <p className="ok">{msg.ok}</p>}
        {msg.error && <p className="error">{msg.error}</p>}
      </div>

      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
        <tbody>
          {users?.map((u) => (
            <tr key={u.id}>
              <td>{u.name || '—'}</td>
              <td>{u.email}</td>
              <td>
                <select
                  value={u.role}
                  onChange={(e) => changeRole(u.id, e.target.value)}
                  style={{ width: 'auto' }}
                >
                  <option value="referee">referee</option>
                  <option value="admin">admin</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
