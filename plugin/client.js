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
    // 凌晨 6 点前的时间视为"次日"，否则 00:15 会被排到最前面
    const sortKey = (t) => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || ""));
      if (!m) return 99999;
      const hh = Number(m[1]);
      return (hh < 6 ? hh + 24 : hh) * 60 + Number(m[2]);
    };
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
@media (min-width:1000px){ .lg-grid{grid-template-columns:minmax(0,1.35fr) minmax(0,.95fr);gap:56px;align-items:start} }
@media (max-width:999px){ .lg-grid{gap:26px} }

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
.lg-dot{width:22px;height:22px;flex:0 0 auto;border-radius:50%;border:1px solid var(--lg-line);display:grid;place-items:center;color:transparent;background:none;cursor:pointer;padding:0;transition:border-color .15s,background .15s}
.lg-dot:hover{border-color:var(--lg-accent)}
.lg-dot.on{border-color:var(--lg-accent);background:var(--lg-accent);color:var(--lg-on-accent)}
.lg-plan .t{flex:1 1 auto;min-width:0;font-size:14.5px;line-height:1.5}
.lg-plan li.on .t{color:var(--lg-muted)}
.lg-plan .s{font-size:12px;color:var(--lg-muted);flex:0 0 auto}

.lg-teaser{padding:20px;border:1px dashed var(--lg-line);border-radius:14px}
.lg-teaser p{margin:0}
.lg-teaser .a{font-size:15px;line-height:1.75;margin-bottom:8px}
.lg-teaser .b{font-size:12.5px;color:var(--lg-muted);line-height:1.7}

.lg-bars{display:flex;gap:6px;margin:6px 0 0}
.lg-bars i{flex:1 1 0;height:64px;border-radius:6px;background:var(--lg-surface-2);position:relative;overflow:hidden}
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

/* 专注卡 */
.lg-focus{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.lg-focus .big{font-family:var(--lg-serif);font-size:26px;letter-spacing:.02em;line-height:1.2;color:var(--lg-accent);font-variant-numeric:tabular-nums}
.lg-focus .unit{font-size:12px;color:var(--lg-muted);margin-left:2px}
.lg-focus .sub{flex:1 1 100%;font-size:12.5px;color:var(--lg-muted);line-height:1.7;margin:0}
.lg-focus-btn{margin-left:auto;flex:0 0 auto;min-height:42px;padding:0 18px;border-radius:9px;border:1px solid rgba(201,168,106,.45);background:none;color:var(--lg-accent);font-size:13.5px;cursor:pointer;letter-spacing:.04em}
.lg-focus-btn:hover{background:rgba(201,168,106,.1)}

/* 灵感 */
.lg-insp{margin:0}
.lg-insp .q{font-family:var(--lg-serif);font-size:17px;line-height:1.9;letter-spacing:.03em;color:var(--lg-text);margin:0 0 10px}
.lg-insp .from{font-size:11.5px;color:var(--lg-muted);letter-spacing:.06em;margin:0}
.lg-insp .none{font-size:13px;line-height:1.85;color:var(--lg-muted);margin:0}

/* 现在这条 */
.lg-nowbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px;margin-bottom:16px;background:var(--lg-surface);border-radius:10px;font-size:13px}
.lg-nowbar .k{color:var(--lg-accent);letter-spacing:.16em;font-size:11.5px;flex:0 0 auto}
.lg-nowbar .v{flex:1 1 auto;min-width:0;color:var(--lg-muted);line-height:1.6}
.lg-go{flex:0 0 auto;min-height:38px;padding:0 18px;border-radius:8px;border:0;cursor:pointer;background:var(--lg-accent);color:var(--lg-on-accent);font-size:13px;font-weight:600;letter-spacing:.04em}

/* 卡片头 */
.lg-card-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:14px}
.lg-card-head span:first-child{font-size:12px;letter-spacing:.18em;color:var(--lg-muted)}
.lg-count-n{font-size:12px;color:var(--lg-muted);font-variant-numeric:tabular-nums}

