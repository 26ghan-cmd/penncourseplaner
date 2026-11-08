/* Placeholder — a four-year planner for Penn undergrads. */
(() => {
"use strict";

// ---------- helpers ----------
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtCU = n => (Math.round(n * 100) / 100).toString();
const uid = () => Math.random().toString(36).slice(2, 10);
const codeOf = id => id.replace("-", " ");
function toast(msg) { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); }

// ---------- static data ----------
const ATTR_LABEL = {
  AUWR: "College · Writing", AULL: "College · Language (final semester)", AULG: "Language course", AUQD: "College · Quant Data Analysis",
  AUFR: "College · Formal Reasoning", AUCC: "College · Cross-Cultural", AUCD: "College · Cultural Diversity US", AUSO: "Sector I · Society",
  AUHT: "Sector II · History & Tradition", AUAL: "Sector III · Arts & Letters", AUHS: "Sector IV · Hum & Soc Sci", AULW: "Sector V · Living World",
  AUPW: "Sector VI · Physical World", AUNM: "Sector VII · Natural Sci", AUFS: "First-Year Seminar",
  WUHM: "Wharton · Humanities", WUNM: "Wharton · NatSci/Math/Eng", WUSS: "Wharton · Social Science", WUCN: "Wharton · Cross-Cultural (non-US)",
  WUCU: "Wharton · Cross-Cultural (US)", WUGE: "Wharton · GEBS", WUTI: "Wharton · Tech, Innovation & Analytics", WUCP: "Wharton · Capstone",
  EUHS: "SEAS · Humanities", EUSS: "SEAS · Social Science", EUTB: "SEAS · Tech, Business & Society", EUMA: "SEAS · Math", EUNS: "SEAS · Natural Science", EUNG: "SEAS · Engineering",
};
const ATTR_GROUPS = [
  ["College", ["AUWR", "AULL", "AUQD", "AUFR", "AUCC", "AUCD", "AUSO", "AUHT", "AUAL", "AUHS", "AULW", "AUPW", "AUNM", "AUFS"]],
  ["Wharton", ["WUHM", "WUNM", "WUSS", "WUCN", "WUCU", "WUGE", "WUTI", "WUCP"]],
  ["Engineering", ["EUHS", "EUSS", "EUTB", "EUMA", "EUNS", "EUNG"]],
];
// AP equivalence: College of Arts & Sciences chart (Class of 2025+), plus school-specific Chemistry awards from Penn Admissions.
const AP = [
  ["Art History", { 5: { waiver: ["ARTH-1010"], note: "ARTH 1010 or 1020 waiver (consult the undergraduate chair)" } }],
  ["Biology", {}], ["Calculus AB", {}],
  ["Calculus BC", { 5: { credit: ["MATH-1300"], cu: 1, provides: ["MATH-1400"], note: "MATH 1300 credit; satisfies the MATH 1400 prerequisite" } }],
  ["Chemistry", { 5: { school: { SEAS: { credit: ["EAS-0091"], cu: 1 }, NUR: { credit: ["NURS-0061"], cu: 0.5 } }, note: "Credit only for Engineering (EAS 0091) or Nursing (NURS 0061) students" } }],
  ["Computer Science A", { 5: { credit: ["CIS-1100"], cu: 1 } }],
  ["English Language", {}], ["English Literature", {}], ["Environmental Science", {}], ["European History", {}],
  ["French Language", { 5: { credit: ["FREN-1000"], cu: 1, lang: true }, 4: { lang: true } }],
  ["German Language", { 5: { credit: ["GRMN-0400"], cu: 1, lang: true }, 4: { note: "Pass the departmental exam for the language requirement" } }],
  ["Gov & Politics (US)", {}], ["Human Geography", {}],
  ["Italian Language", { 5: { credit: ["ITAL-1000"], cu: 1, lang: true }, 4: { lang: true } }],
  ["Japanese Language", { 5: { credit: ["JPAN-0400"], cu: 1, lang: true }, 4: { note: "Pass the departmental exam for the language requirement" } }],
  ["Latin", { 5: { note: "No credit; Classical Studies offers a placement test" } }],
  ["Macroeconomics", { 5: { waiver: ["ECON-0200"] } }], ["Microeconomics", { 5: { waiver: ["ECON-0100"] } }],
  ["Music Theory", {}],
  ["Physics 1", { 5: { credit: ["PHYS-0101"], cu: 1.5 } }], ["Physics 2", { 5: { credit: ["PHYS-0102"], cu: 1.5 } }],
  ["Physics C: Mechanics", { 5: { credit: ["PHYS-0150"], cu: 1.5 } }], ["Physics C: E&M", { 5: { credit: ["PHYS-0151"], cu: 1.5 } }],
  ["Psychology", { 5: { waiver: ["PSYC-0001"] } }],
  ["Spanish Language", { 5: { credit: ["SPAN-1000"], cu: 1, lang: true }, 4: { lang: true } }],
  ["Spanish Literature", { 5: { credit: ["SPAN-1200"], cu: 1, lang: true }, 4: { lang: true } }],
  ["Statistics", { 5: { waiver: ["STAT-1010"], note: "STAT 1010 or STAT 1110 waiver (consult the undergraduate chair)" } }],
  ["US History", {}], ["World History", {}],
];
// Known prerequisites (Economics department; CIS course pages). Groups are AND-of-ORs.
const KNOWN_PRE = {
  "ECON-2100": [["ECON-0100", "BEPP-1000"], ["ECON-0200", "BEPP-1000"], ["MATH-1400", "MATH-1070"]],
  "ECON-2200": [["ECON-2100"]],
  "ECON-2300": [["ECON-0100", "BEPP-1000"], ["ECON-0200", "BEPP-1000"], ["MATH-1400", "MATH-1070"]],
  "ECON-2310": [["ECON-2100"], ["ECON-2300"]],
  "CIS-1210": [["CIS-1200"]], "CIS-3200": [["CIS-1210"]],
  "MATH-1410": [["MATH-1400", "MATH-1300"]],
};

// ---------- course data ----------
let COURSES = new Map(), CLIST = [], DEPTS = [];
function loadCourses(rows) {
  for (const r of rows) {
    const [id, t, cu, d, bm, q, df, w, attrs, pre, xl, mt] = r;
    const [dept, n] = id.split("-");
    const c = { id, dept, num: parseInt(n, 10), t, cu: cu || 1, d, bm, q, df, w, attrs: new Set(attrs ? attrs.split(" ") : []), pre, xl: xl || [], mt: mt || {} };
    c.s = (id + " " + codeOf(id) + " " + dept + n + " " + t).toLowerCase();
    COURSES.set(id, c);
  }
  // collapse cross-listings: keep one primary per group (fewest-digit dept order), hide aliases from browsing
  for (const c of COURSES.values()) {
    if (c.alias || !c.xl.length) continue;
    const grp = [c.id, ...c.xl.filter(x => COURSES.has(x))];
    grp.sort();
    const prim = grp[0];
    for (const x of grp) { const o = COURSES.get(x); if (x !== prim) o.alias = prim; }
  }
  CLIST = [...COURSES.values()];
  DEPTS = [...new Set(CLIST.map(c => c.dept))].sort();
}
function prereqGroups(c) {
  if (KNOWN_PRE[c.id]) return KNOWN_PRE[c.id];
  if (c.dept === "ECON" && c.num >= 4000 && c.num < 5000) return [["ECON-2100"]];
  if (!c.pre) return null;
  const codes = [...c.pre.matchAll(/\b([A-Z]{2,5})\s?(\d{4})\b/g)].map(m => m[1] + "-" + m[2]).filter(x => x !== c.id);
  return codes.length ? [codes] : null;
}

// ---------- terms ----------
const SEASON = { A: "Spring", B: "Summer", C: "Fall" };
const termYear = k => parseInt(k.slice(0, 4), 10);
const termOrd = k => termYear(k) * 10 + { A: 1, B: 2, C: 3 }[k[4]];
const termLabel = k => SEASON[k[4]] + " " + termYear(k);
function currentTerm() { const d = new Date(), m = d.getMonth() + 1, y = d.getFullYear(); return y + (m <= 5 ? "A" : m <= 7 ? "B" : "C"); }
const CUR = currentTerm();
function termsFor(start, years) {
  const out = [];
  for (let y = 0; y < years; y++) out.push({ label: `${start + y}–${String(start + y + 1).slice(2)}`, terms: [`${start + y}C`, `${start + y + 1}A`, `${start + y + 1}B`] });
  return out;
}
function allTerms() { return S.start ? termsFor(S.start, S.years || 4).flatMap(y => y.terms) : []; }
const isStarted = k => termOrd(k) <= termOrd(CUR);
function offeredIn(c, k) {
  const s = k[4];
  if (s === "C") return !!(c.bm & 5);
  if (s === "A") return !!(c.bm & 10);
  return true;
}
function offeredText(c) {
  const out = [];
  if (c.bm & 1) out.push("Fall 2025"); if (c.bm & 2) out.push("Spring 2026"); if (c.bm & 4) out.push("Fall 2026"); if (c.bm & 8) out.push("Spring 2027");
  return out;
}
const seasonsOf = c => [(c.bm & 5) ? "Fall" : null, (c.bm & 10) ? "Spring" : null].filter(Boolean);

// ---------- programs ----------
function parseProgram(name) {
  const m = name.match(/, (BA|BS|BSE|BAS|BSN|BFA|Minor)(?::|$)/);
  const deg = m ? m[1] : "";
  const school = { BA: "COL", BFA: "COL", BS: "WH", BSE: "SEAS", BAS: "SEAS", BSN: "NUR" }[deg] || null;
  return { name, deg, school, minor: deg === "Minor" };
}
const PROGRAMS = PROGRAM_NAMES.map(parseProgram);
function programDef(name) {
  if (DETAILED[name]) return { key: "p:" + name, title: name, ...DETAILED[name] };
  if (WH_CONC_DEPT[name]) return {
    key: "p:" + name, title: name, school: "WH", totalCU: 37, approx: true,
    source: "https://catalog.upenn.edu/search/?search=" + encodeURIComponent(name),
    groups: [{ name: "Concentration", reqs: [{ id: "conc", name: `4 c.u. of ${WH_CONC_DEPT[name].join("/")} concentration courses`, count: 4, rule: { dept: WH_CONC_DEPT[name], min: 2000, max: 5999 }, note: "Approximate: the concentration has a specific approved list. Check the catalog." }] }],
  };
  return null;
}
function schoolDef() {
  if (!S.school) return null;
  const sc = SCHOOLS[S.school];
  return { key: "school:" + S.school, title: sc.name, school: S.school, ...sc, isSchool: true };
}
const catalogLink = name => "https://catalog.upenn.edu/search/?search=" + encodeURIComponent(name);

// ---------- state ----------
const LS_KEY = "locust-penn-v1";
const defaults = () => ({ v: 1, school: null, start: null, years: 4, programs: [], plan: {}, bm: [], ap: {}, transfer: [], prefs: { desc: true, per: 10, dense: false, warn: { remove: true, offered: true, conflict: true, program: true } }, updated: 0 });
let S = defaults();
try { const raw = localStorage.getItem(LS_KEY); if (raw) S = Object.assign(defaults(), JSON.parse(raw)); } catch (e) {}
S.prefs = Object.assign(defaults().prefs, S.prefs || {}); S.prefs.warn = Object.assign(defaults().prefs.warn, S.prefs.warn || {});

const sync = { mode: "local", ref: null, busy: false, pending: false, note: "" };
function setSync(txt) { const el = $("#sync"); if (el) el.textContent = txt; }
function syncLabel() { return sync.mode === "cloud" ? "Saved to your Claude account" : sync.mode === "local" ? "Saved in this browser" : "Not saved"; }
let saveTimer = null;
function save() {
  S.updated = Date.now();
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {}
  if (sync.mode !== "cloud") { setSync(syncLabel()); return; }
  setSync("Saving…");
  clearTimeout(saveTimer); saveTimer = setTimeout(pushCloud, 900);
}
async function pushCloud() {
  if (!sync.ref) return;
  if (sync.busy) { sync.pending = true; return; }
  sync.busy = true;
  try { await sync.ref.set({ json: JSON.stringify(S), updated: S.updated }); setSync(syncLabel()); }
  catch (e) { if (e && e.code === "invalid_argument") { sync.mode = "local"; } setSync(syncLabel()); }
  sync.busy = false;
  if (sync.pending) { sync.pending = false; pushCloud(); }
}
async function initCloud() {
  if (!window.claude || !window.claude.use) return;
  try {
    const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    if (!db || !user) return;
    const id = await user.id(); if (!id) return;
    const ref = db.doc("data/users/" + id + "/planner");
    const snap = await Promise.race([ref.get(), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000))]);
    sync.ref = ref; sync.mode = "cloud";
    if (snap.exists) {
      const body = snap.data();
      if (body && body.json && (body.updated || 0) > (S.updated || 0)) {
        S = Object.assign(defaults(), JSON.parse(body.json));
        S.prefs = Object.assign(defaults().prefs, S.prefs || {}); S.prefs.warn = Object.assign(defaults().prefs.warn, S.prefs.warn || {});
        try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {}
        render();
      } else if (S.updated) pushCloud();
    } else if (S.updated) pushCloud();
    setSync(syncLabel());
  } catch (e) { setSync(syncLabel()); }
}

