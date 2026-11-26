/**
 * 人生游戏 · 宿主侧
 *
 * 只做三件事：
 *   1. 在 $DSH_HOME/lifegame/db.json 里存一份状态（唯一真相源）。
 *   2. 暴露两个 HTTP 接口给客户端页面用：GET state / POST op。
 *   3. 幂等去重（opId）——为手机的离线重放留好路，现在不用，将来不用改。
 *
 * 设计纪律（见 doc/001）：
 *   - 数据只有这个文件说了算，客户端不缓存真相。
 *   - 每个写操作带 opId，重复提交不会重复计数。
 *   - 日期由客户端给（用户本地时区），服务端不猜时区。
 */
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { toolCard } from "./tool-card.js";
import { todayView, weekView } from "./view.js";
import path from "node:path";
import os from "node:os";

const API = "/lifegame/api/";
const NS = "lifegame";

export const name = "lifegame";

let db = null;
let dataFile = "";
let chain = Promise.resolve();

/* ---------------- 默认数据 ---------------- */

const defaultPlan = (p) => [
  { id: "meditate", title: `冥想 ${p.meditationMinutes} 分钟`, kind: "time", minutes: p.meditationMinutes, slot: "09:30", done: false },
  { id: "move", title: `运动 ${p.moveMinutes} 分钟`, kind: "time", minutes: p.moveMinutes, slot: "09:50", done: false },
  { id: "create", title: "写一段话", kind: "output", minutes: 25, slot: "19:35", done: false },
];

const defaultAfter = [
  { time: "21:30", title: "读《禅与摩托车维修艺术》20 分钟" },
  { time: "22:45", title: "手机放到客厅" },
  { time: "00:15", title: "关灯 · 目标 00:30 前睡着" },
];

const seed = () => ({
  rev: 1,
  appliedOps: [],
  profile: {
    sleepTarget: "00:30",
    meditationMinutes: 5,
    moveMinutes: 5,
    budget: "500-1500",
    fitnessLevel: "1-2/week",
    location: { name: "杭州 · 余杭", lat: 30.4192, lon: 120.3017 },
    goals: { short: [], long: [] },
  },
  season: { name: "降噪季", dayIndex: 4, totalDays: 14, startedAt: "2026-11-24" },
  days: {},
  weeks: {},
  readlater: [],
});

/* ---------------- 存取 ---------------- */

async function load() {
  try {
    db = JSON.parse(await readFile(dataFile, "utf8"));
  } catch {
    db = seed();
  }
  if (!Array.isArray(db.appliedOps)) db.appliedOps = [];
  if (!db.days) db.days = {};
  if (!db.weeks) db.weeks = {};
  if (!Array.isArray(db.readlater)) db.readlater = [];
  if (!db.profile.location) db.profile.location = { name: "杭州 · 余杭", lat: 30.4192, lon: 120.3017 };
  if (!db.profile.goals) db.profile.goals = { short: [], long: [] };
  if (!Array.isArray(db.profile.goals.short)) db.profile.goals.short = [];
  if (!Array.isArray(db.profile.goals.long)) db.profile.goals.long = [];
  await persist();
  normalizeDays();
}

function persist() {
  chain = chain.then(async () => {
    await mkdir(path.dirname(dataFile), { recursive: true });
    const tmp = `${dataFile}.tmp`;
    await writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await rename(tmp, dataFile);
  });
  return chain;
}

function makeDay(date) {
  return {
    date,
    sleptAt: "01:42",
    wokeAt: "09:00",
    intention: "",
    plan: defaultPlan(db.profile),
    after: defaultAfter,
    todos: [],
    sessions: [],
    timer: null,
    inspiration: null,
    alt: "现在下去走 10 分钟，今天的光很好",
    teaser: "去城南那家面包店，坐 20 分钟。",
    watching: ["你 3 天没动", "今晚 19:00 后空窗", "周三降温，户外改周四"],
  };
}

function weekKeyOf(d) {
  const t = new Date(d || new Date());
  const off = (t.getDay() + 6) % 7; // 周一 = 0
  t.setDate(t.getDate() - off);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function getWeek() {
  const k = weekKeyOf(new Date(`${todayKey()}T00:00:00`));
  if (!db.weeks[k]) {
    db.weeks[k] = { key: k, goals: [], comment: null };
    persist();
  }
  const w = db.weeks[k];
  if (!Array.isArray(w.goals)) w.goals = [];
  return w;
}

/** 把旧数据里的三项对齐到当前规则（保留完成状态） */
function normalizeDays() {
  let changed = 0;
  for (const key of Object.keys(db.days)) {
    const day = db.days[key];
    if (!day || !Array.isArray(day.plan)) continue;
    for (const item of day.plan) {
      const before = `${item.title}|${item.minutes}`;
      if (item.id === "meditate") {
        item.title = `冥想 ${db.profile.meditationMinutes} 分钟`;
        item.minutes = db.profile.meditationMinutes;
      } else if (item.id === "move") {
        item.title = `运动 ${db.profile.moveMinutes} 分钟`;
        item.minutes = db.profile.moveMinutes;
      } else if (item.id === "create") {
        item.title = "写一段话";
      }
      if (`${item.title}|${item.minutes}` !== before) changed += 1;
    }
  }
  if (changed) persist();
  return changed;
}

function getDay(date) {
  const key = date || new Date().toISOString().slice(0, 10);
  if (!db.days[key]) {
    db.days[key] = makeDay(key);
    persist();
  }
  return db.days[key];
}

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** 周与「我」用的派生统计。只读，不写盘。 */
function statsFor(date) {
  const base = new Date(`${date}T00:00:00`);
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    const key = ymd(d);
    const day = db.days[key];
    week.push({
      date: key,
      done: day ? day.plan.filter((p) => p.done).length : 0,
      total: day ? day.plan.length : 0,
    });
  }
  const agg = { planDone: 0, planTotal: 0, focusSeconds: 0, sessions: 0, todosDone: 0, todosTotal: 0 };
  for (const d of week) {
    const day = db.days[d.date];
    if (!day) continue;
    agg.planDone += d.done;
    agg.planTotal += d.total;
    const sess = day.sessions || [];
    agg.sessions += sess.length;
    agg.focusSeconds += sess.reduce((n, x) => n + (x.seconds || 0), 0);
    const td = day.todos || [];
    agg.todosTotal += td.length;
    agg.todosDone += td.filter((t) => t.done).length;
  }

  const keys = Object.keys(db.days).sort();
  const active = keys.map((k) => {
    const plan = db.days[k].plan || [];
    return { date: k, done: plan.filter((p) => p.done).length, total: plan.length };
  });
  return {
    week,
    agg,
    days: keys.length,
    records: active.reduce((n, x) => n + x.done, 0),
    active,
  };
}