/* 快速输入 */
.lg-add{display:flex;gap:8px;margin-bottom:8px}
.lg-add input{flex:1 1 auto;min-width:0;min-height:48px;padding:0 16px;background:var(--lg-surface-2);border:1px solid var(--lg-line);border-radius:10px;color:var(--lg-text);font-size:15px;font-family:var(--lg-sans);outline:none}
.lg-add input::placeholder{color:#6b665f}
.lg-add input:focus{border-color:var(--lg-accent)}
.lg-add-btn{flex:0 0 auto;min-width:56px;min-height:48px;border-radius:10px;border:1px solid var(--lg-line);background:none;color:var(--lg-muted);font-size:15px;cursor:pointer}
.lg-add-btn:hover{color:var(--lg-text);border-color:var(--lg-muted)}

/* 待办列表 */
.lg-todo{list-style:none;margin:6px 0 0;padding:0}
.lg-todo li{display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--lg-line)}
.lg-todo li:last-child{border-bottom:0}
.lg-todo li .t{flex:1 1 auto;min-width:0;font-size:15px;line-height:1.55}
.lg-todo li.on .t{color:var(--lg-muted);text-decoration:line-through;text-decoration-color:var(--lg-line);text-decoration-thickness:1px}
.lg-del{flex:0 0 auto;width:32px;height:32px;display:grid;place-items:center;border:0;background:none;color:var(--lg-muted);cursor:pointer;font-size:16px;border-radius:8px;opacity:.55}
.lg-del:hover{color:var(--danger);background:var(--lg-surface-2)}
.lg-empty{margin:10px 0 2px;font-size:13.5px;line-height:1.8;color:var(--lg-muted)}
.lg-plan-t{flex:1 1 auto;min-width:0;text-align:left;background:none;border:0;cursor:pointer;color:var(--lg-text);font-size:14.5px;line-height:1.5;padding:0;font-family:var(--lg-sans)}
.lg-plan-t:hover{color:var(--lg-accent)}
.lg-row-s{display:flex;align-items:baseline;gap:14px;padding:9px 0;border-bottom:1px solid var(--lg-line)}
.lg-row-s:last-child{border-bottom:0}
.lg-row-s i{font-style:normal;font-size:12px;color:var(--lg-muted);flex:0 0 50px;font-variant-numeric:tabular-nums}
.lg-row-s span{font-size:13.5px;line-height:1.5;color:var(--lg-muted)}

