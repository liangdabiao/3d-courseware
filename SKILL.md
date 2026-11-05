---
name: 3d-courseware
description: 制作「铜匠实验室」风格的 3D 交互科学课件（单文件 HTML，three.js，高中物理/化学/生物/地理）。当用户要制作课件、互动课件、3D 实验课件、虚拟实验室、微课演示、教学演示页、公开课交互页面，或提到「课件」「讲课用的 3D 演示」「仿铜匠实验室」「做一个实验模拟给学生看」时使用——即使用户没说 3D 或 HTML，只要意图是做教学演示内容就应触发。
---

# 3D 交互科学课件制作（清透实验室风格）

从 54 门「铜匠实验室」课件逆向学习得的完整制作方法：**教学设计方法论 + 单文件架构契约 + 可运行的 starter 模板 + 视觉规范**。目标是产出同等质量的课件：一个独立 HTML 文件（~1.3MB），双击即开、断网可用，带常驻中控台、主线问题与步骤条，老师按「下一步」就能从头讲到尾。

## 必读顺序（开工前按需加载）

1. **`references/pedagogy.md`** —— 教学设计方法论（主线问题/知识链/步骤教研结构/考核/quiz/易错点防护）。**先读这个，内容设计先于一切代码。**
2. **`references/architecture.md`** —— C/world/model/console 四块契约与字段 schema。
3. **`references/subjects.md`** —— 学科差异化模式（物化生地各自场景骨架、时间表达、特效手法速查）。
4. **`references/visual-spec.md`** —— 「清透实验室」视觉规范（设计 tokens、布局、3D 质感基准）。

## 制作流程

### 阶段一：教学设计（产出 C 对象草稿，纯内容无代码）

1. **定位**：确定学科+教材位置（人教版 2019 章节）+ 类型（原理与现象 / 实验探究 / 工业流程）。写 `locate` 与课标 `ref` 编号。
2. **主线问题**：一个具体可感、有冲突悬念的问题（好例：「一块银白色的小金属，为什么着火时连水都不能浇？」）。全课只回答它。
3. **知识链**：4–6 环因果链 `{k: 短语, t: 一句话}`，环间箭头语义化（→ / ↔ / ＋）。
4. **步骤规划**：7–9 步。第 1 步认识场景（orbit），中间每步对应一环，最后一步「考核 · 当XX」（hold 15s）。
5. **每步教研化**（这是质量的核心，逐字段写全）：
   - `q` 问题式标题；`act` 动手任务（orbit/slider/toggle/watch/custom/record/hold，必配 demo 自动演示）；
   - `expect` **含具体数字**的观察清单（时间线+读数+对照组，数字必须与 model 公式一致——用「标定法」：常数 = 期望读数 ÷ 公式在参考工况的输出）；
   - `concl` 教材原话+页码；`points` 恒 4 条且**末条固定「去掉这一步：学生会…」**（迷思概念防护）；
   - `exam` 考点；`eq/eqCal/tags`；`start/cam/chain`。
6. **quiz 5–8 题**：干扰项=真实迷思概念，`why` 逐项点破，答错可跳回对应站位。

### 阶段二：搭建（用 starter 模板）

1. **复制模板**：把 `assets/starter/` 整个目录复制为新课件工作目录。
2. **读一遍 `src/course/course.demo.js`**（单摆示例课）——它是四块写法的活样本：C 的完整字段、world 的组件工厂/调色板/canvas 纹理、model 的 evaluate/tick、console 的全部控件配置。
3. **写课程文件**：新建 `src/course/course.<slug>.js`，按 references 的规范实现 `C / world / model / consoleCfg` 四块导出；改 `main.js` 的 import。场景骨架选型看 references/subjects.md §0（知识链性质 → 场景骨架）。
4. **构建**：`npm install`（首次，需联网装 three+esbuild）→ `node build.js` → 产物 `dist/<slug>.html` 单文件，双击即开。开发期用 `node build.js --watch`。
5. 若构建环境不可用（无 node/网络）：按 references/architecture.md §0 的单文件布局手写拼接，three.js 用 CDN 版或从资料库课件中提取（见下）。

### 阶段三：验收（红线自查 + 运行时验证）

