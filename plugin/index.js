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
  { id: "move", title: `动一动 ${p.moveMinutes} 分钟`, kind: "time", minutes: p.moveMinutes, slot: "09:50", done: false },
  { id: "create", title: "写 200 字", kind: "output", minutes: 25, slot: "19:35", done: false },
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
    meditationMinutes: 10,
    moveMinutes: 20,
    budget: "500-1500",
    fitnessLevel: "1-2/week",
  },
  season: { name: "降噪季", dayIndex: 4, totalDays: 14, startedAt: "2026-11-24" },
  days: {},
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
  await persist();
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
    alt: "现在下去走 10 分钟，今天的光很好",
    teaser: "去城南那家面包店，坐 20 分钟。",
    watching: ["你 3 天没动", "今晚 19:00 后空窗", "周三降温，户外改周四"],
  };
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
  const keys = Object.keys(db.days).sort();
  const active = keys.map((k) => {
    const plan = db.days[k].plan || [];
    return { date: k, done: plan.filter((p) => p.done).length, total: plan.length };
  });
  return {
    week,
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

/* ---------------- 插件入口 ---------------- */

export const inject = ["webServer"];

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
}
