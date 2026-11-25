window.__ModuleLoader__.load({
  id: "@local/lifegame",
  factory(require) {
    const React = require("react");
    const h = React.createElement;
    const { useEffect, useState, useCallback, useRef } = React;

    const PANEL = "lifegame";
    const API = "/lifegame/api/";

    /* ================= 工具 ================= */

    const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const todayStr = () => ymd(new Date());
    const hm = () => {
      const d = new Date();
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    const shortDate = (s) => s.slice(5).replace("-", "/");
    const newId = () => globalThis.crypto?.randomUUID?.() || `op-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    async function fetchState() {
      const r = await fetch(`${API}state?date=${todayStr()}`, { credentials: "same-origin", cache: "no-store" });
      if (!r.ok) throw new Error(`state ${r.status}`);
      return r.json();
    }

    async function sendOp(op, payload) {
      const r = await fetch(`${API}op`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opId: newId(), op, payload, date: todayStr() }),
      });
      if (!r.ok) throw new Error(`op ${r.status}`);
      return r.json();
    }

    /* ================= 样式 ================= */

    const CSS = `
.lg-scope{
  --lg-bg:#0e0e10; --lg-surface:#18181b; --lg-surface-2:#1f1f23; --lg-surface-3:#26262b;
  --lg-text:#f2efe9; --lg-muted:#a19c93; --lg-line:#2c2c30; --lg-accent:#c9a86a; --lg-on-accent:#17140e;
  --lg-serif:"Songti SC","Noto Serif SC","Source Han Serif SC",serif;
  --lg-sans:"PingFang SC","HarmonyOS Sans SC","MiSans","Microsoft YaHei",system-ui,sans-serif;
  background:var(--lg-bg); color:var(--lg-text); min-height:100%;
  font-family:var(--lg-sans); -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
}
.lg-scope *{box-sizing:border-box}
.lg-page{
  max-width:1120px; margin:0 auto;
  padding:calc(var(--dsh-frame-top-clearance,0px) + 34px) 40px 96px;
}
@media (max-width:820px){ .lg-page{padding:calc(var(--dsh-frame-top-clearance,0px) + 20px) 20px 72px} }

/* 顶栏 */
.lg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap}
.lg-eyebrow{font-size:12px;letter-spacing:.14em;color:var(--lg-muted);margin:0 0 10px}
.lg-h1{font-family:var(--lg-serif);font-weight:500;font-size:42px;line-height:1.1;letter-spacing:.06em;margin:0}
@media (max-width:820px){ .lg-h1{font-size:30px} }
.lg-season{font-size:12px;letter-spacing:.1em;color:var(--lg-muted);padding-bottom:8px;white-space:nowrap}
.lg-rule{height:1px;background:linear-gradient(90deg,var(--lg-accent),rgba(201,168,106,0));margin:18px 0 26px}

/* 页签 */
.lg-tabs{display:flex;gap:4px;margin:0 0 30px;border-bottom:1px solid var(--lg-line)}
.lg-tab{
  min-height:46px;padding:0 18px;display:inline-flex;align-items:center;
  font-size:15px;letter-spacing:.06em;color:var(--lg-muted);
  background:none;border:0;border-bottom:1px solid transparent;cursor:pointer;transition:color .15s
}
.lg-tab:hover{color:var(--lg-text)}
.lg-tab.on{color:var(--lg-accent);border-bottom-color:var(--lg-accent)}
@media (max-width:820px){ .lg-tab{padding:0 14px;font-size:14px} }

/* 两栏 */
.lg-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:44px}
@media (min-width:1000px){ .lg-grid{grid-template-columns:minmax(0,1.45fr) minmax(0,.9fr);gap:64px;align-items:start} }

/* 组件 */
.lg-watch{
  display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;
  padding:13px 16px;background:var(--lg-surface);border-radius:10px;
  font-size:12.5px;line-height:1.7;letter-spacing:.03em;color:var(--lg-muted);margin-bottom:30px
}
.lg-watch b{display:inline-flex;align-items:center;gap:8px;color:var(--lg-accent);font-weight:500;letter-spacing:.16em}
.lg-watch b::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--lg-accent)}
.lg-sep{width:3px;height:3px;border-radius:50%;background:var(--lg-line)}

.lg-done-line{font-size:13px;color:var(--lg-muted);margin:0 0 26px;letter-spacing:.02em}
.lg-done-line em{font-style:normal;color:var(--lg-accent)}

