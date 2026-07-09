import { Link } from 'react-router-dom';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useCollection } from '../lib/hooks.js';
import { fmtDate } from '../lib/stats.js';

export default function NewsList() {
  const news = useCollection(query(collection(db, 'news'), orderBy('publishedAt', 'desc')), []);
  return (
    <>
      <h1>News</h1>
      <div className="grid cols-3" style={{ marginTop: 20 }}>
        {news?.map((n) => (
          <Link key={n.id} to={`/news/${n.id}`} className="card news-card">
            {n.imageUrl && <img src={n.imageUrl} alt="" />}
            <div className="body">
              <div className="eyebrow">{fmtDate(n.publishedAt)}</div>
              <h3>{n.title}</h3>
              <p className="muted">{(n.body || '').slice(0, 120)}…</p>
            </div>
          </Link>
        ))}
        {news?.length === 0 && <p className="muted">No news yet.</p>}
      </div>
    </>
  );
}
