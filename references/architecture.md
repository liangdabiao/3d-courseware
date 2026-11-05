# 架构契约：单文件 HTML 四块式课件（C / world / model / console）

> 来源：铜匠实验室 54 门课件的共同架构（对 8 门代表性课件逆向分析确认）。
> 每门课 = 一个独立 HTML（~1MB，内嵌 three.js + 共享框架 + 课程定制代码），
> 双击即开、断网可用、投影/电子白板可用。课程代码固定分四块，最后一行入口调用：

```js
m0({ C, world, model, console, section? })
// C=内容文案+教学数据  world=3D世界  model=仿真模型  console=中控台配置
```

框架启动时**强校验契约**，违反直接抛中文错误（如「步骤条外壳契约错误：…」）。
以下是四块各自的职责、schema 与写作/编码规范。

---

## 0. 文件布局与产物形态

```
course.html   单文件：<!doctype html>…<canvas id="gl">
              <script type="module">  [three.js 内联(~600KB)]  [框架外壳+步骤引擎]
                                      [C 对象] [world] [model] [console]  m0({…}) </script>
```

- 无外部资源：无字体文件（系统字体栈）、无图片（纹理全用 canvas 现画）、无网络请求。
- 开发期可分文件（framework.js / course.js），构建时用 esbuild 打成 IIFE 内联回单 HTML
  （见 assets/starter/build.js）。
- `window.__lab = {C, S, STEPS, CONSOLE, scene, camera, renderer, controls, hud, world, units, ctx, score…}`
  在初始化后挂到全局，供测试/检查用。

---

## 1. C —— 内容对象（只数据，无 3D/逻辑）

完整教学设计规范见 `pedagogy.md`。架构视角的字段清单：

```js
C = {
  meta:  { slug, subject, type, locate, title, cover },
  top:   { title, total },                 // total：总式或一句总纲（顶栏常驻）
  mainline: { q, chain:[{k,t}], seps },
  ui:    { crumb, subAll, panel:{sub}, quiz:{allRight, retry} },
  layers: { key: "一句话说明" },           // 与 world.LAYERS 键一一对应
  world: { labels:{…}, tags:{…} },         // 悬浮标注文本 / 设备铭牌短词
  units: [ {no:"①", name, short, brief, color:1..5} ],   // ≤5 个，识别色 1–5
  panel: { … },   // 中控台全部文案：读数名+cal、滑杆 label/ticks、开关 on/off、现象词典 phenWords、goal
  steps: [ … ],   // 6–9 步，字段见 pedagogy.md §2
  toast: { … },   // 每个开关 on/off、每个考核事件各一条现场感文案
  quiz:  { list:[{tag, unit, q, opts[4], ans, why}] },
  help:  { head, keys:[[key,说明]…], goal },    // keys 末对常是 ["Esc","回到控制台"]
  foot:  { note, keys },                   // note：数字来源声明（教材常数/课件设定）
  // 可选：
  quiz/accident/section/plates/…
}
```

校验点：`steps[].cam.pitch` 必须落在 world.CAMERA.polar 区间；`units` 数量与 world 返回的
units 一一对应；`layers` 的键必须在 world.LAYERS 里；`color` ∈ 1–5。

## 2. model —— 仿真模型（纯函数 + 可恢复状态）

```js
model = {
  ref:  { … },          // 参考工况（reset/回参考的基准），全部是中控台控件 key
  init: () => ({ … }),  // 可选：内部记忆变量初值（如不可逆损伤 cap）
  evaluate: (S) => R,   // 纯函数：一次算出全部派生量（UI/世界/测试只读 R，从不算数）
  tick: (S, dt) => void,// 可选：状态演化（停车降温、中毒衰减、不可逆上限 cap 下降）
}
```

设计纪律（提炼自钠/氨两课的模型）：

1. **可控字段进 S**（每个 key 对应一个 slider/switch），**派生量全进 R**。
2. **R 是「大扁平对象」**：钠一次返回 27 个字段（ne、gloss、pH、risk、colorKey、fireKey、
   phenKey、microN、examOk…）。
3. **语义 key 总线**：model 输出离散 key（colorKey: bright/dulled/darkDull；fireKey:
   off/yellow/worse/out；phenKey: 八态现象），world 查色表换材质、C.panel 查词典出文案。
   三方以 key 对齐，互不渗透。
4. **公式要有教材锚点**：氨模型用人教选必1 表 2-2 的平衡数据网格打底（lnK 反演 + 1/T 插值
   + 二分解 Q=K），图表 dots 直接画教材数据。
5. **标定法**：`常数 = 期望读数 ÷ 公式在 REF 工况的输出`——先定参考工况读数，反推比例常数，
   保证 expect 断言值与公式永不错位（氨：26.8 t/h 反推 k_）。
6. **不可逆量单独建字段**：氨的 `act`（可逆活性）与 `cap`（活性上限）拆分——净化关掉会中毒，
   重开后只能回到 cap，"回不到 100%" 才能被模型真实表达。
