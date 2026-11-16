// Placeholder — Penn degree planner server.
// Zero dependencies: Node's built-in http, crypto, zlib and sqlite (Node >= 22.13).
// Serves the static app and a small JSON API for accounts and saved plans.
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const zlib = require("node:zlib");
const { DatabaseSync } = require("node:sqlite");

const PORT = +process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const PROD = process.env.NODE_ENV === "production";
const SESSION_COOKIE = "plnr_sid";
const SESSION_DAYS = 30;
const MAX_BODY = 512 * 1024;

// ---------- database ----------
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, "planner.db"));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    pw_hash TEXT NOT NULL,
    pw_salt TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    persistent INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS user_data (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    state TEXT,
    prefs TEXT,
    updated_at INTEGER NOT NULL
  );
`);
// Accounts sign in with email. Older databases had username-only accounts: add the column.
if (!db.prepare("PRAGMA table_info(users)").all().some(c => c.name === "email")) db.exec("ALTER TABLE users ADD COLUMN email TEXT COLLATE NOCASE");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_email ON users(email)");
const q = {
  userByLogin: db.prepare("SELECT * FROM users WHERE email = ?1 OR (email IS NULL AND username = ?1)"),
  userByEmail: db.prepare("SELECT id FROM users WHERE email = ? OR username = ?"),
  userById: db.prepare("SELECT id, username, email, created_at FROM users WHERE id = ?"),
  setEmail: db.prepare("UPDATE users SET email = ?, username = ? WHERE id = ?"),
  insertReset: db.prepare("INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)"),
  reset: db.prepare("SELECT * FROM password_resets WHERE token_hash = ?"),
  deleteResets: db.prepare("DELETE FROM password_resets WHERE user_id = ?"),
  purgeResets: db.prepare("DELETE FROM password_resets WHERE expires_at < ?"),
  deleteAllSessions: db.prepare("DELETE FROM sessions WHERE user_id = ?"),
  pwById: db.prepare("SELECT pw_hash, pw_salt FROM users WHERE id = ?"),
  insertUser: db.prepare("INSERT INTO users (username, email, pw_hash, pw_salt, created_at) VALUES (?, ?, ?, ?, ?)"),
  updatePw: db.prepare("UPDATE users SET pw_hash = ?, pw_salt = ? WHERE id = ?"),
  deleteUser: db.prepare("DELETE FROM users WHERE id = ?"),
  insertSession: db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, persistent) VALUES (?, ?, ?, ?)"),
  session: db.prepare("SELECT * FROM sessions WHERE token_hash = ?"),
  deleteSession: db.prepare("DELETE FROM sessions WHERE token_hash = ?"),
  deleteUserSessionsExcept: db.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?"),
  purgeSessions: db.prepare("DELETE FROM sessions WHERE expires_at < ?"),
  getData: db.prepare("SELECT state, prefs, updated_at FROM user_data WHERE user_id = ?"),
  upsertState: db.prepare(`INSERT INTO user_data (user_id, state, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`),
  upsertPrefs: db.prepare(`INSERT INTO user_data (user_id, prefs, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET prefs = excluded.prefs, updated_at = excluded.updated_at`),
};
setInterval(() => { q.purgeSessions.run(Date.now()); q.purgeResets.run(Date.now()); }, 6 * 3600 * 1000).unref();

// ---------- auth helpers ----------
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
const sha256 = s => crypto.createHash("sha256").update(s).digest("hex");
function checkPw(pw, row) {
  const a = Buffer.from(hashPw(pw, row.pw_salt), "hex"), b = Buffer.from(row.pw_hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const DUMMY = { pw_salt: "00", pw_hash: hashPw("dummy-password", "00") };
const EMAIL_RE = /^[^\s@"<>()\[\],;:]+@[^\s@"<>()\[\],;:]+\.[a-z]{2,}$/i;
const normEmail = e => String(e || "").trim().toLowerCase();
const validEmail = e => e.length <= 254 && EMAIL_RE.test(e) ? null : "Enter a valid email address.";
const validPw = p => (typeof p !== "string" || p.length < 8 || p.length > 200) ? "Passwords need at least 8 characters." : null;

// ---------- email (optional) ----------
// Password-reset emails are sent through Resend's HTTP API when RESEND_API_KEY and MAIL_FROM are set.
const MAIL_ON = !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
const APP_URL = (process.env.APP_URL || "").replace(/\/$/, "");
async function sendMail(to, subject, text) {
  if (!MAIL_ON) return false;
  const r = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text }),
  });
  if (!r.ok) console.error("Email send failed:", r.status, await r.text().catch(() => ""));
  return r.ok;
}
function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("="); if (i < 0) continue;
    const k = part.slice(0, i).trim(); if (!k) continue;
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { out[k] = part.slice(i + 1).trim(); }
  }
  return out;
}
function sessionCookie(token, persistent) {
  const parts = [`${SESSION_COOKIE}=${token}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  if (PROD) parts.push("Secure");
  if (persistent) parts.push(`Max-Age=${SESSION_DAYS * 86400}`);
  return parts.join("; ");
}
const clearCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${PROD ? "; Secure" : ""}`;
function startSession(res, userId, persistent) {
  const token = crypto.randomBytes(32).toString("base64url");
  const days = persistent ? SESSION_DAYS : 1;
  q.insertSession.run(sha256(token), userId, Date.now() + days * 86400 * 1000, persistent ? 1 : 0);
  res.setHeader("Set-Cookie", sessionCookie(token, persistent));
  return token;
}
function currentUser(req) {
  const token = parseCookies(req)[SESSION_COOKIE]; if (!token) return null;
  const s = q.session.get(sha256(token));
  if (!s || s.expires_at < Date.now()) { if (s) q.deleteSession.run(s.token_hash); return null; }
  const u = q.userById.get(s.user_id);
  return u ? { ...u, tokenHash: s.token_hash } : null;
}

// Simple in-memory rate limit for auth endpoints: 10 attempts / 10 min per IP+email.
const attempts = new Map();
function limited(key) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const a = (attempts.get(key) || []).filter(t => now - t < win);
  a.push(now); attempts.set(key, a);
  if (attempts.size > 5000) for (const [k, v] of attempts) if (!v.some(t => now - t < win)) attempts.delete(k);
  return a.length > 10;
}
const clientIp = req => (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "";

// ---------- http helpers ----------
const SEC_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
};
function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...SEC_HEADERS, ...headers });
  res.end(body);
}
function json(res, status, obj) { send(res, status, JSON.stringify(obj), { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); }
function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error("too large"), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { if (!chunks.length) return resolve({}); try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch { reject(Object.assign(new Error("bad json"), { status: 400 })); } });
    req.on("error", reject);
  });
}

// ---------- static files (cached, gzip/brotli) ----------
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8" };
const PUBLIC = new Set(["/index.html", "/app.js", "/programs.js", "/theme.js", "/courses.json", "/robots.txt"]);
const cache = new Map();
function loadStatic(p) {
  const file = path.join(ROOT, p);
  const st = fs.statSync(file);
  const hit = cache.get(p);
  if (hit && hit.mtime === st.mtimeMs) return hit;
  const raw = fs.readFileSync(file);
  const entry = { mtime: st.mtimeMs, raw, gz: zlib.gzipSync(raw, { level: 9 }), br: zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } }), etag: '"' + sha256(raw).slice(0, 20) + '"', type: TYPES[path.extname(p)] || "application/octet-stream" };
  cache.set(p, entry); return entry;
}
function serveStatic(req, res, pathname) {
  let p = pathname === "/" ? "/index.html" : pathname;
  if (!PUBLIC.has(p)) p = "/index.html"; // single-page app: unknown paths get the app
  let f; try { f = loadStatic(p); } catch { return send(res, 404, "Not found", { "Content-Type": "text/plain" }); }
  const headers = { "Content-Type": f.type, ETag: f.etag, Vary: "Accept-Encoding", "Cache-Control": p === "/courses.json" ? "public, max-age=3600" : "no-cache" };
  if (req.headers["if-none-match"] === f.etag) return send(res, 304, "", headers);
  const ae = req.headers["accept-encoding"] || "";
  if (/\bbr\b/.test(ae)) return send(res, 200, req.method === "HEAD" ? "" : f.br, { ...headers, "Content-Encoding": "br" });
  if (/\bgzip\b/.test(ae)) return send(res, 200, req.method === "HEAD" ? "" : f.gz, { ...headers, "Content-Encoding": "gzip" });
  send(res, 200, req.method === "HEAD" ? "" : f.raw, headers);
}

// ---------- API ----------
function userPayload(u) {
  const d = q.getData.get(u.id) || {};
  let state = null, prefs = null;
  try { state = d.state ? JSON.parse(d.state) : null; } catch {}
  try { prefs = d.prefs ? JSON.parse(d.prefs) : null; } catch {}
  return { user: { email: u.email || null, username: u.username, createdAt: u.created_at }, state, prefs, updatedAt: d.updated_at || 0 };
}
async function api(req, res, pathname) {
  // CSRF defence: state-changing requests must be same-origin JSON with our custom header.
  if (req.method !== "GET") {
    if (req.headers["x-planner"] !== "1" || !/^application\/json/.test(req.headers["content-type"] || "")) return json(res, 403, { error: "Bad request origin." });
    const origin = req.headers.origin;
    if (origin && new URL(origin).host !== req.headers.host) return json(res, 403, { error: "Bad request origin." });
  }
  const route = req.method + " " + pathname;
  if (route === "GET /api/health") return json(res, 200, { ok: true });
  if (route === "GET /api/config") return json(res, 200, { mail: MAIL_ON });

  if (route === "POST /api/forgot") {
    const body = await readJson(req); const email = normEmail(body.email);
    if (limited(clientIp(req) + "|forgot")) return json(res, 429, { error: "Too many requests. Try again in a few minutes." });
    if (!MAIL_ON) return json(res, 503, { error: "Password reset by email isn't set up on this server." });
    const row = !validEmail(email) && q.userByLogin.get(email);
    if (row && row.email) {
      const token = crypto.randomBytes(32).toString("base64url");
      q.deleteResets.run(row.id);
      q.insertReset.run(sha256(token), row.id, Date.now() + 3600 * 1000);
      const base = APP_URL || `${PROD ? "https" : "http"}://${req.headers.host}`;
      sendMail(row.email, "Reset your planner password",
        `Someone (hopefully you) asked to reset the password for ${row.email}.\n\nReset it here (link works for 1 hour):\n${base}/?reset=${token}\n\nIf you didn't ask for this, ignore this email; your password won't change.`).catch(e => console.error(e));
    }
    return json(res, 200, { ok: true }); // same answer whether or not the account exists
  }
  if (route === "POST /api/reset") {
    const body = await readJson(req);
    if (limited(clientIp(req) + "|reset")) return json(res, 429, { error: "Too many attempts. Try again in a few minutes." });
    const r = typeof body.token === "string" && q.reset.get(sha256(body.token));
    if (!r || r.expires_at < Date.now()) return json(res, 400, { error: "This reset link is invalid or has expired. Request a new one." });
    const err = validPw(body.password); if (err) return json(res, 400, { error: err });
    const salt = crypto.randomBytes(16).toString("hex");
    q.updatePw.run(hashPw(body.password, salt), salt, r.user_id);
    q.deleteResets.run(r.user_id); q.deleteAllSessions.run(r.user_id);
    startSession(res, r.user_id, body.remember !== false);
    return json(res, 200, userPayload(q.userById.get(r.user_id)));
  }

  if (route === "POST /api/signup" || route === "POST /api/login") {
    const body = await readJson(req);
    const email = normEmail(body.email), password = body.password, remember = body.remember !== false;
    if (limited(clientIp(req) + "|" + email)) return json(res, 429, { error: "Too many attempts. Try again in a few minutes." });
    if (route === "POST /api/signup") {
      const err = validEmail(email) || validPw(password); if (err) return json(res, 400, { error: err });
      if (q.userByEmail.get(email, email)) return json(res, 409, { error: "An account with that email already exists. Try signing in." });
      const salt = crypto.randomBytes(16).toString("hex");
      const r = q.insertUser.run(email, email, hashPw(password, salt), salt, Date.now());
      const id = Number(r.lastInsertRowid);
      if (body.state && typeof body.state === "object") q.upsertState.run(id, JSON.stringify(body.state), Date.now());
      if (body.prefs && typeof body.prefs === "object") q.upsertPrefs.run(id, JSON.stringify(body.prefs), Date.now());
      startSession(res, id, remember);
      return json(res, 201, userPayload(q.userById.get(id)));
    }
    const row = q.userByLogin.get(email);
    if (!checkPw(String(password || ""), row || DUMMY) || !row) return json(res, 401, { error: "Wrong email or password." });
    startSession(res, row.id, remember);
    return json(res, 200, userPayload(row));
  }

  const u = currentUser(req);
  if (route === "GET /api/me") return json(res, 200, u ? userPayload(u) : { user: null });
  if (route === "POST /api/logout") {
    if (u) q.deleteSession.run(u.tokenHash);
    res.setHeader("Set-Cookie", clearCookie()); return json(res, 200, { ok: true });
  }
  if (!u) return json(res, 401, { error: "Not signed in." });

  if (route === "PUT /api/state") {
    const body = await readJson(req);
    if (!body.state || typeof body.state !== "object") return json(res, 400, { error: "Missing state." });
    q.upsertState.run(u.id, JSON.stringify(body.state), Date.now()); return json(res, 200, { ok: true });
  }
  if (route === "PUT /api/prefs") {
    const body = await readJson(req);
    if (!body.prefs || typeof body.prefs !== "object") return json(res, 400, { error: "Missing prefs." });
    q.upsertPrefs.run(u.id, JSON.stringify(body.prefs), Date.now()); return json(res, 200, { ok: true });
  }
  if (route === "POST /api/password") {
    const body = await readJson(req);
    if (limited(clientIp(req) + "|pw|" + u.id)) return json(res, 429, { error: "Too many attempts. Try again in a few minutes." });
    if (!checkPw(String(body.current || ""), q.pwById.get(u.id))) return json(res, 401, { error: "Current password is wrong." });
    const err = validPw(body.next); if (err) return json(res, 400, { error: err });
    const salt = crypto.randomBytes(16).toString("hex");
    q.updatePw.run(hashPw(body.next, salt), salt, u.id);
    q.deleteUserSessionsExcept.run(u.id, u.tokenHash); // sign out other devices
    return json(res, 200, { ok: true });
  }
  if (route === "POST /api/email") {
    const body = await readJson(req); const email = normEmail(body.email);
    if (limited(clientIp(req) + "|em|" + u.id)) return json(res, 429, { error: "Too many attempts. Try again in a few minutes." });
    if (!checkPw(String(body.password || ""), q.pwById.get(u.id))) return json(res, 401, { error: "Password is wrong." });
    const err = validEmail(email); if (err) return json(res, 400, { error: err });
    const other = q.userByEmail.get(email, email); if (other && other.id !== u.id) return json(res, 409, { error: "Another account already uses that email." });
    q.setEmail.run(email, email, u.id);
    return json(res, 200, userPayload(q.userById.get(u.id)));
  }
  if (route === "POST /api/logout-all") { q.deleteUserSessionsExcept.run(u.id, u.tokenHash); return json(res, 200, { ok: true }); }
  if (route === "POST /api/delete-account") {
    const body = await readJson(req);
    if (!checkPw(String(body.password || ""), q.pwById.get(u.id))) return json(res, 401, { error: "Password is wrong." });
    q.deleteUser.run(u.id); // sessions and data cascade
    res.setHeader("Set-Cookie", clearCookie()); return json(res, 200, { ok: true });
  }
  if (route === "GET /api/export") {
    const p = userPayload(u);
    return send(res, 200, JSON.stringify(p, null, 2), { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="planner-export.json"`, "Cache-Control": "no-store" });
  }
  return json(res, 404, { error: "Not found." });
}

// ---------- server ----------
const server = http.createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { return send(res, 400, "Bad request"); }
  try {
    if (pathname.startsWith("/api/")) return await api(req, res, pathname);
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed");
    return serveStatic(req, res, pathname);
  } catch (e) {
    if (!res.headersSent) json(res, e.status || 500, { error: e.status ? e.message : "Server error." });
    if (!e.status) console.error(e);
  }
});
for (const p of PUBLIC) { try { loadStatic(p); } catch {} } // compress once at startup so requests never wait on it
server.listen(PORT, () => console.log(`Planner running on http://localhost:${PORT} (data: ${DATA_DIR})`));
