# 视觉规范 · 清透实验室（Clear Lab）v0.2

> 来源：铜匠实验室 54 门课件的共享外壳样式（`assets/step-shell.css` 是完整原件，可直接复用）。
> 原作品按 CC BY-NC 4.0 授权，复用时保留署名「铜匠实验室（https://lab.tongjiang.app）」，不得商用。
> 本文档提炼其设计语言，便于在新课件中保持同一质感。

## 1. 设计理念

「清透实验室」：像一块干净的玻璃实验台。UI 是浮在 3D 世界之上的**玻璃面板**，
3D 场景本身走「白/浅蓝底 + 玻璃器皿 + 拉丝金属 + 柔和影棚光」的产品摄影质感。
关键取舍：

- **色值只出现在 `:root`**，组件规则一律用变量（自检规则「视觉①」）——保证全局一致性。
- 面板字号下限 **12px**，任何空间不够都靠「收内容」解决（截断、折叠、换档），**不缩字号**。
- 玻璃面板在低端机上有降级路径（见 §8）。

## 2. 设计变量（唯一色值出口）

```css
/* 字体 */
--font: "PingFang SC","Microsoft YaHei","Noto Sans CJK SC","Source Han Sans SC","Hiragino Sans GB",system-ui,sans-serif;
--num : "SF Pro Display","DIN Alternate","Helvetica Neue",…            /* 数字专用，tabular-nums */

/* 玻璃底 */
--glass: rgba(255,255,255,.84);      --glass-bar: rgba(255,255,255,.72);
--glass-back: rgba(255,255,255,.95); --glass-solid: rgba(255,255,255,.92);  /* lowfps 降级底 */
--glass-blur: blur(12px) saturate(150%);
--glass-edge: 1px solid rgba(255,255,255,.75);
--glass-glow: inset 0 1px 0 rgba(255,255,255,.9);
--shadow-1: 0 2px 8px rgba(30,50,110,.08);  --shadow-2: 0 10px 32px rgba(30,50,110,.14);
--tint: #F3F7FF;                     /* 面块底 */
--line: rgba(14,26,43,.08);  --line-2: rgba(14,26,43,.25);  --line-soft: rgba(14,26,43,.06);

/* 文字 */
--ink:#0E1A2B; --ink2:#43526A; --ink3:#56627A;

/* 主色 / 状态色（只做面、条、点、图标） */
--sci:#2F6BFF; --cyan:#13B8C6; --violet:#7C5CFF;
--grad: linear-gradient(100deg,#2F6BFF 0%,#13B8C6 100%);   /* 品牌渐变：主按钮、进行中轨道 */
--ok:#10B981; --warn:#F59E0B; --bad:#EF4444;
--heat: linear-gradient(90deg,#F59E0B,#EF4444);            /* 温度类滑杆专用 */

/* 文字用深色变体（玻璃底上对比度 ≥ 4.7） */
--sci-d:#1E4FD8; --cyan-d:#086A73; --ok-d:#036646; --warn-d:#9A4507; --bad-d:#B91C1C;

/* 五个站位/工段的识别色（1–5），-s 为白字实底加深版 */
--u1:#3730A3(靛) --u2:#0EA5E9(天蓝) --u3:#9333EA(紫) --u4:#D97706(橙) --u5:#057A55(绿)
/* 运行时在元素上写 --uc/--ucs/--ucg/--uh（当前识别色），组件只读变量 —— 站位数不限 */

/* 圆角 */
--r-panel:16px; --r-card:12px; --r-ctrl:10px; --r-pill:999px;

/* 尺寸 */
--top-h:78px; --steps-h:46px; --foot-h:52px;
--panelw-l: clamp(320px,22vw,404px);  --panelw-r: clamp(300px,20.5vw,348px);
--fs-main:34px; --fs-sub:20px; --fs-t:13px; --fs-b:13px; --fs-xs:12px;
```

## 3. 页面骨架（z-index 层级）

```
#gl        canvas 全屏 (fixed inset:0)                        z:0
#labels    3D 名牌覆盖层（pointer-events:none）                z:10   .lab 胶囊名牌
#anno      标注引导线层                                        z:11   .anno 圆点标注
#secview   讲义图面板（可选功能）                               z:13
#foot      底栏：上一步 | 3 / 9 · 下一步                       z:14
#left      左栏「本步」教学内容                                z:15   width: --panelw-l
#right     右栏「中控台」控件                                  z:15   width: --panelw-r
.tab       左右折叠后的竖排展开把手                             z:16
#steps     步骤条（顶栏下方一条轨道 + N 个节点）                z:18
#top       顶栏：课名+总式 | 主线问题 | 状态灯+记分+按钮        z:20   row1 + chain5 两行
#toast     右上提示气泡                                        z:30
#flash     全屏红闪（考核失败/事故）                           z:34
#countdown 考核倒计时大数字                                    z:35
```

- 顶栏两行：第一行 `home ‹ 课名 [总式] | [主线] 问题 … 状态灯 · 得分 · 按钮`，第二行 `#top .chain5` 因果链胶囊。
- 左右栏可折叠（`.collapsed` 位移留 26px 把手，`.tab` 竖排文字恢复）。
- 步骤条：`#steps .chip`（节点圆 22px，当前步 28px + 光环 `0 0 0 6px var(--sci-8)`；已完成实底识别色 + 右下角小 ✓）。

## 4. 左栏「本步」结构

