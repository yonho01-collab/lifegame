/**
 * 自检：前端调用的 op 必须都在后端 applyOp 里有 case。
 * 跑法：node --check 不管这个，所以单独一个脚本；提交前跑一次。
 *
 *   ELECTRON_RUN_AS_NODE=1 "$DSH_NODE_EXECUTABLE" plugin/check-ops.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const client = readFileSync(join(dir, "client.js"), "utf8");
const index = readFileSync(join(dir, "index.js"), "utf8");

// 后端：applyOp 里全部 case
const iStart = index.indexOf("function applyOp(");
const iEnd = index.indexOf("\nfunction ", iStart + 10);
const backend = new Set([...index.slice(iStart, iEnd).matchAll(/case "([^"]+)":/g)].map((m) => m[1]));

// 前端：所有 run("op" / applyMockOp("op" 的字面量
const frontend = new Set();
for (const m of client.matchAll(/\brun\(\s*"([a-zA-Z]+)"/g)) frontend.add(m[1]);

const missing = [...frontend].filter((op) => !backend.has(op)).sort();
const unused = [...backend].filter((op) => !frontend.has(op)).sort();

console.log(`前端调用 op：${frontend.size} 个`);
console.log(`后端支持 op：${backend.size} 个`);
if (missing.length) {
  console.log(`\n✗ 前端调用了但后端没有的 op（会静默失败）：\n  ${missing.join("\n  ")}`);
} else {
  console.log("\n✓ 前端调用的 op 后端都有");
}
if (unused.length) console.log(`\n（后端多出的，可能只给 Agent 工具用：${unused.join(", ")}）`);
process.exit(missing.length ? 1 : 0);
