/**
 * 工具卡兜底（照 DSH Go 官方 12 行实现抄的，语义一致）
 *
 * presentationMeta 抛错 / 返回非无损 JSON / 超过 8 KiB，
 * 都会让**整次工具调用失败**。这里把三种情况都兜成 {}（不出卡片，但工具调用成功）。
 */
export function toolCard(build, maxBytes = 8 * 1024) {
  return (args, value) => {
    try {
      const text = JSON.stringify(build(args, value));
      if (text === undefined || Buffer.byteLength(text, "utf8") > maxBytes) return {};
      return { "dsh-go/view": JSON.parse(text) };
    } catch {
      return {};
    }
  };
}
