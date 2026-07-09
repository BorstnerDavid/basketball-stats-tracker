# HoopStats

A basketball league tracker that runs entirely on Firebase's free (Spark) plan.

- **Public site** — leagues, standings, rosters, player stats, box scores, live games (realtime), leaderboards, news
- **Admin panel** (`/admin`) — manage leagues, teams, players, matches, referees, and news
- **Referee console** (`/referee`) — live per-player stat entry that the public sees in real time

Stack: React (Vite) + Firebase Auth + Firestore (durable data) + **Realtime Database (live game feed: scores, box, game clock, play-by-play)** + Firebase Hosting. News images go to Cloudinary's free tier, because Firebase Storage is not available on the Spark plan for new projects.

## 1. Create the Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project (stay on the Spark plan).
2. **Authentication** → Get started → enable the **Email/Password** provider.
3. **Firestore Database** → Create database → production mode → pick a region close to you (e.g. `europe-west`).
4. **Realtime Database** → Create database → locked mode (the rules deploy in step 4). Copy the database URL it shows you.
5. Project settings → Your apps → add a **Web app**. Copy the config object.
6. Paste the config into `src/firebase.js`, including the Realtime Database URL as `databaseURL`.

## 2. Cloudinary (news images)

1. Create a free account at [cloudinary.com](https://cloudinary.com).
2. Settings → Upload → Upload presets → Add upload preset → set **Signing mode: Unsigned**. Note the preset name and your cloud name.
3. Fill both into `cloudinary` in `src/firebase.js`.

(Skip this if you don't need images — articles work without one.)

## 3. Install and run locally

```bash
npm install
npm run dev
```

## 4. Deploy rules, indexes, and hosting

```bash
npm install -g firebase-tools
firebase login
firebase use --add          # select your project
firebase deploy --only firestore,database   # Firestore rules + indexes, RTDB rules
npm run build
firebase deploy --only hosting
```

## 5. Bootstrap the first admin

1. In the Firebase console → Authentication → Add user (your email + password).
2. Copy the user's **UID**.
3. Firestore → start collection `users` → document ID = that UID, with fields:
   - `email` (string): your email
   - `name` (string): your name
   - `role` (string): `admin`
4. Realtime Database → add data at path `roles/<that UID>` with string value `admin` (the RTDB rules can't read Firestore, so roles are mirrored in both).

Sign in on the site — the Admin link appears. From `/admin/users` you can now create referee accounts inside the app (no console needed again); the app keeps both role stores in sync automatically.

## 6. Typical flow

1. Admin creates a **league**, its **teams**, and each team's **players**.
2. Admin schedules a **match** and assigns a **referee**.
3. The referee opens `/referee`, picks the quarter length, and starts the game. The console has a **game clock** (start / pause / reset, auto-reset on next quarter) and per-player stat buttons with undo. Every tap writes one durable event to Firestore and mirrors the score, box, clock, and play-by-play into the Realtime Database `live/` node.
4. Public viewers watching the match page (or the home page's live scoreboards) stream everything — including the ticking clock — from the Realtime Database.
5. The referee ends the game: the result is locked in Firestore, the box score is folded into per-player **season totals** (league leaderboards), and the live node is deleted.

## Free-tier notes

- **No Cloud Functions** on Spark, so roles are stored in the `users` collection and enforced by `firestore.rules`, and referee accounts are created client-side via a secondary Firebase app instance (see `ManageUsers.jsx`). Roles are mirrored to the RTDB `roles/` node because `database.rules.json` can't read Firestore.
- **Live games cost almost nothing.** The Realtime Database is billed by bandwidth (10 GB/month free), not per read, so many viewers streaming tiny score updates is fine. The clock generates no traffic at all while running: it's stored as a snapshot (remaining time + timestamp) and every client ticks it down locally.
- **Firestore quotas** (per day): 50k reads, 20k writes, 20k deletes, 1 GB storage. A full game is a few hundred writes — trivial. Finished games read their box score and last 25 play-by-play events from Firestore.
- **Hosting**: 10 GB storage, 360 MB/day transfer — plenty for this app.
- Hiding admin/referee UI is cosmetic; `firestore.rules` is what actually protects the data. Deploy it before inviting anyone.

## Project structure

```
src/
  firebase.js            Firebase + Cloudinary config
  context/AuthContext    auth state + role from users collection
  lib/hooks.js           realtime Firestore + Realtime Database hooks
  lib/stats.js           stat types, box-score math, season aggregation
  lib/live.js            live feed paths + game clock math
  components/            layout, route guards, game clock
  pages/                 public pages (home, league, team, player, match, news)
  pages/admin/           leagues, teams, players, matches, news, users
  pages/referee/         assigned games + live scoring console
firestore.rules          role-based security rules (durable data)
database.rules.json      Realtime Database rules (live feed + role mirror)
firestore.indexes.json   composite indexes for the app's queries
firebase.json            hosting + firestore deploy config
```