// ---------- plan helpers ----------
const termItems = k => (S.plan[k] = S.plan[k] || []);
function plannedIds() { const s = new Set(); for (const k of allTerms()) for (const it of S.plan[k] || []) s.add(it.id); return s; }
function findItem(key) { for (const k in S.plan) { const i = S.plan[k].findIndex(x => x.k === key); if (i >= 0) return { term: k, idx: i, item: S.plan[k][i] }; } return null; }
function termCU(k) { return (S.plan[k] || []).reduce((a, it) => a + (COURSES.get(it.id)?.cu || 1), 0); }
function apAwards() {
  const out = [];
  for (const [exam, tbl] of AP) {
    const sc = S.ap[exam]; if (!sc) continue;
    let aw = tbl[sc]; if (!aw) continue;
    if (aw.school) { const sa = aw.school[S.school]; aw = sa ? { ...aw, ...sa } : { note: aw.note }; }
    out.push({ exam, score: sc, ...aw });
  }
  return out;
}
function instances() {
  const out = [], seen = new Set();
  for (const a of apAwards()) {
    for (const id of a.credit || []) { out.push({ key: "ap:" + a.exam + id, id, c: COURSES.get(id) || null, cu: a.cu || 0, ext: true, lang: !!a.lang, term: "AP", ord: 0, label: "AP " + a.exam }); seen.add(id); }
    if (a.lang && !(a.credit || []).length) out.push({ key: "ap:" + a.exam, id: "AP-" + a.exam, c: null, cu: 0, ext: true, lang: true, term: "AP", ord: 0, label: "AP " + a.exam });
  }
  for (const t of S.transfer) { out.push({ key: "tr:" + t.k, id: t.id || ("TR-" + t.k), c: t.id ? COURSES.get(t.id) || null : null, cu: +t.cu || 0, ext: true, transfer: true, term: "TR", ord: 0, label: t.title || "Transfer credit" }); }
  for (const k of allTerms()) for (const it of S.plan[k] || []) {
    const c = COURSES.get(it.id);
    const inst = { key: it.k, id: it.id, c, cu: c ? c.cu : 1, term: k, ord: termOrd(k), o: it.o };
    if (seen.has(it.id) || (c && c.xl.some(x => seen.has(x)))) inst.dup = true; else seen.add(it.id);
    out.push(inst);
  }
  return out;
}
function satisfiedBefore(k) {
  const s = new Set();
  for (const a of apAwards()) { (a.credit || []).forEach(x => s.add(x)); (a.waiver || []).forEach(x => s.add(x)); (a.provides || []).forEach(x => s.add(x)); }
  for (const t of S.transfer) if (t.id) s.add(t.id);
  for (const kk of allTerms()) if (termOrd(kk) < termOrd(k)) for (const it of S.plan[kk] || []) { s.add(it.id); const c = COURSES.get(it.id); if (c) c.xl.forEach(x => s.add(x)); }
  return s;
}
function missingPrereq(id, k) {
  const c = COURSES.get(id); if (!c) return null;
  const g = prereqGroups(c); if (!g) return null;
  const have = satisfiedBefore(k);
  const miss = g.filter(or => !or.some(x => have.has(x)));
  return miss.length ? miss : null;
}

// ---------- requirement engine ----------
function ruleMatch(rule, inst) {
  const c = inst.c, id = inst.id;
  if (rule.or) return rule.or.some(r => ruleMatch(r, inst));
  if (rule.any) return inst.cu > 0;
  if (rule.ids) return rule.ids.includes(id) || (c && c.xl.some(x => rule.ids.includes(x)));
  if (rule.attr) return (c && rule.attr.some(a => c.attrs.has(a))) || (inst.lang && rule.attr.some(a => a === "AULL" || a === "AULG"));
  if (!c) return false;
  if (rule.dept) return rule.dept.includes(c.dept) && c.num >= (rule.min ?? 0) && c.num <= (rule.max ?? 9999);
  if (rule.notDept) return !rule.notDept.includes(c.dept);
  return false;
}
const ruleIsFree = r => !!r.any;
function evalProgram(def, insts) {
  const flat = [];
  def.groups.forEach((g, gi) => g.reqs.forEach(r => flat.push({ r, gi })));
  const res = new Map(); const used = new Map();
  const pool = r => def.key + ":" + (r.pool || "main");
  const need = r => r.unit === "cu" ? r.cu : r.count;
  const usable = insts.filter(i => !i.dup && !(i.ext && def.key === "school:COL" && false));
  for (const { r } of flat) {
    const cands = usable.filter(i => ruleMatch(r.rule, i) && !(i.ext && def.key === "school:COL" && r.id !== "fl")).sort((a, b) => a.ord - b.ord);
    res.set(r.id, { req: r, cands, filled: [], have: 0, need: need(r) });
  }
  const take = (rr, i) => { const p = pool(rr.req); if (!used.has(p)) used.set(p, new Set()); used.get(p).add(i.key); rr.filled.push(i); rr.have += rr.req.unit === "cu" ? i.cu : 1; };
  const inPool = (rr, i) => used.get(pool(rr.req))?.has(i.key);
  // overrides first
  for (const rr of res.values()) for (const i of rr.cands) if (i.o === def.key + "|" + rr.req.id && rr.have < rr.need && !inPool(rr, i)) take(rr, i);
  const order = [...res.values()].sort((a, b) => (ruleIsFree(a.req.rule) - ruleIsFree(b.req.rule)) || ((!!a.req.rule.notDept) - (!!b.req.rule.notDept)) || (a.cands.length - b.cands.length));
  for (const rr of order) {
    for (const i of rr.cands) {
      if (rr.have >= rr.need - 1e-9) break;
      if (inPool(rr, i)) continue;
      if (i.o && i.o.startsWith(def.key + "|") && i.o !== def.key + "|" + rr.req.id) continue;
      take(rr, i);
    }
  }
  let met = 0, total = 0;
  const groups = def.groups.map(g => ({ name: g.name, reqs: g.reqs.map(r => { const rr = res.get(r.id); rr.done = rr.have >= rr.need - 1e-9; total++; if (rr.done) met++; return rr; }) }));
  return { def, groups, met, total };
}
let EV = null;
function evaluate() {
  const insts = instances();
  const defs = [];
  const sd = schoolDef(); if (sd) defs.push(sd);
  for (const n of S.programs) { const d = programDef(n); if (d) defs.push(d); }
  const progs = defs.map(d => evalProgram(d, insts));
  const counts = new Map(); // inst.key -> [{prog, req}]
  for (const p of progs) for (const g of p.groups) for (const rr of g.reqs) if (!ruleIsFree(rr.req.rule)) for (const i of rr.filled) { if (!counts.has(i.key)) counts.set(i.key, []); counts.get(i.key).push({ p: p.def, r: rr.req }); }
  const totalCU = insts.filter(i => !i.dup).reduce((a, i) => a + i.cu, 0);
  const majorCU = S.programs.map(n => programDef(n)?.totalCU).filter(Boolean);
  const targetCU = majorCU.length ? Math.max(...majorCU) : (sd ? sd.totalCU : (S.school ? SCHOOLS[S.school].totalCU : 32));
  const met = progs.reduce((a, p) => a + p.met, 0), total = progs.reduce((a, p) => a + p.total, 0);
  EV = { insts, progs, counts, totalCU, targetCU, met, total };
  return EV;
}
function unmetReqs() {
  const out = [];
  for (const p of EV.progs) for (const g of p.groups) for (const rr of g.reqs) if (!rr.done && !ruleIsFree(rr.req.rule)) out.push({ p: p.def, rr });
  return out;
}
function wouldCount(c) {
  const fake = { key: "x", id: c.id, c, cu: c.cu };
  const out = [];
  for (const p of EV.progs) for (const g of p.groups) for (const rr of g.reqs) if (!ruleIsFree(rr.req.rule) && ruleMatch(rr.req.rule, fake)) out.push({ p: p.def, rr });
  return out;
}

