#!/usr/bin/env node
/**
 * 构建脚本：把 src/course/main.js 打包成单文件离线 HTML。
 *
 * 依赖：node >= 18；首次运行 `npm install`（安装 three 与 esbuild，需联网一次）。
 * 之后构建完全离线，产物双击即可打开。
 *
 * 用法：
 *   node build.js            # 产出 dist/<slug>.html（slug 取自课程的 C.meta.slug）
 *   node build.js --watch    # 开发模式：改动自动重建（终端 Ctrl+C 退出）
 */
import { build, context } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, "dist");
mkdirSync(outDir, { recursive: true });

const htmlShell = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<link rel="icon" href="data:,">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>__TITLE__ · 3D 互动课件</title>
</head>
<body>
<canvas id="gl" tabindex="0"></canvas>
<script>
/* 启动错误可见化：契约校验/脚本错误直接显示在页面上，方便课件作者排查 */
window.addEventListener("error", function (e) {
  var d = document.createElement("pre");
  d.style.cssText = "position:fixed;left:12px;right:12px;top:12px;z-index:99999;background:#fff;border:2px solid #EF4444;border-radius:12px;padding:14px;font:13px/1.5 Consolas,monospace;color:#B91C1C;white-space:pre-wrap;max-height:60vh;overflow:auto";
  d.textContent = "启动错误：\\n" + (e.message || "") + "\\n" + ((e.error && e.error.stack) || "");
  document.body.appendChild(d);
});
</script>
<script>
__BUNDLE__
</script>
</body>
</html>
`;

async function run(watch) {
  const ctx = await context({
    entryPoints: [join(root, "src/course/main.js")],
    bundle: true,
    format: "iife",
    write: false,
    legalComments: "inline",
    logLevel: "info",
  });

  const emit = async () => {
    const r = await ctx.rebuild();
    const js = r.outputFiles[0].text;
    const m = js.match(/slug:\s*["']([a-z0-9-]+)["']/i) || js.match(/["']slug["']:\s*["']([a-z0-9-]+)["']/i);
    let title = "3D 互动课件";
    if (m) {
      // title 就在 meta 块里 slug 的后面不远
      const near = js.slice(m.index, m.index + 600);
      const t = near.match(/title:\s*["']([^"']+)["']/);
      if (t) {
        // 还原 \uXXXX 转义
        title = t[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      }
    }
    const slug = m ? m[1] : "course";
    const file = join(outDir, `${slug}.html`);
    writeFileSync(file, htmlShell.replace("__BUNDLE__", () => js).replace("__TITLE__", title));
    console.log(`✓ ${file} (${(js.length / 1024).toFixed(0)} KB js)`);
  };

  if (watch) {
    await ctx.watch();
    await emit();
    console.log("watching for changes…");
  } else {
    await emit();
    await ctx.dispose();
  }
}

run(process.argv.includes("--watch")).catch((e) => {
  console.error(e);
  process.exit(1);
});
