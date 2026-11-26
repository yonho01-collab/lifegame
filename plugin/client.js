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
      if (!r.ok) {
        let detail = "";
        try {
          const j = await r.json();
          detail = j && j.error ? String(j.error) : "";
        } catch {
          /* 忽略 */
        }
        throw new Error(detail || `op ${r.status}`);
      }
      return r.json();
    }

    /* ================= 样式 ================= */

    const CSS = `
.lg-scope{
  /* 极简白：大留白、细线、黑白加一点蓝 */
  --lg-bg:#fafaf9; --lg-surface:#ffffff; --lg-surface-2:#f4f4f5; --lg-surface-3:#efeff1;
  --lg-text:#18181b; --lg-muted:#6b6b73; --lg-line:#e4e4e7;
  --lg-ink:#18181b; --lg-on-ink:#ffffff;
  --lg-accent:#2563eb; --lg-on-accent:#ffffff;
  --lg-hover:#f1f1f3; --lg-placeholder:#a1a1aa;
  --lg-focus:rgba(37,99,235,.32); --lg-accent-soft:rgba(37,99,235,.08);
  --lg-danger:#b42318; --lg-danger-line:rgba(180,35,24,.4);
  --lg-radius:10px; --lg-shadow:0 1px 2px rgba(24,24,27,.06);
  --lg-serif:"PingFang SC","HarmonyOS Sans SC","Microsoft YaHei",system-ui,sans-serif;
  --lg-sans:"PingFang SC","HarmonyOS Sans SC","Microsoft YaHei",system-ui,sans-serif;
  background:var(--lg-bg); color:var(--lg-text);
  height:100%; display:flex; flex-direction:column; overflow-y:auto; overflow-x:hidden;
  scrollbar-width:thin; scrollbar-color:rgba(24,24,27,.16) transparent;
  font-family:var(--lg-sans); -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
}
.lg-scope::-webkit-scrollbar{width:6px;height:6px}
.lg-scope::-webkit-scrollbar-track{background:transparent}
.lg-scope::-webkit-scrollbar-thumb{background:rgba(24,24,27,.14);border-radius:999px}
.lg-scope::-webkit-scrollbar-thumb:hover{background:rgba(24,24,27,.26)}
.lg-scope *{box-sizing:border-box}
.lg-page{
  width:100%; max-width:var(--lg-maxw,1560px); min-width:0; margin:0 auto; flex:0 0 auto;
  padding:calc(var(--dsh-frame-top-clearance,0px) + 30px) clamp(20px,2.6vw,56px) 96px;
}
@media (max-width:820px){ .lg-page{padding:calc(var(--dsh-frame-top-clearance,0px) + 20px) 20px 72px} }

/* 顶栏 */
.lg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap}
.lg-eyebrow{font-size:12px;letter-spacing:.14em;color:var(--lg-muted);margin:0 0 10px}
.lg-h1{letter-spacing:-.02em;font-family:var(--lg-serif);font-weight:500;font-size:42px;line-height:1.1;letter-spacing:.06em;margin:0}
@media (max-width:820px){ .lg-h1{letter-spacing:-.02em;font-size:30px} }
.lg-season{font-size:12px;letter-spacing:.1em;color:var(--lg-muted);padding-bottom:8px;white-space:nowrap}
.lg-notice{display:flex;align-items:flex-start;gap:12px;margin:14px 0 0;padding:11px 14px;border:1px solid var(--lg-danger-line);border-radius:var(--lg-radius);background:#fef3f2;color:var(--lg-danger);font-size:13px;line-height:1.6}
.lg-notice span{flex:1 1 auto;min-width:0}
.lg-notice button{flex:0 0 auto;border:0;background:none;color:var(--lg-danger);font-size:15px;cursor:pointer;line-height:1;padding:2px 4px}
.lg-rule{height:1px;background:var(--lg-line);margin:18px 0 26px}

/* 页签 */
.lg-tabs{display:flex;flex-wrap:nowrap;align-items:stretch;gap:4px;margin:0 0 30px;border-bottom:1px solid var(--lg-line);min-width:0}
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
@media (min-width:1000px){ .lg-grid{grid-template-columns:minmax(0,1.45fr) minmax(320px,1fr);gap:clamp(28px,3vw,64px);align-items:start} }
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
  background:var(--lg-ink);color:var(--lg-on-ink);font-size:17px;font-weight:600;letter-spacing:.05em;
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

.lg-card{background:var(--lg-surface);border:1px solid var(--lg-line);border-radius:var(--lg-radius);padding:22px 24px;box-shadow:var(--lg-shadow)}
.lg-card-title{font-size:11.5px;letter-spacing:.2em;color:var(--lg-muted);margin:0 0 14px}

.lg-plan{list-style:none;margin:0;padding:0}
.lg-plan li .lg-drag{margin-left:2px}
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
.lg-bars i b{position:absolute;left:0;right:0;bottom:0;background:var(--lg-focus);display:block}
.lg-bars i.full b{background:var(--lg-accent)}
.lg-bars-label{display:flex;gap:6px;margin-top:8px}
.lg-bars-label span{flex:1 1 0;text-align:center;font-size:10.5px;color:var(--lg-muted);letter-spacing:.06em}

.lg-traces{display:grid;grid-template-columns:repeat(15,minmax(0,1fr));gap:8px;max-width:640px}
.lg-traces i{aspect-ratio:1;border-radius:3px;background:var(--lg-surface-2);display:block}
.lg-traces i.on{background:var(--lg-focus)}
.lg-traces i.full{background:var(--lg-accent)}
.lg-traces i.today{box-shadow:0 0 0 1px var(--lg-accent);background:var(--lg-accent-soft)}
.lg-axis{display:flex;justify-content:space-between;max-width:520px;margin-top:8px;font-size:11px;color:var(--lg-muted);letter-spacing:.08em}

.lg-big{font-family:var(--lg-sans);font-size:38px;font-weight:600;line-height:1.15;letter-spacing:-.02em;color:var(--lg-accent);margin:0 0 6px}
@media (max-width:820px){ .lg-big{font-size:30px} }

.lg-muted{color:var(--lg-muted)}
.lg-eyebrow-sm{margin:0 0 8px;font-size:11.5px;letter-spacing:.2em;color:var(--lg-muted)}
.footnote-line{margin:2px 0 10px;font-size:12px;line-height:1.7;color:var(--lg-muted)}
.lg-readrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 12px}
.lg-readrow .k{flex:0 0 auto;font-size:11.5px;letter-spacing:.1em;color:var(--lg-muted)}
.lg-readchip{max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-height:28px;padding:0 12px;border-radius:999px;border:1px dashed var(--lg-line);background:none;color:var(--lg-muted);font-size:12px;font-family:var(--lg-sans);cursor:grab}
.lg-readchip:hover{color:var(--lg-accent);border-color:var(--lg-accent)}
.lg-readchip:active{cursor:grabbing}
.lg-cal-day.drop-on{border-color:var(--lg-accent);background:var(--lg-accent-soft)}
.lg-cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;margin-bottom:16px}
.lg-cal-day{background:var(--lg-surface-2);border:1px solid var(--lg-line);border-radius:10px;padding:10px 9px;min-height:150px;display:flex;flex-direction:column;gap:8px}
.lg-cal-day.today{border-color:var(--lg-focus)}
.lg-cal-day.past{opacity:.62}
.lg-cal-head{display:flex;align-items:baseline;justify-content:space-between;font-size:11.5px;color:var(--lg-muted);letter-spacing:.06em}
.lg-cal-head b{font-weight:500;color:var(--lg-text);font-size:12px}
.lg-cal-day.today .lg-cal-head b{color:var(--lg-accent)}
.lg-cal-tasks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.lg-cal-tasks li{display:flex;align-items:flex-start;gap:5px;font-size:12px;line-height:1.55}
.lg-cal-tasks li .tx{flex:1 1 auto;min-width:0;white-space:pre-wrap;overflow-wrap:anywhere}
.lg-cal-tasks li.on .tx{color:var(--lg-muted);text-decoration:line-through;text-decoration-color:var(--lg-line)}
.lg-cal-tasks li .lg-dot{width:15px;height:15px;margin-top:1px}
.lg-cal-tasks li .lg-del{display:none;width:18px;height:18px;font-size:12px}
.lg-cal-tasks li:hover .lg-del{display:grid;place-items:center}
.lg-cal-add{margin-top:auto;display:flex;gap:4px}
.lg-cal-add input{flex:1 1 auto;min-width:0;min-height:28px;padding:2px 8px;background:var(--lg-surface);border:1px solid var(--lg-line);border-radius:6px;color:var(--lg-text);font-size:12px;font-family:var(--lg-sans);outline:none}
.lg-cal-add input:focus{border-color:var(--lg-accent)}
.lg-cal-add input::placeholder{color:var(--lg-placeholder)}
.lg-cal-add button{flex:0 0 auto;min-height:28px;padding:0 8px;border-radius:6px;border:1px solid var(--lg-line);background:none;color:var(--lg-muted);font-size:12px;cursor:pointer}
.lg-cal-add button:hover{color:var(--lg-accent);border-color:var(--lg-line)}
@media (max-width:1100px){ .lg-cal{grid-template-columns:repeat(4,minmax(0,1fr))} }
@media (max-width:700px){ .lg-cal{grid-template-columns:repeat(2,minmax(0,1fr))} }
.lg-fold{min-height:24px;padding:0 10px;border-radius:999px;border:1px solid var(--lg-line);background:none;color:var(--lg-muted);font-size:11.5px;font-family:var(--lg-sans);cursor:pointer}
.lg-fold:hover{color:var(--lg-accent);border-color:var(--lg-focus)}
.lg-charts{display:grid;grid-template-columns:1fr 1fr 152px;gap:22px;align-items:end;margin-bottom:20px;padding-bottom:18px;border-bottom:1px solid var(--lg-line)}
.lg-chart-box{min-width:0}
.lg-chart-k{display:block;font-size:11px;letter-spacing:.06em;color:var(--lg-muted);margin-bottom:8px}
.lg-chart{width:100%;height:76px;display:block}
.lg-chart .bar{fill:var(--lg-surface-3)}
.lg-chart .bar.on{fill:var(--lg-accent)}
.lg-rings{display:flex;gap:18px;align-self:center;justify-content:flex-end}
.lg-ring{display:flex;flex-direction:column;align-items:center;gap:3px}
.lg-ring .ring-wrap{position:relative;width:64px;height:64px}
.lg-ring .ring-wrap svg{width:64px;height:64px;display:block}
.lg-ring .ring-bg{fill:none;stroke:var(--lg-surface-3);stroke-width:5}
.lg-ring .ring-fg{fill:none;stroke:var(--lg-accent);stroke-width:5;stroke-linecap:round;transition:stroke-dasharray .4s}
.lg-ring b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:500;font-variant-numeric:tabular-nums;margin:0}
.lg-ring span{font-size:11px;color:var(--lg-muted)}
.lg-ring em{font-style:normal;font-size:10.5px;color:var(--lg-muted);font-variant-numeric:tabular-nums}
.lg-drop-img{display:flex;align-items:center;gap:12px;padding:16px;border:1px dashed var(--lg-line);border-radius:var(--lg-radius);background:var(--lg-surface-2);transition:border-color .15s,background .15s}
.lg-drop-img.over{border-color:var(--lg-accent);background:var(--lg-accent-soft)}
.lg-drop-img.busy{opacity:.6}
.lg-drop-img-btn{min-height:30px;padding:0 14px;border-radius:var(--lg-radius);border:1px solid var(--lg-line);background:var(--lg-surface);color:var(--lg-text);font-size:12.5px;display:inline-flex;align-items:center;cursor:pointer;box-shadow:var(--lg-shadow)}
.lg-drop-img-btn:hover{border-color:var(--lg-accent);color:var(--lg-accent)}
.lg-drop-img-hint{font-size:11.5px;color:var(--lg-muted)}
.lg-thumb{display:block;max-width:100%;max-height:180px;border-radius:8px;border:1px solid var(--lg-line);object-fit:cover}
.lg-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:16px 18px;margin-bottom:16px}
.lg-stat{display:flex;flex-direction:column;gap:2px;min-width:0}
.lg-stat .k{font-size:11px;letter-spacing:.08em;color:var(--lg-muted)}
.lg-stat b{font-size:17px;font-weight:500;color:var(--lg-text);font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.lg-stat .s{font-size:11.5px;color:var(--lg-muted)}
.lg-stats-bars{display:flex;flex-direction:column;gap:10px;padding-top:4px;border-top:1px solid var(--lg-line);margin-top:2px;padding-top:14px}
.lg-minibar-row{display:flex;align-items:center;gap:10px;font-size:11.5px;color:var(--lg-muted)}
.lg-minibar-row .k{flex:0 0 56px}
.lg-minibar-row .lg-pbar{flex:1 1 auto}
.lg-minibar-row .v{flex:0 0 auto;font-variant-numeric:tabular-nums;color:var(--lg-text)}
.lg-kind i{font-style:normal;font-size:11px;color:var(--lg-muted);margin-left:5px}
.lg-kind.on i{color:var(--lg-on-ink);opacity:.75}
.lg-plan-no{flex:0 0 46px;font-size:11.5px;color:var(--lg-muted);font-variant-numeric:tabular-nums;padding:2px 0 0;border:0;background:none;text-align:left;font-family:var(--lg-sans);cursor:pointer;min-height:24px;display:inline-flex;align-items:center}
.lg-plan-no:hover{color:var(--lg-accent)}
.lg-inline-in.slot{flex:0 0 56px;min-width:56px;max-width:64px}
.lg-todo > li, .lg-plan > li, .lg-cal-tasks > li, .lg-recs > li, .lg-notes-col > .lg-note-mini, .lg-drag{-webkit-user-select:none;user-select:none}
.lg-todo textarea, .lg-todo input, .lg-note-mini textarea, .lg-plan input{-webkit-user-select:text;user-select:text}
.lg-todo.sort-on, .lg-cal-tasks.sort-on, .lg-plan.sort-on{box-shadow:inset 0 0 0 1px var(--lg-focus);border-radius:6px;background:var(--lg-accent-soft)}
.lg-notes-col.sort-on{box-shadow:inset 0 0 0 1px var(--lg-focus);border-radius:8px;background:var(--lg-accent-soft)}
.lg-todo > li[draggable="true"]{cursor:grab}
.lg-drag{flex:0 0 auto;width:20px;height:24px;display:grid;place-items:center;color:var(--lg-muted);font-size:13px;cursor:grab;user-select:none;border-radius:4px;opacity:.75}
.lg-drag:hover{opacity:1;background:var(--lg-surface-2);color:var(--lg-text)}
.lg-drag.note{position:absolute;top:4px;right:30px;width:22px;height:24px}
.lg-slot{min-height:20px;padding:0 8px;margin-left:6px;border-radius:999px;border:1px solid var(--lg-line);background:none;color:var(--lg-muted);font-size:11px;font-family:var(--lg-sans);cursor:pointer}
.lg-slot:hover{color:var(--lg-accent);border-color:var(--lg-focus)}
.lg-slot.on{color:var(--lg-accent);border-color:var(--lg-focus)}
.lg-slot-pick{flex:0 0 100%;display:flex;gap:4px;flex-wrap:wrap;margin:8px 0 2px;padding:8px;border-radius:8px;background:var(--lg-surface-2)}
.lg-slot-opt{min-height:24px;padding:0 8px;border-radius:6px;border:1px solid var(--lg-line);background:var(--lg-surface);color:var(--lg-muted);font-size:11.5px;font-family:var(--lg-sans);cursor:pointer}
.lg-slot-opt:hover{color:var(--lg-accent)}
.lg-slot-opt.on{background:var(--lg-ink);border-color:var(--lg-ink);color:var(--lg-on-ink)}
.lg-slot-opt.today{border-color:var(--lg-accent)}
.lg-notes-col{display:flex;flex-direction:column;gap:10px}
.lg-note-mini{position:relative;background:var(--note-bg,#fff);border:1px solid var(--lg-line);border-radius:var(--lg-radius);padding:10px 12px 8px;box-shadow:var(--lg-shadow)}
.lg-note-mini.n-paper{--note-bg:#ffffff}
.lg-note-mini.n-warm{--note-bg:#fffbf0}
.lg-note-mini.n-blue{--note-bg:#f2f6ff}
.lg-note-mini.n-green{--note-bg:#f1f8f2}
.lg-note-mini textarea{width:100%;border:0;background:none;resize:none;outline:none;font-family:var(--lg-sans);font-size:13.5px;line-height:1.7;color:var(--lg-text);padding:0}
.lg-note-mini textarea::placeholder{color:var(--lg-placeholder)}
.lg-note-mini-x{position:absolute;top:4px;right:4px;width:24px;height:24px;border:0;border-radius:6px;background:none;color:var(--lg-muted);font-size:13px;line-height:1;cursor:pointer;opacity:0}
.lg-note-mini:hover .lg-note-mini-x{opacity:1}
.lg-note-mini-x:hover{background:rgba(0,0,0,.04);color:var(--lg-danger)}
.lg-note-mini-foot{display:flex;gap:4px;justify-content:flex-end;margin-top:4px}
.lg-weekhead{display:flex;align-items:flex-end;gap:20px;margin:0 0 22px;flex-wrap:wrap}
.lg-minis{display:flex;gap:18px;flex-wrap:wrap;flex:1 1 auto;min-width:0}
.lg-mini{min-width:76px}
.lg-mini .k{display:block;font-size:11px;letter-spacing:.06em;color:var(--lg-muted)}
.lg-mini .v{display:block;font-size:12.5px;color:var(--lg-text);font-variant-numeric:tabular-nums;margin:2px 0 5px}
.lg-minibar{height:3px;border-radius:999px;background:var(--lg-surface-2);overflow:hidden}
.lg-minibar i{display:block;height:100%;background:var(--lg-accent);border-radius:999px}
.lg-newnote{flex:0 0 auto;min-height:36px;padding:0 16px;border-radius:var(--lg-radius);border:1px solid var(--lg-line);background:var(--lg-surface);color:var(--lg-text);font-size:13px;font-family:var(--lg-sans);cursor:pointer;box-shadow:var(--lg-shadow)}
.lg-newnote:hover{border-color:var(--lg-accent);color:var(--lg-accent)}
.lg-notes{display:grid;grid-template-columns:repeat(auto-fill,minmax(272px,1fr));gap:14px;align-items:start}
.lg-note{position:relative;background:var(--note-bg,#fff);border:1px solid var(--lg-line);border-radius:var(--lg-radius);padding:20px 14px 10px;box-shadow:var(--lg-shadow);display:flex;flex-direction:column;gap:8px;min-height:132px}
.lg-note.n-paper{--note-bg:#ffffff}
.lg-note.n-warm{--note-bg:#fffbf0}
.lg-note.n-blue{--note-bg:#f2f6ff}
.lg-note.n-green{--note-bg:#f1f8f2}
.lg-note.n-pink{--note-bg:#fdf2f4}
.lg-note.n-grey{--note-bg:#f4f4f5}
.lg-note.n-rec{--note-bg:#fbfbfc}
.lg-note.ghost{border-style:dashed;box-shadow:none;align-items:center;justify-content:center;min-height:120px}
.lg-note.done{opacity:.55}
.lg-note-x{position:absolute;top:4px;right:4px;width:24px;height:24px;border:0;border-radius:6px;background:none;color:var(--lg-muted);font-size:14px;line-height:1;cursor:pointer;opacity:0;transition:opacity .12s}
.lg-note:hover .lg-note-x{opacity:1}
.lg-note-x:hover{background:var(--lg-surface-2);color:var(--lg-danger)}
.lg-note-text{width:100%;flex:1 1 auto;min-height:84px;border:0;background:none;resize:none;outline:none;font-family:var(--lg-sans);font-size:14px;line-height:1.7;color:var(--lg-text);padding:0}
.lg-note-text::placeholder{color:var(--lg-placeholder)}
.lg-note-text.static{font-size:14.5px;margin:0;line-height:1.55;min-height:0}
.lg-note-why{margin:0;font-size:12px;line-height:1.6;color:var(--lg-muted)}
.lg-note-top{display:flex;align-items:center;gap:8px;justify-content:space-between;min-height:16px}
.lg-note-foot{display:flex;align-items:center;gap:8px;justify-content:space-between;margin-top:auto;padding-top:8px;border-top:1px solid var(--lg-line)}
.lg-note-days{display:flex;gap:2px;flex-wrap:nowrap;flex:1 1 auto;min-width:0;overflow:hidden}
.lg-note-day{flex:0 0 auto;min-width:24px;min-height:24px;padding:0 4px;border:1px solid transparent;border-radius:5px;background:none;color:var(--lg-muted);font-size:11px;line-height:1;font-family:var(--lg-sans);cursor:pointer;white-space:nowrap}
.lg-note-day:hover{color:var(--lg-text);border-color:var(--lg-line)}
.lg-note-day.on{background:var(--lg-ink);border-color:var(--lg-ink);color:var(--lg-on-ink)}
.lg-note-day.today{border-color:var(--lg-accent)}
.lg-note-colors{display:flex;gap:5px;flex:0 0 auto}
.lg-note-c{position:relative;width:20px;height:20px;border:0;background:none;cursor:pointer;padding:0}
.lg-note-c::before{content:"";position:absolute;inset:5px;border-radius:50%;background:var(--c,#fff);border:1px solid rgba(24,24,27,.16)}
.lg-note-c.on::before{box-shadow:0 0 0 2px var(--lg-accent-soft),0 0 0 1px var(--lg-accent)}
.lg-note-where{font-size:11px;color:var(--lg-muted);letter-spacing:.04em}
.lg-recfresh{display:flex;flex-direction:column;gap:4px;align-items:center;border:0;background:none;color:var(--lg-muted);font-size:12.5px;font-family:var(--lg-sans);cursor:pointer}
.lg-recfresh .big{font-size:13.5px;color:var(--lg-text)}
.lg-recfresh .s{font-size:11px}
.lg-recfresh:hover{color:var(--lg-accent)}
.lg-progress{display:flex;flex-direction:column;gap:14px}
.lg-prow-top{display:flex;align-items:baseline;justify-content:space-between;gap:12px;font-size:12.5px;color:var(--lg-muted);margin-bottom:6px}
.lg-prow-top .n{color:var(--lg-text);font-variant-numeric:tabular-nums}
.lg-pbar{height:4px;border-radius:999px;background:var(--lg-surface-2);overflow:hidden}
.lg-pbar i{display:block;height:100%;background:var(--lg-accent);border-radius:999px;transition:width .3s}
.lg-inbox-body{flex:1 1 auto;min-width:0}
.lg-inbox-t{display:block;width:100%;text-align:left;background:none;border:0;padding:0;color:var(--lg-text);font-size:15px;line-height:1.55;font-family:var(--lg-sans);cursor:text;white-space:pre-wrap}
.lg-inbox-t:hover{color:var(--lg-accent)}
.lg-inbox-meta{margin-top:4px}
.lg-tag{display:inline-block;font-size:11px;letter-spacing:.06em;color:var(--lg-accent);border:1px solid var(--lg-focus);border-radius:999px;padding:1px 7px}
.lg-recs{list-style:none;margin:0;padding:0}
.lg-recs li{display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid var(--lg-line)}
.lg-recs li:last-child{border-bottom:0;padding-bottom:0}
.lg-rec-kind{flex:0 0 auto;width:26px;height:26px;display:grid;place-items:center;border-radius:8px;border:1px solid var(--lg-line);color:var(--lg-muted);font-size:12px}
.lg-rec-body{flex:1 1 auto;min-width:0}
.lg-rec-body .t{margin:0;font-size:14.5px;line-height:1.5}
.lg-rec-body .w{margin:4px 0 0;font-size:12px;line-height:1.6;color:var(--lg-muted)}
.lg-rec-min{flex:0 0 auto;font-size:12px;color:var(--lg-muted);font-variant-numeric:tabular-nums;padding-top:2px}
.lg-kinds{display:flex;gap:6px;margin:2px 0 12px}
.lg-kind{min-height:28px;padding:0 12px;border-radius:999px;border:1px solid var(--lg-line);background:none;color:var(--lg-muted);font-size:12.5px;font-family:var(--lg-sans);cursor:pointer}
.lg-kind:hover{color:var(--lg-text)}
.lg-kind.on{background:var(--lg-ink);border-color:var(--lg-ink);color:var(--lg-on-ink)}
.lg-goal-body{flex:1 1 auto;min-width:0}
.lg-goal-t{display:block;width:100%;text-align:left;background:none;border:0;padding:0;color:var(--lg-text);font-size:15px;line-height:1.5;font-family:var(--lg-sans);cursor:pointer;white-space:pre-wrap}
.lg-goal-t:hover{color:var(--lg-accent)}
.lg-goal-meta{display:flex;align-items:center;gap:6px;margin-top:4px;font-size:11.5px;color:var(--lg-muted)}
.lg-goal-meta .dot{opacity:.5}
.lg-steps{list-style:none;margin:10px 0 2px;padding:0;color:var(--lg-muted);counter-reset:st}
.lg-steps li{display:flex;align-items:flex-start;gap:8px;padding:6px 0;font-size:13px;line-height:1.6;border:0;counter-increment:st}
.lg-steps li::before{content:counter(st);flex:0 0 14px;color:var(--lg-line);font-size:11.5px;line-height:1.75;font-variant-numeric:tabular-nums}
.lg-steps li .tx{flex:1 1 auto;min-width:0}
.lg-steps li.on .tx{color:var(--lg-line);text-decoration:line-through}
.lg-toweek{flex:0 0 auto;min-height:24px;padding:0 8px;border-radius:6px;border:1px solid var(--lg-line);background:none;color:var(--lg-muted);font-size:11.5px;cursor:pointer}
.lg-toweek:hover{color:var(--lg-accent);border-color:var(--lg-line)}
.lg-placed{flex:0 0 auto;font-size:11.5px;color:var(--lg-accent);opacity:.8}
.lg-stat{list-style:none;margin:0;padding:0}
.lg-stat li{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--lg-line);font-size:14px}
.lg-stat li:last-child{border-bottom:0}
.lg-stat .k{color:var(--lg-muted)}
.lg-stat .v{font-variant-numeric:tabular-nums;letter-spacing:.02em}
.lg-meter{height:3px;border-radius:999px;background:var(--lg-line);overflow:hidden;margin-top:12px}
.lg-meter i{display:block;height:100%;background:var(--lg-accent);border-radius:999px}
.lg-comment{margin:0;font-family:var(--lg-serif);font-size:16px;line-height:2;letter-spacing:.02em;white-space:pre-wrap}

/* 专注卡 */
.lg-focus{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.lg-focus .big{font-family:var(--lg-serif);font-size:26px;letter-spacing:.02em;line-height:1.2;color:var(--lg-accent);font-variant-numeric:tabular-nums}
.lg-focus .unit{font-size:12px;color:var(--lg-muted);margin-left:2px}
.lg-focus .sub{flex:1 1 100%;font-size:12.5px;color:var(--lg-muted);line-height:1.7;margin:0}
.lg-focus-btn{margin-left:auto;flex:0 0 auto;min-height:42px;padding:0 18px;border-radius:9px;border:1px solid var(--lg-line);background:none;color:var(--lg-accent);font-size:13.5px;cursor:pointer;letter-spacing:.04em}
.lg-focus-btn:hover{background:var(--lg-accent-soft)}
.lg-focus-btn.strong{background:var(--lg-ink);border-color:var(--lg-ink);color:var(--lg-on-ink);font-weight:600}
.lg-live{font-family:var(--lg-serif);font-size:26px;color:var(--lg-accent);font-variant-numeric:tabular-nums;letter-spacing:.02em}
.lg-labelrow{display:flex;gap:8px;margin-top:12px}
.lg-labelrow input{flex:1 1 auto;min-width:0;min-height:42px;padding:0 14px;background:var(--lg-surface-2);border:1px solid var(--lg-line);border-radius:9px;color:var(--lg-text);font-size:14px;font-family:var(--lg-sans);outline:none}
.lg-labelrow input:focus{border-color:var(--lg-accent)}
.lg-labelrow button{flex:0 0 auto;min-width:64px;min-height:42px;border-radius:9px;border:0;background:var(--lg-ink);color:var(--lg-on-ink);font-size:14px;font-weight:600;cursor:pointer}

/* 灵感 */
.lg-topline{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap}
.lg-wxtop{display:inline-flex;align-items:baseline;gap:12px;font-size:12px;color:var(--lg-muted);letter-spacing:.02em}
.lg-wxline{display:inline-flex;align-items:baseline;gap:7px}
.lg-wxline b{font-weight:500;font-size:14px;color:var(--lg-accent);font-variant-numeric:tabular-nums}
.lg-wxline em{font-style:normal;font-size:11.5px;opacity:.85}
.lg-locbtn{background:none;border:0;padding:2px 0;min-height:24px;color:var(--lg-muted);font-size:12px;font-family:var(--lg-sans);cursor:pointer;border-bottom:1px dashed var(--lg-line);letter-spacing:.02em}
.lg-locbtn:hover{color:var(--lg-accent)}
.lg-locin{width:150px;min-height:26px;padding:2px 8px;background:var(--lg-surface-2);border:1px solid var(--lg-accent);border-radius:6px;color:var(--lg-text);font-size:12px;font-family:var(--lg-sans);outline:none}
.lg-tabspark{margin-left:auto;align-self:center;display:inline-flex;align-items:center;gap:10px;max-width:58%;min-width:0;flex:0 1 auto;padding-bottom:2px}
.lg-tabspark .q{min-width:0;flex:0 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--lg-serif);font-size:13px;letter-spacing:.03em;color:var(--lg-muted)}
.lg-tabspark .from{flex:0 0 auto;font-size:11px;letter-spacing:.08em;color:var(--lg-line);white-space:nowrap}
.lg-tabspark .lg-spark-swap{flex:0 0 auto;min-height:26px;padding:0 9px;border-radius:6px;border:1px solid var(--lg-line);background:none;color:var(--lg-muted);font-size:11.5px;font-family:var(--lg-sans);cursor:pointer}
.lg-tabspark .lg-spark-swap:hover{color:var(--lg-accent);border-color:var(--lg-line)}
.lg-h1row{display:flex;align-items:baseline;justify-content:space-between;gap:24px;flex-wrap:wrap;min-width:0}
.lg-h1row .lg-watch.inline{min-width:0}
.lg-watch.inline{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap;min-width:0;padding:0;border:0;background:none;border-radius:0;margin:0;font-size:12px;text-align:right}
.lg-watch.inline b{color:var(--lg-accent);font-size:11.5px;letter-spacing:.16em;font-weight:500}
.lg-wx{display:inline-flex;align-items:baseline;gap:8px;font-size:12px;color:var(--lg-muted)}
.lg-wx i{font-style:normal;color:var(--lg-text)}
.lg-wx b{font-weight:500;font-size:15px;color:var(--lg-accent);font-variant-numeric:tabular-nums}
.lg-wx em{font-style:normal;font-size:11.5px;opacity:.8}
.lg-loc{display:flex;align-items:center;gap:10px;margin-top:12px;padding-top:10px;border-top:1px solid var(--lg-line);font-size:11.5px;color:var(--lg-muted)}
.lg-loc .k{letter-spacing:.14em;flex:0 0 auto}
.lg-loc button{background:none;border:0;padding:0;color:var(--lg-muted);font-size:11.5px;font-family:var(--lg-sans);cursor:pointer;border-bottom:1px dashed var(--lg-line)}
.lg-loc button:hover{color:var(--lg-accent)}
.lg-loc .sun{margin-left:auto;font-variant-numeric:tabular-nums}
.lg-loc input{flex:1 1 auto;min-width:0;min-height:30px;padding:2px 8px;background:var(--lg-surface-2);border:1px solid var(--lg-accent);border-radius:6px;color:var(--lg-text);font-size:12px;font-family:var(--lg-sans);outline:none}
.lg-insp{margin:0}
.lg-insp .q{font-family:var(--lg-serif);font-size:17px;line-height:1.9;letter-spacing:.03em;color:var(--lg-text);margin:0 0 10px}
.lg-insp .from{font-size:11.5px;color:var(--lg-muted);letter-spacing:.06em;margin:0}
.lg-insp .none{font-size:13px;line-height:1.85;color:var(--lg-muted);margin:0}

/* 现在这条 */
.lg-nowbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px;margin-bottom:16px;background:var(--lg-surface);border-radius:10px;font-size:13px}
.lg-nowbar .k{color:var(--lg-accent);letter-spacing:.16em;font-size:11.5px;flex:0 0 auto}
.lg-nowbar .v{flex:1 1 auto;min-width:0;color:var(--lg-muted);line-height:1.6}
.lg-go{flex:0 0 auto;min-height:38px;padding:0 18px;border-radius:var(--lg-radius);border:0;cursor:pointer;background:var(--lg-ink);color:var(--lg-on-ink);font-size:13px;font-weight:600;letter-spacing:.04em}

/* 卡片头 */
.lg-card-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:14px}
.lg-card-head span:first-child{font-size:12px;letter-spacing:.18em;color:var(--lg-muted)}
.lg-count-n{font-size:12px;color:var(--lg-muted);font-variant-numeric:tabular-nums}

/* 快速输入 */
.lg-add{display:flex;gap:8px;margin-bottom:8px}
.lg-add input,.lg-add textarea{flex:1 1 auto;min-width:0;min-height:48px;padding:13px 16px;background:var(--lg-surface-2);border:1px solid var(--lg-line);border-radius:10px;color:var(--lg-text);font-size:15px;line-height:1.6;font-family:var(--lg-sans);outline:none;resize:none;overflow:hidden}
.lg-add input::placeholder,.lg-add textarea::placeholder{color:var(--lg-placeholder)}
.lg-add input:focus,.lg-add textarea:focus{border-color:var(--lg-accent)}
.lg-add .hint{flex:1 1 100%;margin:2px 0 0;font-size:11.5px;color:var(--lg-muted)}
.lg-add-btn{flex:0 0 auto;min-width:56px;min-height:48px;border-radius:10px;border:1px solid var(--lg-line);background:none;color:var(--lg-muted);font-size:15px;cursor:pointer}
.lg-add-btn:hover{color:var(--lg-text);border-color:var(--lg-muted)}

/* 待办列表 */
.lg-todo{list-style:none;margin:6px 0 0;padding:0}
.lg-todo > li{display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--lg-line)}
.lg-todo > li:last-child{border-bottom:0}
.lg-todo > li .t{flex:1 1 auto;min-width:0;font-size:15px;line-height:1.55;white-space:pre-wrap}
.lg-todo > li.on .t{color:var(--lg-muted);text-decoration:line-through;text-decoration-color:var(--lg-line);text-decoration-thickness:1px}
.lg-card.drop-on{border-color:var(--lg-accent);background:var(--lg-accent-soft);box-shadow:0 0 0 3px var(--lg-accent-soft)}
.lg-drop-hint{font-size:11.5px;color:var(--lg-accent);letter-spacing:.04em}
.lg-todo > li[draggable="true"]{cursor:grab}
.lg-todo > li[draggable="true"]:active{cursor:grabbing}
.lg-read-body{flex:1 1 auto;min-width:0}
.lg-read-t{display:block;max-width:100%;text-align:left;background:none;border:0;padding:0;cursor:pointer;color:var(--lg-text);font-size:15px;line-height:1.5;font-family:var(--lg-sans);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lg-read-t:hover{color:var(--lg-accent)}
.lg-read-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:5px;font-size:12px;color:var(--lg-muted);line-height:1.6}
.lg-read-sum{max-width:44em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lg-badge{font-size:11px;letter-spacing:.06em;color:var(--lg-accent);border:1px solid var(--lg-line);border-radius:999px;padding:1px 7px}
.lg-badge.busy{color:var(--lg-muted);border-color:var(--lg-line)}
.lg-badge.bad{color:var(--danger);border-color:var(--lg-danger-line)}
.lg-read-open{color:var(--lg-muted);text-decoration:underline;text-decoration-color:var(--lg-line)}
.lg-outline{margin:10px 0 4px;padding-left:18px;font-size:13px;line-height:1.9;color:var(--lg-muted);list-style:decimal}
.lg-outline li{padding:2px 0;border:0}
.lg-pomo{flex:0 0 auto;min-height:30px;padding:0 12px;border-radius:7px;border:1px solid var(--lg-line);background:none;color:var(--lg-accent);font-size:12px;cursor:pointer;letter-spacing:.04em;transition:background .12s,border-color .12s}
.lg-pomo:hover{background:var(--lg-accent-soft)}
.lg-pomo.off{display:none}
.lg-del{flex:0 0 auto;width:32px;height:32px;display:grid;place-items:center;border:0;background:none;color:var(--lg-muted);cursor:pointer;font-size:16px;border-radius:8px;opacity:.55}
.lg-del:hover{color:var(--danger);background:var(--lg-surface-2)}
.lg-empty{margin:10px 0 2px;font-size:13.5px;line-height:1.8;color:var(--lg-muted)}
.lg-plan-in{flex:1 1 auto;min-width:0;min-height:34px;padding:4px 10px;background:var(--lg-surface-2);border:1px solid var(--lg-accent);border-radius:7px;color:var(--lg-text);font-size:14.5px;font-family:var(--lg-sans);outline:none}
.lg-plan-t{flex:1 1 auto;min-width:0;text-align:left;background:none;border:0;cursor:pointer;color:var(--lg-text);font-size:14.5px;line-height:1.5;padding:0;font-family:var(--lg-sans)}
.lg-plan-t:hover{color:var(--lg-accent)}
.lg-inline-t{background:none;border:0;padding:0;text-align:left;color:var(--lg-text);font-size:15px;line-height:1.55;font-family:var(--lg-sans);cursor:text;white-space:pre-wrap}
.lg-inline-t:hover{color:var(--lg-accent)}
.lg-inline-in{flex:1 1 auto;min-width:0;min-height:32px;padding:3px 9px;background:var(--lg-surface);border:1px solid var(--lg-accent);border-radius:6px;color:var(--lg-text);font-size:14px;font-family:var(--lg-sans);outline:none;box-shadow:0 0 0 3px var(--lg-accent-soft)}
.lg-inline-in.time{flex:0 0 62px;text-align:center;font-variant-numeric:tabular-nums}
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
.lg-paper textarea::placeholder{color:var(--lg-placeholder)}
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
                  h("circle", { cx: 130, cy: 130, r: 110, fill: "none", stroke: "var(--lg-line)", strokeWidth: 1.5 }),
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


    /* ---------- 统一拖拽排序 ----------
       载荷格式：sort|<listKey>|<id>
       列表容器用 sortZone(listKey)；列表项用 dragItem(listKey, id) */
    const LG_TAG = "sort";
    const dragItem = (listKey, id, extra) => ({
      draggable: true,
      "data-sid": id,
      onDragStart: (e) => {
        const sel = window.getSelection && window.getSelection();
        if (sel) sel.removeAllRanges();
        e.dataTransfer.setData("text/plain", `${LG_TAG}|${listKey}|${id}`);
        e.dataTransfer.effectAllowed = "copyMove";
        e.stopPropagation();
      },
      ...(extra || {}),
    });
    /** 把手：只让这个 ⠿ 可拖，整行留着点/勾/改 */
    const dragHandle = (listKey, id, extra) => ({
      className: "lg-drag" + (extra && extra.className ? " " + extra.className : ""),
      draggable: true,
      onDragStart: (e) => {
        const sel = window.getSelection && window.getSelection();
        if (sel) sel.removeAllRanges();
        e.dataTransfer.setData("text/plain", `${LG_TAG}|${listKey}|${id}`);
        e.dataTransfer.effectAllowed = "move";
        e.stopPropagation();
      },
      title: (extra && extra.title) || "拖动排序",
    });
    const sortZone = (listKey, run) => ({
      "data-sortkey": listKey,
      onDragOver: (e) => {
        e.preventDefault();
        if (!e.currentTarget.classList.contains("sort-on")) e.currentTarget.classList.add("sort-on");
      },
      onDragLeave: (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove("sort-on");
      },
      onDrop: (e) => {
        e.currentTarget.classList.remove("sort-on");
        const [tag, key, id] = (e.dataTransfer.getData("text/plain") || "").split("|");
        // 不是本列表的东西 → 不拦，冒泡给上层容器（比如日历格子要接跨天）
        if (tag !== LG_TAG || key !== listKey || !id) return;
        e.preventDefault();
        e.stopPropagation();
        const items = [...e.currentTarget.querySelectorAll("[data-sid]")];
        let index = items.length;
        const pts = items.map((el) => {
          const r = el.getBoundingClientRect();
          return { top: r.top, mid: r.top + r.height / 2 };
        });
        for (let i = 0; i < pts.length; i++) {
          if (e.clientY < pts[i].mid) { index = i; break; }
        }
        run("reorder", { key: listKey, id, index });
      },
    });
    const parseDrag = (raw) => {
      const [tag, key, id] = String(raw || "").split("|");
      return tag === LG_TAG && key && id ? { key, id } : null;
    };

    /* ================= 今天 ================= */

    function TodayView({ state, run, busy }) {
      const [runner, setRunner] = useState(null);
      const [draft, setDraft] = useState("");
      const { day } = state;
      const tday = todayStr();
      const todayTodosKey = `todos:${tday}`;

      const current = day.plan.find((p) => !p.done);
      const later = (day.after || [])
        .map((x, i) => ({ ...x, _i: i }))
        .sort((a, b) => sortKey(a.time) - sortKey(b.time));
      const todos = Array.isArray(day.todos) ? day.todos : [];
      const openTodos = todos.filter((t) => !t.done);
      const doneTodos = todos.filter((t) => t.done);
      const donePlan = day.plan.filter((p) => p.done).length;
      const [tick, setTick] = useState(0);
      const [pending, setPending] = useState(null);
      const [label, setLabel] = useState("");
      const [url, setUrl] = useState("");
      const [expanded, setExpanded] = useState(null);
      const [dropOn, setDropOn] = useState(false);

      // 拖拽结束一定要清高亮——dragleave 在拖出窗口/被中断时不一定触发
      useEffect(() => {
        const clear = () => setDropOn(false);
        window.addEventListener("dragend", clear);
        window.addEventListener("drop", clear);
        window.addEventListener("blur", clear);
        return () => {
          window.removeEventListener("dragend", clear);
          window.removeEventListener("drop", clear);
          window.removeEventListener("blur", clear);
        };
      }, []);
      const [editingId, setEditingId] = useState(null);
      const [editText, setEditText] = useState("");
      const [todoEditId, setTodoEditId] = useState(null);
      const [todoEditText, setTodoEditText] = useState("");
      const [afterEditIdx, setAfterEditIdx] = useState(null);
      const [afterEditTime, setAfterEditTime] = useState("");
      const [afterEditText, setAfterEditText] = useState("");


      useEffect(() => {
        if (!day.timer) return;
        const t = setInterval(() => setTick((x) => x + 1), 1000);
        return () => clearInterval(t);
      }, [day.timer ? day.timer.startedAt : null]);

      const sessions = Array.isArray(day.sessions) ? day.sessions : [];
      const elapsed = day.timer ? Math.max(0, Math.floor((Date.now() - new Date(day.timer.startedAt).getTime()) / 1000)) : 0;
      const wx = state.weather || null;
      const rl = Array.isArray(state.readlater) ? state.readlater : [];
      const rlPending = rl.filter((r) => r.status === "pending");
      const rlReady = rl.filter((r) => r.status === "ready");
      const isPomo = !!(day.timer && day.timer.minutes > 0);
      const remain = isPomo ? Math.max(0, day.timer.minutes * 60 - elapsed) : 0;
      const focusMin = Math.round(sessions.reduce((n, x) => n + (x.seconds || 0), 0) / 60);
      const longest = sessions.length ? Math.round(Math.max(...sessions.map((x) => x.seconds || 0)) / 60) : 0;

      const go = (item) => setRunner({ item, mode: item.kind === "output" ? "write" : "focus" });

      const addTodo = () => {
        const text = draft.trim();
        if (!text) return;
        setDraft("");
        run("todoAdd", { text });
      };

      const stopTimer = async () => {
        const r = await run("timerStop", {});
        const last = r && r.state && r.state.day && r.state.day.sessions && r.state.day.sessions.slice(-1)[0];
        if (last && !last.label) {
          setPending(last);
          setLabel("");
        } else {
          setPending(null);
        }
      };

      const startPomo = (text) => run("timerStart", { label: text, minutes: 25 });

      const saveTodoEdit = () => {
        const id = todoEditId;
        const v = todoEditText.trim();
        setTodoEditId(null);
        if (id && v) run("todoEdit", { id, text: v });
      };

      const saveAfterEdit = () => {
        const idx = afterEditIdx;
        const time = afterEditTime.trim();
        const title = afterEditText.trim();
        setAfterEditIdx(null);
        if (idx === null || !title) return;
        run("afterEdit", { index: idx, time, title });
      };

      const beginEdit = (p) => {
        setEditingId(p.id);
        setEditText(p.title);
      };

      const savePlanEdit = () => {
        const id = editingId;
        const v = editText.trim();
        setEditingId(null);
        if (id && v) run("planEdit", { id, title: v });
      };

      const addUrl = () => {
        const v = url.trim();
        if (!v) return;
        setUrl("");
        run("readlaterAdd", { url: v });
      };

      const saveLabel = async () => {
        if (!pending) return;
        const v = label.trim();
        if (v) await run("sessionLabel", { id: pending.id, label: v });
        setPending(null);
        setLabel("");
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
              h(
                "div",
                { className: "lg-card-head" },
                h("span", null, "专注"),
                h("span", { className: "lg-count-n" }, day.timer ? (isPomo ? "番茄中" : "计时中") : pending ? "刚记下" : "不用全屏"),
              ),

              // 计时中：页内实时走，不用跳全屏
              day.timer
                ? h(
                    "div",
                    { className: "lg-focus" },
                    h("span", { className: "lg-live" }, isPomo ? fmt(remain) : fmt(elapsed)),
                    h("button", { className: "lg-focus-btn strong", onClick: stopTimer }, isPomo && remain === 0 ? "记下" : "结束"),
                    h(
                      "p",
                      { className: "sub" },
                      isPomo
                        ? remain === 0
                          ? `番茄结束了${day.timer.label ? ` · ${day.timer.label}` : ""}。做完了吗？`
                          : `番茄 ${day.timer.minutes} 分钟 · ${day.timer.label || "专注"}`
                        : "在做事就开着，做完回来点结束——然后填一句在做什么。",
                    ),
                  )
                : null,

              // 刚结束：补填在做什么
              !day.timer && pending
                ? h(
                    "div",
                    null,
                    h(
                      "div",
                      { className: "lg-focus" },
                      h("span", { className: "big" }, Math.max(1, Math.round(pending.seconds / 60))),
                      h("span", { className: "unit" }, "分钟"),
                      h("p", { className: "sub" }, "刚才那段在做什么？写一句，方便以后看统计。"),
                    ),
                    h(
                      "div",
                      { className: "lg-labelrow" },
                      h("input", {
                        value: label,
                        placeholder: "比如：写周报 / 读《禅与摩托车维修艺术》",
                        onChange: (e) => setLabel(e.target.value),
                        onKeyDown: (e) => { if (e.key === "Enter") { e.preventDefault(); saveLabel(); } },
                        autoFocus: true,
                      }),
                      h("button", { onClick: saveLabel }, label.trim() ? "记下" : "跳过"),
                    ),
                  )
                : null,

              // 空闲：今天累计 + 开始
              !day.timer && !pending
                ? h(
                    "div",
                    { className: "lg-focus" },
                    h("span", { className: "big" }, focusMin),
                    h("span", { className: "unit" }, "分钟"),
                    h("button", { className: "lg-focus-btn", onClick: () => run("timerStart", {}) }, "开始"),
                    h(
                      "p",
                      { className: "sub" },
                      sessions.length
                        ? `今天 ${sessions.length} 段，最长 ${longest} 分钟。${sessions[sessions.length - 1].label ? `最近：${sessions[sessions.length - 1].label}` : ""}`
                        : "开始计时，然后去干活。结束回来补一句做了什么就行。",
                    ),
                  )
                : null,
            ),

            h(
              "div",
              {
                className: "lg-card" + (dropOn ? " drop-on" : ""),
                onDragOver: (e) => {
                  e.preventDefault();
                  if (!dropOn) setDropOn(true);
                },
                onDragLeave: (e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) setDropOn(false);
                },
                onDrop: (e) => {
                  e.preventDefault();
                  setDropOn(false);
                  const d = parseDrag(e.dataTransfer.getData("text/plain"));
                  if (d && d.key === "readlater") run("readlaterToToday", { id: d.id });
                },
              },
              h(
                "div",
                { className: "lg-card-head" },
                h("span", null, "今天要做"),
                h(
                  "span",
                  { style: { marginLeft: "auto", display: "inline-flex", alignItems: "baseline", gap: 10 } },
                  dropOn ? h("span", { className: "lg-drop-hint" }, "松手就加进来") : null,
                  h("span", { className: "lg-count-n" }, openTodos.length ? `还剩 ${openTodos.length} 件` : "清空了"),
                ),
              ),
              h(
                "div",
                { className: "lg-add" },
                h("textarea", {
                  value: draft,
                  rows: Math.min(8, Math.max(1, draft.split("\n").length)),
                  placeholder: "写一件要做的事。回车换行，写好了再点「加」。",
                  onChange: (e) => setDraft(e.target.value),
                  onKeyDown: (e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
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
                    { className: "lg-todo", ...sortZone(todayTodosKey, run) },
                    ...[...openTodos, ...doneTodos].map((t) =>
                      h(
                        "li",
                        { key: t.id, className: t.done ? "on" : "", "data-sid": t.id },
                        h(
                          "button",
                          {
                            className: "lg-dot" + (t.done ? " on" : ""),
                            onClick: () => run("todoToggle", { id: t.id, done: !t.done }),
                            "aria-label": t.done ? "标记未完成" : "标记完成",
                          },
                          t.done ? h(Check) : null,
                        ),
                        todoEditId === t.id
                          ? h("input", {
                              className: "lg-inline-in",
                              value: todoEditText,
                              autoFocus: true,
                              onChange: (e) => setTodoEditText(e.target.value),
                              onBlur: saveTodoEdit,
                              onKeyDown: (e) => {
                                if (e.key === "Enter") { e.preventDefault(); saveTodoEdit(); }
                                if (e.key === "Escape") { e.preventDefault(); setTodoEditId(null); }
                              },
                            })
                          : h(
                              "button",
                              { className: "t lg-inline-t", onClick: () => { setTodoEditId(t.id); setTodoEditText(t.text); }, title: "点一下改" },
                              t.text,
                            ),
                        t.done
                          ? null
                          : h(
                              "button",
                              {
                                className: "lg-pomo" + (day.timer ? " off" : ""),
                                disabled: !!day.timer,
                                onClick: () => startPomo(t.text),
                                title: "25 分钟番茄，做这件事",
                              },
                              "开始",
                            ),
                        h("span", dragHandle(todayTodosKey, t.id), "⠿"),
                        h("button", { className: "lg-del", onClick: () => run("todoRemove", { id: t.id }), "aria-label": "删除" }, "×"),
                      ),
                    ),
                  ),
            ),
          ),

          /* ---------- 右：灵感（右上角）+ 规定事项 ---------- */
          h(
            "div",
            null,
            h(
              "div",
              { className: "lg-card", style: { marginTop: 16 } },
              h(
                "div",
                { className: "lg-card-head" },
                h("span", null, "规定事项"),
                h("span", { className: "lg-count-n" }, `${donePlan} / ${day.plan.length}`),
              ),
              h(
                "ul",
                { className: "lg-plan", ...sortZone(`plan:${tday}`, run) },
                ...day.plan.map((p) =>
                  h(
                    "li",
                    { key: p.id, className: p.done ? "on" : "", "data-sid": p.id },
                    h(
                      "button",
                      {
                        className: "lg-dot" + (p.done ? " on" : ""),
                        onClick: () => run("toggle", { id: p.id, done: !p.done }),
                        "aria-label": p.done ? "撤销" : "标记完成",
                      },
                      p.done ? h(Check) : null,
                    ),
                    editingId === p.id
                      ? h("input", {
                          className: "lg-plan-in",
                          value: editText,
                          autoFocus: true,
                          onChange: (e) => setEditText(e.target.value),
                          onBlur: savePlanEdit,
                          onKeyDown: (e) => {
                            if (e.key === "Enter") { e.preventDefault(); savePlanEdit(); }
                            if (e.key === "Escape") { e.preventDefault(); setEditingId(null); }
                          },
                        })
                      : h("button", { className: "lg-plan-t", onClick: () => beginEdit(p), title: "点一下改；标题里写「N 分钟」会自动改时长" }, p.title),
                    p.done
                      ? null
                      : h(
                          "button",
                          {
                            className: "lg-pomo" + (day.timer ? " off" : ""),
                            disabled: !!day.timer,
                            onClick: () => go(p),
                          },
                          "开始",
                        ),
                    h("span", { className: "s" }, p.slot),
                    h("span", dragHandle(`plan:${tday}`, p.id), "⠿"),
                  ),
                ),
              ),
            ),

            h(
              "div",
              { className: "lg-alt", style: { marginTop: 16 } },
              h("span", { className: "tag" }, "或者"),
              h("span", { className: "txt" }, day.alt),
              h("button", { onClick: () => run("skipAlt", {}) }, "换"),
            ),

            h(
              "div",
              { className: "lg-card", style: { marginTop: 16 } },
              h("div", { className: "lg-card-head" }, h("span", null, "之后"), h("span", { className: "lg-count-n" }, "到点会提醒")),
              ...later.map((x, i) =>
                afterEditIdx === x._i
                  ? h(
                      "div",
                      { className: "lg-row-s editing", key: `e${i}` },
                      h("input", {
                        className: "lg-inline-in time",
                        value: afterEditTime,
                        autoFocus: true,
                        onChange: (e) => setAfterEditTime(e.target.value),
                        onKeyDown: (e) => {
                          if (e.key === "Enter") { e.preventDefault(); saveAfterEdit(); }
                          if (e.key === "Escape") { e.preventDefault(); setAfterEditIdx(null); }
                        },
                      }),
                      h("input", {
                        className: "lg-inline-in",
                        value: afterEditText,
                        onChange: (e) => setAfterEditText(e.target.value),
                        onBlur: saveAfterEdit,
                        onKeyDown: (e) => {
                          if (e.key === "Enter") { e.preventDefault(); saveAfterEdit(); }
                          if (e.key === "Escape") { e.preventDefault(); setAfterEditIdx(null); }
                        },
                      }),
                      h("button", { className: "lg-del", onClick: () => setAfterEditIdx(null), "aria-label": "取消" }, "×"),
                    )
                  : h(
                      "div",
                      { className: "lg-row-s", key: `l${i}` },
                      h("i", { onClick: () => { setAfterEditIdx(x._i); setAfterEditTime(x.time); setAfterEditText(x.title); }, title: "点一下改", style: { cursor: "pointer" } }, x.time),
                      h(
                        "span",
                        { onClick: () => { setAfterEditIdx(x._i); setAfterEditTime(x.time); setAfterEditText(x.title); }, title: "点一下改", style: { cursor: "pointer" } },
                        x.title,
                      ),
                    ),
              ),
            ),

          ),
        ),

        /* ---------- 底部：稍后深度阅读 ---------- */
        h(
          "div",
          { className: "lg-card", style: { marginTop: 16 } },
          h(
            "div",
            { className: "lg-card-head" },
            h("span", null, "稍后深度阅读"),
            h(
              "span",
              { className: "lg-count-n" },
              rl.filter((r) => r.status === "parsing").length
                ? `正在解析 ${rl.filter((r) => r.status === "parsing").length} 篇`
                : rlPending.length
                  ? `${rlPending.length} 篇排队中`
                  : rlReady.length
                    ? `${rlReady.length} 篇待读`
                    : "空",
            ),
          ),
          h(
            "div",
            { className: "lg-add" },
            h("input", {
              value: url,
              placeholder: "粘贴一篇文章的链接，回车存下",
              onChange: (e) => setUrl(e.target.value),
              onKeyDown: (e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } },
            }),
            h("button", { className: "lg-add-btn", onClick: addUrl }, "存"),
          ),
          rl.length === 0
            ? h("p", { className: "lg-empty" }, "看到值得细读的，先把链接丢进来。存下之后我来读一遍，把纲要和要花多少时间写上去。")
            : h(
                "ul",
                { className: "lg-todo", ...sortZone("readlater", run) },
                ...rl.map((r) =>
                  h(
                    "li",
                    {
                      key: r.id,
                      className: r.status === "done" ? "on" : "",
                      "data-sid": r.id,
                      title: r.status !== "done" ? "可拖到上方「今天要做」，也可上下调整顺序" : "",
                    },
                    h(
                      "button",
                      {
                        className: "lg-dot" + (r.status === "done" ? " on" : ""),
                        onClick: () => run("readlaterDone", { id: r.id, done: r.status !== "done" }),
                      },
                      r.status === "done" ? h(Check) : null,
                    ),
                    h(
                      "div",
                      { className: "lg-read-body" },
                      h(
                        "button",
                        { className: "lg-read-t", onClick: () => setExpanded(expanded === r.id ? null : r.id), draggable: false },
                        r.title || r.url,
                      ),
                      h(
                        "div",
                        { className: "lg-read-meta" },
                        r.status === "pending"
                          ? h("span", { className: "lg-badge" }, "排队中")
                          : r.status === "parsing"
                            ? h("span", { className: "lg-badge busy" }, "解析中…")
                            : r.status === "failed"
                              ? h("span", { className: "lg-badge bad" }, "解析失败")
                              : null,
                        r.minutes ? h("span", null, `${r.minutes} 分钟`) : null,
                        r.summary ? h("span", { className: "lg-read-sum" }, r.summary) : null,
                        h("a", { className: "lg-read-open", href: r.url, target: "_blank", rel: "noreferrer" }, "打开"),
                      ),
                      expanded === r.id && r.outline && r.outline.length
                        ? h("ol", { className: "lg-outline" }, ...r.outline.map((o, i) => h("li", { key: i }, o)))
                        : null,
                    ),
                    r.status !== "done" && r.minutes
                      ? h(
                          "button",
                          {
                            className: "lg-pomo" + (day.timer ? " off" : ""),
                            disabled: !!day.timer,
                            onClick: () => run("timerStart", { label: r.title || "读一篇", minutes: r.minutes }),
                            title: `${r.minutes} 分钟番茄，读这一篇`,
                          },
                          "开始",
                        )
                      : null,
                    r.status === "failed"
                      ? h("button", { className: "lg-pomo", onClick: () => run("readlaterRetry", { id: r.id }) }, "重试")
                      : r.status !== "done"
                        ? h(
                            "button",
                            {
                              className: "lg-pomo",
                              onClick: () => run("readlaterToToday", { id: r.id }),
                              title: "加进今天的「今天要做」",
                            },
                            "加进今天",
                          )
                        : null,
                    r.status !== "done" ? h("span", dragHandle("readlater", r.id, { title: "拖到上方「今天要做」，或上下调顺序" }), "⠿") : null,
                    h("button", { className: "lg-del", onClick: () => run("readlaterRemove", { id: r.id }), "aria-label": "删除" }, "×"),
                  ),
                ),
              ),
          rlPending.length || rl.some((r) => r.status === "parsing")
            ? h("p", { className: "footnote-line", style: { margin: "10px 0 0" } }, "它在后台读这些链接，读完自己把纲要和阅读时间填上——不用管它。")
            : null,
        ),
      );
    }

    /* ================= 本周 ================= */

    const WD = ["日", "一", "二", "三", "四", "五", "六"];
    const KIND_LABEL = { book: "书", movie: "影", wear: "穿", read: "读", out: "去", rest: "歇" };
    const NOTE_COLORS = [
      ["paper", "#ffffff"],
      ["warm", "#fffbf0"],
      ["blue", "#f2f6ff"],
      ["green", "#f1f8f2"],
    ];

    function WeekView({ state, run }) {
      const week = state.week || { inbox: [], notes: [] };
      const board = state.weekBoard || [];
      const inbox = Array.isArray(week.inbox) ? week.inbox : [];
      const notes = Array.isArray(week.notes) ? week.notes : [];
      const rec = week.recommend && Array.isArray(week.recommend.items) ? week.recommend : null;
      const today = todayStr();

      const [draft, setDraft] = useState("");
      const [editId, setEditId] = useState(null);
      const [editText, setEditText] = useState("");
      const [dateOpen, setDateOpen] = useState(null);
      const [drafts, setDrafts] = useState({});
      const [noteEdit, setNoteEdit] = useState({});
      const [recOpen, setRecOpen] = useState(null);
      const [dropDay, setDropDay] = useState(null);
      const dragSet = (e, payload) => {
        e.dataTransfer.setData("text/plain", payload);
        e.dataTransfer.effectAllowed = "copyMove";
        e.stopPropagation();
      };
      const handleDrop = (e, date) => {
        e.preventDefault();
        e.stopPropagation();
        setDropDay(null);
        const d = parseDrag(e.dataTransfer.getData("text/plain"));
        if (!d) return;
        if (d.key === "readlater") run("readlaterToToday", { id: d.id, date });
        else if (d.key === "inbox") run("inboxDate", { id: d.id, date });
        else if (d.key === "notes") run("noteToDay", { id: d.id, date });
        else if (d.key.startsWith("todos:")) run("todoMove", { id: d.id, from: d.key.slice(6), to: date });
      };
      const reading = (state.readlater || []).filter((r) => r.status !== "done");

      const open = inbox.filter((g) => !g.done);
      const done = inbox.filter((g) => g.done);

      const addInbox = () => {
        const t = draft.trim();
        if (!t) return;
        setDraft("");
        run("inboxAdd", { text: t });
      };
      const saveEdit = () => {
        const id = editId;
        const v = editText.trim();
        setEditId(null);
        if (id && v) run("inboxEdit", { id, text: v });
      };
      const addTo = (date) => {
        const v = (drafts[date] || "").trim();
        if (!v) return;
        setDrafts({ ...drafts, [date]: "" });
        run("todoAdd", { text: v, date });
      };
      const commitNote = (id) => {
        const v = noteEdit[id];
        if (v === undefined) return;
        const next = { ...noteEdit };
        delete next[id];
        setNoteEdit(next);
        run("noteEdit", { id, text: v });
      };

      const dayLabelOf = (d) => (d === today ? "今天" : `周${WD[new Date(`${d}T00:00:00`).getDay()]}`);

      return h(
        "div",
        null,

        h(
          "div",
          { className: "lg-grid", style: { alignItems: "stretch" } },

          /* ---------- 左：Inbox ---------- */
          h(
            "div",
            null,
            h(
              "div",
              { className: "lg-card" },
              h(
                "div",
                { className: "lg-card-head" },
                h("span", null, "Inbox"),
                h("span", { className: "lg-count-n" }, open.length ? `${open.length} 件待处理` : inbox.length ? "清空了" : "空"),
              ),
              h("p", { className: "footnote-line", style: { margin: "0 0 10px" } }, "这周冒出来的事都先扔这儿——目标里推过来的在，临时想到的也在。"),
              h(
                "div",
                { className: "lg-add" },
                h("input", {
                  value: draft,
                  placeholder: "想到就写，回车放进 Inbox",
                  onChange: (e) => setDraft(e.target.value),
                  onKeyDown: (e) => { if (e.key === "Enter") { e.preventDefault(); addInbox(); } },
                }),
                h("button", { className: "lg-add-btn", onClick: addInbox }, "加"),
              ),
              inbox.length === 0
                ? h("p", { className: "lg-empty" }, "空的。可以临时加一件，也可以去「我」页把目标拆一步放进来。")
                : h(
                    "ul",
                    { className: "lg-todo", ...sortZone("inbox", run) },
                    ...[...open, ...done].map((g) =>
                      h(
                        "li",
                        { key: g.id, className: g.done ? "on" : "", style: { alignItems: "flex-start", flexWrap: "wrap" } },
                        h("button", { className: "lg-dot" + (g.done ? " on" : ""), onClick: () => run("inboxToggle", { id: g.id, done: !g.done }) }, g.done ? h(Check) : null),
                        h(
                          "div",
                          { className: "lg-inbox-body" },
                          editId === g.id
                            ? h("input", {
                                className: "lg-inline-in",
                                value: editText,
                                autoFocus: true,
                                onChange: (e) => setEditText(e.target.value),
                                onBlur: saveEdit,
                                onKeyDown: (e) => {
                                  if (e.key === "Enter") { e.preventDefault(); saveEdit(); }
                                  if (e.key === "Escape") { e.preventDefault(); setEditId(null); }
                                },
                              })
                            : h("button", { className: "lg-inbox-t", onClick: () => { setEditId(g.id); setEditText(g.text); }, title: "点一下改" }, g.text),
                          h(
                            "div",
                            { className: "lg-inbox-meta" },
                            g.fromStep ? h("span", { className: "lg-tag" }, "来自目标") : null,
                            h(
                              "button",
                              {
                                className: "lg-slot" + (g.date ? " on" : ""),
                                onClick: () => setDateOpen(dateOpen === g.id ? null : g.id),
                                title: "安排到某一天",
                              },
                              g.date ? dayLabelOf(g.date) : "排期",
                            ),
                          ),
                        ),
                        h(
                          "span",
                          {
                            className: "lg-drag",
                            ...dragItem("inbox", g.id, { style: { cursor: "grab" } }),
                            title: "拖到某一天，或上下调顺序",
                          },
                          "⠿",
                        ),
                        h("button", { className: "lg-del", onClick: () => run("inboxRemove", { id: g.id }), "aria-label": "删除" }, "×"),
                        dateOpen === g.id
                          ? h(
                              "div",
                              { className: "lg-slot-pick" },
                              h("button", { className: "lg-slot-opt", onClick: () => { setDateOpen(null); run("inboxDate", { id: g.id, date: null }); } }, "不排"),
                              ...board.map((d) => {
                                const dt = new Date(`${d.date}T00:00:00`);
                                return h(
                                  "button",
                                  {
                                    key: d.date,
                                    className: "lg-slot-opt" + (g.date === d.date ? " on" : "") + (d.today ? " today" : ""),
                                    onClick: () => { setDateOpen(null); run("inboxDate", { id: g.id, date: d.date }); },
                                    title: `${dt.getMonth() + 1}/${Number(d.date.slice(8, 10))}`,
                                  },
                                  d.today ? "今天" : `周${WD[dt.getDay()]}`,
                                );
                              }),
                            )
                          : null,
                      ),
                    ),
                  ),
            ),
          ),

          /* ---------- 右：便签 ---------- */
          h(
            "div",
            { style: { display: "flex", flexDirection: "column" } },
            h(
              "div",
              { className: "lg-card", style: { display: "flex", flexDirection: "column", flex: "1 1 auto" } },
              h(
                "div",
                { className: "lg-card-head" },
                h("span", null, "便签"),
                h("button", { className: "lg-pomo", style: { opacity: 1 }, onClick: () => run("noteAdd", { text: "" }) }, "＋ 贴一张"),
              ),
              notes.length === 0
                ? h("p", { className: "lg-empty", style: { margin: 0 } }, "随手写点什么——想法、待查的、不必成为任务的。")
                : h(
                    "div",
                    { className: "lg-notes-col", style: { flex: "1 1 auto" }, ...sortZone("notes", run) },
                    ...notes.map((n) =>
                      h(
                        "div",
                        { key: n.id, className: "lg-note-mini n-" + (n.color || "paper") },
                        h(
                          "span",
                          {
                            className: "lg-drag note",
                            ...dragItem("notes", n.id),
                            title: "拖到某一天，或上下调顺序",
                          },
                          "⠿",
                        ),
                        h(
                          "button",
                          { className: "lg-note-mini-x", onClick: () => run("noteRemove", { id: n.id }), title: "撕掉" },
                          "×",
                        ),
                        h("textarea", {
                          value: noteEdit[n.id] !== undefined ? noteEdit[n.id] : n.text,
                          rows: Math.max(2, Math.min(6, String(n.text || "").split("\n").length + 1)),
                          placeholder: "写点什么",
                          onChange: (e) => setNoteEdit({ ...noteEdit, [n.id]: e.target.value }),
                          onBlur: () => commitNote(n.id),
                        }),
                        h(
                          "div",
                          { className: "lg-note-mini-foot" },
                          ...NOTE_COLORS.map(([k, c]) =>
                            h("button", {
                              key: k,
                              className: "lg-note-c" + (n.color === k ? " on" : ""),
                              style: { "--c": c },
                              onClick: () => run("noteColor", { id: n.id, color: k }),
                              title: "换颜色",
                            }),
                          ),
                        ),
                      ),
                    ),
                  ),
              h("p", { className: "footnote-line", style: { margin: "10px 0 0" } }, "便签只属于这一周——下周会换一张新墙。"),
            ),
          ),
        ),

        /* ---------- 这一周：七天 ---------- */
        h(
          "div",
          null,
          h("p", { className: "lg-sec", style: { marginTop: 8 } }, "这一周"),
          reading.length
            ? h(
                "div",
                { className: "lg-readrow" },
                h("span", { className: "k" }, "拖到某一天"),
                ...reading.slice(0, 8).map((r) =>
                  h(
                    "button",
                    {
                      key: r.id,
                      className: "lg-readchip",
                      draggable: true,
                      title: r.title || r.url,
                      onDragStart: (e) => dragSet(e, `read:${r.id}`),
                    },
                    r.title || r.url,
                  ),
                ),
              )
            : null,
          h(
            "div",
            { className: "lg-cal" },
            ...board.map((d) => {
              const dt = new Date(`${d.date}T00:00:00`);
              return h(
                "div",
                {
                  key: d.date,
                  className: "lg-cal-day" + (d.today ? " today" : "") + (d.past && !d.today ? " past" : "") + (dropDay === d.date ? " drop-on" : ""),
                  onDragOver: (e) => {
                    e.preventDefault();
                    if (dropDay !== d.date) setDropDay(d.date);
                  },
                  onDragLeave: () => setDropDay((cur) => (cur === d.date ? null : cur)),
                  onDrop: (e) => handleDrop(e, d.date),
                },
                h("div", { className: "lg-cal-head" }, h("b", null, d.today ? "今天" : `周${WD[dt.getDay()]}`), h("span", null, `${dt.getMonth() + 1}/${Number(d.date.slice(8, 10))}`)),
                h(
                  "ul",
                  { className: "lg-cal-tasks", ...sortZone(`todos:${d.date}`, run) },
                  ...d.todos.map((t) =>
                    h(
                      "li",
                      {
                        key: t.id,
                        className: t.done ? "on" : "",
                        ...dragItem(`todos:${d.date}`, t.id),
                        title: "拖到别的一天，或上下调顺序",
                        style: { cursor: "grab" },
                      },
                      h("button", { className: "lg-dot" + (t.done ? " on" : ""), onClick: () => run("todoToggle", { id: t.id, done: !t.done, date: d.date }), draggable: false }, t.done ? h(Check) : null),
                      h("span", { className: "tx" }, t.text),
                      h("button", { className: "lg-del", onClick: () => run("todoRemove", { id: t.id, date: d.date }), "aria-label": "删除" }, "×"),
                    ),
                  ),
                ),
                h(
                  "div",
                  { className: "lg-cal-add" },
                  h("input", {
                    value: drafts[d.date] || "",
                    placeholder: "加一件",
                    onChange: (e) => setDrafts({ ...drafts, [d.date]: e.target.value }),
                    onKeyDown: (e) => { if (e.key === "Enter") { e.preventDefault(); addTo(d.date); } },
                  }),
                  h("button", { onClick: () => addTo(d.date), "aria-label": "添加" }, "加"),
                ),
              );
            }),
          ),
          h("p", { className: "footnote-line" }, "在这七天里写下的，就是那一天的「今天要做」——两边是同一份。"),
        ),

        /* ---------- 本周推荐 ---------- */
        h(
          "div",
          { className: "lg-card", style: { marginTop: 8 } },
          h(
            "div",
            { className: "lg-card-head" },
            h("span", null, "本周推荐"),
            h("button", { className: "lg-pomo", style: { opacity: 1 }, onClick: () => run("recommendWeek", {}) }, rec ? "换一批" : "让它推荐"),
          ),
          h("p", { className: "footnote-line", style: { margin: "0 0 14px" } }, "根据你在「我」页写的目标、书单、电影和今天的天气给的。"),
          !rec || !rec.items.length
            ? h("p", { className: "lg-empty", style: { margin: 0 } }, "还没有推荐。点右上角「让它推荐」，它会看完你的目标再给三条。")
            : h(
                "ul",
                { className: "lg-recs" },
                ...rec.items.map((it) =>
                  h(
                    "li",
                    { key: it.id },
                    h("span", { className: "lg-rec-kind" }, KIND_LABEL[it.kind] || "·"),
                    h(
                      "div",
                      { className: "lg-rec-body" },
                      h("p", { className: "t" }, it.title),
                      it.why ? h("p", { className: "w" }, it.why) : null,
                    ),
                    it.minutes ? h("span", { className: "lg-rec-min" }, `${it.minutes} 分钟`) : null,
                    h(
                      "button",
                      {
                        className: "lg-slot" + (it.placed ? " on" : ""),
                        onClick: () => setRecOpen(recOpen === it.id ? null : it.id),
                        title: "安排到某一天",
                      },
                      it.placed ? dayLabelOf(it.placed) : "安排",
                    ),
                    it.minutes
                      ? h(
                          "button",
                          {
                            className: "lg-pomo" + (state.day && state.day.timer ? " off" : ""),
                            style: { opacity: 1 },
                            disabled: !!(state.day && state.day.timer),
                            onClick: () => run("timerStart", { label: it.title, minutes: it.minutes }),
                          },
                          "开始",
                        )
                      : null,
                    recOpen === it.id
                      ? h(
                          "div",
                          { className: "lg-slot-pick", style: { flex: "1 1 100%", margin: "8px 0 0" } },
                          ...board.map((d) => {
                            const dt = new Date(`${d.date}T00:00:00`);
                            return h(
                              "button",
                              {
                                key: d.date,
                                className: "lg-slot-opt" + (it.placed === d.date ? " on" : "") + (d.today ? " today" : ""),
                                onClick: () => { setRecOpen(null); run("recommendToDay", { recId: it.id, date: d.date }); },
                                title: `${dt.getMonth() + 1}/${Number(d.date.slice(8, 10))}`,
                              },
                              d.today ? "今天" : `周${WD[dt.getDay()]}`,
                            );
                          }),
                        )
                      : null,
                  ),
                ),
              ),
        ),
      );
    }

    /* ================= 我 ================= */

    const COLLECT_KINDS = [
      ["book", "书"], ["movie", "电影"], ["article", "文章"], ["image", "图片"], ["skill", "技能"],
    ];
    const COLLECT_HINT = {
      book: { title: "书名", note: "作者 / 为什么想读", empty: "还没有想读的书。" },
      movie: { title: "片名", note: "年份 / 谁推荐", empty: "还没有想看的电影。" },
      article: { title: "文章标题或链接", note: "一句话印象", empty: "还没有收藏的文章。" },
      image: { title: "图片描述", note: "哪里打动了你", empty: "还没有收藏的图片——选一张、拖进来，或者直接粘贴。" },
      skill: { title: "想学的技能", note: "为什么想学", empty: "还没有想学的技能。" },
    };

    function MeView({ state, run }) {
      const stats = state.stats || { days: 0, records: 0, active: [] };
      const goals = (state.profile && state.profile.goals) || { short: [], long: [] };
      const [draftS, setDraftS] = useState("");
      const [draftL, setDraftL] = useState("");
      const [openGoal, setOpenGoal] = useState(null);
      const collect = (state.profile && state.profile.collect) || {};
      const [collectKind, setCollectKind] = useState("book");
      const [collectTitle, setCollectTitle] = useState("");
      const [collectNote, setCollectNote] = useState("");
      const collectTotal = COLLECT_KINDS.reduce((n, [k]) => n + ((collect[k] || []).length), 0);
      const [imgBusy, setImgBusy] = useState(false);
      const [statsOpen, setStatsOpen] = useState(true);
      useEffect(() => {
        if (collectKind !== "image") return;
        const onPaste = (e) => {
          const items = (e.clipboardData && e.clipboardData.items) || [];
          for (const it of items) {
            if (String(it.type || "").startsWith("image/")) {
              const f = it.getAsFile();
              if (f) { uploadImage(f); e.preventDefault(); break; }
            }
          }
        };
        document.addEventListener("paste", onPaste);
        return () => document.removeEventListener("paste", onPaste);
      }, [collectKind]);

      const uploadImage = (file) => {
        if (!file || !/^image\//.test(file.type)) return;
        if (file.size > 8 * 1024 * 1024) return;
        setImgBusy(true);
        const fr = new FileReader();
        fr.onload = () => {
          run("collectAddImage", { dataUrl: String(fr.result || ""), title: file.name.replace(/\.[^.]+$/, "") });
          setImgBusy(false);
        };
        fr.onerror = () => setImgBusy(false);
        fr.readAsDataURL(file);
      };
      const addCollect = () => {
        const v = collectTitle.trim();
        if (!v) return;
        setCollectTitle("");
        run("collectAdd", { kind: collectKind, title: v, note: collectNote.trim() });
        setCollectNote("");
      };
      const [planTplEdit, setPlanTplEdit] = useState(null);
      const [planTplText, setPlanTplText] = useState("");
      const [slotEdit, setSlotEdit] = useState(null);
      const [slotText, setSlotText] = useState("");


      const byDate = {};
      (stats.active || []).forEach((a) => (byDate[a.date] = a));

      const st = stats || {};
      const fmtMin = (sec) => {
        const m = Math.round((sec || 0) / 60);
        if (!m) return "0 分钟";
        return m >= 60 ? `${Math.floor(m / 60)} 小时 ${m % 60 ? `${m % 60} 分` : ""}`.trim() : `${m} 分钟`;
      };
      const focusTotal = fmtMin(st.focusSeconds);
      const focusLongest = st.longestSession ? fmtMin(st.longestSession) : "—";
      const ratio = (a, b) => (b ? `${Math.round(((a || 0) / b) * 100)}%` : "—");
      const statCollect = Object.values(st.collect || {}).reduce((n, x) => n + (x.total || 0), 0);
      let goalStepTotal = 0;
      let goalStepDone = 0;
      for (const g of [...goals.short, ...goals.long]) {
        const steps = Array.isArray(g.steps) ? g.steps : [];
        goalStepTotal += steps.length;
        goalStepDone += steps.filter((x) => x.done).length;
      }
      const activityLine = (() => {
        const d = st.days || 0;
        const a = st.activeDays || 0;
        if (!d) return "还没有记录。今天做一件事，这里就开始有数。";
        if (!a) return `${d} 天里还没有一天留下完成记录。`;
        if ((st.streak || 0) >= 3) return `已经连续 ${st.streak} 天有记录，最长连续 ${st.longestStreak} 天。`;
        const pct = Math.round((a / d) * 100);
        if (pct <= 30) return `${d} 天里有 ${a} 天留下记录——断断续续也算数，接上就行。`;
        return `${d} 天里有 ${a} 天留下记录，占 ${pct}%，最长连续 ${st.longestStreak || 0} 天。`;
      })();
      const statCell = (label, value, sub) =>
        h(
          "div",
          { className: "lg-stat", key: label },
          h("span", { className: "k" }, label),
          h("b", null, value),
          sub ? h("span", { className: "s" }, sub) : null,
        );
      const series = Array.isArray(st.series) ? st.series : [];
      const bars30 = series.slice(-30);
      const maxDone = Math.max(1, ...bars30.map((x) => x.done));
      const barsChart = h(
        "svg",
        { className: "lg-chart", viewBox: "0 0 300 62", preserveAspectRatio: "none", role: "img", "aria-label": "近 30 天完成量" },
        ...bars30.map((x, i) => {
          const w = 300 / Math.max(bars30.length, 1);
          const hh = x.done ? Math.max(3, (x.done / maxDone) * 54) : 1.5;
          return h("rect", {
            key: x.date,
            x: i * w + w * 0.18,
            y: 58 - hh,
            width: w * 0.64,
            height: hh,
            rx: 1.5,
            className: x.done ? "bar on" : "bar",
          });
        }),
      );
      const focus14 = series.slice(-14);
      const maxFocus = Math.max(1, ...focus14.map((x) => x.focus));
      const focusChart = h(
        "svg",
        { className: "lg-chart", viewBox: "0 0 300 62", preserveAspectRatio: "none", role: "img", "aria-label": "近 14 天专注时长" },
        ...focus14.map((x, i) => {
          const w = 300 / Math.max(focus14.length, 1);
          const hh = x.focus ? Math.max(3, (x.focus / maxFocus) * 54) : 1.5;
          return h("rect", {
            key: x.date,
            x: i * w + w * 0.2,
            y: 58 - hh,
            width: w * 0.6,
            height: hh,
            rx: 1.5,
            className: x.focus ? "bar on" : "bar",
          });
        }),
      );
      const ring = (pct, label, value) => {
        const r = 26;
        const c = 2 * Math.PI * r;
        const p = Math.max(0, Math.min(100, pct || 0));
        return h(
          "div",
          { className: "lg-ring", key: label },
          h(
            "div",
            { className: "ring-wrap" },
            h(
              "svg",
              { viewBox: "0 0 64 64", role: "img", "aria-label": `${label} ${p}%` },
              h("circle", { cx: 32, cy: 32, r, className: "ring-bg" }),
              h("circle", {
                cx: 32,
                cy: 32,
                r,
                className: "ring-fg",
                strokeDasharray: `${(c * p) / 100} ${c}`,
                transform: "rotate(-90 32 32)",
              }),
            ),
            h("b", null, `${p}%`),
          ),
          h("span", null, label),
          h("em", null, value),
        );
      };

      const miniBar = (label, a, b) =>
        h(
          "div",
          { className: "lg-minibar-row", key: label },
          h("span", { className: "k" }, label),
          h("span", { className: "lg-pbar" }, h("i", { style: { width: `${b ? Math.min(100, Math.round((a / b) * 100)) : 0}%` } })),
          h("span", { className: "v" }, `${a || 0} / ${b || 0}`),
        );

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
        const s0 = stats.active[0].date;
        return s0 === todayStr() ? null : shortDate(s0);
      })();

      const goalBlock = (scope, title, hint, draft, setDraft) => {
        const stepScope = scope;
        const list = goals[scope] || [];
        const open = list.filter((g) => !g.done);
        const done = list.filter((g) => g.done);
        const add = () => {
          const v = draft.trim();
          if (!v) return;
          setDraft("");
          run("lifeGoalAdd", { scope, text: v });
        };
        return h(
          "div",
          { className: "lg-card", style: { marginBottom: 16 } },
          h(
            "div",
            { className: "lg-card-head" },
            h("span", null, title),
            h("span", { className: "lg-count-n" }, list.length ? `${done.length} / ${list.length}` : "还没写"),
          ),
          h(
            "div",
            { className: "lg-add" },
            h("textarea", {
              value: draft,
              rows: Math.min(5, Math.max(1, draft.split("\n").length)),
              placeholder: hint,
              onChange: (e) => setDraft(e.target.value),
              onKeyDown: (e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); add(); }
              },
            }),
            h("button", { className: "lg-add-btn", onClick: add }, "加"),
          ),
          list.length === 0
            ? null
            : h(
                "ul",
                { className: "lg-todo", ...sortZone(`goals:${scope}`, run) },
                ...[...open, ...done].map((g) => {
                  const steps = Array.isArray(g.steps) ? g.steps : [];
                  const doneSteps = steps.filter((x) => x.done).length;
                  return h(
                    "li",
                    { key: g.id, className: g.done ? "on" : "", style: { alignItems: "flex-start" }, ...dragItem(`goals:${scope}`, g.id) },
                    h(
                      "button",
                      { className: "lg-dot" + (g.done ? " on" : ""), onClick: () => run("lifeGoalToggle", { id: g.id, done: !g.done }) },
                      g.done ? h(Check) : null,
                    ),
                    h(
                      "div",
                      { className: "lg-goal-body" },
                      h(
                        "button",
                        { className: "lg-goal-t", onClick: () => setOpenGoal(openGoal === g.id ? null : g.id), title: "点开看回推的步骤" },
                        g.text,
                      ),
                      steps.length
                        ? h("div", { className: "lg-goal-meta" }, `${doneSteps} / ${steps.length} 步已做`, h("span", { className: "dot" }, "·"), openGoal === g.id ? "收起" : "展开")
                        : h("div", { className: "lg-goal-meta" }, "还没拆过"),
                      openGoal === g.id
                        ? steps.length
                          ? h(
                              "ol",
                              { className: "lg-steps" },
                              ...steps.map((st) =>
                                h(
                                  "li",
                                  { key: st.id, className: st.done ? "on" : "" },
                                  h(
                                    "button",
                                    { className: "lg-dot" + (st.done ? " on" : ""), onClick: () => run("goalStepToggle", { goalId: g.id, stepId: st.id, done: !st.done }) },
                                    st.done ? h(Check) : null,
                                  ),
                                  h("span", { className: "tx" }, st.text),
                                  st.placed
                                    ? h("span", { className: "lg-placed" }, st.placedTo === "today" ? "已在今天" : "已在本周")
                                    : h(
                                        "span",
                                        { style: { display: "inline-flex", gap: 6, flex: "0 0 auto" } },
                                        stepScope === "short"
                                          ? h("button", { className: "lg-toweek", onClick: () => run("goalStepToToday", { goalId: g.id, stepId: st.id }), title: "直接放进今天要做" }, "放到今天")
                                          : null,
                                        h("button", { className: "lg-toweek", onClick: () => run("goalStepToWeek", { goalId: g.id, stepId: st.id }) }, "放到本周"),
                                      ),
                                ),
                              ),
                            )
                          : h("p", { className: "lg-empty", style: { margin: "8px 0 0" } }, "点右侧「拆解」，它会往前推几步。")
                        : null,
                    ),
                    h(
                      "button",
                      {
                        className: "lg-pomo",
                        style: { opacity: 1 },
                        onClick: () => {
                          setOpenGoal(g.id);
                          run("goalBreakdown", { id: g.id });
                        },
                        title: "让模型把这个目标拆成几步",
                      },
                      steps.length ? "重拆" : "拆解",
                    ),
                    h("button", { className: "lg-del", onClick: () => run("lifeGoalRemove", { id: g.id }), "aria-label": "删除" }, "×"),
                  );
                }),
              ),
        );
      };

      return h(
        "div",
        { className: "lg-grid" },

        /* ---------- 左：这九十天 + 四字 ---------- */
        h(
          "div",
          null,
          h("p", { className: "lg-eyebrow-sm" }, "你走过的"),
          h("p", { className: "lg-big" }, `第 ${Math.max(stats.days, 1)} 天`),
          h("p", { className: "lg-why", style: { marginBottom: 30 } }, `在这里留下 ${(st.planDone || 0) + (st.todoDone || 0)} 条完成记录。`),

          h("p", { className: "lg-sec", style: { marginTop: 0 } }, "九十天"),
          h("div", { className: "lg-traces" }, ...cells),
          h("div", { className: "lg-axis" }, h("span", null, start || "今天"), h("span", null, "今天")),

          /* ---------- 统计 + 活跃度 ---------- */
          h(
            "div",
            { className: "lg-card", style: { marginTop: 26 } },
            h(
              "div",
              { className: "lg-card-head" },
              h("span", null, "统计"),
              h(
                "span",
                { style: { marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 12 } },
                h("span", { className: "lg-count-n" }, `${st.activeDays || 0} / ${st.days || 0} 天有记录 · 连续 ${st.streak || 0} 天`),
                h(
                  "button",
                  { className: "lg-fold", onClick: () => setStatsOpen(!statsOpen), "aria-expanded": statsOpen },
                  statsOpen ? "收起" : "展开",
                ),
              ),
            ),
            h("p", { className: "lg-why", style: { margin: statsOpen ? "0 0 18px" : "0" } }, activityLine),

            statsOpen
              ? h(
                  "div",
                  null,
                  h(
                    "div",
                    { className: "lg-charts" },
                    h(
                      "div",
                      { className: "lg-chart-box" },
                      h("span", { className: "lg-chart-k" }, "近 30 天 · 每天完成"),
                      barsChart,
                    ),
                    h(
                      "div",
                      { className: "lg-chart-box" },
                      h("span", { className: "lg-chart-k" }, "近 14 天 · 专注分钟"),
                      focusChart,
                    ),
                    h(
                      "div",
                      { className: "lg-rings" },
                      ring(Math.round(((st.planDone || 0) / (st.planTotal || 1)) * 100), "规定事项", `${st.planDone || 0}/${st.planTotal || 0}`),
                      ring(Math.round(((st.todoDone || 0) / (st.todoTotal || 1)) * 100), "待办", `${st.todoDone || 0}/${st.todoTotal || 0}`),
                    ),
                  ),
                  h(
                    "div",
                    { className: "lg-stats" },
              statCell("连续", st.streak ? `${st.streak} 天` : "—", `最长 ${st.longestStreak || 0} 天`),
              statCell("规定事项", `${st.planDone || 0} / ${st.planTotal || 0}`, ratio(st.planDone, st.planTotal)),
              statCell("待办", `${st.todoDone || 0} / ${st.todoTotal || 0}`, ratio(st.todoDone, st.todoTotal)),
              statCell("专注", focusTotal, `${st.sessions || 0} 段`),
              statCell("最长一段", focusLongest, st.daysWithFocus ? `${st.daysWithFocus} 天有专注` : "还没专注过"),
              statCell("读过", `${st.readDone || 0} / ${st.readTotal || 0}`, st.readTotal ? ratio(st.readDone, st.readTotal) : "还没有存的"),
              statCell("收藏", `${statCollect} 条`, "书 / 影 / 文 / 图 / 穿 / 乐 / 技"),
              statCell("目标推进", `${goalStepDone} 步`, `共 ${goalStepTotal} 步`),
            ),
            h(
              "div",
              { className: "lg-stats-bars" },
              miniBar("活跃", st.activeDays || 0, st.days || 0),
              miniBar("规定事项", st.planDone || 0, st.planTotal || 0),
              miniBar("待办", st.todoDone || 0, st.todoTotal || 0),
            ),
                )
              : null,
          ),

          h(
            "div",
            { className: "lg-card", style: { marginTop: 26 } },
            h(
              "div",
              { className: "lg-card-head" },
              h("span", null, "收集仓库"),
              h("span", { className: "lg-count-n" }, `共 ${collectTotal} 条`),
            ),
            h(
              "p",
              { className: "footnote-line", style: { margin: "0 0 12px" } },
              "喜欢什么就扔进来。它给你建议、给你推荐时，先看这里。",
            ),
            h(
              "div",
              { className: "lg-kinds" },
              ...COLLECT_KINDS.map(([k, label]) =>
                h(
                  "button",
                  { key: k, className: "lg-kind" + (collectKind === k ? " on" : ""), onClick: () => setCollectKind(k) },
                  label,
                  h("i", null, (collect[k] || []).length || ""),
                ),
              ),
            ),
            collectKind === "image"
              ? h(
                  "div",
                  {
                    className: "lg-drop-img" + (imgBusy ? " busy" : ""),
                    onDragOver: (e) => { e.preventDefault(); e.currentTarget.classList.add("over"); },
                    onDragLeave: (e) => e.currentTarget.classList.remove("over"),
                    onDrop: (e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("over");
                      const f = e.dataTransfer.files && e.dataTransfer.files[0];
                      if (f) uploadImage(f);
                    },
                  },
                  h("input", {
                    type: "file",
                    accept: "image/*",
                    id: "lg-img-file",
                    style: { display: "none" },
                    onChange: (e) => {
                      const f = e.target.files && e.target.files[0];
                      if (f) uploadImage(f);
                      e.target.value = "";
                    },
                  }),
                  h(
                    "label",
                    { htmlFor: "lg-img-file", className: "lg-drop-img-btn" },
                    imgBusy ? "正在存…" : "选一张图",
                  ),
                  h("span", { className: "lg-drop-img-hint" }, "也可以拖进来，或者直接粘贴"),
                )
              : h(
                  "div",
                  { className: "lg-add" },
                  h("input", {
                    value: collectTitle,
                    placeholder: COLLECT_HINT[collectKind] ? COLLECT_HINT[collectKind].title : "标题",
                    onChange: (e) => setCollectTitle(e.target.value),
                    onKeyDown: (e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      addCollect();
                    },
                  }),
                  h("button", { className: "lg-add-btn", onClick: addCollect }, "加"),
                ),
            collectKind === "image"
              ? null
              : h(
                  "div",
                  { className: "lg-labelrow" },
                  h("input", {
                    value: collectNote,
                    placeholder: COLLECT_HINT[collectKind] ? COLLECT_HINT[collectKind].note : "备注（可空）",
                    onChange: (e) => setCollectNote(e.target.value),
                  }),
                ),
            (collect[collectKind] || []).length === 0
              ? h("p", { className: "lg-empty" }, COLLECT_HINT[collectKind] ? COLLECT_HINT[collectKind].empty : "还没有。")
              : h(
                  "ul",
                  { className: "lg-todo", ...sortZone(`collect:${collectKind}`, run) },
                  ...(collect[collectKind] || []).map((it) =>
                    h(
                      "li",
                      { key: it.id, "data-sid": it.id, style: { alignItems: "flex-start" } },
                      h(
                        "button",
                        { className: "lg-dot" + (it.done ? " on" : ""), onClick: () => run("collectToggle", { kind: collectKind, id: it.id, done: !it.done }) },
                        it.done ? h(Check) : null,
                      ),
                      collectKind === "image" && it.url
                        ? h(
                            "div",
                            { style: { flex: "1 1 auto", minWidth: 0 } },
                            h("img", { className: "lg-thumb", src: it.url, alt: it.title, loading: "lazy" }),
                            h("p", { style: { margin: "6px 0 0", fontSize: 12, color: "var(--lg-muted)" } }, it.title),
                          )
                        : h(
                            "div",
                            { style: { flex: "1 1 auto", minWidth: 0 } },
                            h("p", { style: { margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" } }, it.title),
                            it.note ? h("p", { style: { margin: "3px 0 0", fontSize: 11.5, color: "var(--lg-muted)" } }, it.note) : null,
                            it.url
                              ? h(
                                  "a",
                                  { href: it.url, target: "_blank", rel: "noreferrer", style: { fontSize: 11.5, color: "var(--lg-accent)" } },
                                  "打开",
                                )
                              : null,
                          ),
                      h("button", { className: "lg-del", onClick: () => run("collectRemove", { kind: collectKind, id: it.id }), "aria-label": "删除" }, "×"),
                    ),
                  ),
                ),
          ),

        ),

        /* ---------- 右：短期 / 长期目标 ---------- */
        h(
          "div",
          null,
          h("p", { className: "lg-eyebrow-sm" }, "你定义的远方"),
          h(
            "p",
            { className: "footnote-line", style: { marginTop: 8 } },
            "写在这里的目标，会成为「今天」安排和建议的依据——它推什么，先看你想到哪儿去。",
          ),
          goalBlock("short", "短期目标", "这一阵想做成什么？比如「这两周把早睡调回来」。", draftS, setDraftS),
          goalBlock("long", "长期目标", "一两年后想成为什么样？比如「能自己拍一支短片」。", draftL, setDraftL),

          h(
            "div",
            { className: "lg-card", style: { marginTop: 16 } },
            h(
              "div",
              { className: "lg-card-head" },
              h("span", null, "每天的规矩"),
              h("span", { className: "lg-count-n" }, "改了之后，每天都这样"),
            ),
            h("p", { className: "footnote-line", style: { margin: "0 0 12px" } }, "「今天」页里的规定事项就是这三条。写「N 分钟」会自动改时长。"),
            h(
              "ul",
              { className: "lg-todo", ...sortZone(`plan:${state.day && state.day.date ? state.day.date : todayStr()}`, run) },
              ...(state.day && Array.isArray(state.day.plan) ? state.day.plan : []).map((p) =>
                h(
                  "li",
                  { key: p.id },
                  slotEdit === p.id
                    ? h("input", {
                        className: "lg-inline-in time slot",
                        value: slotText,
                        autoFocus: true,
                        placeholder: "09:30",
                        onChange: (e) => setSlotText(e.target.value),
                        onBlur: () => {
                          const v = slotText.trim();
                          setSlotEdit(null);
                          if (v) run("planTemplate", { id: p.id, slot: v });
                        },
                        onKeyDown: (e) => {
                          if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
                          if (e.key === "Escape") { e.preventDefault(); setSlotEdit(null); }
                        },
                      })
                    : h(
                        "button",
                        {
                          className: "lg-plan-no",
                          onClick: () => { setSlotEdit(p.id); setSlotText(p.slot); },
                          title: "点一下改时间",
                        },
                        p.slot,
                      ),
                  planTplEdit === p.id
                    ? h("input", {
                        className: "lg-inline-in",
                        value: planTplText,
                        autoFocus: true,
                        onChange: (e) => setPlanTplText(e.target.value),
                        onBlur: () => {
                          const v = planTplText.trim();
                          setPlanTplEdit(null);
                          if (v) run("planTemplate", { id: p.id, title: v });
                        },
                        onKeyDown: (e) => {
                          if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
                          if (e.key === "Escape") { e.preventDefault(); setPlanTplEdit(null); }
                        },
                      })
                    : h(
                        "button",
                        { className: "lg-inbox-t", onClick: () => { setPlanTplEdit(p.id); setPlanTplText(p.title); }, title: "点一下改，以后每天都这样" },
                        p.title,
                      ),
                ),
              ),
            ),
          ),
        ),
      );
    }

    const TABS = [
      { id: "today", label: "今天" },
      { id: "week", label: "本周" },
      { id: "me", label: "我" },
    ];

    function LifegamePanel() {
      const [state, setState] = useState(null);
      const [err, setErr] = useState("");
      const [notice, setNotice] = useState("");
      const [busy, setBusy] = useState(false);
      const [tab, setTab] = useState("today");
      const [editingLoc, setEditingLoc] = useState(false);
      const [locText, setLocText] = useState("");
      const alive = useRef(true);
      const wx = (state && state.weather) || null;
      const locName = (state && state.location && state.location.name) || "";
      const watching = (state && state.day && state.day.watching) || [];

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
          if (busy) return null;
          setBusy(true);
          try {
            const r = await sendOp(op, payload);
            if (r?.state) setState(r.state);
            else await load();
            setNotice("");
            return r;
          } catch (e) {
            const msg = String((e && e.message) || e);
            // 最常见的原因：宿主没重启，新 op 还不存在
            setNotice(/unknown op/i.test(msg) ? "这一步没生效——插件宿主还没重启，重启 DSH 后再试。" : `没保存成功：${msg}`);
            await load();
            return null;
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
              ? h(WeekView, { state, run })
              : h(MeView, { state, run });
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
              { style: { flex: "1 1 auto", minWidth: 0 } },
              h(
                "div",
                { className: "lg-topline" },
                h("p", { className: "lg-eyebrow" }, `${day ? shortDate(day.date) : ""} · 人生游戏`),
                h(
                  "span",
                  { className: "lg-wxtop" },
                  editingLoc
                    ? h("input", {
                        className: "lg-locin",
                        value: locText,
                        autoFocus: true,
                        placeholder: "城市或区，如 杭州余杭",
                        onChange: (e) => setLocText(e.target.value),
                        onBlur: () => {
                          const v = locText.trim();
                          setEditingLoc(false);
                          if (v && v !== locName) run("setLocation", { name: v });
                        },
                        onKeyDown: (e) => {
                          if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
                          if (e.key === "Escape") { e.preventDefault(); setEditingLoc(false); }
                        },
                      })
                    : h(
                        "button",
                        {
                          className: "lg-locbtn",
                          onClick: () => {
                            setLocText(locName);
                            setEditingLoc(true);
                          },
                          title: "点一下改位置",
                        },
                        locName || "设定位置",
                      ),
                  wx && wx.text
                    ? h(
                        "span",
                        { className: "lg-wxline" },
                        h("span", null, wx.text),
                        wx.temp != null ? h("b", null, `${wx.temp}°`) : null,
                        wx.tmin != null && wx.tmax != null ? h("em", null, `${wx.tmin}–${wx.tmax}°`) : null,
                      )
                    : null,
                ),
              ),
              h(
                "div",
                { className: "lg-h1row" },
                h("h1", { className: "lg-h1" }, tab === "today" ? "今天" : tab === "week" ? "本周" : "我"),
                watching.length
                  ? h(
                      "div",
                      { className: "lg-watch inline" },
                      h("b", null, "它在看着"),
                      ...watching.flatMap((w, i) =>
                        i === 0
                          ? [h("span", { key: `w${i}` }, w)]
                          : [h("span", { className: "lg-sep", key: `s${i}` }), h("span", { key: `w${i}` }, w)],
                      ),
                    )
                  : null,
              ),
            ),
          ),
          notice
            ? h(
                "div",
                { className: "lg-notice" },
                h("span", null, notice),
                h("button", { onClick: () => setNotice(""), "aria-label": "关闭" }, "×"),
              )
            : null,
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
            day && day.inspiration
              ? h(
                  "span",
                  { className: "lg-tabspark", title: day.inspiration.text },
                  h("span", { className: "q" }, `「${day.inspiration.text}」`),
                  day.inspiration.from ? h("span", { className: "from" }, day.inspiration.from) : null,
                  h("button", { className: "lg-spark-swap", onClick: () => run("inspirationRotate", {}), title: "换一条" }, "换"),
                )
              : null,
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