7. **考试判定是复合的**：`examOk = 知识正确 && 数值达标`（钠：way===0 && risk<=0.10）。

## 3. world —— 3D 世界（构建 + 每帧更新）

```js
world = {
  LAYERS: { key: { inAll?: true } },          // 图层开关表（步骤 layers 引用这些键）
  CAMERA: { pitch, yaw?, polar?:[min,max], clampPolar?:true, air, ty, focusY:[a,b],
            homeBox:{min:[x,y,z],max:[x,y,z]}, fov?, dist? },   // 初始机位；极角默认自由环绕（可任意仰望/俯视），
                                                                // 仅当显式写 clampPolar:true 才按 polar 区间夹持
  TONE?:  { finish?:true, sun:[x,y,z], envIntensity },          // 质感套件
  build(ctx) => ({
    units: [ { box:Box3, group, label:Vector3, ring:{x,z,r,w,y}|false, labelVisible?(ctx) } ],
    labels: [ { id, text, tone:"sci|warn|ok", icon, layer, anchor():Vector3, visible(ctx) } ],
    pickables: […], onPick(hit)=>bool,
    dbg: { …旗标 },        // 视觉隔离开关（tintOff/fireOff/…），供测试逐项排除
    update(dt, ctx),       // ctx: {S, R, layers, introK, camera, step}
    live(S?) => {…},       // 遥测：模型读数 + 视觉事实（十六进制颜色、计数、缩放）
    state: {…},            // 视觉锁存快照（供 live/测试断言）
    // 可选：sim.step(dt,cmd) 厂况仿真器、boom()/repair() 事故生命周期、framed(ctx) 前景重建
  }),
}
```

### 3.1 组件工厂模式（最重要的复用单元）

```js
function 工厂({ 带默认值的参数 }, kit) {
  return {
    root: Group,                    // 唯一挂载入口
    update({ k, t, ...专用参数 }),  // k∈[0,1] 强度目标（内部自缓动）；t=累计秒驱动周期动画
    …把手,                          // 暴露后续要动的对象：liqMat / hornTip / waterY / set()…
    dispose(),                      // 遍历释放 geometry/material/map
  };
}
```

- **k 是目标值不是瞬时值**：内部 `cur += (k−cur)×系数`（0.13–0.2 常用），`cur>0.02` 才显示
  root → 淡入淡出免费获得。
- **首帧 snap**：闭包 `first=true` 时缓动系数给 99（≈瞬移），首帧后恢复正常系数——步骤切换不拖影。
- **t 驱动周期性**：火焰抖动 `sin(t*9.3)*.05 + sin(t*15.7)*.035` 双频叠加；气泡/颗粒用
  `(t*speed + ph) % 1` 相位循环，粒子各自错相。
- **把手模式**：把"之后会被 update 操纵的内部对象"暴露出去（烧杯暴露 liqMat 让外面直接
  `color.lerp(红)`；灭火器暴露 hornTip 世界坐标给颗粒流作发射点）。

### 3.2 场景组织与尺度

- 实验台型：**米制实物**。台面 y=0（世界原点），地面 y=−0.78；台面 1.2×0.6；
  站位等距 x=[−0.36,−0.12,0.12,0.36]；器物厘米级（烧杯 r0.029/h0.08）。
  每步 `cam.box` 是世界坐标包围盒，框架据其算特写机位。
- 工业型：**厂区百米级**，根节点 `scale.set(0.55,1,0.55)` 压扁深度让构图紧凑；
  anchor 表 `{x, label, focus, dist, box, r}` 代替 per-step cam；前景（道路/卡车）随镜头
  `framed(ctx)` 现场重建，永远有前景可看。
- **调色板命名法**：一张主调色板（按「材质+状态」或「工厂角色」命名，38–26 色）+ 一张
  model key→颜色映射表（H0）+ 每大类器物一张子板。**绝无散落硬编码色**。

### 3.3 透明物与阴影纪律

| 层 | renderOrder | depthWrite |
|---|---|---|
| 液体 | 1 | false |
| 液面圆片 / 聚焦环 | 2 | false |
| 玻璃壳 | 3 | false |
| 刻度 / 标签贴面 | 4 | false |
| 颗粒流 / 视窗罩 | 6 | false |
| 火焰光晕 / 外焰 / 内焰 | 7 / 8 / 9 | false（toneMapped:false） |
| 虚线引导线 | 9 | depthTest:false（永远可见） |

- 玻璃材质：`transparent + depthWrite:false` + onBeforeCompile 注入菲涅尔边缘加亮
  （face≈0.08–0.13 / edge≈0.3–0.55），配 customProgramCacheKey 防串味。
- 液体材质：正对视角处 alpha 衰减（rim），中心实边缘透，有体积感。
- 可调液位容器 = 薄壁壳 + 液位截断的旋转体 + 液面圆片，三件套。
- 阴影：一律 `receiveShadow=false`；InstancedMesh/透明材质 `castShadow=false`；
  其余按包围球半径×最大缩放 >0.02 才投影。