const publicState = (date) => ({
  rev: db.rev,
  profile: db.profile,
  season: db.season,
  day: getDay(date),
  week: getWeek(),
  readlater: db.readlater.slice(0, 40),
  weather: db.weather,
  location: db.profile.location,
  stats: statsFor(date),
});

/* ---------------- 操作 ---------------- */

const ALT_POOL = [
  "现在下去走 10 分钟，今天的光很好",
  "把手机放远，读 10 分钟任意一页",
  "给一盆植物浇水，顺便看看窗外",
  "写下今天最想不通的一件事，就一句",
];

function applyOp(op, payload, date) {
  const day = getDay(date);
  switch (op) {
    case "toggle": {
      const item = day.plan.find((x) => x.id === payload.id);
      if (!item) return false;
      item.done = !!payload.done;
      item.doneAt = payload.done ? new Date().toISOString() : null;
      return true;
    }
    case "todoAdd": {
      const text = String(payload.text ?? "").trim().slice(0, 200);
      if (!text) return false;
      if (!Array.isArray(day.todos)) day.todos = [];
      day.todos.push({ id: `t${Date.now()}_${day.todos.length}`, text, done: false, at: new Date().toISOString() });
      return true;
    }
    case "todoToggle": {
      if (!Array.isArray(day.todos)) return false;
      const t = day.todos.find((x) => x.id === payload.id);
      if (!t) return false;
      t.done = !!payload.done;
      return true;
    }
    case "todoRemove": {
      if (!Array.isArray(day.todos)) return false;
      const n = day.todos.length;
      day.todos = day.todos.filter((x) => x.id !== payload.id);
      return day.todos.length !== n;
    }
    case "lifeGoalAdd": {
      const scope = payload.scope === "long" ? "long" : "short";
      const text = String(payload.text ?? "").trim().slice(0, 160);
      if (!text) return false;
      db.profile.goals[scope].push({ id: `lg${Date.now()}`, text, done: false, at: new Date().toISOString() });
      return true;
    }
    case "lifeGoalToggle": {
      for (const scope of ["short", "long"]) {
        const g = db.profile.goals[scope].find((x) => x.id === payload.id);
        if (g) {
          g.done = !!payload.done;
          g.doneAt = g.done ? new Date().toISOString() : null;
          return true;
        }
      }
      return false;
    }
    case "lifeGoalRemove": {
      for (const scope of ["short", "long"]) {
        const before = db.profile.goals[scope].length;
        db.profile.goals[scope] = db.profile.goals[scope].filter((x) => x.id !== payload.id);
        if (db.profile.goals[scope].length !== before) return true;
      }
      return false;
    }
    case "inspirationRotate": {
      queueMicrotask(() => rotateInspiration());
      return true;
    }
    case "setLocation": {
      const name = String(payload.name ?? "").trim().slice(0, 40);
      if (!name) return false;
      db.profile.location = { name, lat: null, lon: null };
      queueMicrotask(async () => {
        const g = await geocode(name);
        if (g) {
          db.profile.location = { name: g.name || name, lat: g.lat, lon: g.lon };
          db.rev += 1;
          persist();
        }
        await fetchWeather();
      });
      return true;
    }
    case "planEdit": {
      const item = day.plan.find((p) => p.id === payload.id);
      if (!item) return false;
      const title = String(payload.title ?? "").trim().slice(0, 40);
      if (!title) return false;
      item.title = title;
      // 标题里写了「N 分钟」就同步时长，这样改时长不用另找地方
      const m = title.match(/(\d{1,3})\s*(?:分钟|min)/i);
      if (m) {
        const n = Math.max(1, Math.min(180, Number(m[1]) || 0));
        if (n) item.minutes = n;
        if (item.id === "meditate") db.profile.meditationMinutes = n;
        if (item.id === "move") db.profile.moveMinutes = n;
      }
      return true;
    }
    case "timerStart": {
      if (day.timer) return false;
      const minutes = Math.max(0, Math.min(180, Number(payload.minutes) || 0));
      day.timer = {
        label: String(payload.label ?? "").slice(0, 60),
        minutes,
        startedAt: new Date().toISOString(),
      };
      return true;
    }
    case "timerStop": {
      if (!day.timer) return false;
      const started = new Date(day.timer.startedAt).getTime();
      const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
      if (!Array.isArray(day.sessions)) day.sessions = [];
      const label = String(payload.label || day.timer.label || "").slice(0, 60);
      day.sessions.push({
        id: `s${Date.now()}`,
        label,
        startedAt: day.timer.startedAt,
        endedAt: new Date().toISOString(),
        seconds,
      });
      day.timer = null;
      return true;
    }
    case "sessionLabel": {
      const sess = (day.sessions || []).find((x) => x.id === payload.id);
      if (!sess) return false;
      sess.label = String(payload.label ?? "").slice(0, 60) || "专注";
      return true;
    }
    case "setInspiration": {
      const text = String(payload.text ?? "").trim().slice(0, 240);
      if (!text) return false;
      day.inspiration = { text, from: String(payload.from ?? "").slice(0, 60), at: new Date().toISOString() };
      return true;
    }
    case "goalAdd": {
      const w = getWeek();
      const text = String(payload.text ?? "").trim().slice(0, 160);
      if (!text) return false;
      w.goals.push({ id: `g${Date.now()}`, text, done: false, at: new Date().toISOString() });
      return true;
    }
    case "goalToggle": {
      const g = getWeek().goals.find((x) => x.id === payload.id);
      if (!g) return false;
      g.done = !!payload.done;
      return true;
    }
    case "goalRemove": {
      const w = getWeek();
      const n = w.goals.length;
      w.goals = w.goals.filter((x) => x.id !== payload.id);
      return w.goals.length !== n;
    }
    case "setWeekComment": {
      const w = getWeek();
      w.comment = String(payload.text ?? "").slice(0, 1200) || null;
      return true;
    }
    case "readlaterAdd": {
      const url = String(payload.url ?? "").trim().slice(0, 2000);
      if (!/^https?:\/\//i.test(url)) return false;
      if (db.readlater.some((x) => x.url === url)) return false;
      const newId = `r${Date.now()}`;
      db.readlater.unshift({
        id: newId,
        url,
        title: String(payload.title ?? "").slice(0, 200) || "",
        status: "pending",
        summary: "",
        outline: [],
        minutes: 0,
        addedAt: new Date().toISOString(),
      });
      queueMicrotask(() => kickParse(newId));
      return true;
    }
    case "readlaterRemove": {
      const n = db.readlater.length;
      db.readlater = db.readlater.filter((x) => x.id !== payload.id);
      return db.readlater.length !== n;
    }
    case "readlaterDone": {
      const r = db.readlater.find((x) => x.id === payload.id);
      if (!r) return false;
      r.status = payload.done ? "done" : r.summary ? "ready" : "pending";
      r.doneAt = payload.done ? new Date().toISOString() : null;
      return true;
    }
    case "readlaterRetry": {
      const r = db.readlater.find((x) => x.id === payload.id);
      if (!r) return false;
      r.status = "pending";
      r.tries = 0;
      queueMicrotask(() => kickParse(r.id));
      return true;
    }
    case "readlaterEnrich": {
      const r = db.readlater.find((x) => x.id === payload.id);
      if (!r) return false;
      if (payload.title) r.title = String(payload.title).slice(0, 200);
      r.summary = String(payload.summary ?? "").slice(0, 600);
      r.outline = Array.isArray(payload.outline) ? payload.outline.slice(0, 12).map((x) => String(x).slice(0, 120)) : [];
      r.minutes = Math.max(1, Math.min(120, Number(payload.minutes) || 0)) || 0;
      r.status = r.status === "done" ? "done" : "ready";
      r.enrichedAt = new Date().toISOString();
      return true;
    }
    case "note":
      day.note = String(payload.text ?? "").slice(0, 500);
      return true;
    case "setIntention":
      day.intention = String(payload.text ?? "").slice(0, 200);
      return true;
    case "skipAlt": {
      const i = ALT_POOL.indexOf(day.alt);
      day.alt = ALT_POOL[(i + 1) % ALT_POOL.length];
      return true;
    }
    default:
      return false;
  }
}

/* ---------------- 给 Agent 与手机用的视图模型 ---------------- */

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function viewModel(day) {
  return {
    title: `今天 · ${todayKey()}`,
    watching: day.watching || [],
    plan: day.plan.map((p) => ({ title: p.title, slot: p.slot, done: !!p.done })),
    after: day.after || [],
    todos: (day.todos || []).slice(0, 8).map((t) => ({ title: t.text, done: !!t.done })),
    focusMinutes: Math.round(((day.sessions || []).reduce((n, x) => n + (x.seconds || 0), 0)) / 60),
    inspiration: day.inspiration ? day.inspiration.text : null,
    alt: day.alt,
  };
}

function weekModel() {
  const w = getWeek();
  const st = statsFor(todayKey());
  return {
    title: `本周 · ${w.key}`,
    goals: w.goals.map((g) => ({ title: g.text, done: !!g.done })),
    comment: w.comment,
    planDone: st.agg.planDone,
    planTotal: st.agg.planTotal,
    focusMinutes: Math.round(st.agg.focusSeconds / 60),
    sessions: st.agg.sessions,
    todosDone: st.agg.todosDone,
    todosTotal: st.agg.todosTotal,
  };
}

function weekSummary() {
  const m = weekModel();
  return [
    m.goals.length ? `本周目标：${m.goals.map((g) => `${g.title}${g.done ? "（已达成）" : ""}`).join("；")}` : "本周还没定目标。",
    `本周规定事项 ${m.planDone}/${m.planTotal}，专注 ${m.focusMinutes} 分钟（${m.sessions} 段），待办 ${m.todosDone}/${m.todosTotal}。`,
    m.comment ? `写给他的话：${m.comment}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function summaryText(day) {
  const done = day.plan.filter((p) => p.done).length;
  const cur = day.plan.find((p) => !p.done);
  const wk = getWeek();
  const goalLine = wk.goals.length
    ? `本周目标：${wk.goals.map((g) => `${g.text}${g.done ? "（已达成）" : ""}`).join("；")}`
    : "";
  const goals = db.profile.goals || { short: [], long: [] };
  const goalList = [
    goals.short.length ? `短期目标：${goals.short.map((g) => `${g.text}${g.done ? "（已达成）" : ""}`).join("；")}` : "",
    goals.long.length ? `长期目标：${goals.long.map((g) => `${g.text}${g.done ? "（已达成）" : ""}`).join("；")}` : "",
  ].filter(Boolean).join("\n");
  const w = db.weather;
  const weatherLine = w && w.text ? `天气（${w.place || ""}）：${w.text} ${w.temp != null ? w.temp + "°" : ""}${w.tmax != null ? `（${w.tmin}–${w.tmax}°）` : ""}` : "";
  return [
    weatherLine,
    goalList,
    goalLine,
    `今天 ${day.plan.length} 件，已完成 ${done} 件。`,
    cur ? `下一件：${cur.title}（${cur.slot}）。` : "今天的都做完了。",
    (day.after || []).length ? `之后：${day.after.map((a) => `${a.time} ${a.title}`).join("；")}。` : "",
    Array.isArray(day.todos) && day.todos.length
      ? `自由待办 ${day.todos.filter((t) => t.done).length}/${day.todos.length}：${day.todos.filter((t) => !t.done).slice(0, 4).map((t) => t.text).join("；") || "都做完了"}`
      : "",
    (day.sessions || []).length ? `今天已专注 ${Math.round(day.sessions.reduce((n, x) => n + (x.seconds || 0), 0) / 60)} 分钟。` : "",
    day.inspiration ? `今天的灵感：${day.inspiration.text}` : "",
    day.alt ? `或者：${day.alt}` : "",
    day.note ? `今天写下一句：${day.note}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/* ---------------- 工具 ---------------- */

function json(res, code, body) {
  if (res.headersSent) return;
  res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > 512_000) reject(new Error("body too large"));
      else chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}


/* ---------------- 天气与位置 ---------------- */

const WMO = {
  0: "晴", 1: "晴间多云", 2: "多云", 3: "阴",
  45: "雾", 48: "雾凇",
  51: "毛毛雨", 53: "小雨", 55: "中雨", 56: "冻雨", 57: "冻雨",
  61: "小雨", 63: "中雨", 65: "大雨", 66: "冻雨", 67: "冻雨",
  71: "小雪", 73: "中雪", 75: "大雪", 77: "雪粒",
  80: "阵雨", 81: "阵雨", 82: "强阵雨", 85: "阵雪", 86: "阵雪",
  95: "雷阵雨", 96: "雷暴冰雹", 99: "雷暴冰雹",
};

async function fetchWeather() {
  const loc = (db.profile && db.profile.location) || null;
  if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lon)) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
      "&current=temperature_2m,weather_code,relative_humidity_2m" +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset" +
      "&timezone=Asia%2FShanghai&forecast_days=1";
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } });
    clearTimeout(timer);
    const j = await res.json();
    const cur = j.current || {};
    const d = (j.daily || {});
    db.weather = {
      code: cur.weather_code ?? null,
      text: WMO[cur.weather_code] || "",
      temp: Number.isFinite(cur.temperature_2m) ? Math.round(cur.temperature_2m) : null,
      humidity: Number.isFinite(cur.relative_humidity_2m) ? Math.round(cur.relative_humidity_2m) : null,
      tmax: Array.isArray(d.temperature_2m_max) ? Math.round(d.temperature_2m_max[0]) : null,
      tmin: Array.isArray(d.temperature_2m_min) ? Math.round(d.temperature_2m_min[0]) : null,
      rain: Array.isArray(d.precipitation_probability_max) ? d.precipitation_probability_max[0] : null,
      sunrise: Array.isArray(d.sunrise) ? String(d.sunrise[0]).slice(11, 16) : "",
      sunset: Array.isArray(d.sunset) ? String(d.sunset[0]).slice(11, 16) : "",
      place: loc.name,
      at: new Date().toISOString(),
    };
    db.rev += 1;
    persist();
    return db.weather;
  } catch {
    return null;
  }
}