写完后逐条自查（全部通过才算完成）：

- [ ] 每步五件套齐全：q / act(+demo) / expect(含数字) / concl(教材原话) / points(末条「去掉这一步」) + exam 考点
- [ ] expect 的每个数字都用 `window.__lab.ctx.R.*` 实测核对过（启动后 `__lab.set(k,v)` 设到该工况读数确认）
- [ ] 契约校验通过：启动无「步骤条外壳契约错误」红框（框架会自动校验并中文报错）
- [ ] 每步运镜合适（cam.box 框住教学焦点）、控件 hi 高亮正确、知识链点亮正确
- [ ] quiz 干扰项是迷思概念；考核有 events 中途变故（或 accident 事故链）
- [ ] foot.note 写了数值来源声明（教材值/按公式示意/课件设定）与尺度假象声明
- [ ] `node build.js` 产物 <2MB，断网双击可运行；文案全中文、面板字号≥12px

运行时验证 API（构建产物内置）：`window.__lab` → `{ S, ctx, set(k,v), goto(i), step, score, live(), pump(n) 快进帧, quiz(), repair() }`。
**测试不截图，断言 live() 的数值**（坐标/颜色十六进制/计数/读数）。启动错误会以红框显示在页面顶部。

## 参考真实课件（资料库可用时）

资料库在 `D:\tongjiang-lab-main\courses\`（54 门单文件 HTML + `../catalog.json` 元数据）。
做同类新课前，**抽一门同类型课件研究其 C 与步骤写法**：

```bash
# 提取课程代码段（框架入口函数之后的全部课程定制代码）并格式化阅读：
python - <<'EOF'
import re
data = open(r'D:\tongjiang-lab-main\courses\<slug>.html', encoding='utf-8').read()
m = re.search(r'function (\w+)\(\{C:', data)          # 框架入口
j = data.rfind(';', 0, m.start()) + 1
end = data.rfind('</script>')
open(r'D:\temp-<slug>.js', 'w', encoding='utf-8').write(data[j:end])
EOF
npx --yes prettier --parser babel --print-width 110 D:\temp-<slug>.js > D:\temp-<slug>-pretty.js
```

重点看：C.steps 的 expect/points 写法、world 的组件工厂与调色板、model 公式、console 配置。
（注意：资料库原框架是压缩混淆的，**不要**试图把新课程拼进原文件；用自己的 starter 重建。原作品 CC BY-NC 4.0，仿写方法与自写代码没有问题，勿直接复制其代码。）

## 目录结构

```
skills/3d-courseware/
├── SKILL.md                 本文件
├── references/
│   ├── pedagogy.md          教学设计方法论（内容内核）
│   ├── architecture.md      四块架构契约与 schema
│   ├── subjects.md          学科差异化模式 + 特效手法速查
│   └── visual-spec.md       清透实验室视觉规范
└── assets/
    ├── step-shell.css       外壳样式原件（含署名头，已内嵌进模板 style.js）
    └── starter/             可运行模板（three + esbuild）
        ├── build.js         构建脚本：打包成单文件 HTML（含启动错误红框）
        ├── package.json
        └── src/
            ├── framework/   engine.js 步骤引擎 / hud.js 外壳 / world3d.js 3D 基建 / style.js 设计系统
            └── course/      course.demo.js 单摆示例课（活样本） / main.js 入口
```

## 模板能力清单（engine 已实现）

步骤推进（下一步自动演示/讲解揭示/重置本步/进度存档）、七种 act 门控、考核（hold 保持+events 中途注入+goal 条+加分）、检测 quiz（逐题解析/回看跳转/结算）、事故（倒计时→红闪→复盘→抢修）、中控台（主读数平滑/副读数/滑杆 ticks+band+ref/开关+多档/曲线图 curve+dash+dots+at+bandY+line/风险条/记录表）、名牌投影+站位聚焦环、公式横幅锚定、toast/倒计时/红闪、契约校验（中文报错）、lowfps 降级、`__lab` 调试 API。
**尚未实现**（资料库有、模板没有，需要时按 architecture.md 手写）：section 剖面讲义图、subSeq 副读数轮播、记录表拟合线、名牌防重叠算法、着色器预热。