// ---------- routing & render ----------
const TABS = [["home", "Home"], ["courses", "Courses"], ["programs", "Majors & minors"], ["plan", "Planner"], ["reqs", "Requirements"], ["schedule", "Weekly schedule"], ["credit", "AP & transfer"], ["export", "Degree plan"], ["settings", "Settings"]];
let route = "home";
const UI = { q: "", attr: "", season: "", level: "ug", dept: "", sort: "rec", page: 0, req: "", progFilter: "all", progQ: "", schedTerm: "" };
function readRoute() { const h = (location.hash || "#home").slice(1); route = TABS.some(t => t[0] === h) ? h : "home"; }
function go(r) { if (location.hash.slice(1) === r) render(); else location.hash = r; window.scrollTo(0, 0); }
function renderTabs() { $("#tabs").innerHTML = TABS.map(([k, l]) => `<a href="#${k}" class="${k === route ? "on" : ""}">${l}</a>`).join(""); }
function render() {
  if (!COURSES.size) return;
  evaluate(); renderTabs(); closeMenu();
  const app = $("#app");
  const fn = { home: vHome, courses: vCourses, programs: vPrograms, plan: vPlan, reqs: vReqs, schedule: vSchedule, credit: vCredit, export: vExport, settings: vSettings }[route];
  app.innerHTML = fn();
  after[route] && after[route]();
  setSync(syncLabel());
}
const after = {};

// ---------- shared bits ----------
const pct = (a, b) => b ? Math.min(100, Math.round(a / b * 100)) : 0;
function nextTerm() { const ts = allTerms().filter(k => !isStarted(k) && k[4] !== "B"); return ts[0] || null; }
function statLine(c) {
  const f = (v, l) => v == null ? "" : `<span class="stat">${l} <b>${v.toFixed(1)}</b></span>`;
  return `<div class="stats">${f(c.q, "Quality")}${f(c.df, "Difficulty")}${f(c.w, "Work")}</div>`;
}
function attrPills(c, max = 4) {
  const a = [...c.attrs].filter(x => ATTR_LABEL[x]);
  const mine = S.school === "WH" ? "W" : S.school === "SEAS" ? "E" : "A";
  a.sort((x, y) => (y[0] === mine) - (x[0] === mine));
  return a.slice(0, max).map(x => `<span class="pill b">${esc(ATTR_LABEL[x])}</span>`).join(" ") + (a.length > max ? ` <span class="pill">+${a.length - max}</span>` : "");
}
function courseRow(c, opts = {}) {
  const planned = plannedIds().has(c.id), bm = S.bm.includes(c.id);
  const wc = opts.reqHi ? wouldCount(c).filter(x => !x.rr.done) : [];
  return `<div class="course">
    <div><div class="row" style="gap:8px"><span class="code">${esc(codeOf(c.id))}</span><span class="pill">${fmtCU(c.cu)} c.u.</span>${seasonsOf(c).map(s => `<span class="pill">${s}</span>`).join("")}${planned ? '<span class="pill g">In plan</span>' : ""}</div>
    <div class="title" data-act="detail" data-id="${c.id}">${esc(c.t)}</div>${c.xl.length ? `<div class="small faint">Also listed as ${c.xl.map(codeOf).join(", ")}</div>` : ""}
    <div class="row" style="gap:6px;margin-top:4px">${attrPills(c)}${wc.slice(0, 2).map(x => `<span class="pill g">Fills: ${esc(x.rr.req.name)}</span>`).join("")}</div></div>
    <div class="acts"><button class="btn sm pri" data-act="addmenu" data-id="${c.id}">+ Add</button><button class="star ${bm ? "on" : ""}" data-act="bm" data-id="${c.id}" title="Bookmark">${bm ? "★" : "☆"}</button></div>
    ${opts.desc && c.d ? `<div class="desc">${esc(c.d)}</div>` : ""}
    <div style="grid-column:1/-1">${statLine(c)}</div>
  </div>`;
}
function recommendations(n = 6) {
  const nt = nextTerm() || "2027A";
  const planned = plannedIds(); const have = satisfiedBefore("9999C");
  const out = [], seenIds = new Set();
  const push = (c, why) => { if (c && c.alias) c = COURSES.get(c.alias); if (!c || seenIds.has(c.id) || planned.has(c.id) || have.has(c.id)) return; if (!offeredIn(c, nt)) return; seenIds.add(c.id); out.push({ c, why }); };
  const um = unmetReqs();
  for (const { rr } of um) if (rr.req.rule.ids) for (const id of rr.req.rule.ids) { const c = COURSES.get(id); if (c && !missingPrereq(id, nt)) { push(c, rr.req.name); break; } }
  for (const { rr } of um) {
    if (out.length >= n * 2) break;
    if (rr.req.rule.ids) continue;
    const cands = CLIST.filter(c => c.num < 4000 && c.q != null && ruleMatch(rr.req.rule, { id: c.id, c, cu: c.cu }) && offeredIn(c, nt)).sort((a, b) => (b.q - (b.df || 0) * 0.15) - (a.q - (a.df || 0) * 0.15));
    if (cands[0]) push(cands[0], rr.req.name);
  }
  if (out.length < n) for (const id of ["ECON-0100", "CIS-1100", "MATH-1400", "PSYC-0001", "CIS-1200", "STAT-1110", "PHIL-0001", "ECON-0200"]) push(COURSES.get(id), "Popular first-year course");
  return out.slice(0, n);
}

// ---------- views ----------
function vHome() {
  const h = new Date().getHours(); const greet = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const nt = nextTerm();
  const hasMajor = S.programs.some(n => !parseProgram(n).minor);
  const ntCU = nt ? termCU(nt) : 0;
  const steps = [
    { ok: !!S.school, t: "Choose your school", d: S.school ? SCHOOLS[S.school].name : "College, Wharton, Engineering or Nursing.", act: `<select data-change="school"><option value="">Choose…</option>${Object.entries(SCHOOLS).map(([k, v]) => `<option value="${k}" ${S.school === k ? "selected" : ""}>${v.name}</option>`).join("")}</select>` },
    { ok: hasMajor, t: "Declare your major", d: hasMajor ? S.programs.filter(n => !parseProgram(n).minor).join(", ") : "Pick an intended major, even if you haven't declared yet.", act: `<a class="btn sm" href="#programs">${hasMajor ? "Change" : "Choose a major"}</a>` },
    { ok: !!S.start, t: "Set your starting year", d: S.start ? `Matriculated Fall ${S.start}` : "The fall you started (or will start) at Penn.", act: `<select data-change="start"><option value="">Year…</option>${[2022, 2023, 2024, 2025, 2026, 2027].map(y => `<option ${S.start === y ? "selected" : ""}>${y}</option>`).join("")}</select>` },
    { ok: Object.keys(S.ap).length > 0 || S.transfer.length > 0, t: "Add AP or transfer credit", d: "Optional — skip it if you have none.", act: `<a class="btn sm" href="#credit">Add credit</a>` },
    { ok: nt && ntCU >= 4, t: nt ? `Plan 4+ c.u. for ${termLabel(nt)}` : "Plan your next semester", d: nt ? `${fmtCU(ntCU)} c.u. planned so far. A typical load is 4–5.5 c.u.` : "Set a starting year first.", act: nt ? `<a class="btn sm" href="#plan">Open planner</a>` : "" },
  ];
  const done = steps.filter(s => s.ok).length;
  const recs = recommendations(5);
  return `<div class="hero"><div><h1>${greet}.</h1><p class="sub" style="margin:0">${done === steps.length ? "You're all set up. Here's where your degree stands." : "Let's get your Penn plan set up. The checklist below is the short version."}</p></div>
    <div class="row"><a class="btn" href="#courses">Browse courses</a><a class="btn pri" href="#plan">Open planner</a></div></div>
  <div class="grid g2">
    <div class="card"><div class="row between"><h3>Get started</h3><span class="small muted">${done} / ${steps.length}</span></div>
      ${steps.map(s => `<div class="check"><span class="dot ${s.ok ? "ok" : ""}">${s.ok ? "✓" : ""}</span><div style="flex:1"><div style="font-weight:600">${s.t}</div><div class="small muted">${esc(s.d)}</div></div><div>${s.act}</div></div>`).join("")}
    </div>
    <div class="grid">
      <div class="card"><h3>Degree progress</h3>
        <div class="row between"><div><div class="big">${fmtCU(EV.totalCU)} <span class="muted" style="font-size:18px">/ ${EV.targetCU} c.u.</span></div><div class="small muted">Planned + credited course units</div></div></div>
        <div class="bar" style="margin:10px 0 16px"><i style="width:${pct(EV.totalCU, EV.targetCU)}%"></i></div>
        ${EV.progs.length ? EV.progs.map(p => `<div class="row between small" style="margin-top:8px"><span>${esc(p.def.isSchool ? SCHOOLS[S.school].short + " requirements" : p.def.title)}</span><span class="muted">${p.met} / ${p.total}</span></div><div class="bar g" style="margin-top:4px"><i style="width:${pct(p.met, p.total)}%"></i></div>`).join("") : `<div class="empty">Choose a school to track requirements.</div>`}
        <div style="margin-top:14px"><a href="#reqs" class="small">See requirements →</a></div>
      </div>
      <div class="card"><h3>${nt ? termLabel(nt) : "Next semester"}</h3>
        ${nt && (S.plan[nt] || []).length ? (S.plan[nt].map(it => { const c = COURSES.get(it.id); return `<div class="row between small" style="padding:4px 0"><span><span class="mono">${esc(codeOf(it.id))}</span> <span class="muted">${esc(c?.t || "")}</span></span><span class="faint">${fmtCU(c?.cu || 1)}</span></div>`; }).join("") + `<div class="row between small" style="border-top:1px solid var(--line);margin-top:6px;padding-top:6px"><b>Total</b><b>${fmtCU(ntCU)} c.u.</b></div>`) : `<div class="empty">No courses scheduled yet.</div><a href="#courses" class="small">Browse courses →</a>`}
      </div>
    </div>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><div class="row between"><h3>Recommended for you</h3><span class="small faint">${nt ? "Offered in " + SEASON[nt[4]].toLowerCase() : ""}</span></div>
      ${recs.map(({ c, why }) => `<div class="check" style="align-items:center"><div style="flex:1;min-width:0"><div><span class="mono" style="font-weight:600">${esc(codeOf(c.id))}</span> <span class="title" data-act="detail" data-id="${c.id}" style="cursor:pointer">${esc(c.t)}</span></div><div class="small muted">${esc(why)} · ${fmtCU(c.cu)} c.u.${c.q != null ? " · Quality " + c.q.toFixed(1) : ""}</div></div><button class="btn sm" data-act="addmenu" data-id="${c.id}">+ Add</button></div>`).join("") || `<div class="empty">Nothing to suggest yet.</div>`}
      <div style="margin-top:10px"><a href="#courses" class="small">Browse all courses →</a></div>
    </div>
    <div class="card"><h3>Programs</h3>
      ${S.programs.length ? S.programs.map(n => { const p = EV.progs.find(x => x.def.title === n); return `<div class="check" style="align-items:center"><div style="flex:1"><div style="font-weight:600">${esc(n)}</div><div class="small muted">${p ? `${p.met} / ${p.total} requirements met` : `Requirements not mapped yet · <a href="${catalogLink(n)}" target="_blank" rel="noopener">Catalog</a>`}</div></div></div>`; }).join("") : `<div class="empty">Select a major or minor to track its requirements here.</div>`}
      <div style="margin-top:10px"><a class="btn sm" href="#programs">Add a program</a></div>
    </div>
  </div>`;
}