.lg-nowtime{font-size:12px;letter-spacing:.24em;color:var(--lg-accent);margin:0 0 14px}
.lg-nowtitle{font-family:var(--lg-serif);font-weight:500;font-size:40px;line-height:1.25;letter-spacing:.04em;margin:0 0 14px}
@media (max-width:820px){ .lg-nowtitle{font-size:30px} }
.lg-why{font-size:15.5px;line-height:1.8;color:var(--lg-muted);margin:0 0 26px;max-width:34em}
.lg-actions{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.lg-btn{
  display:inline-flex;align-items:center;justify-content:center;
  min-height:56px;padding:0 46px;border-radius:12px;border:0;cursor:pointer;
  background:var(--lg-accent);color:var(--lg-on-accent);font-size:17px;font-weight:600;letter-spacing:.05em;
  transition:transform .15s cubic-bezier(.2,.8,.2,1),opacity .15s
}
.lg-btn:hover{opacity:.94}
.lg-btn:active{transform:scale(.985)}
.lg-btn[disabled]{opacity:.5;cursor:default}
.lg-ghost{min-height:46px;padding:0 10px;font-size:15px;color:var(--lg-muted);background:none;border:0;cursor:pointer;letter-spacing:.03em}
.lg-ghost:hover{color:var(--lg-text)}

.lg-alt{display:flex;align-items:center;gap:12px;margin-top:18px;padding:8px 10px 8px 18px;background:var(--lg-surface);border-radius:12px}
.lg-alt .tag{flex:0 0 auto;font-size:11.5px;letter-spacing:.18em;color:var(--lg-accent)}
.lg-alt .txt{flex:1 1 auto;min-width:0;font-size:14.5px;line-height:1.7}
.lg-alt button{flex:0 0 auto;min-height:44px;min-width:52px;font-size:13px;color:var(--lg-muted);background:none;border:0;cursor:pointer;letter-spacing:.08em}
.lg-alt button:hover{color:var(--lg-text)}

.lg-sec{font-size:11.5px;letter-spacing:.2em;color:var(--lg-muted);margin:40px 0 6px}
.lg-row{display:flex;align-items:baseline;gap:18px;padding:15px 0;border-bottom:1px solid var(--lg-line)}
.lg-row:last-child{border-bottom:0}
.lg-row i{font-style:normal;font-size:13px;color:var(--lg-muted);flex:0 0 54px;font-variant-numeric:tabular-nums;letter-spacing:.02em}
.lg-row span{font-size:15.5px;line-height:1.5}

.lg-card{background:var(--lg-surface);border-radius:14px;padding:24px}
.lg-card-title{font-size:11.5px;letter-spacing:.2em;color:var(--lg-muted);margin:0 0 14px}

.lg-plan{list-style:none;margin:0;padding:0}
.lg-plan li{display:flex;align-items:center;gap:14px;padding:13px 0;border-bottom:1px solid var(--lg-line)}
.lg-plan li:last-child{border-bottom:0}
.lg-dot{width:20px;height:20px;flex:0 0 auto;border-radius:50%;border:1px solid var(--lg-line);display:grid;place-items:center;color:transparent}
.lg-dot.on{border-color:var(--lg-accent);background:var(--lg-accent);color:var(--lg-on-accent)}
.lg-plan .t{flex:1 1 auto;min-width:0;font-size:14.5px;line-height:1.5}
.lg-plan li.on .t{color:var(--lg-muted)}
.lg-plan .s{font-size:12px;color:var(--lg-muted);flex:0 0 auto}

.lg-teaser{padding:20px;border:1px dashed var(--lg-line);border-radius:14px}
.lg-teaser p{margin:0}
.lg-teaser .a{font-size:15px;line-height:1.75;margin-bottom:8px}
.lg-teaser .b{font-size:12.5px;color:var(--lg-muted);line-height:1.7}

.lg-bars{display:flex;gap:6px;margin:6px 0 0}
.lg-bars i{flex:1 1 0;height:44px;border-radius:6px;background:var(--lg-surface-2);position:relative;overflow:hidden}
.lg-bars i b{position:absolute;left:0;right:0;bottom:0;background:rgba(201,168,106,.55);display:block}
.lg-bars i.full b{background:var(--lg-accent)}
.lg-bars-label{display:flex;gap:6px;margin-top:8px}
.lg-bars-label span{flex:1 1 0;text-align:center;font-size:10.5px;color:var(--lg-muted);letter-spacing:.06em}

.lg-traces{display:grid;grid-template-columns:repeat(15,1fr);gap:6px;margin:8px 0 10px}
.lg-traces i{aspect-ratio:1;border-radius:3px;background:var(--lg-surface-3)}
.lg-traces i.on{background:rgba(201,168,106,.62)}
.lg-traces i.full{background:var(--lg-accent)}
.lg-traces i.today{box-shadow:0 0 0 1px var(--lg-accent);background:rgba(201,168,106,.22)}
.lg-axis{display:flex;justify-content:space-between;font-size:11px;color:var(--lg-muted);letter-spacing:.08em}

.lg-big{font-family:var(--lg-serif);font-size:56px;font-weight:500;line-height:1.1;letter-spacing:.02em;color:var(--lg-accent);margin:0 0 6px}
@media (max-width:820px){ .lg-big{font-size:40px} }

.lg-muted{color:var(--lg-muted)}
.lg-state{padding:120px 0;text-align:center;color:var(--lg-muted);font-size:14px;letter-spacing:.08em}
`;

    function Styles() {
      return h("style", { dangerouslySetInnerHTML: { __html: CSS } });
    }

    /* ================= 小组件 ================= */

    function Check() {
      return h(
        "svg",
        { width: 12, height: 12, viewBox: "0 0 14 14", fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" },
        h("path", { d: "M2.6 7.4 5.6 10.4l5.8-6.4" }),
      );
    }

    function Watching({ items }) {
      const kids = [h("b", { key: "lb" }, "它在看着")];
      items.forEach((w, i) => {
        if (i > 0) kids.push(h("span", { key: `s${i}`, className: "lg-sep" }));
        kids.push(h("span", { key: `w${i}` }, w));
      });
      return h("div", { className: "lg-watch" }, ...kids);
    }

    /* ================= 今天 ================= */

    function TodayView({ state, run, busy }) {
      const { day, season } = state;
      const done = day.plan.filter((p) => p.done);
      const current = day.plan.find((p) => !p.done);
      const later = [
        ...day.plan.filter((p) => !p.done && p.id !== current?.id).map((p) => ({ time: p.slot, title: p.title })),
        ...day.after,
      ].sort((a, b) => String(a.time).localeCompare(String(b.time)));

      const why =
        current?.id === "create"
          ? "现在到 20:30 是空的。写完就够，不用写得好。"
          : current?.kind === "time"
            ? "不用做到最好，做了就算。这一项只占这么点时间。"
            : "不用想清楚再开始。";

      return h(
        "div",
        { className: "lg-grid" },
        // 主栏
        h(
          "div",
          null,
          h(Watching, { items: day.watching || [] }),

          done.length
            ? h("p", { className: "lg-done-line" }, h("em", null, "今早已完成"), "　", done.map((d) => d.title).join(" · "))
            : null,

          current
            ? h(
                "div",
                null,
                h("p", { className: "lg-nowtime" }, "现在 ", hm()),
                h("h2", { className: "lg-nowtitle" }, current.title),
                h("p", { className: "lg-why" }, why),
                h(
                  "div",
                  { className: "lg-actions" },
                  h("button", { className: "lg-btn", disabled: busy, onClick: () => run("toggle", { id: current.id, done: true }) }, "开始"),
                  h("button", { className: "lg-ghost", onClick: () => run("skipAlt", {}) }, "晚点再说"),
                ),
                h(
                  "div",
                  { className: "lg-alt" },
                  h("span", { className: "tag" }, "或者"),
                  h("span", { className: "txt" }, day.alt),
                  h("button", { onClick: () => run("skipAlt", {}) }, "换"),
                ),
              )
            : h(
                "div",
                null,
                h("p", { className: "lg-nowtime" }, "今天 · 都做完了"),
                h("h2", { className: "lg-nowtitle" }, "剩下的交给今晚"),
                h("p", { className: "lg-why" }, "22:45 手机放客厅，00:15 关灯。今天到这儿。"),
                h(
                  "div",
                  { className: "lg-actions" },
                  h("button", { className: "lg-ghost", onClick: () => day.plan.forEach((p) => run("toggle", { id: p.id, done: false })) }, "全部撤回重来"),
                ),
              ),

          h("p", { className: "lg-sec" }, "之后"),
          h(
            "div",
            null,
            ...later.map((x, i) => h("div", { className: "lg-row", key: `l${i}` }, h("i", null, x.time), h("span", null, x.title))),
          ),
        ),

        // 侧栏
        h(
          "div",
          null,
          h(
            "div",
            { className: "lg-card" },
            h("p", { className: "lg-card-title" }, "今天的三件"),
            h(
              "ul",
              { className: "lg-plan" },
              ...day.plan.map((p) =>
                h(
                  "li",
                  { key: p.id, className: p.done ? "on" : "" },
                  h("span", { className: "lg-dot" + (p.done ? " on" : "") }, p.done ? h(Check) : null),
                  h("span", { className: "t" }, p.title),
                  h("span", { className: "s" }, p.slot),
                ),
              ),
            ),
          ),

          h("p", { className: "lg-sec" }, "明天给你留了一件"),
          h("div", { className: "lg-teaser" }, h("p", { className: "a" }, day.teaser), h("p", { className: "b" }, "不用现在决定。")),
        ),
      );
    }

    /* ================= 本周 ================= */

    const WD = ["日", "一", "二", "三", "四", "五", "六"];

    function WeekView({ state }) {
      const week = state.stats?.week || [];
      const total = week.reduce((n, d) => n + d.done, 0);
      const fullDays = week.filter((d) => d.total > 0 && d.done === d.total).length;
      const touched = week.filter((d) => d.done > 0).length;

      const verdict =
        total === 0
          ? "这一周还没有记录。不用补，从今天开始记一笔就够。"
          : `这一周你完成了 ${total} 项，有 ${touched} 天动过。${fullDays > 0 ? `其中 ${fullDays} 天是全做完了的。` : ""}`;

      return h(
        "div",
        { className: "lg-grid" },
        h(
          "div",
          null,
          h("p", { className: "lg-why", style: { fontSize: 17, color: "var(--lg-text)", marginBottom: 30 } }, verdict),

          h("p", { className: "lg-sec", style: { marginTop: 0 } }, "最近七天"),
          h(
            "div",
            { className: "lg-bars" },
            ...week.map((d, i) => {
              const pct = d.total ? Math.round((d.done / d.total) * 100) : 0;
              const full = d.total > 0 && d.done === d.total;
              return h("i", { key: i, className: full ? "full" : "" }, h("b", { style: { height: `${pct}%` } }));
            }),
          ),
          h(
            "div",
            { className: "lg-bars-label" },
            ...week.map((d, i) => h("span", { key: i }, WD[new Date(`${d.date}T00:00:00`).getDay()])),
          ),

          h("p", { className: "lg-sec" }, "这一周你留下的"),
          h(
            "div",
            { className: "lg-card" },
            h("p", { className: "lg-teaser-b", style: { margin: 0, fontSize: 13.5, lineHeight: 1.8, color: "var(--lg-muted)" } }, "记录功能还没做。等「一句话」接上，这里会出现你每天写的那句。"),
          ),
        ),
        h(
          "div",
          null,
          h(
            "div",
            { className: "lg-card" },
            h("p", { className: "lg-card-title" }, "说明"),
            h(
              "p",
              { style: { margin: 0, fontSize: 13.5, lineHeight: 1.85, color: "var(--lg-muted)" } },
              "这一页现在只统计完成情况。四维趋势、可解释建议、推荐三样，按设计稿在下一版接入——它们需要 Agent 参与生成，不是前端自己算的。",
            ),
          ),
        ),
      );
    }

    /* ================= 我 ================= */

    function MeView({ state }) {
      const stats = state.stats || { days: 0, records: 0, active: [] };
      const byDate = {};
      (stats.active || []).forEach((a) => (byDate[a.date] = a));

      const cells = [];
      const base = new Date();
      for (let i = 89; i >= 0; i--) {
        const d = new Date(base);
        d.setDate(d.getDate() - i);
        const key = ymd(d);
        const a = byDate[key];
        const cls = i === 0 ? "today" : a && a.done > 0 ? (a.total > 0 && a.done === a.total ? "full" : "on") : "";
        cells.push(h("i", { key, className: cls }));
      }

      const start = (() => {
        if (!stats.active?.length) return null;
        const s = stats.active[0].date;
        return s === todayStr() ? null : shortDate(s);
      })();

      return h(
        "div",
        { className: "lg-grid" },
        h(
          "div",
          null,
          h("p", { className: "lg-big" }, `第 ${Math.max(stats.days, 1)} 天`),
          h("p", { className: "lg-why", style: { marginBottom: 34 } }, `在这里留下 ${stats.records} 条。`),

          h("p", { className: "lg-sec", style: { marginTop: 0 } }, "九十天"),
          h("div", { className: "lg-traces" }, ...cells),
          h("div", { className: "lg-axis" }, h("span", null, start || "今天"), h("span", null, "今天")),

          h("p", { className: "lg-sec" }, "从开始到现在"),
          h(
            "div",
            null,
            ...["耐心", "轻盈", "专注", "健康"].map((k) =>
              h(
                "div",
                { className: "lg-row", key: k },
                h("span", { style: { flex: "0 0 76px", fontFamily: "var(--lg-serif)", fontSize: 17, letterSpacing: ".12em" } }, k),
                h("span", { className: "lg-muted", style: { fontSize: 13.5 } }, stats.days < 7 ? "还看不出来" : "还在长"),
              ),
            ),
          ),
        ),
        h(
          "div",
          null,
          h(
            "div",
            { className: "lg-card" },
            h("p", { className: "lg-card-title" }, "当前季"),
            h("p", { style: { margin: "0 0 14px", fontSize: 16, lineHeight: 1.7 } }, `${state.season.name} · ${state.season.dayIndex} / ${state.season.totalDays}`),
            h("p", { style: { margin: 0, fontSize: 13.5, lineHeight: 1.85, color: "var(--lg-muted)" } }, "把睡前那一小时拿回来。两周后自动加码。"),
          ),
          h(
            "div",
            { className: "lg-card", style: { marginTop: 16 } },
            h("p", { className: "lg-card-title" }, "设置"),
            h(
              "p",
              { style: { margin: 0, fontSize: 13.5, lineHeight: 1.95, color: "var(--lg-muted)" } },
              `睡觉目标 ${state.profile.sleepTarget}　冥想 ${state.profile.meditationMinutes} 分钟　动一动 ${state.profile.moveMinutes} 分钟`,
            ),
          ),
        ),
      );
    }

    /* ================= 外壳 ================= */

    const TABS = [
      { id: "today", label: "今天" },
      { id: "week", label: "本周" },
      { id: "me", label: "我" },
    ];

    function LifegamePanel() {
      const [state, setState] = useState(null);
      const [err, setErr] = useState("");
      const [busy, setBusy] = useState(false);
      const [tab, setTab] = useState("today");
      const alive = useRef(true);

      const load = useCallback(async () => {
        try {
          const s = await fetchState();
          if (alive.current) {
            setState(s);
            setErr("");
          }
        } catch (e) {
          if (alive.current) setErr(String(e.message || e));
        }
      }, []);

      useEffect(() => {
        alive.current = true;
        load();
        const t = setInterval(load, 30_000);
        return () => {
          alive.current = false;
          clearInterval(t);
        };
      }, [load]);

      const run = useCallback(
        async (op, payload) => {
          if (busy) return;
          setBusy(true);
          try {
            const r = await sendOp(op, payload);
            if (r?.state) setState(r.state);
            else await load();
          } catch {
            await load();
          } finally {
            setBusy(false);
          }
        },
        [busy, load],
      );

      let body;
      if (!state) {
        body = h("div", { className: "lg-state" }, err ? `连不上后台：${err}` : "…");
      } else {
        body =
          tab === "today"
            ? h(TodayView, { state, run, busy })
            : tab === "week"
              ? h(WeekView, { state })
              : h(MeView, { state });
      }

      const day = state?.day;
      return h(
        "div",
        { className: "lg-scope" },
        h(Styles),
        h(
          "div",
          { className: "lg-page" },
          h(
            "header",
            { className: "lg-head" },
            h(
              "div",
              null,
              h("p", { className: "lg-eyebrow" }, `${day ? shortDate(day.date) : ""} · 人生游戏`),
              h("h1", { className: "lg-h1" }, tab === "today" ? "今天" : tab === "week" ? "本周" : "我"),
            ),
            h("span", { className: "lg-season" }, state ? `${state.season.name}　${state.season.dayIndex} / ${state.season.totalDays}` : ""),
          ),
          h("div", { className: "lg-rule" }),
          h(
            "nav",
            { className: "lg-tabs" },
            ...TABS.map((t) =>
              h(
                "button",
                { key: t.id, className: "lg-tab" + (tab === t.id ? " on" : ""), onClick: () => setTab(t.id) },
                t.label,
              ),
            ),
          ),
          body,
        ),
      );
    }

    /* ================= 侧栏图标 ================= */

    function PanelIcon() {
      return h(
        "svg",
        { width: 16, height: 16, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", "aria-hidden": true },
        h("circle", { cx: 10, cy: 10, r: 6.2 }),
        h("path", { d: "M10 1.4v2.2M10 16.4v2.2M1.4 10h2.2M16.4 10h2.2" }),
      );
    }

    /* ================= 注册 ================= */

    return {
      inject: ["slots"],
      apply(ctx) {
        ctx.slots.inject("sidebar.panellist", () =>
          ctx.slots.register({ name: "sidebar.panellist", id: PANEL, order: 6, label: () => "人生游戏" }, PanelIcon),
        );
        ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: PANEL }, LifegamePanel));
      },
    };
  },
});
