window.__ModuleLoader__.load({
  id: "@local/lifegame",
  factory(require) {
    const React = require("react");
    const h = React.createElement;
    const { useEffect, useState, useCallback, useRef } = React;

    const PANEL = "lifegame";
    const API = "/lifegame/api/";

    /* ---------------- 基础设施 ---------------- */

    const todayStr = () => {
      const d = new Date();
      const p = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    };

    const hm = () => {
      const d = new Date();
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };

    const opId = () =>
      (globalThis.crypto?.randomUUID?.() || `op-${Date.now()}-${Math.random().toString(16).slice(2)}`);

    async function fetchState() {
      const r = await fetch(`${API}state?date=${todayStr()}`, { credentials: "same-origin", cache: "no-store" });
      if (!r.ok) throw new Error(`state ${r.status}`);
      return r.json();
    }

    async function sendOp(op, payload) {
      const body = { opId: opId(), op, payload, date: todayStr() };
      const r = await fetch(`${API}op`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`op ${r.status}`);
      return r.json();
    }

    /* ---------------- 样式 ---------------- */

    const ACCENT = "#c9a86a";

    const CSS = `
.lg-root{
  --lg-bg: var(--dsw-alias-bg-base, #0e0e10);
  --lg-surface: var(--dsw-alias-bg-elevated, #18181b);
  --lg-text: var(--dsw-alias-text-primary, #f2efe9);
  --lg-muted: var(--dsw-alias-text-secondary, #a19c93);
  --lg-line: var(--dsw-alias-border-default, #2c2c30);
  --lg-accent: ${ACCENT};
  --lg-serif: "Songti SC","Noto Serif SC","Source Han Serif SC",serif;
  background: var(--lg-bg);
  color: var(--lg-text);
  min-height: 100%;
  padding: calc(var(--dsh-frame-top-clearance, 0px) + 28px) 24px 64px;
  font-family: var(--dsw-font-family-body, "PingFang SC","HarmonyOS Sans SC","Microsoft YaHei",system-ui,sans-serif);
  -webkit-font-smoothing: antialiased;
}
.lg-inner{max-width:520px;margin:0 auto}
.lg-top{display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-size:12px;color:var(--lg-muted);letter-spacing:.04em;margin-bottom:10px}
.lg-title{font-family:var(--lg-serif);font-weight:500;font-size:28px;line-height:1.2;letter-spacing:.05em;margin:0 0 16px}
.lg-watch{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;padding:11px 13px;background:var(--lg-surface);border-radius:8px;font-size:11px;line-height:1.7;letter-spacing:.04em;color:var(--lg-muted);margin-bottom:18px}
.lg-watch b{display:inline-flex;align-items:center;gap:6px;color:var(--lg-accent);font-weight:400;letter-spacing:.14em}
.lg-watch b::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--lg-accent)}
.lg-done{font-size:12px;color:var(--lg-muted);margin:0 0 20px}
.lg-done em{font-style:normal;color:var(--lg-accent)}
.lg-nowtime{font-size:11px;letter-spacing:.22em;color:var(--lg-accent);margin:0 0 10px}
.lg-nowtitle{font-family:var(--lg-serif);font-weight:500;font-size:30px;line-height:1.35;letter-spacing:.04em;margin:0 0 10px}
.lg-why{font-size:14px;line-height:1.7;color:var(--lg-muted);margin:0 0 18px}
.lg-actions{display:flex;align-items:center;gap:14px}
.lg-btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 34px;border-radius:12px;background:var(--lg-accent);color:#17140e;font-size:16px;font-weight:600;letter-spacing:.04em;border:0;cursor:pointer;transition:transform .15s cubic-bezier(.2,.8,.2,1),opacity .15s}
.lg-btn:active{transform:scale(.985);opacity:.92}
.lg-ghost{min-height:44px;padding:0 8px;font-size:14px;color:var(--lg-muted);background:none;border:0;cursor:pointer}
.lg-alt{display:flex;align-items:center;gap:10px;margin-top:14px;padding:6px 8px 6px 14px;background:var(--lg-surface);border-radius:12px;font-size:13px;line-height:1.6}
.lg-alt span.tag{color:var(--lg-accent);font-size:11px;letter-spacing:.14em;flex:0 0 auto}
.lg-alt span.txt{flex:1 1 auto;min-width:0}
.lg-alt button{min-height:44px;min-width:44px;font-size:12px;color:var(--lg-muted);background:none;border:0;cursor:pointer;letter-spacing:.06em}
.lg-sec{font-size:11px;letter-spacing:.16em;color:var(--lg-muted);margin:26px 0 8px}
.lg-row{display:flex;align-items:baseline;gap:14px;padding:11px 0;border-bottom:1px solid var(--lg-line)}
.lg-row:last-child{border-bottom:0}
.lg-row i{font-style:normal;font-size:12px;color:var(--lg-muted);flex:0 0 46px;font-variant-numeric:tabular-nums}
.lg-row span{font-size:14px;line-height:1.5}
.lg-teaser{padding:16px;border:1px dashed var(--lg-line);border-radius:12px}
.lg-teaser p{margin:0}
.lg-teaser p.a{font-size:14px;line-height:1.7;margin-bottom:6px}
.lg-teaser p.b{font-size:12px;color:var(--lg-muted);line-height:1.7}
.lg-state{color:var(--lg-muted);font-size:13px;letter-spacing:.06em;padding:60px 0;text-align:center}
`;

    function Styles() {
      return h("style", { dangerouslySetInnerHTML: { __html: CSS } });
    }

    /* ---------------- 页面 ---------------- */

    function TodayPage() {
      const [state, setState] = useState(null);
      const [err, setErr] = useState("");
      const [busy, setBusy] = useState(false);
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

      if (err && !state)
        return h("div", { className: "lg-root" }, h(Styles), h("div", { className: "lg-inner" }, h("div", { className: "lg-state" }, "连不上后台：", err)));

      if (!state) return h("div", { className: "lg-root" }, h(Styles), h("div", { className: "lg-inner" }, h("div", { className: "lg-state" }, "…")));

      const { day, season } = state;
      const done = day.plan.filter((p) => p.done);
      const current = day.plan.find((p) => !p.done);
      const later = [
        ...day.plan.filter((p) => !p.done && p.id !== current?.id).map((p) => ({ time: p.slot, title: p.title })),
        ...day.after,
      ].sort((a, b) => a.time.localeCompare(b.time));

      const reason = current?.id === "create" ? "现在到 20:30 是空的。写完就够，不用写得好。" : "不用做到最好，做了就算。";

      return h(
        "div",
        { className: "lg-root" },
        h(Styles),
        h(
          "div",
          { className: "lg-inner" },
          h(
            "div",
            { className: "lg-top" },
            h("span", null, day.date.replace(/-/g, "/").slice(5), " · 今天"),
            h("span", null, season.name, " ", season.dayIndex, " / ", season.totalDays),
          ),
          h("h1", { className: "lg-title" }, "今天"),

          h(
            "div",
            { className: "lg-watch" },
            h("b", null, "它在看着"),
            ...day.watching.flatMap((w, i) => (i === 0 ? [h("span", { key: `w${i}` }, w)] : [h("span", { key: `d${i}` }, "·"), h("span", { key: `w${i}` }, w)])),
          ),

          done.length
            ? h("p", { className: "lg-done" }, h("em", null, "今早已完成"), " ", done.map((d) => d.title).join(" · "))
            : null,

          current
            ? h(
                "div",
                null,
                h("p", { className: "lg-nowtime" }, "现在 ", hm()),
                h("h2", { className: "lg-nowtitle" }, current.title),
                h("p", { className: "lg-why" }, reason),
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
                h("h2", { className: "lg-nowtitle" }, "今天做完了"),
                h("p", { className: "lg-why" }, "剩下的交给今晚：22:45 手机放客厅，00:15 关灯。"),
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

          h("p", { className: "lg-sec" }, "明天给你留了一件"),
          h("div", { className: "lg-teaser" }, h("p", { className: "a" }, day.teaser), h("p", { className: "b" }, "不用现在决定。")),
        ),
      );
    }

    /* ---------------- 侧栏图标 ---------------- */

    function PanelIcon() {
      return h(
        "svg",
        { width: 16, height: 16, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", "aria-hidden": true },
        h("circle", { cx: 10, cy: 10, r: 6.2 }),
        h("path", { d: "M10 1.4v2.2M10 16.4v2.2M1.4 10h2.2M16.4 10h2.2" }),
      );
    }

    /* ---------------- 注册 ---------------- */

    return {
      inject: ["slots"],
      apply(ctx) {
        ctx.slots.inject("sidebar.panellist", () =>
          ctx.slots.register({ name: "sidebar.panellist", id: PANEL, order: 6, label: () => "人生游戏" }, PanelIcon),
        );
        ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: PANEL }, TodayPage));
      },
    };
  },
});
