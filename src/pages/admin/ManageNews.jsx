import { useState } from 'react';
import { collection, addDoc, deleteDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db, auth, cloudinary } from '../../firebase.js';
import { useCollection } from '../../lib/hooks.js';
import { fmtDate } from '../../lib/stats.js';

// Firebase Storage isn't available on the free Spark plan, so news images
// go to Cloudinary (free tier) via an unsigned upload preset.
async function uploadImage(file) {
  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', cloudinary.uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`, {
    method: 'POST',
    body,
  });
  if (!res.ok) throw new Error('Image upload failed');
  const data = await res.json();
  return data.secure_url;
}

export default function ManageNews() {
  const news = useCollection(query(collection(db, 'news'), orderBy('publishedAt', 'desc')), []);
  const blank = { title: '', body: '', file: null };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null); // { id, title, body, imageUrl, file }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const publish = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const imageUrl = form.file ? await uploadImage(form.file) : '';
      await addDoc(collection(db, 'news'), {
        title: form.title,
        body: form.body,
        imageUrl,
        publishedAt: new Date().toISOString(),
        createdBy: auth.currentUser.uid,
      });
      setForm(blank);
      e.target.reset?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const imageUrl = editing.file ? await uploadImage(editing.file) : editing.imageUrl;
      await updateDoc(doc(db, 'news', editing.id), {
        title: editing.title,
        body: editing.body,
        imageUrl,
      });
      setEditing(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const articleFields = (v, on) => (
    <>
      <div className="field"><label>Title</label><input value={v.title} onChange={(e) => on({ ...v, title: e.target.value })} required /></div>
      <div className="field"><label>Body</label><textarea rows={7} value={v.body} onChange={(e) => on({ ...v, body: e.target.value })} required /></div>
      <div className="field">
        <label>{v.imageUrl ? 'Replace image (optional)' : 'Image (optional)'}</label>
        <input type="file" accept="image/*" onChange={(e) => on({ ...v, file: e.target.files[0] || null })} />
      </div>
    </>
  );

  return (
    <>
      <h1>News</h1>
      <div className="card" style={{ margin: '20px 0' }}>
        <form onSubmit={publish}>
          {articleFields(form, setForm)}
          <button className="primary" disabled={busy}>{busy ? 'Working…' : 'Publish article'}</button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>

      <ul className="list-plain">
        {news?.map((n) =>
          editing?.id === n.id ? (
            <li key={n.id}>
              <form onSubmit={save} style={{ width: '100%' }}>
                {articleFields(editing, setEditing)}
                <button className="primary" disabled={busy}>{busy ? 'Working…' : 'Save changes'}</button>
                <button type="button" className="ghost" style={{ marginLeft: 8 }} onClick={() => setEditing(null)}>Cancel</button>
              </form>
            </li>
          ) : (
            <li key={n.id}>
              <span><strong>{n.title}</strong> <span className="muted">· {fmtDate(n.publishedAt)}</span></span>
              <span style={{ display: 'flex', gap: 8 }}>
                <button className="ghost" onClick={() => setEditing({ id: n.id, title: n.title, body: n.body, imageUrl: n.imageUrl || '', file: null })}>Edit</button>
                <button className="ghost" onClick={() => confirm('Delete this article?') && deleteDoc(doc(db, 'news', n.id))}>Delete</button>
              </span>
            </li>
          )
        )}
      </ul>
    </>
  );
}