// Courses
function courseMatchesFilters(c) {
  if (c.alias && !(UI.q && c.id.toLowerCase().replace("-", "").startsWith(UI.q.toLowerCase().replace(/[\s-]+/g, "")))) return false;
  if (UI.level === "ug" && c.num >= 5000) return false;
  if (UI.level === "intro" && c.num >= 2000) return false;
  if (UI.level === "mid" && (c.num < 2000 || c.num >= 5000)) return false;
  if (UI.level === "grad" && c.num < 5000) return false;
  if (UI.dept && c.dept !== UI.dept) return false;
  if (UI.season === "C" && !(c.bm & 4)) return false;
  if (UI.season === "A" && !(c.bm & 8)) return false;
  if (UI.attr) {
    if (UI.attr === "unmet") { if (!wouldCount(c).some(x => !x.rr.done)) return false; }
    else if (!c.attrs.has(UI.attr)) return false;
  }
  if (UI.req) { const [pk, rid] = UI.req.split("||"); const p = EV.progs.find(x => x.def.key === pk); const rr = p && p.groups.flatMap(g => g.reqs).find(r => r.req.id === rid); if (rr && !ruleMatch(rr.req.rule, { id: c.id, c, cu: c.cu })) return false; }
  if (UI.q) {
    const q = UI.q.toLowerCase().trim(); const qn = q.replace(/\s+/g, "");
    if (!(c.s.includes(q) || c.s.replace(/\s+/g, "").includes(qn) || (q.length >= 4 && c.d && c.d.toLowerCase().includes(q)))) return false;
  }
  return true;
}
function filteredCourses() {
  const list = CLIST.filter(courseMatchesFilters);
  const q = UI.q.toLowerCase().trim().replace(/\s+/g, "");
  const exact = c => (q && (c.id.toLowerCase().replace("-", "") === q || c.id.toLowerCase().replace("-", "").startsWith(q))) ? 1 : 0;
  const rec = c => (c.q ?? 2.6) - (c.num >= 5000 ? 1 : 0) + (c.num < 2000 ? .3 : 0) + ((c.bm & 12) ? .3 : 0) + (EV.progs.length && wouldCount(c).some(x => !x.rr.done) ? .8 : 0);
  const sorts = {
    rec: (a, b) => exact(b) - exact(a) || rec(b) - rec(a),
    az: (a, b) => a.dept.localeCompare(b.dept) || a.num - b.num,
    q: (a, b) => (b.q ?? -1) - (a.q ?? -1),
    easy: (a, b) => (a.df ?? 9) - (b.df ?? 9),
    work: (a, b) => (a.w ?? 9) - (b.w ?? 9),
  };
  return list.sort(sorts[UI.sort] || sorts.rec);
}
function vCourses() {
  const list = filteredCourses(); const per = S.prefs.per || 10;
  const pages = Math.max(1, Math.ceil(list.length / per)); UI.page = Math.min(UI.page, pages - 1);
  const slice = list.slice(UI.page * per, UI.page * per + per);
  let reqLabel = "";
  if (UI.req) { const [pk, rid] = UI.req.split("||"); const p = EV.progs.find(x => x.def.key === pk); const rr = p && p.groups.flatMap(g => g.reqs).find(r => r.req.id === rid); reqLabel = rr ? rr.req.name : ""; }
  const nf = [UI.q, UI.attr, UI.season, UI.dept, UI.req, UI.level !== "ug" ? 1 : ""].filter(Boolean).length;
  return `<h1>Courses</h1><p class="sub">${CLIST.length.toLocaleString()} Penn courses offered between Fall 2025 and Spring 2027, with Penn Course Review ratings.</p>
  <div class="filters">
    <div class="card side">
      <input type="search" id="cq" placeholder="Search code, title or topic" value="${esc(UI.q)}" style="width:100%">
      ${reqLabel ? `<div class="note" style="margin-top:10px">Showing courses for <b>${esc(reqLabel)}</b> <button class="btn sm ghost" data-act="clearreq">✕</button></div>` : ""}
      <label>Requirement</label>
      <select data-f="attr"><option value="">Any requirement</option>${EV.progs.length ? `<option value="unmet" ${UI.attr === "unmet" ? "selected" : ""}>Fills one of my remaining requirements</option>` : ""}
        ${ATTR_GROUPS.map(([g, codes]) => `<optgroup label="${g}">${codes.map(a => `<option value="${a}" ${UI.attr === a ? "selected" : ""}>${esc(ATTR_LABEL[a].replace(/^[^·]*· /, ""))}</option>`).join("")}</optgroup>`).join("")}</select>
      <label>Offered in 2026–27</label>
      <select data-f="season"><option value="">Any semester</option><option value="C" ${UI.season === "C" ? "selected" : ""}>Fall 2026</option><option value="A" ${UI.season === "A" ? "selected" : ""}>Spring 2027</option></select>
      <label>Level</label>
      <select data-f="level"><option value="ug" ${UI.level === "ug" ? "selected" : ""}>Undergraduate (0000–4999)</option><option value="intro" ${UI.level === "intro" ? "selected" : ""}>Introductory (0000–1999)</option><option value="mid" ${UI.level === "mid" ? "selected" : ""}>Intermediate/advanced (2000–4999)</option><option value="grad" ${UI.level === "grad" ? "selected" : ""}>Graduate (5000+)</option><option value="all" ${UI.level === "all" ? "selected" : ""}>All levels</option></select>
      <label>Department</label>
      <select data-f="dept"><option value="">All departments</option>${DEPTS.map(d => `<option ${UI.dept === d ? "selected" : ""}>${d}</option>`).join("")}</select>
      <label>Sort by</label>
      <select data-f="sort"><option value="rec">Recommended</option><option value="az" ${UI.sort === "az" ? "selected" : ""}>Course number</option><option value="q" ${UI.sort === "q" ? "selected" : ""}>Highest quality</option><option value="easy" ${UI.sort === "easy" ? "selected" : ""}>Lowest difficulty</option><option value="work" ${UI.sort === "work" ? "selected" : ""}>Least work</option></select>
      <div class="row between" style="margin-top:14px"><span class="small muted">${nf} filter${nf === 1 ? "" : "s"}</span><button class="btn sm" data-act="clearf">Clear</button></div>
    </div>
    <div>
      <div class="card" style="padding:0">
        <div class="pager" style="border-bottom:1px solid var(--line);padding:10px 16px"><span>${list.length ? `${(UI.page * per + 1).toLocaleString()}–${Math.min(list.length, UI.page * per + per).toLocaleString()} of ${list.length.toLocaleString()}` : "No matches"}</span>${pagerBtns(pages)}</div>
        ${slice.map(c => courseRow(c, { desc: S.prefs.desc, reqHi: EV.progs.length })).join("") || `<div class="empty" style="padding:30px">No courses match these filters.</div>`}
        <div class="pager" style="border-top:1px solid var(--line);padding:10px 16px"><span></span>${pagerBtns(pages)}</div>
      </div>
    </div>
  </div>`;
}
const pagerBtns = pages => `<span class="row" style="gap:6px"><button class="btn sm" data-act="page" data-d="-1" ${UI.page <= 0 ? "disabled" : ""}>Prev</button><span class="small">${UI.page + 1} / ${pages}</span><button class="btn sm" data-act="page" data-d="1" ${UI.page >= pages - 1 ? "disabled" : ""}>Next</button></span>`;
after.courses = () => {
  const inp = $("#cq"); let t;
  inp.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { UI.q = inp.value; UI.page = 0; const pos = inp.selectionStart; render(); const n = $("#cq"); n.focus(); n.setSelectionRange(pos, pos); }, 180); });
};

// Programs
function vPrograms() {
  const f = UI.progFilter, q = UI.progQ.toLowerCase();
  const list = PROGRAMS.filter(p => (f === "all" || (f === "minor" ? p.minor : p.school === f && !p.minor)) && (!q || p.name.toLowerCase().includes(q)));
  const tracked = n => !!programDef(n);
  const cats = [["all", "All"], ["COL", "College (BA)"], ["WH", "Wharton (BS)"], ["SEAS", "Engineering (BSE/BAS)"], ["NUR", "Nursing (BSN)"], ["minor", "Minors"]];
  return `<h1>Majors &amp; minors</h1><p class="sub">${PROGRAMS.length} undergraduate programs from the 2026-27 Penn Catalog. Programs marked <span class="pill g">Tracked</span> have requirement-by-requirement progress; for the rest, the planner tracks your school's requirements and total c.u., and links to the catalog.</p>
  <div class="card" style="margin-bottom:16px"><div class="row between"><div><div style="font-weight:600">Your school</div><div class="small muted">${S.school ? SCHOOLS[S.school].applies : "Determines general-education requirements."}</div></div>
    <div class="seg">${Object.entries(SCHOOLS).map(([k, v]) => `<button data-act="setschool" data-v="${k}" class="${S.school === k ? "on" : ""}">${v.short}</button>`).join("")}</div></div>
    ${S.programs.length ? `<div class="row" style="margin-top:12px;gap:6px">${S.programs.map(n => `<span class="pill g">${esc(n)} <button class="star" style="font-size:12px;padding:0 0 0 4px;color:inherit" data-act="rmprog" data-n="${esc(n)}" title="Remove">✕</button></span>`).join("")}</div>` : ""}
  </div>
  <div class="row between" style="margin-bottom:12px"><div class="seg">${cats.map(([k, l]) => `<button data-act="progf" data-v="${k}" class="${f === k ? "on" : ""}">${l}</button>`).join("")}</div>
    <input type="search" id="pq" placeholder="Search programs" value="${esc(UI.progQ)}" style="width:240px"></div>
  <div class="card" style="padding:0">${list.map(p => {
    const sel = S.programs.includes(p.name);
    return `<div class="course" style="grid-template-columns:1fr auto;align-items:center"><div><div style="font-weight:600">${esc(p.name)}</div><div class="row small" style="gap:6px;margin-top:3px"><span class="pill">${p.minor ? "Minor" : p.deg}</span>${p.school ? `<span class="pill">${SCHOOLS[p.school].short}</span>` : ""}${tracked(p.name) ? `<span class="pill g">Tracked${programDef(p.name).approx ? " (approx.)" : ""}</span>` : ""}<a class="small" href="${catalogLink(p.name)}" target="_blank" rel="noopener">Catalog ↗</a></div></div>
      <button class="btn sm ${sel ? "" : "pri"}" data-act="${sel ? "rmprog" : "addprog"}" data-n="${esc(p.name)}">${sel ? "Remove" : "Add"}</button></div>`;
  }).join("") || `<div class="empty" style="padding:24px">No programs match.</div>`}</div>`;
}
after.programs = () => { const i = $("#pq"); let t; i.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { UI.progQ = i.value; render(); const n = $("#pq"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 150); }); };

