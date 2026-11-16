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
  CREATE TABLE IF NOT EXISTS user_data (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    state TEXT,
    prefs TEXT,
    updated_at INTEGER NOT NULL
  );
`);
const q = {
  userByName: db.prepare("SELECT * FROM users WHERE username = ?"),
  userById: db.prepare("SELECT id, username, created_at FROM users WHERE id = ?"),
  pwById: db.prepare("SELECT pw_hash, pw_salt FROM users WHERE id = ?"),
  insertUser: db.prepare("INSERT INTO users (username, pw_hash, pw_salt, created_at) VALUES (?, ?, ?, ?)"),
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
setInterval(() => q.purgeSessions.run(Date.now()), 6 * 3600 * 1000).unref();

// ---------- auth helpers ----------
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
const sha256 = s => crypto.createHash("sha256").update(s).digest("hex");
function checkPw(pw, row) {
  const a = Buffer.from(hashPw(pw, row.pw_salt), "hex"), b = Buffer.from(row.pw_hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const DUMMY = { pw_salt: "00", pw_hash: hashPw("dummy-password", "00") };
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;
function validCreds(u, p) {
  if (typeof u !== "string" || !USERNAME_RE.test(u)) return "Usernames are 3–32 characters: letters, numbers, dot, dash or underscore.";
  if (typeof p !== "string" || p.length < 8 || p.length > 200) return "Passwords need at least 8 characters.";
  return null;
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

// Simple in-memory rate limit for auth endpoints: 10 attempts / 10 min per IP+username.
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
  return { user: { username: u.username, createdAt: u.created_at }, state, prefs, updatedAt: d.updated_at || 0 };
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

  if (route === "POST /api/signup" || route === "POST /api/login") {
    const body = await readJson(req);
    const username = String(body.username || "").trim(), password = body.password, remember = body.remember !== false;
    if (limited(clientIp(req) + "|" + username.toLowerCase())) return json(res, 429, { error: "Too many attempts. Try again in a few minutes." });
    if (route === "POST /api/signup") {
      const err = validCreds(username, password); if (err) return json(res, 400, { error: err });
      if (q.userByName.get(username)) return json(res, 409, { error: "That username is taken." });
      const salt = crypto.randomBytes(16).toString("hex");
      const r = q.insertUser.run(username, hashPw(password, salt), salt, Date.now());
      const id = Number(r.lastInsertRowid);
      if (body.state && typeof body.state === "object") q.upsertState.run(id, JSON.stringify(body.state), Date.now());
      if (body.prefs && typeof body.prefs === "object") q.upsertPrefs.run(id, JSON.stringify(body.prefs), Date.now());
      startSession(res, id, remember);
      return json(res, 201, userPayload(q.userById.get(id)));
    }
    const row = q.userByName.get(username);
    if (!checkPw(String(password || ""), row || DUMMY) || !row) return json(res, 401, { error: "Wrong username or password." });
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
    const err = validCreds(u.username, body.next); if (err) return json(res, 400, { error: err });
    const salt = crypto.randomBytes(16).toString("hex");
    q.updatePw.run(hashPw(body.next, salt), salt, u.id);
    q.deleteUserSessionsExcept.run(u.id, u.tokenHash); // sign out other devices
    return json(res, 200, { ok: true });
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
    return send(res, 200, JSON.stringify(p, null, 2), { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="planner-${u.username}.json"`, "Cache-Control": "no-store" });
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