/* 执行界面：看不见别的，只有这一件 */
.lg-run{position:fixed;inset:0;z-index:60;background:var(--lg-bg);display:flex;flex-direction:column}
.lg-run-top{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;gap:12px}
.lg-run-name{font-size:13px;letter-spacing:.14em;color:var(--lg-muted)}
.lg-count{font-size:13px;letter-spacing:.06em;color:var(--lg-muted);font-variant-numeric:tabular-nums;display:inline-flex;align-items:center;gap:6px}
.lg-count.ok{color:var(--lg-accent)}
.lg-x{width:44px;height:44px;display:grid;place-items:center;color:var(--lg-muted);background:none;border:0;cursor:pointer;border-radius:999px}
.lg-x:hover{background:var(--lg-surface)}
.lg-paper{flex:1 1 auto;margin:0 22px;padding:26px 24px;background:var(--lg-surface-2);border-radius:18px;display:flex;flex-direction:column;overflow:hidden}
.lg-paper textarea{flex:1 1 auto;width:100%;min-height:180px;background:none;border:0;outline:none;resize:none;color:var(--lg-text);font-family:var(--lg-serif);font-size:17.5px;line-height:2;letter-spacing:.02em}
.lg-paper textarea::placeholder{color:#6b665f}
.lg-foot{padding:18px 22px 26px}
.lg-timer{flex:1 1 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:0 24px 40px}
.lg-ring{position:relative;width:min(240px,64vw);aspect-ratio:1}
.lg-ring svg{width:100%;height:100%;display:block}
.lg-ring-c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.lg-ring-n{font-family:var(--lg-serif);font-size:40px;font-weight:500;letter-spacing:.04em;font-variant-numeric:tabular-nums;line-height:1.24;color:var(--lg-accent)}
.lg-ring-l{font-size:11px;letter-spacing:.22em;color:var(--lg-muted)}
.lg-run-item{font-family:var(--lg-serif);font-size:22px;font-weight:500;letter-spacing:.04em;text-align:center;margin:0 0 6px}
.lg-run-hint{font-size:12.5px;color:var(--lg-muted);letter-spacing:.04em;text-align:center;margin:0}
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

    /* ================= 执行界面 ================= */

    const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    function Runner({ item, mode, onClose, run }) {
      const isTimer = mode === "timer";
      const total = Math.max(1, (item?.minutes || 20) * 60);
      const [text, setText] = useState(item?.note || "");
      const [left, setLeft] = useState(isTimer ? 0 : total);

      useEffect(() => {
        if (mode === "focus") {
          const t = setInterval(() => setLeft((x) => (x > 0 ? x - 1 : 0)), 1000);
          return () => clearInterval(t);
        }
        if (mode === "timer") {
          const t = setInterval(() => setLeft((x) => x + 1), 1000);
          return () => clearInterval(t);
        }
      }, [mode]);

      const finish = async () => {
        if (isTimer) {
          if (left >= 10) await run("timerStop", {});
          onClose();
          return;
        }
        if (text.trim()) await run("note", { text: text.trim() });
        if (item?.id) await run("toggle", { id: item.id, done: true });
        onClose();
      };

      const done = mode === "write" ? text.trim().length >= 200 : isTimer ? false : left === 0;
      const pct = mode === "write" ? Math.min(1, text.trim().length / 200) : isTimer ? (left % 3600) / 3600 : 1 - left / total;

      return h(
        "div",
        { className: "lg-run" },
        h(
          "div",
          { className: "lg-run-top" },
          h("button", { className: "lg-x", onClick: onClose, "aria-label": "退出" },
            h("svg", { width: 18, height: 18, viewBox: "0 0 18 18", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" },
              h("path", { d: "M4.5 4.5l9 9M13.5 4.5l-9 9" }))),
          h("span", { className: "lg-run-name" }, isTimer ? "专注计时" : item?.title || ""),
          h("span", { className: "lg-count" + (done ? " ok" : "") }, mode === "write" ? `${text.trim().length} 字` : fmt(left)),
        ),

        mode === "write"
          ? h("div", { className: "lg-paper" },
              h("textarea", {
                value: text,
                placeholder: "随便写什么。不用写得好。",
                onChange: (e) => setText(e.target.value),
                spellCheck: false,
              }))
          : h("div", { className: "lg-timer" },
              h("p", { className: "lg-run-item" }, isTimer ? "现在，只有这一件事" : item?.title || ""),
              h("p", { className: "lg-run-hint" }, "手机放远一点。这一屏不会响。"),
              h("div", { className: "lg-ring" },
                h("svg", { viewBox: "0 0 260 260", "aria-hidden": true },
                  h("circle", { cx: 130, cy: 130, r: 110, fill: "none", stroke: "#26262b", strokeWidth: 1.5 }),
                  h("circle", {
                    cx: 130, cy: 130, r: 110, fill: "none", stroke: "var(--lg-accent)", strokeWidth: 2,
                    strokeLinecap: "round",
                    strokeDasharray: `${(2 * Math.PI * 110 * pct).toFixed(1)} 691.15`,
                    transform: "rotate(-90 130 130)",
                  })),
                h("div", { className: "lg-ring-c" },
                  h("span", { className: "lg-ring-n" }, fmt(left)),
                  h("span", { className: "lg-ring-l" }, isTimer ? "已专注" : left === 0 ? "时间到了" : "还剩")))),

        h("div", { className: "lg-foot" },
          h("button", { className: "lg-btn", style: { width: "100%", padding: 0 }, onClick: finish },
            isTimer ? (left < 10 ? "太短，不留记录" : "结束并记录") : done ? "完成" : mode === "write" ? "写完，完成" : "提前结束，算完成"),
          h("p", { style: { margin: "12px 0 0", textAlign: "center", fontSize: 12, color: "var(--lg-muted)" } },
            isTimer
              ? "用时会计进今天和本周。少于 10 秒不留记录。"
              : mode === "write"
                ? "写完会记进今天，也会进「本周」你留下的话。"
                : "做完了就记一笔，不用回来打勾。")),
      );
    }

    /* ================= 今天 ================= */

    function TodayView({ state, run, busy }) {
      const [runner, setRunner] = useState(null);
      const [draft, setDraft] = useState("");
      const { day } = state;

      const current = day.plan.find((p) => !p.done);
      const later = [...(day.after || [])].sort((a, b) => sortKey(a.time) - sortKey(b.time));
      const todos = Array.isArray(day.todos) ? day.todos : [];
      const openTodos = todos.filter((t) => !t.done);
      const doneTodos = todos.filter((t) => t.done);
      const donePlan = day.plan.filter((p) => p.done).length;
      const sessions = Array.isArray(day.sessions) ? day.sessions : [];
      const focusMin = Math.round(sessions.reduce((n, x) => n + (x.seconds || 0), 0) / 60);
      const longest = sessions.length ? Math.round(Math.max(...sessions.map((x) => x.seconds || 0)) / 60) : 0;

      const go = (item) => setRunner({ item, mode: item.kind === "output" ? "write" : "focus" });

      const addTodo = () => {
        const text = draft.trim();
        if (!text) return;
        setDraft("");
        run("todoAdd", { text });
      };

      return h(
        "div",
        null,
        runner ? h(Runner, { item: runner.item, mode: runner.mode, onClose: () => setRunner(null), run }) : null,

        h(
          "div",
          { className: "lg-grid" },

          /* ---------- 左：今天要做（自由待办） ---------- */
          h(
            "div",
            null,
            h(Watching, { items: day.watching || [] }),

            h(
              "div",
              { className: "lg-nowbar" },
              h("span", { className: "k" }, "现在 ", hm()),
              h("span", { className: "v" }, current ? `下一件规定事项：${current.title}` : "规定事项都做完了"),
              current ? h("button", { className: "lg-go", onClick: () => go(current) }, "开始") : null,
            ),

            h(
              "div",
              { className: "lg-card", style: { marginBottom: 16 } },
              h("div", { className: "lg-card-head" }, h("span", null, "专注"), h("span", { className: "lg-count-n" }, "计时自动记")),
              h(
                "div",
                { className: "lg-focus" },
                h("span", { className: "big" }, focusMin),
                h("span", { className: "unit" }, "分钟"),
                h(
                  "button",
                  { className: "lg-focus-btn", onClick: () => setRunner({ item: null, mode: "timer" }) },
                  day.timer ? "计时中" : "开始专注",
                ),
                h(
                  "p",
                  { className: "sub" },
                  day.timer
                    ? `正在计时：${day.timer.label}`
                    : sessions.length
                      ? `今天 ${sessions.length} 段，最长 ${longest} 分钟。`
                      : "还没有记录。点开始就计时，结束自动记下用时。",
                ),
              ),
            ),

            h(
              "div",
              { className: "lg-card" },
              h(
                "div",
                { className: "lg-card-head" },
                h("span", null, "今天要做"),
                h("span", { className: "lg-count-n" }, openTodos.length ? `还剩 ${openTodos.length} 件` : "清空了"),
              ),
              h(
                "div",
                { className: "lg-add" },
                h("input", {
                  value: draft,
                  placeholder: "写一件要做的事，回车添加",
                  onChange: (e) => setDraft(e.target.value),
                  onKeyDown: (e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      addTodo();
                    }
                  },
                }),
                h("button", { className: "lg-add-btn", onClick: addTodo }, "加"),
              ),
              todos.length === 0
                ? h("p", { className: "lg-empty" }, "还没有。想到什么就写一件，不用分类，也不用排优先级。")
                : h(
                    "ul",
                    { className: "lg-todo" },
                    ...[...openTodos, ...doneTodos].map((t) =>
                      h(
                        "li",
                        { key: t.id, className: t.done ? "on" : "" },
                        h(
                          "button",
                          {
                            className: "lg-dot" + (t.done ? " on" : ""),
                            onClick: () => run("todoToggle", { id: t.id, done: !t.done }),
                            "aria-label": t.done ? "标记未完成" : "标记完成",
                          },
                          t.done ? h(Check) : null,
                        ),
                        h("span", { className: "t" }, t.text),
                        h("button", { className: "lg-del", onClick: () => run("todoRemove", { id: t.id }), "aria-label": "删除" }, "×"),
                      ),
                    ),
                  ),
            ),
          ),

          /* ---------- 右：规定事项 ---------- */
          h(
            "div",
            null,
            h(
              "div",
              { className: "lg-card" },
              h(
                "div",
                { className: "lg-card-head" },
                h("span", null, "规定事项"),
                h("span", { className: "lg-count-n" }, `${donePlan} / ${day.plan.length}`),
              ),
              h(
                "ul",
                { className: "lg-plan" },
                ...day.plan.map((p) =>
                  h(
                    "li",
                    { key: p.id, className: p.done ? "on" : "" },
                    h(
                      "button",
                      {
                        className: "lg-dot" + (p.done ? " on" : ""),
                        onClick: () => run("toggle", { id: p.id, done: !p.done }),
                        "aria-label": p.done ? "撤销" : "标记完成",
                      },
                      p.done ? h(Check) : null,
                    ),
                    h("button", { className: "lg-plan-t", onClick: () => go(p), title: "进入这一件" }, p.title),
                    h("span", { className: "s" }, p.slot),
                  ),
                ),
              ),
            ),

            h(
              "div",
              { className: "lg-card", style: { marginTop: 16 } },
              h(
                "div",
                { className: "lg-card-head" },
                h("span", null, "灵感"),
                h("span", { className: "lg-count-n" }, day.inspiration ? day.inspiration.from || "" : ""),
              ),
              day.inspiration
                ? h("div", { className: "lg-insp" }, h("p", { className: "q" }, `「${day.inspiration.text}」`), h("p", { className: "from" }, "它替你想到的"))
                : h("p", { className: "lg-empty" }, "今天的还没到。它一般早上来，也可以直接跟我说「给我一条今天的灵感」。"),
            ),

            h(
              "div",
              { className: "lg-card", style: { marginTop: 16 } },
              h("div", { className: "lg-card-head" }, h("span", null, "之后"), h("span", { className: "lg-count-n" }, "到点会提醒")),
              ...later.map((x, i) => h("div", { className: "lg-row-s", key: `l${i}` }, h("i", null, x.time), h("span", null, x.title))),
            ),

            h(
              "div",
              { className: "lg-alt", style: { marginTop: 16 } },
              h("span", { className: "tag" }, "或者"),
              h("span", { className: "txt" }, day.alt),
              h("button", { onClick: () => run("skipAlt", {}) }, "换"),
            ),

            h("p", { className: "lg-sec" }, "明天给你留了一件"),
            h("div", { className: "lg-teaser" }, h("p", { className: "a" }, day.teaser), h("p", { className: "b" }, "不用现在决定。")),
          ),
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

      const best = week.reduce((a, b) => (b.done > a.done ? b : a), week[0] || { done: 0, date: "" });
      const bestLabel =
        !best || best.done === 0
          ? "这周还没有哪一天算得上。不急，明天就可能是。"
          : `${shortDate(best.date)} 那天做完了 ${best.done} 件，是这周最多的一天。`;

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
            h("p", { className: "lg-card-title" }, "这一周最快的一天"),
            h("p", { style: { margin: "0 0 10px", fontSize: 15, lineHeight: 1.8 } }, bestLabel),
            h(
              "p",
              { style: { margin: 0, fontSize: 13, lineHeight: 1.85, color: "var(--lg-muted)" } },
              "不比上周，不排名次。只看得出你在哪天更像你自己。",
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