// Planner
function chipHTML(it, k) {
  const c = COURSES.get(it.id); const cnt = EV.counts.get(it.k);
  const inst = EV.insts.find(i => i.key === it.k);
  const miss = k && missingPrereq(it.id, k);
  const notOff = k && c && !offeredIn(c, k);
  const cls = miss || notOff ? "warn" : cnt ? "creq" : "";
  const tip = [cnt ? "Counts toward: " + cnt.map(x => x.r.name).join("; ") : "", miss ? "May be missing a prerequisite: " + miss.map(g => g.map(codeOf).join(" or ")).join(" and ") : "", notOff ? `Not offered in ${SEASON[k[4]].toLowerCase()} in 2025–27` : "", inst?.dup ? "Planned twice; counts once" : ""].filter(Boolean).join("\n");
  return `<div class="chip ${cls}" draggable="true" data-key="${it.k}" data-act="chip" title="${esc(tip)}"><span class="cc">${esc(codeOf(it.id))}</span><span class="ct">${S.prefs.dense ? "" : esc(c?.t || "")}</span>${inst?.dup ? '<span class="x2">×2</span>' : ""}<span class="cu">${fmtCU(c?.cu || 1)}</span></div>`;
}
function vPlan() {
  if (!S.start) return `<h1>Planner</h1><p class="sub">Set the fall you started at Penn to lay out your semesters.</p><div class="card"><div class="row"><span>I started (or will start) in Fall</span><select data-change="start"><option value="">Year…</option>${[2022, 2023, 2024, 2025, 2026, 2027].map(y => `<option>${y}</option>`).join("")}</select></div></div>`;
  const years = termsFor(S.start, S.years || 4);
  const pastWarn = k => isStarted(k);
  return `<div class="hero"><div><h1>Planner</h1><p class="sub" style="margin:0">Drag courses between semesters. Click a course for options. ${fmtCU(EV.totalCU)} of ${EV.targetCU} c.u. planned.</p></div>
    <div class="row"><label class="row small"><input type="checkbox" data-change="dense" ${S.prefs.dense ? "checked" : ""}> Compact</label><button class="btn sm" data-act="years" data-d="${(S.years || 4) === 4 ? 5 : 4}">${(S.years || 4) === 4 ? "+ Add a 5th year" : "Remove 5th year"}</button></div></div>
  <div class="legend" style="margin-bottom:14px"><span><span class="sw"></span>Elective</span><span><span class="sw g"></span>Counts toward a requirement</span><span><span class="sw s"></span>Prerequisite or offering warning</span><span><span class="sw d"></span>Semester already started</span><span><span class="x2" style="font-size:10.5px;font-weight:700;background:var(--ink);color:var(--bg);border-radius:4px;padding:0 4px">×2</span> Planned twice</span></div>
  <div class="card" style="margin-bottom:20px;padding:14px"><div class="row between" style="margin-bottom:8px"><h3 style="margin:0">Bookmarked</h3><span class="small faint">Drag into a semester to schedule; drag back to unschedule.</span></div>
    <div class="tray" data-drop="tray">${S.bm.map(id => { const c = COURSES.get(id); return c ? `<div class="chip" draggable="true" data-bm="${id}" data-act="bmchip"><span class="cc">${esc(codeOf(id))}</span><span class="ct" style="max-width:180px">${esc(c.t)}</span><span class="cu">${fmtCU(c.cu)}</span></div>` : ""; }).join("") || `<span class="empty">No bookmarks yet. Star courses on the Courses page.</span>`}</div></div>
  <div class="${S.prefs.dense ? "dense" : ""}">${years.map(y => `<div class="year"><div class="yearhead"><h2>${y.label}</h2><span class="small muted">${fmtCU(y.terms.reduce((a, k) => a + termCU(k), 0))} c.u.</span></div><div class="terms">${y.terms.map(k => {
    const cu = termCU(k);
    return `<div class="term ${pastWarn(k) ? "past" : ""}" data-drop="${k}"><div class="termhead"><span>${termLabel(k)}</span><span class="cu ${cu > 5.5 ? "over" : ""}">${fmtCU(cu)} c.u.${cu > 5.5 ? " · overload" : ""}</span></div>
      <div class="chips">${(S.plan[k] || []).map(it => chipHTML(it, k)).join("") || `<div class="empty">No courses planned</div>`}</div>
      <div class="addline" style="position:relative"><input type="text" placeholder="Add course, e.g. ECON 0100" data-addterm="${k}" autocomplete="off"></div></div>`;
  }).join("")}</div></div>`).join("")}</div>
  ${apAwards().some(a => (a.credit || []).length) || S.transfer.length ? `<div class="card"><h3>External credit applied</h3><div class="row" style="gap:6px">${EV.insts.filter(i => i.ext && i.cu > 0).map(i => `<span class="chip ext"><span class="cc">${esc(i.c ? codeOf(i.id) : i.label)}</span><span class="ct">${esc(i.label)}</span><span class="cu">${fmtCU(i.cu)}</span></span>`).join("")}</div></div>` : ""}`;
}
after.plan = () => {
  document.querySelectorAll("[data-addterm]").forEach(inp => attachSuggest(inp, id => addCourse(id, inp.dataset.addterm)));
};
function maybeWarnOffered(id, k) { const c = COURSES.get(id); if (c && S.prefs.warn.offered && !offeredIn(c, k)) toast(`${codeOf(id)} wasn't offered in ${SEASON[k[4]].toLowerCase()} 2025–27`); }
function addCourse(id, k, silent) {
  const c = COURSES.get(id); if (!c) { toast("Course not found"); return; }
  const dup = plannedIds().has(id);
  termItems(k).push({ id, k: uid() });
  save(); render();
  if (!silent) toast(`Added ${codeOf(id)} to ${termLabel(k)}${dup ? " (already planned elsewhere)" : ""}`);
  if (S.prefs.warn.offered && !offeredIn(c, k)) setTimeout(() => toast(`Heads up: ${codeOf(id)} wasn't offered in ${SEASON[k[4]].toLowerCase()} 2025–27`), 900);
  else if (S.prefs.warn.conflict && k[4] !== "B") { const conf = scheduleFor(k).conflicts.filter(x => x.includes(id)); if (conf.length) setTimeout(() => toast(`Time conflict: ${conf[0].map(codeOf).join(" & ")}`), 900); }
}
function attachSuggest(inp, onPick) {
  let box = null, hl = 0, items = [];
  const close = () => { box && box.remove(); box = null; };
  const show = () => {
    const q = inp.value.trim().toLowerCase(); close(); if (q.length < 2) return;
    const qn = q.replace(/[\s-]+/g, "");
    items = CLIST.filter(c => c.s.includes(q) || c.id.toLowerCase().replace("-", "").startsWith(qn)).sort((a, b) => (b.id.toLowerCase().replace("-", "").startsWith(qn) - a.id.toLowerCase().replace("-", "").startsWith(qn)) || (a.num >= 5000) - (b.num >= 5000) || a.dept.localeCompare(b.dept) || a.num - b.num).slice(0, 8);
    if (!items.length) return; hl = 0;
    box = document.createElement("div"); box.className = "sugg";
    box.innerHTML = items.map((c, i) => `<div data-i="${i}" class="${i === 0 ? "hl" : ""}"><span class="mono" style="font-weight:600">${esc(codeOf(c.id))}</span><span class="muted" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.t)}</span><span class="faint small">${fmtCU(c.cu)}</span></div>`).join("");
    box.style.top = (inp.offsetTop + inp.offsetHeight + 4) + "px"; box.style.left = "0";
    inp.parentElement.appendChild(box);
    box.addEventListener("mousedown", e => { const d = e.target.closest("[data-i]"); if (d) { e.preventDefault(); onPick(items[+d.dataset.i].id); } });
  };
  inp.addEventListener("input", show);
  inp.addEventListener("keydown", e => {
    if (!box) { if (e.key === "Enter") { const id = inp.value.trim().toUpperCase().replace(/\s+/, "-"); if (COURSES.has(id)) onPick(id); } return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); hl = (hl + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; box.querySelectorAll("[data-i]").forEach((d, i) => d.classList.toggle("hl", i === hl)); }
    else if (e.key === "Enter") { e.preventDefault(); onPick(items[hl].id); }
    else if (e.key === "Escape") close();
  });
  inp.addEventListener("blur", () => setTimeout(close, 150));
}