async function geocodeOne(name) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=zh&format=json`;
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } });
    clearTimeout(timer);
    const j = await res.json();
    const hit = (j.results || [])[0];
    if (!hit) return null;
    return {
      name: [hit.name, hit.admin1, hit.admin2].filter(Boolean).slice(0, 2).join(" · "),
      lat: hit.latitude,
      lon: hit.longitude,
    };
  } catch {
    return null;
  }
}

/** 「杭州余杭」这种区县级查不到时，退到城市级 */
async function geocode(name) {
  const tries = [];
  const push = (v) => {
    const t = String(v || "").trim();
    if (t && !tries.includes(t)) tries.push(t);
  };
  push(name);
  push(name.replace(/[·,，\s]/g, ""));
  push(name.split(/[·,，\s]/)[0].replace(/(市|区|县|镇|街道)$/g, ""));
  push(name.replace(/[·,，\s]/g, "").slice(0, 2));
  for (const q of tries) {
    const g = await geocodeOne(q);
    if (g) return { name, lat: g.lat, lon: g.lon };
  }
  return null;
}

/* ---------------- 灵感：来源与轮换 ---------------- */

const INSPIRATION_FALLBACK = [
  "今天的光是斜的，适合走一段。",
  "窗开着两分钟，脑子会清楚一点。",
  "先把水烧上，再决定要不要坐下。",
  "不用今天就想明白，可以先记一句。",
  "把手机放到另一个房间，十分钟就好。",
];

async function rotateInspiration() {
  const day = getDay(todayKey());
  const goals = db.profile.goals || { short: [], long: [] };
  const w = db.weather;
  const prev = day.inspiration && day.inspiration.text ? day.inspiration.text : "";
  const nowH = new Date().getHours();

  const pick = await pickModel();
  if (llmRef && pick) {
    const prompt =
      "你是给一个人的日常应用写「今天的一句」的人。写一句此刻对他有用的话，30 字以内。\n" +
      "要求：具体、当下，像朋友随口说的；不要鸡汤、不要口号、不要「加油」「坚持」「相信自己」这类词；不要说教。\n" +
      "只输出这句话本身，不要引号、不要解释。\n\n" +
      `现在：${nowH} 点\n` +
      `天气：${w && w.text ? `${w.text} ${w.temp}°（${w.tmin}–${w.tmax}°）` : "未知"}\n` +
      (goals.short.length ? `他的短期目标：${goals.short.map((g) => g.text).join("；")}\n` : "") +
      (goals.long.length ? `他的长期目标：${goals.long.map((g) => g.text).join("；")}\n` : "") +
      (prev ? `上一句是（不要重复它）：${prev}\n` : "");
    try {
      let buf = "";
      for await (const c of llmRef.stream({ provider: pick.provider, model: pick.model, messages: [{ role: "user", content: [{ type: "text", text: prompt }] }] })) {
        if (!c) continue;
        if (typeof c.text === "string") buf += c.text;
        else if (c.type === "text-delta" && typeof c.delta === "string") buf += c.delta;
        if (buf.length > 300) break;
      }
      const text = buf.replace(/^["「『\s]+|["」』\s]+$/g, "").trim().slice(0, 120);
      if (text) {
        day.inspiration = { text, from: "它刚想到的", at: new Date().toISOString() };
        db.rev += 1;
        await persist();
        return;
      }
    } catch {
      /* 落到兜底 */
    }
  }

  const text = INSPIRATION_FALLBACK[Math.floor(Math.random() * INSPIRATION_FALLBACK.length)];
  day.inspiration = { text, from: "随手一条", at: new Date().toISOString() };
  db.rev += 1;
  await persist();
}

/* ---------------- 后台解析：插件自己抓页 + 调模型 ---------------- */

let llmRef = null;
let modelCache = null;
const parsing = new Set();

function stripHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function metaOf(html, name) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["']`, "i");
  return (html.match(re) || [])[1] || "";
}

