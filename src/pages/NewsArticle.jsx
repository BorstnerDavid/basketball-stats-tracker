import { useParams, Link } from 'react-router-dom';
import { doc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useDoc } from '../lib/hooks.js';
import { fmtDate } from '../lib/stats.js';

export default function NewsArticle() {
  const { id } = useParams();
  const article = useDoc(doc(db, 'news', id), [id]);

  if (article === undefined) return <p className="muted">Article not found.</p>;
  if (!article) return <p className="muted">Loading…</p>;

  return (
    <article style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="eyebrow"><Link to="/news">← All news</Link> · {fmtDate(article.publishedAt)}</div>
      <h1 style={{ marginBottom: 18 }}>{article.title}</h1>
      {article.imageUrl && <img className="news-hero" src={article.imageUrl} alt="" />}
      <div className="prose">
        {(article.body || '').split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </article>
  );
}
