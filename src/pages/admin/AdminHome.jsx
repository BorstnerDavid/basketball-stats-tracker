import { Link } from 'react-router-dom';

const sections = [
  ['leagues', 'Leagues', 'Countries, tiers, formats and seasons'],
  ['teams', 'Teams', 'Create teams and assign them to leagues'],
  ['players', 'Players', 'Rosters, jersey numbers and positions'],
  ['matches', 'Matches', 'Schedule games and assign referees'],
  ['news', 'News', 'Publish articles with images'],
  ['users', 'Users', 'Create referee accounts and manage roles'],
];

export default function AdminHome() {
  return (
    <>
      <h1>Admin</h1>
      <div className="grid cols-3" style={{ marginTop: 20 }}>
        {sections.map(([path, title, desc]) => (
          <Link key={path} to={`/admin/${path}`} className="card">
            <h3>{title}</h3>
            <p className="muted">{desc}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