### 3.4 canvas 纹理（无图片资源的全部秘密）

文字板/标签卡/刻度/计数牌/瓶签/渐变背板全部现场 canvas 绘制 → CanvasTexture
（colorSpace=sRGB, anisotropy 4）→ 贴 Plane/Cylinder 侧面。带脏检查（文字变了才重绘）。

### 3.5 每帧更新套路（update(dt, ctx)）

```js
const on = k => !!(layers[k] || layers.all);
const oilOn = !!S.oil && !dbg.oilOff;                    // 状态 + 调试旁路
nt += ((oilOn?1:0) − nt) * Math.min(1, dt*3.2);          // 目标缓动
comp.update({ k: nt, t: now });                          // 下发给组件
world.state = { oilK: +nt.toFixed(3), … };               // 帧末快照锁存
```

## 4. console —— 中控台配置

```js
console = {
  ref: {…},                        // 同 model.ref
  main: { key, label, fmt, smooth, cal, pill?: {ok(S,R)} },
  subs:  [ { key, label, value|fmt, cal, bar?:[min,max], bad?(S,R) } ],
  sliders: [ { key, label, icon, min, max, step, unit?, ref, fmt?, ticks?:[{v,t}],
               band?:[a,b], fill?: "heat" } ],
  switches:[ { key, label, icon, on, off, toast:{on,off}, bad?(S,R), states?:[{v,t,lock?}] } ],
  chart: { title, legend, x:{min,max,ticks}, y:{…}, y2?, band?, line?,
           data(S,R) => ({ curve, dash?, dots?, at:[x,y] }) },
  risk?: { label, cal, value(S,R), warn },
  record?: { cols:[{key,label,unit?,fmt?}], row|rows(S,R), max?, hi?, group?, plot?:{x,y,fit} },
  exam:  { ok(S,R), hold:15, score:15,
           events:[{at:秒, set:{…}, toast}],
           solve:{…}, goal:{title, tip, short} },
  accident?: { check(S)=>"T"|"P"|null, trip:{T,P}, unit,
               countdown(kind,R)=>文案, estop(S)=>{…钳回安全值} },
}
```

要点：

- **所有 label/cal 文案来自 C.panel**（文案与配置分离）；cal 是数字血统注
  （「教材 p.34」/「标准状况」/「课件设定」）。
- `main.smooth`：读数平滑常数（实验台 0.35s 灵敏；工业 1.3s 制造惯性感）。
- slider 的 `ticks` 钉刻度语义；`band:[a,b]` 画教材达标区间；`ref` 画参考工况刻度线；
  枚举 slider（fmt 映射名字）可当「离散站位选择器」。
- switch 的 on/off 文案描述**状态**（「已泡在煤油里/已取出放在玻璃片上」）而非动作；
  `bad` 让错误状态持续警色。
- chart 三层同图是常用招：`curve 你的工况 + dash 对照/上限 + dots 教材数据点 + at 当前点`。
- exam：`ok = 知识正确 && 数值达标`；hold 15s；**events 中途注入干扰**（第 6s 有人换灭火器…）；
  solve 给标准解；goal.tip 写完整攻略。

## 5. 步骤引擎行为（框架职责，课件作者只需了解）

- 进入步骤：应用 `start` 状态（数值补间）→ 切 `layers` → 运镜到 `cam.box`（或 anchor 飞行）
  → 高亮 `hi` 控件（「本步」徽）→ 名牌/面包屑/知识链点亮。
- act 完成判定：orbit=拖动>0.25 圈；toggle=`S[key]===want`；slider=数值比较（op/to）；
  watch=停留 secs 秒；custom=`ok(ctx)`；record=记满 n 行；hold=`S.won`。
- 完成后：exbadge 变 ✓，开放「讲解」展开（concl/points/exam），下一步按钮亮起。
- 「讲解」按钮揭示 cardmore；「重置本步」回 `start` 状态。
- hold 考核：条件成立保持 hold 秒 → 胜利（score+15、confetti/win 文案）；期间 events 定时
  `set` 注入 + toast；失败/事故 → 倒计时（3s）→ 红闪 → 事故复盘（若配 accident）。

## 6. 启动校验清单（框架会对以下错误抛中文异常）

- steps[].cam.pitch 超出 CAMERA.polar 区间
- units 数量与 world.build().units 不一致；units[].color ∉ 1–5
- layers 引用了 world.LAYERS 不存在的键
- start 的 key 不是中控台控件
- 有 hold 步但没写 console.exam；record 步没配 CONSOLE.record（或 row/rows 二选一违反）
- CONSOLE.record.cols 的 key 重复；record.plot.x/y 不在 cols 里
- chart.bandY 形状错（要 [lo,hi] 或 {range,tone,label}）
- CAMERA.homeBox 形状错；CAMERA.orbitYaw 只允许 'free'
- labelOccluder 形状错（要 {center, r}）
- main.label 要是文字或函数；TONE.sun 要 [x,y,z] 且 y>0