// Requirements
function reqRow(p, rr) {
  const r = rr.req; const st = rr.done ? "ok" : rr.have > 0 ? "part" : "";
  const needTxt = r.unit === "cu" ? `${fmtCU(rr.have)} / ${fmtCU(rr.need)} c.u.` : `${Math.min(rr.have, rr.need)} / ${rr.need}`;
  return `<div class="req"><span class="dot ${st}">${rr.done ? "✓" : ""}</span><div><div class="nm">${esc(r.name)}</div>
    ${rr.filled.length ? `<div class="fill">${rr.filled.map(i => `<span class="pill ${i.ext ? "b" : "g"}">${esc(i.c ? codeOf(i.id) : i.label)}${i.term && i.term.length === 5 ? " · " + termLabel(i.term).replace(/ (\d\d)(\d\d)$/, " '$2") : i.ext ? " · " + (i.transfer ? "transfer" : "AP") : ""}</span>`).join("")}</div>` : ""}
    ${r.note ? `<div class="small faint" style="margin-top:3px">${esc(r.note)}</div>` : ""}</div>
    <div class="cnt">${needTxt}${!rr.done && !ruleIsFree(r.rule) ? `<div><a href="#courses" data-act="findreq" data-p="${esc(p.def.key)}" data-r="${r.id}" class="small">Find courses</a></div>` : ""}</div></div>`;
}
function progCard(p) {
  const d = p.def;
  return `<div class="card"><div class="row between" style="align-items:flex-start"><div><h2 style="margin-bottom:2px">${esc(d.isSchool ? d.name : d.title)}</h2>
    <div class="small muted">${d.isSchool ? esc(d.applies) : d.approx ? "Approximate tracking — see catalog list." : ""} <a href="${d.source}" target="_blank" rel="noopener">Source ↗</a></div></div>
    <div style="text-align:right"><div class="big" style="font-size:24px">${p.met}<span class="muted" style="font-size:16px"> / ${p.total}</span></div><div class="small muted">met</div></div></div>
    <div class="bar g" style="margin:12px 0 6px"><i style="width:${pct(p.met, p.total)}%"></i></div>
    ${p.groups.map(g => `<div class="group"><h3 style="margin-top:14px">${esc(g.name)}</h3>${g.reqs.map(rr => reqRow(p, rr)).join("")}</div>`).join("")}
    ${(d.notes || []).map(n => `<div class="note">${esc(n)}</div>`).join("")}</div>`;
}
function vReqs() {
  const untracked = S.programs.filter(n => !programDef(n));
  return `<h1>Requirements</h1><p class="sub">Progress counts every course in your plan plus AP and transfer credit. Each course fills a requirement automatically; click a course in the Planner to choose a different requirement.</p>
  <div class="card" style="margin-bottom:16px"><div class="row between"><div><div class="big">${fmtCU(EV.totalCU)} <span class="muted" style="font-size:18px">/ ${EV.targetCU} c.u.</span></div><div class="small muted">Total course units toward the degree${S.school === "COL" ? " · " + SCHOOLS.COL.totalNote : ""}</div></div><div style="flex:1;max-width:420px"><div class="bar"><i style="width:${pct(EV.totalCU, EV.targetCU)}%"></i></div></div></div></div>
  ${!S.school ? `<div class="card"><p>Choose your school to see general-education requirements.</p><div class="seg">${Object.entries(SCHOOLS).map(([k, v]) => `<button data-act="setschool" data-v="${k}">${v.short}</button>`).join("")}</div></div>` : ""}
  <div class="grid ${EV.progs.length > 1 ? "g2" : ""}" style="align-items:start">${EV.progs.map(progCard).join("")}</div>
  ${untracked.length ? `<div class="card" style="margin-top:16px"><h3>Not mapped yet</h3>${untracked.map(n => `<div class="row between" style="padding:6px 0"><span>${esc(n)}</span><a href="${catalogLink(n)}" target="_blank" rel="noopener" class="small">Requirements in the catalog ↗</a></div>`).join("")}</div>` : ""}`;
}

// Schedule
function parseMeet(s) { // "M15.3-16.59" -> {day, start, end} minutes
  const m = s.match(/^([MTWRFSU])(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/); if (!m) return null;
  const toMin = x => { const f = parseFloat(x), h = Math.floor(f); return h * 60 + Math.round((f - h) * 100); };
  return { day: m[1], start: toMin(m[2]), end: toMin(m[3]) };
}
function scheduleFor(k) {
  const season = k[4] === "C" ? "F" : k[4] === "A" ? "S" : null;
  const blocks = [], skipped = [];
  for (const it of S.plan[k] || []) {
    const c = COURSES.get(it.id); if (!c) continue;
    const mt = season && c.mt[season];
    if (!mt) { skipped.push({ id: it.id, why: season ? "No published meeting times for this term" : "No summer times" }); continue; }
    for (const [act, pats] of Object.entries(mt)) {
      if (pats.length !== 1 || !pats[0]) { if (pats.length > 1) skipped.push({ id: it.id, why: `${act}: ${pats.length} section options` }); continue; }
      for (const p of pats[0].split(",")) { const m = parseMeet(p); if (m && "MTWRF".includes(m.day)) blocks.push({ id: it.id, act, ...m }); }
    }
  }
  const conflicts = [];
  for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
    const a = blocks[i], b = blocks[j];
    if (a.id !== b.id && a.day === b.day && a.start < b.end && b.start < a.end) { a.conf = b.conf = true; if (!conflicts.some(x => x.includes(a.id) && x.includes(b.id))) conflicts.push([a.id, b.id]); }
  }
  return { blocks, skipped, conflicts, season };
}
function vSchedule() {
  const ts = allTerms().filter(k => k[4] !== "B");
  if (!ts.length) return `<h1>Weekly schedule</h1><p class="sub">Set your starting year and add courses in the Planner to see a weekly view.</p>`;
  if (!UI.schedTerm || !ts.includes(UI.schedTerm)) UI.schedTerm = nextTerm() || ts[ts.length - 1];
  const k = UI.schedTerm; const sc = scheduleFor(k);
  const H0 = 8, H1 = 21, PX = 48;
  const exact = k === "2026C" || k === "2027A";
  return `<div class="hero"><div><h1>Weekly schedule</h1><p class="sub" style="margin:0">Uses each course's published meeting pattern${exact ? "" : ` from ${k[4] === "C" ? "Fall 2026" : "Spring 2027"} as an estimate`}. Only components with exactly one section are drawn and checked for conflicts.</p></div>
    <select data-change="schedTerm">${ts.map(t => `<option value="${t}" ${t === k ? "selected" : ""}>${termLabel(t)}</option>`).join("")}</select></div>
  ${sc.conflicts.length ? `<div class="note" style="border-color:var(--sienna);color:var(--sienna);margin-bottom:12px">Time conflict: ${sc.conflicts.map(c => c.map(codeOf).join(" & ")).join("; ")}</div>` : ""}
  <div class="sched"><div class="hd"></div>${["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => `<div class="hd">${d}</div>`).join("")}
    <div>${Array.from({ length: H1 - H0 }, (_, i) => `<div class="hr">${((H0 + i - 1) % 12) + 1}${H0 + i < 12 ? "a" : "p"}</div>`).join("")}</div>
    ${"MTWRF".split("").map(d => `<div class="col">${Array.from({ length: H1 - H0 }, () => `<div class="hr"></div>`).join("")}${sc.blocks.filter(b => b.day === d).map(b => { const top = (b.start - H0 * 60) / 60 * PX, h = Math.max(18, (b.end - b.start) / 60 * PX); const tt = m => `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")}`; return `<div class="blk ${b.conf ? "conf" : ""}" style="top:${top}px;height:${h}px" data-act="detail" data-id="${b.id}"><b>${esc(codeOf(b.id))}</b> ${b.act}<br><span class="faint">${tt(b.start)}–${tt(b.end + 1)}</span></div>`; }).join("")}</div>`).join("")}
  </div>
  ${sc.skipped.length ? `<div class="card" style="margin-top:16px"><h3>Not drawn</h3>${sc.skipped.map(s => `<div class="row small" style="padding:3px 0"><span class="mono">${esc(codeOf(s.id))}</span><span class="muted">${esc(s.why)}</span></div>`).join("")}</div>` : ""}
  ${!(S.plan[k] || []).length ? `<div class="empty" style="margin-top:12px">No courses planned for ${termLabel(k)}.</div>` : ""}`;
}

// Credit
function vCredit() {
  const sc = S.school;
  return `<h1>AP &amp; transfer credit</h1><p class="sub">Credit Penn grants for AP exams, following the College of Arts &amp; Sciences equivalence chart (Class of 2025 and later). AP credit can't satisfy College general-education requirements except Foreign Language. The Registrar makes the final call.</p>
  <div class="card" style="padding:6px 16px"><table class="t"><thead><tr><th>AP exam</th><th>Your score</th><th>Penn award</th></tr></thead><tbody>
  ${AP.map(([exam, tbl]) => { const s = S.ap[exam]; let aw = s ? tbl[s] : null; if (aw && aw.school) { const sa = aw.school[sc]; aw = sa ? { ...aw, ...sa } : { note: aw.note + (sc ? "" : " — choose your school") }; }
    const awTxt = aw ? [aw.credit ? `<span class="pill g">${aw.credit.map(codeOf).join(", ")} · ${fmtCU(aw.cu)} c.u.</span>` : "", aw.waiver ? `<span class="pill b">${aw.waiver.map(codeOf).join(", ")} waiver</span>` : "", aw.lang ? `<span class="pill g">Language requirement</span>` : "", aw.note ? `<div class="small muted">${esc(aw.note)}</div>` : ""].join(" ") : (s ? `<span class="small faint">No credit</span>` : (Object.keys(tbl).length ? `<span class="small faint">${Object.keys(tbl).sort().reverse()[0]} needed</span>` : `<span class="small faint">No credit at Penn</span>`));
    return `<tr><td>${esc(exam)}</td><td><div class="seg">${["", 5, 4, 3, 2, 1].map(v => `<button data-act="ap" data-e="${esc(exam)}" data-v="${v}" class="${(s || "") == v ? "on" : ""}">${v || "—"}</button>`).join("")}</div></td><td>${awTxt}</td></tr>`; }).join("")}
  </tbody></table></div>
  <div class="card" style="margin-top:16px"><h3>Transfer &amp; other credit</h3><p class="small muted" style="margin-top:0">Add credit you've already been awarded (study away, dual enrollment, IB). Enter a Penn course code if it was awarded as a specific course.</p>
    ${S.transfer.map(t => `<div class="row between" style="padding:6px 0;border-top:1px solid var(--line)"><span><span class="mono">${esc(t.id ? codeOf(t.id) : "—")}</span> ${esc(t.title || "")}</span><span class="row"><span class="muted">${fmtCU(+t.cu)} c.u.</span><button class="btn sm ghost" data-act="rmtr" data-k="${t.k}">Remove</button></span></div>`).join("")}
    <form class="row" id="trform" style="margin-top:10px"><input type="text" name="id" placeholder="Penn code (optional)" style="width:170px"><input type="text" name="title" placeholder="Description" style="flex:1;min-width:160px"><input type="number" name="cu" placeholder="c.u." step="0.5" min="0" value="1" style="width:80px"><button class="btn pri">Add</button></form>
  </div>
  <p class="small faint">Sources: <a href="https://www.college.upenn.edu/ap-equivalence" target="_blank" rel="noopener">College AP equivalence</a>, <a href="https://admissions.upenn.edu/how-to-apply/first-year-applicants/pre-college-credits" target="_blank" rel="noopener">Penn Admissions pre-college credit</a>. Wharton and Engineering may apply AP credit differently toward their requirements.</p>`;
}
after.credit = () => {
  $("#trform").addEventListener("submit", e => { e.preventDefault(); const f = new FormData(e.target); const id = String(f.get("id") || "").trim().toUpperCase().replace(/\s+/, "-"); S.transfer.push({ k: uid(), id: id && COURSES.has(id) ? id : (id || ""), title: String(f.get("title") || "").trim() || (COURSES.get(id)?.t || "Transfer credit"), cu: +f.get("cu") || 0 }); save(); render(); });
};

