import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Protected from './components/Protected.jsx';

import Home from './pages/Home.jsx';
import LeaguePage from './pages/LeaguePage.jsx';
import TeamPage from './pages/TeamPage.jsx';
import PlayerPage from './pages/PlayerPage.jsx';
import MatchPage from './pages/MatchPage.jsx';
import NewsList from './pages/NewsList.jsx';
import NewsArticle from './pages/NewsArticle.jsx';
import Login from './pages/Login.jsx';

import AdminHome from './pages/admin/AdminHome.jsx';
import ManageLeagues from './pages/admin/ManageLeagues.jsx';
import ManageTeams from './pages/admin/ManageTeams.jsx';
import ManagePlayers from './pages/admin/ManagePlayers.jsx';
import ManageMatches from './pages/admin/ManageMatches.jsx';
import ManageNews from './pages/admin/ManageNews.jsx';
import ManageUsers from './pages/admin/ManageUsers.jsx';

import RefHome from './pages/referee/RefHome.jsx';
import LiveEntry from './pages/referee/LiveEntry.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/league/:id" element={<LeaguePage />} />
        <Route path="/team/:id" element={<TeamPage />} />
        <Route path="/player/:id" element={<PlayerPage />} />
        <Route path="/match/:id" element={<MatchPage />} />
        <Route path="/news" element={<NewsList />} />
        <Route path="/news/:id" element={<NewsArticle />} />
        <Route path="/login" element={<Login />} />

        <Route element={<Protected roles={['admin']} />}>
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/admin/leagues" element={<ManageLeagues />} />
          <Route path="/admin/teams" element={<ManageTeams />} />
          <Route path="/admin/players" element={<ManagePlayers />} />
          <Route path="/admin/matches" element={<ManageMatches />} />
          <Route path="/admin/news" element={<ManageNews />} />
          <Route path="/admin/users" element={<ManageUsers />} />
        </Route>

        <Route element={<Protected roles={['referee', 'admin']} />}>
          <Route path="/referee" element={<RefHome />} />
          <Route path="/referee/live/:matchId" element={<LiveEntry />} />
        </Route>
      </Route>
    </Routes>
  );
}