```
cardhead  30px 序号方块(识别色实底) + 步骤问题(17px/600) + 副说明(12px)
tagrow    标签胶囊组（.tg 前置识别色圆点）
block act [动手] 操作指令文本 + exbadge 待办/完成徽标
          └ etxt [观察] 预期现象（虚线分隔，眼睛图标）
cardmore  （点「讲解」展开）
          conclbox 结论卡（左缘 3px 渐变竖条）+ ref 课标出处
          pts   讲解要点列表（识别色圆点；.cut 红点=易错点「去掉这一步…」）
          whybox 考点卡（warn-10 底 + 左缘橙条，灯泡图标「考试怎么考」）
acts      [讲解] [重置本步] 按钮
crumb     站位面包屑（圆点胶囊，可点击跳转聚焦）
```

## 5. 右栏「中控台」结构（自上而下）

```
kpi    主读数：标签 / 34px 大数字 / 状态 pill(达标·未达标) / cal 依据注释
subs   副读数 ×3：tint 底块 + 左缘识别色小条 + 20px 数字 + 迷你进度条
sl     滑杆卡：标签+图标 ←→ 数值+单位；轨道 6px 渐变填充 + 18px 白底描边圆钮；
       .hi 高亮态 = 本步要动的控件（渐变描边 + 顶部「本步」小徽）
sw     开关行：名称+状态文字 + 34×19 胶囊开关（开=渐变底）；.seg 分档按钮组（照片/档位选择）
chart  曲线图 116px 高：canvas 绘制，图例在标题行
rec    数据记录表（可选手动「记录一组」）：数字右对齐 tabular-nums，当前行高亮
risk   风险条：ok→warn→bad 渐变底 + 位置游标（.hot 红色）
goal   考核目标条（考核模式）：目标句 + 简写条件 + 进度
acts   [考核开始] 等
```

## 6. 关键组件样式要点

- **按钮** `.btn`：玻璃底 + 1px line 描边 + 10px 圆角；`.pri` 渐变实底白字带 `0 2px 10px var(--sci-30)` 投影；`.done` 绿、`.warn` 橙、`.danger` 红。
- **名牌** `.lab`：玻璃胶囊（translate(-50%,-100%) 锚在 3D 点上方），左 8px 识别色圆点；`.sel` 选中=识别色实底白字 + 6px 光晕；`.bad` 红底（事故）。
- **公式横幅** `#eqb`：跟随 3D 锚点的玻璃卡，顶部 3px 识别色渐变条；`bk 小标 + beq 16px 式子 + bcal 条件 + btags 关键数字胶囊`；空间不够切 `.tight`（隐去 tags）。
- **Toast**：右上胶囊，左侧 7px 蓝点，`translateY(-8px)→0` 浮入。
- **倒计时**：`--bad` 红描边玻璃卡，96px 大数字。
- **状态灯** `.stat`：呼吸动画 `breathe`（绿点 2s）；warn/stop/bad 各态无动画。
- **图标**：内联 SVG `stroke:currentColor; fill:none; stroke-width:1.7`，16px（搜索/书本/展开/勾/手/眼/灯泡/房子…）。

## 7. 响应式分档（外壳统一处理，课件不各改各的）

| 档位 | 触发 | 主要变化 |
|---|---|---|
| 宽屏基准 | >1500px | 面板全宽 |
| 中档 | ≤1500px | 主线问题 13px、链胶囊限宽 150px、按钮图标隐藏（k-icon 保留）；subs 内边距 5→3px |
| 矮屏 | ≤830px 高 | 顶栏 72/步骤 40/底栏 46，主读数 30px，「本步」徽改行内 |
| 紧凑档 | ≤780px 高 | 记录表只留最近 2 行、风险条压成一行小字、图表 106px、全局限距 |
| 布局模式 | 容器 <860px | body[data-layout=narrow]：面板变浮层（框架切换布局模式） |

## 8. 性能与无障碍降级（外壳已内置）

- **lowfps**：运行时连续 ~2s 低于 30fps → `body.lowfps`：关闭全部 backdrop-filter，大面板换 `--glass-solid` 纯底（按钮/名牌保留各自底色）。
- `prefers-reduced-motion: reduce` → 全部 transition/animation 关闭。
- `prefers-reduced-transparency: reduce` → 玻璃面板换 `--glass-back` 实底。
- 不支持 backdrop-filter 的浏览器（@supports not）→ 同上实底。

## 9. 3D 场景质感基准（与 UI 同一气质）

- **布光**：影棚三点光（studio preset），柔光箱式主光在台面上方（y>0），环境光提亮暗部；可选 `TONE.finish` 质感套件（柔光箱、材质档位、液体透射）。
- **背景/地面**：浅色（#eceef0 地面），无强烈反射；背景与 UI 的 `--tint` 同族。
- **材质**：玻璃 = 白透 + 低不透明度面 + 边缘高亮（face≈0.13/edge≈0.55，`depthWrite:false` + renderOrder 分层）；液体 = 半透明 + 表面圆盘 + 边缘暗化；金属 = 高 metalness + envMap；陶瓷/搪瓷 = 低粗糙白。
- **尺度**：实验台级场景以米为单位（台面 1.2×0.6m、烧杯 r≈0.029 h≈0.08、钠块 0.012–0.03）。
- **阴影**：只让大于 2cm 的不透明铸件投影；透明件/InstancedMesh 不投影。
- **颜色命名法**：调色板按「材质+状态」命名（如 naBright/naDull/naDark/naPerox），组件只引用调色板，不写散色值。
- **名牌/标签在 3D 里的载体**：canvas 画文字 → CanvasTexture → 贴平面（`colorSpace=srgb`）。

## 10. 封面图规范（catalog 配图）

- AI 生成的产品摄影风渲染图：16:9（820×464），白/浅蓝影棚底，器材居中或 45° 摆放，
  玻璃/金属质感与课件场景一致，画面里出现本课核心现象（如粉色酚酞溶液+钠珠）。
