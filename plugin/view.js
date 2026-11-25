/**
 * 今天的原生视图 —— DSH Go 在手机上画出来的就是这棵树。
 *
 * 约束（官方组件目录）：
 *   - 工具卡 ≤ 8 KiB、≤ 40 个组件、每层 ≤ 16 个子节点
 *   - 工具卡**第 0 期不能点**：按钮/确认不显示，选项只读
 *     → 所以交互只能靠「用户在对话里说一句，Agent 调工具改」
 */

const MAX_ITEMS = 6;

export function todayView(v, withActions) {
  if (!v || !v.plan) return null;

  const plan = v.plan.slice(0, MAX_ITEMS);
  const after = (v.after || []).slice(0, MAX_ITEMS);
  const children = [];

  if (v.watching && v.watching.length) {
    children.push({ type: "text", text: `它在看着：${v.watching.join(" · ")}`, tone: "muted" });
  }

  children.push({
    type: "list",
    items: plan.map((p) => ({
      title: p.title,
      subtitle: p.done ? "已完成" : p.slot,
      icon: p.done ? "check" : "todo",
      tone: p.done ? "good" : undefined,
    })),
  });

  if (after.length) {
    children.push({ type: "text", text: "之后", tone: "muted" });
    children.push({ type: "keyValue", items: after.map((a) => [a.time, a.title]) });
  }

  if (v.alt) {
    children.push({ type: "text", text: `或者：${v.alt}`, tone: "muted" });
  }

  if (withActions) {
    children.push({
      type: "actions",
      items: [
        { label: "做了", action: "done", style: "primary" },
        { label: "换一个", action: "swap" },
      ],
    });
  }

  return {
    type: "stack",
    title: v.title || "今天",
    children,
  };
}


export function weekView(v) {
  if (!v) return null;
  const children = [];

  if (v.goals && v.goals.length) {
    children.push({ type: "list", items: v.goals.map((g) => ({ title: g.title, icon: g.done ? "check" : "flag", tone: g.done ? "good" : undefined })) });
  } else {
    children.push({ type: "text", text: "本周还没定目标。", tone: "muted" });
  }

  children.push({
    type: "keyValue",
    items: [
      ["规定事项", `${v.planDone} / ${v.planTotal}`],
      ["专注", `${v.focusMinutes} 分钟 · ${v.sessions} 段`],
      ["自由待办", `${v.todosDone} / ${v.todosTotal}`],
    ],
  });

  if (v.comment) children.push({ type: "text", text: v.comment });

  return { type: "stack", title: v.title || "本周", children };
}