function headingsOf(html) {
  const out = [];
  const re = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let m;
  while ((m = re.exec(html)) && out.length < 8) {
    const t = stripHtml(m[1]);
    if (t && t.length <= 80 && !out.includes(t)) out.push(t);
  }
  return out;
}

async function pickModel() {
  if (modelCache) return modelCache;
  const llm = llmRef;
  if (!llm || typeof llm.listProviders !== "function" || typeof llm.listModels !== "function") return null;
  for (const info of llm.listProviders() || []) {
    const pid = info && info.id;
    if (!pid) continue;
    try {
      const models = await llm.listModels(pid);
      for (const m of models || []) {
        const mods = m && m.inputModalities;
        if (Array.isArray(mods) && mods.length && !mods.includes("text")) continue;
        if (m && m.id) {
          modelCache = { provider: pid, model: m.id };
          return modelCache;
        }
      }
    } catch {
      /* 这个 provider 不可用就跳 */
    }
  }
  return null;
}

async function askModel(text, fallbackTitle) {
  const pick = await pickModel();
  if (!pick) return null;
  const prompt =
    "你在帮一个人做「稍后深度阅读」的预处理。下面是网页正文（可能含导航噪声）。" +
    "请只输出一个 JSON 对象，不要任何解释、不要代码块围栏，字段：\n" +
    '{"title":"文章标题（≤40字）","summary":"主要内容一两句，说清它到底在讲什么观点（≤120字）","outline":["纲要1","纲要2","纲要3"],"minutes":18}\n' +
    "outline 给 3-6 条，按文章逻辑顺序，每条一句话。" +
    "minutes 是「安静读完并想一想」需要的分钟数，通常 8-30。\n\n" +
    `标题参考：${fallbackTitle || "（无）"}\n正文：\n${text.slice(0, 7000)}`;

  let buf = "";
  for await (const c of llmRef.stream({
    provider: pick.provider,
    model: pick.model,
    messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
  })) {
    if (!c) continue;
    if (typeof c.text === "string") buf += c.text;
    else if (c.type === "text-delta" && typeof c.delta === "string") buf += c.delta;
    else if (c.delta && typeof c.delta.text === "string") buf += c.delta.text;
    if (buf.length > 4000) break;
  }

  const start = buf.indexOf("{");
  const end = buf.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(buf.slice(start, end + 1));
    const outline = Array.isArray(obj.outline) ? obj.outline.map((x) => String(x)).filter(Boolean).slice(0, 6) : [];
    return {
      title: String(obj.title || "").slice(0, 200),
      summary: String(obj.summary || "").slice(0, 600),
      outline,
      minutes: Math.max(5, Math.min(60, Number(obj.minutes) || 0)) || 0,
    };
  } catch {
    return null;
  }
}