// Export
function planText() {
  const L = [`Penn degree plan — generated ${new Date().toLocaleDateString()}`, ""];
  if (S.school) L.push(`School: ${SCHOOLS[S.school].name}`);
  if (S.programs.length) L.push(`Programs: ${S.programs.join("; ")}`);
  L.push(`Course units: ${fmtCU(EV.totalCU)} / ${EV.targetCU}`, "");
  for (const k of allTerms()) { const its = S.plan[k] || []; if (!its.length) continue; L.push(`${termLabel(k)} (${fmtCU(termCU(k))} c.u.)`); for (const it of its) { const c = COURSES.get(it.id); L.push(`  ${codeOf(it.id)}  ${c?.t || ""}  [${fmtCU(c?.cu || 1)}]`); } L.push(""); }
  const ext = EV.insts.filter(i => i.ext && i.cu > 0); if (ext.length) { L.push("External credit"); ext.forEach(i => L.push(`  ${i.c ? codeOf(i.id) : ""} ${i.label} [${fmtCU(i.cu)}]`)); L.push(""); }
  for (const p of EV.progs) { L.push(`${p.def.isSchool ? p.def.name : p.def.title}: ${p.met}/${p.total} requirements met`); for (const g of p.groups) for (const rr of g.reqs) L.push(`  [${rr.done ? "x" : " "}] ${rr.req.name}${rr.filled.length ? " — " + rr.filled.map(i => i.c ? codeOf(i.id) : i.label).join(", ") : ""}`); L.push(""); }
  if (S.bm.length) L.push("Bookmarked: " + S.bm.map(codeOf).join(", "));
  return L.join("\n");
}
function vExport() {
  return `<div class="hero"><div><h1>Degree plan</h1><p class="sub" style="margin:0">A summary you can paste into an email to your advisor or a doc.</p></div><button class="btn pri" data-act="copyplan">Copy as text</button></div>
  <div class="grid g2" style="align-items:start"><div class="card planlist">${allTerms().filter(k => (S.plan[k] || []).length).map(k => `<div class="t">${termLabel(k)} <span class="muted small">· ${fmtCU(termCU(k))} c.u.</span></div>${S.plan[k].map(it => `<div><span class="mono">${esc(codeOf(it.id))}</span> <span class="muted">${esc(COURSES.get(it.id)?.t || "")}</span></div>`).join("")}`).join("") || `<div class="empty">No courses planned yet.</div>`}</div>
  <div class="card planlist"><div class="t" style="margin-top:0">Summary</div><div>${S.school ? esc(SCHOOLS[S.school].name) : "No school selected"}</div>${S.programs.map(n => `<div>${esc(n)}</div>`).join("")}<div style="margin-top:6px">${fmtCU(EV.totalCU)} / ${EV.targetCU} c.u. · ${EV.met} / ${EV.total} requirements met</div>
    ${EV.progs.map(p => `<div class="t">${esc(p.def.isSchool ? SCHOOLS[S.school].short + " requirements" : p.def.title)}</div>${p.groups.flatMap(g => g.reqs).map(rr => `<div class="small">${rr.done ? "✓" : "○"} ${esc(rr.req.name)}</div>`).join("")}`).join("")}</div></div>`;
}

// Settings
function vSettings() {
  const w = S.prefs.warn; const tg = (key, label, desc, val) => `<label class="toggle"><input type="checkbox" data-pref="${key}" ${val ? "checked" : ""}><span><b>${label}</b><br><span class="small muted">${desc}</span></span></label>`;
  return `<h1>Settings</h1><p class="sub">${esc(syncLabel())}. ${sync.mode === "cloud" ? "Your plan follows you to any device where you open this page signed in." : "Open this page signed in to Claude to save your plan to your account."}</p>
  <div class="grid g2" style="align-items:start">
    <div class="card"><h3>Student</h3>
      <div class="row between" style="padding:8px 0"><span>School</span><select data-change="school"><option value="">Choose…</option>${Object.entries(SCHOOLS).map(([k, v]) => `<option value="${k}" ${S.school === k ? "selected" : ""}>${v.name}</option>`).join("")}</select></div>
      <div class="row between" style="padding:8px 0;border-top:1px solid var(--line)"><span>Fall you matriculated</span><select data-change="start"><option value="">Year…</option>${[2022, 2023, 2024, 2025, 2026, 2027].map(y => `<option ${S.start === y ? "selected" : ""}>${y}</option>`).join("")}</select></div>
      <div class="row between" style="padding:8px 0;border-top:1px solid var(--line)"><span>Years shown in the planner</span><div class="seg"><button data-act="years" data-d="4" class="${(S.years || 4) === 4 ? "on" : ""}">4</button><button data-act="years" data-d="5" class="${S.years === 5 ? "on" : ""}">5</button></div></div>
    </div>
    <div class="card"><h3>Display</h3>
      ${tg("desc", "Show course descriptions", "Show the first lines of each description in the course list.", S.prefs.desc)}
      ${tg("dense", "Compact planner", "Hide course titles on planner chips.", S.prefs.dense)}
      <div class="row between" style="padding:10px 0;border-top:1px solid var(--line)"><span>Courses per page</span><div class="seg">${[10, 20, 50].map(n => `<button data-act="per" data-v="${n}" class="${S.prefs.per === n ? "on" : ""}">${n}</button>`).join("")}</div></div>
    </div>
    <div class="card"><h3>Warnings</h3>
      ${tg("warn.remove", "Course removal", "Ask before removing a course from the plan.", w.remove)}
      ${tg("warn.program", "Program removal", "Ask before removing a major or minor.", w.program)}
      ${tg("warn.offered", "Not-offered semester", "Warn when a course wasn't offered that season in 2025–27.", w.offered)}
      ${tg("warn.conflict", "Schedule conflicts", "Warn when a new course overlaps another's meeting time.", w.conflict)}
    </div>
    <div class="card"><h3>Your data</h3>
      <p class="small muted" style="margin-top:0">Back up your plan, move it between accounts, or start over.</p>
      <div class="row"><button class="btn" data-act="copyjson">Copy backup</button><button class="btn" data-act="importjson">Restore from backup</button><button class="btn" data-act="reset" style="color:var(--sienna)">Reset everything</button></div>
    </div>
  </div>`;
}

// ---------- menus, modals ----------
let menuEl = null;
function closeMenu() { menuEl && menuEl.remove(); menuEl = null; }
function openMenu(x, y, html) {
  closeMenu(); menuEl = document.createElement("div"); menuEl.className = "menu"; menuEl.innerHTML = html; document.body.appendChild(menuEl);
  const r = menuEl.getBoundingClientRect();
  menuEl.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + "px";
  menuEl.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + "px";
}
function modal(html) { const s = document.createElement("div"); s.className = "scrim"; s.innerHTML = `<div class="modal" role="dialog">${html}</div>`; document.body.appendChild(s); s.addEventListener("click", e => { if (e.target === s || e.target.closest("[data-close]")) s.remove(); }); return s; }
function confirmBox(msg, okLabel, fn) {
  const s = modal(`<h2>${esc(msg)}</h2><div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn" data-close>Cancel</button><button class="btn pri" id="okb">${esc(okLabel)}</button></div>`);
  $("#okb", s).onclick = () => { s.remove(); fn(); };
}
function termMenuHTML(id) {
  if (!S.start) return `<div class="lbl">Set your starting year first</div><button data-act="gostart">Open settings</button>`;
  const nt = nextTerm();
  return `<div class="lbl">Add ${esc(codeOf(id))} to…</div>` + termsFor(S.start, S.years || 4).map(y => `<div class="lbl">${y.label}</div>` + y.terms.map(k => { const c = COURSES.get(id); const off = c && !offeredIn(c, k); return `<button data-act="addto" data-id="${id}" data-t="${k}">${termLabel(k)} <span class="faint small">${fmtCU(termCU(k))} c.u.${off ? " · not usually offered" : ""}${k === nt ? " · next" : ""}</span></button>`; }).join("")).join("");
}
function courseModal(id) {
  const c = COURSES.get(id); if (!c) return;
  const wc = EV.progs.length ? wouldCount(c) : [];
  const g = prereqGroups(c);
  const mt = s => c.mt[s] ? Object.entries(c.mt[s]).map(([a, pats]) => `<div><b class="small">${a}</b> <span class="small muted">${pats.length > 1 ? pats.length + " sections" : esc(pats[0].replace(/(\d+)\.(\d+)/g, (m, h, mm) => h + ":" + mm.padEnd(2, "0")).replace(/,/g, ", "))}</span></div>`).join("") : `<span class="small faint">Not offered</span>`;
  const s = modal(`<div class="row between" style="align-items:flex-start"><div><div class="mono muted">${esc(codeOf(c.id))} · ${fmtCU(c.cu)} c.u.</div><h2>${esc(c.t)}</h2></div><button class="btn sm ghost" data-close>✕</button></div>
    ${statLine(c)}
    <p style="white-space:pre-line">${esc(c.d || "No description available.")}</p>
    <dl class="kv"><dt>Offered</dt><dd>${offeredText(c).join(", ") || "—"}</dd>
      ${c.attrs.size ? `<dt>Attributes</dt><dd>${[...c.attrs].filter(a => ATTR_LABEL[a]).map(a => `<span class="pill b" style="margin:0 4px 4px 0">${esc(ATTR_LABEL[a])}</span>`).join("")}</dd>` : ""}
      ${g ? `<dt>Prerequisites</dt><dd>${g.map(o => o.map(codeOf).join(" or ")).join("; and ")}</dd>` : ""}
      ${c.xl.length ? `<dt>Also listed as</dt><dd>${c.xl.map(codeOf).join(", ")}</dd>` : ""}
      ${(c.mt.F || c.mt.S) ? `<dt>Fall 2026</dt><dd>${mt("F")}</dd><dt>Spring 2027</dt><dd>${mt("S")}</dd>` : ""}
      ${wc.length ? `<dt>Could count toward</dt><dd>${wc.map(x => `<span class="pill ${x.rr.done ? "" : "g"}" style="margin:0 4px 4px 0">${esc(x.rr.req.name)}${x.rr.done ? " (met)" : ""}</span>`).join("")}</dd>` : ""}
    </dl>
    <div class="row" style="margin-top:18px"><button class="btn pri" id="madd">+ Add to plan</button><button class="btn" id="mbm">${S.bm.includes(id) ? "★ Bookmarked" : "☆ Bookmark"}</button>
      <a class="btn ghost" href="https://penncoursereview.com/course/${c.id}" target="_blank" rel="noopener">Penn Course Review ↗</a></div>`);
  $("#madd", s).onclick = e => { const r = e.target.getBoundingClientRect(); s.remove(); openMenu(r.left, r.bottom + 4, termMenuHTML(id)); };
  $("#mbm", s).onclick = () => { toggleBM(id); s.remove(); };
}
function toggleBM(id) { if (S.bm.includes(id)) S.bm = S.bm.filter(x => x !== id); else S.bm.push(id); save(); render(); }
function chipMenu(key, x, y) {
  const f = findItem(key); if (!f) return;
  const c = COURSES.get(f.item.id); const inst = { key, id: f.item.id, c, cu: c?.cu || 1 };
  const opts = []; for (const p of EV.progs) for (const g of p.groups) for (const rr of g.reqs) if (!ruleIsFree(rr.req.rule) && ruleMatch(rr.req.rule, inst)) opts.push({ v: p.def.key + "|" + rr.req.id, l: (p.def.isSchool ? SCHOOLS[S.school].short : p.def.title.split(",")[0]) + " · " + rr.req.name });
  openMenu(x, y, `<div class="lbl">${esc(codeOf(f.item.id))} · ${termLabel(f.term)}</div>
    <button data-act="detail" data-id="${f.item.id}">Course details</button>
    <div class="sep"></div><div class="lbl">Move to</div>
    ${allTerms().filter(k => k !== f.term).map(k => `<button data-act="moveto" data-k="${key}" data-t="${k}">${termLabel(k)}</button>`).join("")}
    ${opts.length ? `<div class="sep"></div><div class="lbl">Count toward</div><button data-act="ovr" data-k="${key}" data-v="">${!f.item.o ? "● " : ""}Automatic</button>${opts.map(o => `<button data-act="ovr" data-k="${key}" data-v="${esc(o.v)}">${f.item.o === o.v ? "● " : ""}${esc(o.l)}</button>`).join("")}` : ""}
    <div class="sep"></div><button data-act="tobm" data-k="${key}">Move to bookmarks</button><button data-act="remove" data-k="${key}" style="color:var(--sienna)">Remove from plan</button>`);
}

