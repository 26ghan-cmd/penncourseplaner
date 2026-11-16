# Placeholder — Penn degree planner

A four-year course planner for University of Pennsylvania undergrads, inspired by Strata Planner.

- Browse ~7,900 Penn courses (Fall 2025–Spring 2027) with Penn Course Review ratings
- Plan Fall/Spring/Summer semesters with drag and drop
- Track College, Wharton, Engineering and Nursing requirements, plus mapped majors
- Weekly schedule with conflict checks, AP/transfer credit, exportable plan
- Accounts: save your plan and settings and open them on any device
- Settings: light/dark/system theme, privacy controls, school and majors

## Running it

Requires Node 22.13 or newer. No packages to install.

```
npm start            # http://localhost:3000
```

Environment variables: `PORT` (default 3000), `DATA_DIR` (where the SQLite database lives, default `./data`),
`NODE_ENV=production` (marks the session cookie Secure; use behind HTTPS).

## Deploying on Render

Accounts need the server, so deploy as a **Web Service** (not a Static Site):

- Runtime: Node · Build command: `echo no build step` · Start command: `npm start`
- Environment: `NODE_ENV=production`, `NODE_VERSION=22.13.0`, `DATA_DIR=/var/data`
- Add a persistent disk mounted at `/var/data` so accounts survive redeploys.

Or use the included `render.yaml` (Blueprint), which sets all of this up.
On Render's free instance type there's no persistent disk: the app works, but accounts are wiped
on every deploy or restart.

## What's stored

- `plnr_prefs` cookie: theme, display and warning preferences (1 year; can be turned off in Settings → Privacy)
- `plnr_sid` cookie: HttpOnly session token (30 days, or about a day if "Stay signed in" is off)
- Browser local storage: a copy of your plan (can be turned off)
- Server: username, scrypt password hash, your plan and preferences. No email, no tracking.

Without the server (any static host), the planner still works and saves to the browser only.

Data: course data from Penn Courses (penncourseplan.com); requirements from the 2026-27 Penn Catalog.
Unofficial — not affiliated with or endorsed by the University of Pennsylvania.