/** 后台解析一条；永不抛错，失败就退回 pending 等下次 */
async function parseOne(id) {
  if (!id || parsing.has(id)) return;
  const r = (db.readlater || []).find((x) => x.id === id);
  if (!r || r.status === "done") return;

  parsing.add(id);
  const before = r.status;
  r.status = "parsing";
  persist();

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(r.url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; lifegame/0.1)", accept: "text/html,*/*" },
    });
    clearTimeout(timer);
    const html = await res.text();

    const pageTitle = stripHtml(metaOf(html, "og:title") || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
    const desc = stripHtml(metaOf(html, "og:description") || metaOf(html, "description"));
    const body = stripHtml(html);
    const heads = headingsOf(html);
    const autoMinutes = Math.max(5, Math.min(60, Math.round(body.length / 500) + 3));

    let out = null;
    try {
      out = await askModel(body, pageTitle);
    } catch {
      out = null;
    }

    r.title = (out && out.title) || r.title || pageTitle || r.url;
    r.summary = (out && out.summary) || r.summary || desc || "";
    r.outline = (out && out.outline && out.outline.length ? out.outline : heads).slice(0, 6);
    r.minutes = (out && out.minutes) || r.minutes || autoMinutes;
    r.status = "ready";
    r.enrichedAt = new Date().toISOString();
    r.source = out ? "llm" : "auto";
    r.tries = 0;
    delete r.lastError;
  } catch (e) {
    r.tries = (r.tries || 0) + 1;
    r.lastError = String((e && e.message) || e).slice(0, 200);
    r.status = r.tries >= 3 ? "failed" : "pending";
  } finally {
    parsing.delete(id);
    db.rev += 1;
    persist();
  }
}

function kickParse(id) {
  Promise.resolve().then(() => parseOne(id)).catch(() => {});
}

export { stripHtml, metaOf, headingsOf, parseOne, pickModel };

/* ---------------- 插件入口 ---------------- */

export const inject = ["webServer", "tools"];

export function apply(ctx) {
  const log = (m) => {
    try {
      ctx.logger?.info?.(`[lifegame] ${m}`);
    } catch {
      /* 没有 logger 也不影响 */
    }
  };

  const home = process.env.DSH_HOME || path.join(os.homedir(), ".dsh");
  dataFile = path.join(home, NS, "db.json");
  const ready = load().then(() => log(`state → ${dataFile}`));

  // 天气：启动后拉一次，之后每小时一次
  ctx.effect(() => {
    const pull = () => {
      fetchWeather().catch(() => {});
    };
    const t0 = setTimeout(pull, 2500);
    const t = setInterval(pull, 3600_000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, "lifegame: weather");

  // 模型调用：只有装了 llm 的主机才进来；Remote 下 App 侧不参与
  ctx.inject(["llm"], (c) => {
    llmRef = c.llm;
    log("llm 已接上，后台解析可用");
  });

  // 兜底扫描：重启后把遗留的 pending / parsing 捡起来，一次一条
  ctx.effect(() => {
    const tick = () => {
      const next = (db.readlater || []).find((x) => x.status === "pending" || x.status === "parsing");
      if (next) kickParse(next.id);
    };
    const t = setInterval(tick, 60_000);
    setTimeout(tick, 8_000);
    return () => clearInterval(t);
  }, "lifegame: readlater sweeper");

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: "exact",
        path: API + "state",
        handler: async (req, res) => {
          await ready;
          try {
            const url = new URL(req.url, "http://localhost");
            json(res, 200, publicState(url.searchParams.get("date")));
          } catch (e) {
            json(res, 500, { error: String(e?.message || e) });
          }
        },
      }),
    "lifegame: state route",
  );

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: "exact",
        path: API + "op",
        handler: async (req, res) => {
          await ready;
          try {
            const { opId, op, payload, date } = await readBody(req);
            if (!opId || !op) return json(res, 400, { error: "opId and op required" });
            if (db.appliedOps.some((x) => x.opId === opId)) {
              return json(res, 200, { ok: true, deduped: true, state: publicState(date) });
            }
            if (!applyOp(op, payload || {}, date)) return json(res, 400, { error: `unknown op: ${op}` });
            db.appliedOps.push({ opId, op, at: new Date().toISOString() });
            if (db.appliedOps.length > 300) db.appliedOps = db.appliedOps.slice(-300);
            db.rev += 1;
            await persist();
            json(res, 200, { ok: true, state: publicState(date) });
          } catch (e) {
            json(res, 400, { error: String(e?.message || e) });
          }
        },
      }),
    "lifegame: op route",
  );

  /* ---- Agent 工具：这是手机端的入口 ---- */

  const outShape = (text, view) => ({ text, view });

  ctx.effect(
    () =>
      ctx.tools.register({
        name: "lifegame_today",
        description:
          "读取「人生游戏」里今天的安排：三件地基（冥想 / 运动 / 写点东西）、此刻该做的那一件、之后的时间节点、以及「或者」的轻量替代。用户问「今天要做什么」「我现在该干嘛」「今天怎么样」时调它。返回后手机上会显示一张原生卡片。",
        parameters: { type: "object", additionalProperties: false, properties: {}, required: [] },
        output: {
          schema: { type: "object", additionalProperties: true },
          render: (_args, value) => [{ type: "text", text: value.text }],
          presentationMeta: toolCard((_args, value) => todayView(value.view)),
        },
        async execute() {
          await ready;
          const day = getDay(todayKey());
          return outShape(summaryText(day), viewModel(day));
        },
      }),
    "lifegame: tool today",
  );

  ctx.effect(
    () =>
      ctx.tools.register({
        name: "lifegame_update",
        description:
          "改「人生游戏」今天的记录。用户说「做完了」「第一件做完了」「撤回」「换一个」「帮我记一句……」时调它。action=done/undo 时 id 取 meditate / move / create（不确定就省略，默认取下一个未完成的）；action=note 时把用户原话放进 text。",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            action: { type: "string", enum: ["done", "undo", "swap", "note"] },
            id: { type: "string", description: "meditate / move / create" },
            text: { type: "string", description: "action=note 时要记下的一句话" },
          },
          required: ["action"],
        },
        output: {
          schema: { type: "object", additionalProperties: true },
          render: (_args, value) => [{ type: "text", text: value.text }],
          presentationMeta: toolCard((_args, value) => todayView(value.view)),
        },
        async execute(args) {
          await ready;
          const day = getDay(todayKey());
          const a = args && args.action;

          if (a === "done" || a === "undo") {
            const item = day.plan.find((p) => p.id === args.id) || day.plan.find((p) => !p.done);
            if (!item) return outShape("今天没有可标记的项。", viewModel(day));
            item.done = a === "done";
            item.doneAt = item.done ? new Date().toISOString() : null;
          } else if (a === "swap") {
            const i = ALT_POOL.indexOf(day.alt);
            day.alt = ALT_POOL[(i + 1) % ALT_POOL.length];
          } else if (a === "note") {
            day.note = String(args.text || "").slice(0, 500);
          } else {
            return outShape("不认识的 action。", viewModel(day));
          }

          db.rev += 1;
          await persist();
          return outShape(summaryText(day), viewModel(day));
        },
      }),
    "lifegame: tool update",
  );

  ctx.effect(
    () =>
      ctx.tools.register({
        name: "lifegame_todo",
        description:
          "管理「人生游戏」今天左侧的自由待办清单（用户自己写的临时任务，和规定的三件地基不同）。action=add 需要 text；action=done 需要 id 或 text 关键词；action=remove 需要 id；action=list 只读。用户说「加一条待办」「把 xxx 记到待办」「那条做完了」时调它。",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            action: { type: "string", enum: ["add", "done", "remove", "list"] },
            text: { type: "string", description: "action=add 的待办内容；action=done 时可用它做关键词匹配" },
            id: { type: "string" },
          },
          required: ["action"],
        },
        output: {
          schema: { type: "object", additionalProperties: true },
          render: (_args, value) => [{ type: "text", text: value.text }],
          presentationMeta: toolCard((_args, value) => todayView(value.view)),
        },
        async execute(args) {
          await ready;
          const day = getDay(todayKey());
          if (!Array.isArray(day.todos)) day.todos = [];
          const a = args && args.action;

          if (a === "add") {
            const text = String(args.text || "").trim().slice(0, 200);
            if (!text) return outShape("要加什么？", viewModel(day));
            day.todos.push({ id: `t${Date.now()}`, text, done: false, at: new Date().toISOString() });
          } else if (a === "done") {
            const t =
              day.todos.find((x) => x.id === args.id) ||
              day.todos.find((x) => !x.done && args.text && x.text.includes(String(args.text)));
            if (!t) return outShape("没找到那条待办。", viewModel(day));
            t.done = true;
          } else if (a === "remove") {
            day.todos = day.todos.filter((x) => x.id !== args.id);
          } else if (a !== "list") {
            return outShape("不认识的 action。", viewModel(day));
          }

          if (a !== "list") {
            db.rev += 1;
            await persist();
          }
          return outShape(summaryText(day), viewModel(day));
        },
      }),
    "lifegame: tool todo",
  );

  ctx.effect(
    () =>
      ctx.tools.register({
        name: "lifegame_timer",
        description:
          "「人生游戏」的专注计时。action=start 开始计时（可选 label 说明在做什么）；action=stop 结束并记录用时；action=status 看当前状态与今天累计。用户说「开始计时」「我在写东西」「停一下」「今天专注了多久」时调它。",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            action: { type: "string", enum: ["start", "stop", "status"] },
            label: { type: "string", description: "action=start 时在做什么，如「把上周的周报补完」" },
            minutes: { type: "number", description: "番茄时长（分钟）；不传为自由计时" },
          },
          required: ["action"],
        },
        output: {
          schema: { type: "object", additionalProperties: true },
          render: (_args, value) => [{ type: "text", text: value.text }],
          presentationMeta: toolCard((_args, value) => todayView(value.view)),
        },
        async execute(args) {
          await ready;
          const day = getDay(todayKey());
          const a = args && args.action;
          if (a === "start") {
            if (day.timer) return outShape(`已经在计时了（${day.timer.label || "专注"}）。`, viewModel(day));
            day.timer = {
              label: String(args.label || "专注").slice(0, 60),
              minutes: Math.max(0, Math.min(180, Number(args.minutes) || 0)),
              startedAt: new Date().toISOString(),
            };
          } else if (a === "stop") {
            if (!day.timer) return outShape("现在没有在计时。", viewModel(day));
            const seconds = Math.max(1, Math.round((Date.now() - new Date(day.timer.startedAt).getTime()) / 1000));
            if (!Array.isArray(day.sessions)) day.sessions = [];
            day.sessions.push({ id: `s${Date.now()}`, label: day.timer.label, startedAt: day.timer.startedAt, endedAt: new Date().toISOString(), seconds });
            day.timer = null;
          } else if (a !== "status") {
            return outShape("不认识的 action。", viewModel(day));
          }
          if (a !== "status") {
            db.rev += 1;
            await persist();
          }
          return outShape(summaryText(day), viewModel(day));
        },
      }),
    "lifegame: tool timer",
  );

  ctx.effect(
    () =>
      ctx.tools.register({
        name: "lifegame_inspiration",
        description:
          "给「人生游戏」写今天的灵感（一句话，会显示在今天页右栏）。内容应该具体、当下、像朋友随口说的一句，不要鸡汤和口号。可写今天的光/天气/节气、他近几天的状态、或是「或者」这类轻量替代。",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            text: { type: "string", description: "一句灵感，≤ 80 字，具体、不喊口号" },
            from: { type: "string", description: "来源，如「天气」「节气」「你的记录」「随口」" },
          },
          required: ["text"],
        },
        output: {
          schema: { type: "object", additionalProperties: true },
          render: (_args, value) => [{ type: "text", text: value.text }],
          presentationMeta: toolCard((_args, value) => todayView(value.view)),
        },
        async execute(args) {
          await ready;
          const day = getDay(todayKey());
          const text = String(args.text || "").trim().slice(0, 240);
          if (!text) return outShape("要写什么？", viewModel(day));
          day.inspiration = { text, from: String(args.from || "").slice(0, 60), at: new Date().toISOString() };
          db.rev += 1;
          await persist();
          return outShape(summaryText(day), viewModel(day));
        },
      }),
    "lifegame: tool inspiration",
  );

  ctx.effect(
    () =>
      ctx.tools.register({
        name: "lifegame_week",
        description:
          "「人生游戏」的本周。两个用途：1) 读写本周定下的目标（会用来给今天安排和推荐）；2) 读本周统计并写下给他的建议与鼓励。action=list 只读；action=goal_add 需要 text；action=goal_done 需要 id 或 text；action=comment 需要 text（写进本周页的建议区）。",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            action: { type: "string", enum: ["list", "goal_add", "goal_done", "comment"] },
            text: { type: "string", description: "goal_add 的目标内容；comment 的建议正文；goal_done 的关键词" },
            id: { type: "string" },
          },
          required: ["action"],
        },
        output: {
          schema: { type: "object", additionalProperties: true },
          render: (_args, value) => [{ type: "text", text: value.text }],
          presentationMeta: toolCard((_args, value) => weekView(value.view)),
        },
        async execute(args) {
          await ready;
          const w = getWeek();
          const a = args && args.action;

          if (a === "goal_add") {
            const text = String(args.text || "").trim().slice(0, 160);
            if (!text) return { text: "要定什么目标？" };
            w.goals.push({ id: `g${Date.now()}`, text, done: false, at: new Date().toISOString() });
          } else if (a === "goal_done") {
            const g = w.goals.find((x) => x.id === args.id) || w.goals.find((x) => !x.done && args.text && x.text.includes(String(args.text)));
            if (!g) return { text: "没找到那条目标。" };
            g.done = true;
          } else if (a === "comment") {
            w.comment = String(args.text || "").slice(0, 1200) || null;
          } else if (a !== "list") {
            return { text: "不认识的 action。" };
          }

          if (a !== "list") {
            db.rev += 1;
            await persist();
          }
          return { text: weekSummary(), view: weekModel() };
        },
      }),
    "lifegame: tool week",
  );

  ctx.effect(
    () =>
      ctx.tools.register({
        name: "lifegame_readlater",
        description:
          "「稍后深度阅读」清单。用户贴进来一篇想读的文章后，你要：1) list 看哪些还 status=pending；2) 用 web_fetch 打开链接读正文；3) 提炼「主要内容」一句话、拆出 3-6 条纲要、按篇幅和密度分配阅读分钟数；4) 调 enrich 写回去。用户在页面里贴链接后只会存 url，不会自己解析——解析是你的事。",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            action: { type: "string", enum: ["list", "add", "enrich", "done", "remove"] },
            url: { type: "string", description: "action=add" },
            id: { type: "string" },
            title: { type: "string" },
            summary: { type: "string", description: "主要内容，一两句，≤120 字" },
            outline: { type: "array", items: { type: "string" }, description: "纲要，3-6 条" },
            minutes: { type: "number", description: "建议阅读分钟数（安静读完并想一想的时间）" },
          },
          required: ["action"],
        },
        output: {
          schema: { type: "object", additionalProperties: true },
          render: (_args, value) => [{ type: "text", text: value.text }],
        },
        async execute(args) {
          await ready;
          const a = args && args.action;

          if (a === "add") {
            const url = String(args.url || "").trim();
            if (!/^https?:\/\//i.test(url)) return { text: "链接要以 http(s) 开头。" };
            if (!db.readlater.some((x) => x.url === url)) {
              const rid = `r${Date.now()}`;
              db.readlater.unshift({ id: rid, url, title: "", status: "pending", summary: "", outline: [], minutes: 0, addedAt: new Date().toISOString() });
              queueMicrotask(() => kickParse(rid));
            }
          } else if (a === "enrich") {
            const r = db.readlater.find((x) => x.id === args.id);
            if (!r) return { text: "没找到这一条。" };
            if (args.title) r.title = String(args.title).slice(0, 200);
            r.summary = String(args.summary || "").slice(0, 600);
            r.outline = Array.isArray(args.outline) ? args.outline.slice(0, 12).map((x) => String(x).slice(0, 120)) : [];
            r.minutes = Math.max(1, Math.min(120, Number(args.minutes) || 0)) || 0;
            r.status = r.status === "done" ? "done" : "ready";
            r.enrichedAt = new Date().toISOString();
          } else if (a === "done") {
            const r = db.readlater.find((x) => x.id === args.id);
            if (!r) return { text: "没找到这一条。" };
            r.status = "done";
            r.doneAt = new Date().toISOString();
          } else if (a === "remove") {
            db.readlater = db.readlater.filter((x) => x.id !== args.id);
          } else if (a !== "list") {
            return { text: "不认识的 action。" };
          }

          if (a !== "list") {
            db.rev += 1;
            await persist();
          }

          const pending = db.readlater.filter((x) => x.status === "pending");
          const ready = db.readlater.filter((x) => x.status === "ready");
          const lines = [
            `待解析 ${pending.length} 条，待读 ${ready.length} 条，已读完 ${db.readlater.filter((x) => x.status === "done").length} 条。`,
            ...pending.slice(0, 6).map((x) => `· [待解析] id=${x.id} ${x.url}`),
            ...ready.slice(0, 6).map((x) => `· [待读] id=${x.id} ${x.title || x.url}（${x.minutes} 分钟）`),
          ];
          return { text: lines.join("\n") };
        },
      }),
    "lifegame: tool readlater",
  );

  ctx.effect(
    () =>
      ctx.tools.register({
        name: "lifegame_goals",
        description:
          "用户的短期与长期人生目标（「我」页里写的）。给今天做安排/推荐前先读它，让建议贴着目标走。action=list 只读；action=add 需要 scope(short|long) 与 text；action=done 需要 id；action=remove 需要 id。",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            action: { type: "string", enum: ["list", "add", "done", "remove"] },
            scope: { type: "string", enum: ["short", "long"], description: "add 时用：短期还是长期" },
            text: { type: "string" },
            id: { type: "string" },
          },
          required: ["action"],
        },
        output: {
          schema: { type: "object", additionalProperties: true },
          render: (_args, value) => [{ type: "text", text: value.text }],
        },
        async execute(args) {
          await ready;
          const g = db.profile.goals;
          const a = args && args.action;
          if (a === "add") {
            const scope = args.scope === "long" ? "long" : "short";
            const text = String(args.text || "").trim().slice(0, 160);
            if (!text) return { text: "要写什么目标？" };
            g[scope].push({ id: `lg${Date.now()}`, text, done: false, at: new Date().toISOString() });
            db.rev += 1;
            await persist();
          } else if (a === "done") {
            for (const scope of ["short", "long"]) {
              const it = g[scope].find((x) => x.id === args.id);
              if (it) { it.done = true; it.doneAt = new Date().toISOString(); }
            }
            db.rev += 1;
            await persist();
          } else if (a === "remove") {
            g.short = g.short.filter((x) => x.id !== args.id);
            g.long = g.long.filter((x) => x.id !== args.id);
            db.rev += 1;
            await persist();
          }
          const fmt = (arr) => (arr.length ? arr.map((x) => `${x.text}${x.done ? "（已达成）" : ""}`).join("；") : "还没有");
          return { text: `短期目标：${fmt(g.short)}\n长期目标：${fmt(g.long)}` };
        },
      }),
    "lifegame: tool goals",
  );

  /* ---- DSH Go 原生插槽（仅手机本机引擎；Remote 连接下 App 不提供桥接）---- */

  ctx.inject(["dshGo"], (c) => {
    const model = () => {
      const day = getDay(todayKey());
      return viewModel(day);
    };

    c.dshGo.panel("today", {
      view: () => todayView(model(), true),
      actions: {
        done: async () => {
          await ready;
          const day = getDay(todayKey());
          const item = day.plan.find((p) => !p.done);
          if (!item) return { toast: "今天都做完了", refresh: "today" };
          item.done = true;
          item.doneAt = new Date().toISOString();
          db.rev += 1;
          await persist();
          return { toast: `记下了：${item.title}`, refresh: "today" };
        },
        swap: async () => {
          await ready;
          const day = getDay(todayKey());
          const i = ALT_POOL.indexOf(day.alt);
          day.alt = ALT_POOL[(i + 1) % ALT_POOL.length];
          db.rev += 1;
          await persist();
          return { toast: "换了一条", refresh: "today" };
        },
      },
    });

    c.dshGo.strip("today", (scope, emit) => {
      let stopped = false;
      const tick = async () => {
        try {
          await ready;
          if (stopped) return;
          const day = getDay(todayKey());
          const done = day.plan.filter((p) => p.done).length;
          emit({ text: `今天 ${done}/${day.plan.length}`, icon: "today" });
        } catch {
          /* 桥接会接住，不抛 */
        }
      };
      tick();
      const timer = setInterval(tick, 60_000);
      return () => {
        stopped = true;
        clearInterval(timer);
      };
    });
  });
}