// ---------- events ----------
document.addEventListener("click", e => {
  const a = e.target.closest("[data-act]");
  if (menuEl && !e.target.closest(".menu")) { if (!a || !["addmenu", "chip"].includes(a.dataset.act)) closeMenu(); }
  if (!a) return;
  const d = a.dataset, act = d.act;
  if (act === "detail") { closeMenu(); courseModal(d.id); }
  else if (act === "addmenu") { const r = a.getBoundingClientRect(); openMenu(r.left - 160, r.bottom + 4, termMenuHTML(d.id)); }
  else if (act === "addto") { closeMenu(); addCourse(d.id, d.t); }
  else if (act === "gostart") { closeMenu(); go("settings"); }
  else if (act === "bm") toggleBM(d.id);
  else if (act === "page") { UI.page += +d.d; render(); window.scrollTo(0, 0); }
  else if (act === "clearf") { Object.assign(UI, { q: "", attr: "", season: "", level: "ug", dept: "", sort: "rec", page: 0, req: "" }); render(); }
  else if (act === "clearreq") { UI.req = ""; UI.page = 0; render(); }
  else if (act === "findreq") { e.preventDefault(); Object.assign(UI, { req: d.p + "||" + d.r, attr: "", q: "", page: 0, level: "all", dept: "" }); go("courses"); }
  else if (act === "setschool") { S.school = d.v; save(); render(); }
  else if (act === "progf") { UI.progFilter = d.v; render(); }
  else if (act === "addprog") { if (!S.programs.includes(d.n)) S.programs.push(d.n); const p = parseProgram(d.n); if (!S.school && p.school) S.school = p.school; save(); render(); toast(`Added ${d.n}`); }
  else if (act === "rmprog") { const doIt = () => { S.programs = S.programs.filter(x => x !== d.n); for (const k in S.plan) S.plan[k].forEach(it => { if (it.o && it.o.startsWith("p:" + d.n + "|")) delete it.o; }); save(); render(); }; S.prefs.warn.program ? confirmBox(`Remove ${d.n}?`, "Remove", doIt) : doIt(); }
  else if (act === "chip") { e.stopPropagation(); chipMenu(d.key, e.clientX, e.clientY); }
  else if (act === "bmchip") { const r = a.getBoundingClientRect(); openMenu(r.left, r.bottom + 4, termMenuHTML(d.bm) + `<div class="sep"></div><button data-act="bm" data-id="${d.bm}">Remove bookmark</button>`); }
  else if (act === "moveto") { const f = findItem(d.k); closeMenu(); if (f) { S.plan[f.term].splice(f.idx, 1); termItems(d.t).push(f.item); save(); render(); maybeWarnOffered(f.item.id, d.t); } }
  else if (act === "ovr") { const f = findItem(d.k); closeMenu(); if (f) { if (d.v) f.item.o = d.v; else delete f.item.o; save(); render(); } }
  else if (act === "tobm") { const f = findItem(d.k); closeMenu(); if (f) { S.plan[f.term].splice(f.idx, 1); if (!S.bm.includes(f.item.id)) S.bm.push(f.item.id); save(); render(); } }
  else if (act === "remove") { const f = findItem(d.k); closeMenu(); if (!f) return; const doIt = () => { S.plan[f.term].splice(f.idx, 1); save(); render(); }; S.prefs.warn.remove ? confirmBox(`Remove ${codeOf(f.item.id)} from ${termLabel(f.term)}?`, "Remove", doIt) : doIt(); }
  else if (act === "years") { S.years = +d.d; save(); render(); }
  else if (act === "per") { S.prefs.per = +d.v; UI.page = 0; save(); render(); }
  else if (act === "ap") { if (d.v) S.ap[d.e] = +d.v; else delete S.ap[d.e]; save(); render(); }
  else if (act === "rmtr") { S.transfer = S.transfer.filter(t => t.k !== d.k); save(); render(); }
  else if (act === "copyplan") copyText(planText(), "Plan copied");
  else if (act === "copyjson") copyText(JSON.stringify(S), "Backup copied — paste it somewhere safe");
  else if (act === "importjson") { const s = modal(`<h2>Restore from backup</h2><p class="small muted">Paste a backup copied from Settings. This replaces your current plan.</p><textarea id="ij" style="width:100%;height:160px;font-family:var(--mono);font-size:12px;border:1px solid var(--line2);border-radius:8px;background:var(--surface);color:var(--ink);padding:8px"></textarea><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-close>Cancel</button><button class="btn pri" id="ijok">Restore</button></div>`);
    $("#ijok", s).onclick = () => { try { const v = JSON.parse($("#ij", s).value); if (!v || typeof v !== "object" || !v.plan) throw 0; S = Object.assign(defaults(), v); S.prefs = Object.assign(defaults().prefs, S.prefs || {}); S.prefs.warn = Object.assign(defaults().prefs.warn, S.prefs.warn || {}); s.remove(); save(); render(); toast("Plan restored"); } catch (err) { toast("That doesn't look like a backup"); } }; }
  else if (act === "reset") confirmBox("Reset your whole plan? This clears courses, programs, credit and settings.", "Reset everything", () => { S = defaults(); save(); render(); toast("Plan reset"); });
});
function copyText(t, msg) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast(msg), () => { const s = modal(`<h2>Copy this text</h2><textarea style="width:100%;height:240px;font-family:var(--mono);font-size:12px">${esc(t)}</textarea><div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn" data-close>Done</button></div>`); $("textarea", s).select(); }); }
document.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.f) { UI[el.dataset.f] = el.value; UI.page = 0; render(); return; }
  const ch = el.dataset.change;
  if (ch === "school") { S.school = el.value || null; save(); render(); }
  else if (ch === "start") { S.start = el.value ? +el.value : null; save(); render(); }
  else if (ch === "dense") { S.prefs.dense = el.checked; save(); render(); }
  else if (ch === "schedTerm") { UI.schedTerm = el.value; render(); }
  if (el.dataset.pref) { const p = el.dataset.pref; if (p.startsWith("warn.")) S.prefs.warn[p.slice(5)] = el.checked; else S.prefs[p] = el.checked; save(); render(); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeMenu(); document.querySelectorAll(".scrim").forEach(s => s.remove()); } });
window.addEventListener("hashchange", () => { readRoute(); render(); window.scrollTo(0, 0); });

// ---------- boot ----------
// drag and drop (attached once)
{ const app = document;
  app.addEventListener("dragstart", e => { const ch = e.target.closest(".chip"); if (!ch) return; ch.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", ch.dataset.key ? "k:" + ch.dataset.key : "b:" + ch.dataset.bm); });
  app.addEventListener("dragend", e => { const ch = e.target.closest(".chip"); ch && ch.classList.remove("dragging"); document.querySelectorAll(".drop").forEach(x => x.classList.remove("drop")); });
  app.addEventListener("dragover", e => { const z = e.target.closest("[data-drop]"); if (!z) return; e.preventDefault(); document.querySelectorAll(".drop").forEach(x => x !== z && x.classList.remove("drop")); z.classList.add("drop"); });
  app.addEventListener("drop", e => {
    const z = e.target.closest("[data-drop]"); if (!z) return; e.preventDefault();
    const v = e.dataTransfer.getData("text/plain"); const dest = z.dataset.drop;
    if (v.startsWith("k:")) { const f = findItem(v.slice(2)); if (!f) return;
      if (dest === "tray") { S.plan[f.term].splice(f.idx, 1); if (!S.bm.includes(f.item.id)) S.bm.push(f.item.id); save(); render(); return; }
      if (dest !== f.term) { S.plan[f.term].splice(f.idx, 1); termItems(dest).push(f.item); save(); render(); maybeWarnOffered(f.item.id, dest); } }
    else if (v.startsWith("b:") && dest !== "tray") { const id = v.slice(2); S.bm = S.bm.filter(x => x !== id); addCourse(id, dest); }
  });
}
readRoute(); renderTabs();
fetch("courses.json").then(r => r.json()).then(rows => { loadCourses(rows); render(); }).catch(() => { $("#app").innerHTML = `<div class="loading">Couldn't load the course catalog. Try reloading the page.</div>`; });
initCloud();
})();
