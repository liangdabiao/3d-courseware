# 课件 Starter 模板

「清透实验室」风格 3D 交互课件的起点。产出**单文件 HTML**：双击即开、断网可用。

## 快速开始

```bash
npm install        # 首次：装 three + esbuild（需联网一次）
node build.js      # 构建 → dist/<slug>.html
node build.js --watch   # 开发模式，改动自动重建
```

打开 `dist/<slug>.html` 即用。启动错误（含契约校验）会以红框显示在页面上。

## 怎么做一门新课

1. 复制整个 starter 目录为新课件目录。
2. 读 `src/course/course.demo.js`（单摆示例课）——四块（C/world/model/consoleCfg）的完整活样本。
3. 新建 `src/course/course.<slug>.js` 实现你的四块，改 `main.js` 引入。
4. `node build.js`，按 SKILL.md 的验收清单自查。

## 结构

```
build.js               构建：esbuild 打 IIFE → 注入单文件 HTML（含启动错误红框）
src/framework/
  engine.js            步骤引擎：act 门控/考核/quiz/事故/主循环/__lab
  hud.js               外壳 DOM：顶栏/步骤条/左栏/中控台/名牌/横幅/toast
  world3d.js           3D 基建：渲染器/影棚灯/相机/材质 kit/canvas 纹理/补间
  style.js             「清透实验室」设计系统 CSS（源自铜匠实验室，CC BY-NC 4.0）
src/course/
  course.demo.js       单摆示例课（对照它写新课）
  main.js              入口：boot({C, world, model, console})
```

## 调试

浏览器控制台里用 `window.__lab`：

```js
__lab.step            // 当前步
__lab.set("l", 1.5)   // 改控件值
__lab.ctx.R.T         // 读派生量（expect 数字核对用）
__lab.live()          // 视觉遥测（测试断言用）
__lab.goto(4)         // 跳步
__lab.pump(300)       // 快进 5 秒（rAF 被节流/写测试时用）
```
