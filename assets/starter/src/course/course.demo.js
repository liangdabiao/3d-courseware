/**
 * course.demo.js · 示例课程「单摆：为什么摆能数时间」
 *
 * 这是一个**完整的最小范例**，演示 C / world / model / console 四块怎么写。
 * 做新课时的做法：复制本文件改名，按 references/pedagogy.md 重写内容、
 * 按 references/subjects.md 选择场景骨架，保留本文件的代码骨架。
 */
import * as THREE from "three";
import { initGL, makeKit, textPlate, lathe, col } from "../framework/world3d.js";

const G = 9.8;

/* ============================================================
 * C · 内容对象（只数据，无 3D/逻辑 —— 课程的「电影剧本」）
 * 字段规范见 references/pedagogy.md
 * ============================================================ */

export const C = {
  meta: {
    slug: "pendulum-demo",
    subject: "高中物理",
    type: "原理与实验",
    locate: "人教版（2019）选择性必修第一册 · 第二章 机械振动 · 第4节 单摆",
    title: "单摆：为什么摆能数时间（示例课）",
  },
  top: { title: "单摆：为什么摆能数时间（示例课）", total: "T = 2π√(L/g) · 小角度时周期只看摆长" },
  mainline: {
    q: "老式挂钟里那根来回摆的杆，凭什么能一秒不差地「数」时间？",
    chain: [
      { k: "等时", t: "小角度下，摆一次来回到家的时间总是相同的——这是伽利略发现的等时性" },
      { k: "看长", t: "周期只随摆长变：摆越长，走得越慢（与摆球质量无关）" },
      { k: "平方", t: "T² ∝ L：周期不是跟着摆长走，是跟着摆长的平方根走" },
      { k: "定量", t: "T = 2π√(L/g)，g 也能反过来用摆测出来" },
      { k: "应用", t: "1 秒一摆的「秒摆」L ≈ 0.99 m——挂钟的摆杆就是这么定的" },
    ],
    seps: ["→", "→", "→", "→"],
  },
  ui: {
    crumb: "两块台子",
    subAll: "整体 · 一台单摆 + 一块测量台",
    panel: { sub: "动一个控件，摆动、读数与曲线一起变" },
    quiz: {
      allRight: "全对！单摆的全部秘密就是「小角度 + 只看摆长」这一条根。",
      retry: "建议回看主线：先看「等时」，再看「周期只随摆长变」，最后看 T = 2π√(L/g)。",
    },
  },
  layers: {
    protractor: "① 量角器：摆线偏离竖直方向的角度 θ（小角度近似 5° 以内）",
    stopwatch: "② 秒表台：光电门测一次全振动的时间 T",
  },
  world: {
    labels: {
      smallAngle: "θ ≤ 10°：sin θ ≈ θ，摆才是「简谐运动」，等时性才成立",
      bigAngle: "θ 太大：回复力不再正比于位移，周期开始变长，等时性破坏",
      stopwatch: "光电门：摆球经过时计一次挡光，两次挡光 = 一个周期 T",
      ruler: "刻度尺：量的是摆线悬点到摆球中心的长度 L",
    },
    tags: { pendulum: "单摆", stopwatch: "秒表台", ruler: "L" },
  },
  units: [
    { no: "①", name: "单摆装置", short: "装置", brief: "铁架台 + 摆线 + 摆球 + 量角器 + 刻度尺", color: 2 },
    { no: "②", name: "测量台", short: "测量", brief: "光电门秒表 + 数据卡", color: 4 },
  ],
  panel: {
    readT: "周期 T（一次全振动）",
    calT: "T = 2π√(L/g) · g 取 9.8 m/s²",
    readL: "摆长 L",
    calL: "悬点到球心 · 刻度尺量出",
    readTheta: "最大摆角 θ₀",
    calTheta: "课件设定（演示用）",
    readN: "50 s 内全振动次数",
    calN: "按当前周期折算",
    readMass: "摆球质量",
    calMass: "对照组：周期与它无关",
    l: "摆长 L",
    unitM: "m",
    tickL1: "1 m",
    tickL0994: "0.994 秒摆",
    theta: "最大摆角 θ₀",
    unitDeg: "°",
    tickTheta5: "5°",
    tickTheta10: "10°（分界）",
    tickTheta30: "30°",
    m: "摆球质量",
    unitKg: "kg",
    slow: "慢放",
    slowOn: "放慢 4 倍（看清楚相位）",
    slowOff: "真实速度",
    protractor: "显示量角器",
    protractorOn: "量角器已挂上",
    protractorOff: "已收起",
    curve: "T² – L：一条过原点的直线",
    legend: "实线 理论 T²=（4π²/g)L · 点 当前摆长",
    riskLabel: "大角度失真",
    riskCal: "课件设定：θ₀ 越大，等时性被破坏得越多",
    goal: "调出「秒摆」",
    goalTip: "两件事：① 把摆长 L 拨到 0.99 m 附近；② 把 θ₀ 压回 10° 以内。周期读数要落在 2.00 ± 0.02 s 并保持 15 s。中途 L 会被拨乱——拨回来就行。",
    goalShort: "T = 2.00 ± 0.02 s · θ₀ ≤ 10°",
  },
  steps: [
    {
      tag: "认识装置",
      q: "一根线拴个小球挂在架子上，它凭什么跟「时间」扯上关系？",
      unit: -1,
      layers: ["all"],
      hi: null,
      act: { kind: "orbit", text: "拖动视角，绕着这两块台子看一圈（滚轮拉近拉远）" },
      expect: { text: "① 铁架台上挂着一只摆球（默认 L = 1.00 m、θ₀ = 8°，正在来回摆）；② 测量台上是光电门秒表，读数显示当前的周期；主读数 T ≈ 2.0 s" },
      concl: "单摆来回一次的时间非常稳定，小小地推它一下，它就用「固定的节拍」回应你——这个节拍叫周期 T。这一步先建立直觉：摆本身就是一个「钟」。",
      ref: "A5 #1",
      points: [
        "摆球质量 50 g（默认），摆线约 1 m，从悬点到球心算 L。",
        "主读数 T ≈ 2.01 s：先记住这个数，后面每一步都在解释它从哪来。",
        "别用手挡光电门（演示件），它每被挡一次计一次时刻。",
        "去掉这一步：学生把单摆当成一段乱晃的线，不知道「节拍稳定」才是要解释的现象。",
      ],
      exam: "常考：单摆的构成（不可伸长线 + 小球）与「一次全振动」的定义。",
      eq: "T = t/n（t 秒内摆 n 次全振动）",
      eqCal: "实验测周期的定义式",
      tags: ["L = 1.00 m", "θ₀ = 8°", "T ≈ 2.01 s"],
      start: { l: 1.0, theta: 8, m: 0.05, slow: false, protractor: true },
      chain: 0,
    },
    {
      tag: "小角度等时",
      q: "把摆拉高一点再放手，摆得远了，一次来回的时间会变吗？",
      unit: 0,
      layers: ["all", "protractor"],
      hi: "theta",
      act: { kind: "slider", key: "theta", op: "<=", to: 10, demo: 5, text: "把「最大摆角 θ₀」从 8° 拖到 10° 以内，再拖回 5°，盯着周期读数" },
      expect: { text: "θ₀ 在 5°～10° 之间来回拨：周期读数几乎不动（2.01 s）；把 θ₀ 拖到 25° 以上：读数慢慢爬到 2.03 s 以上，量角器上的摆线明显偏得更远" },
      concl: "在摆角很小的情况下，单摆做简谐运动（教材原话）。小角度时周期与振幅无关——这就是等时性；角度大了，等时性被破坏，周期开始变长。",
      ref: "选择性必修一 p.51 「小角度」脚注",
      points: [
        "「小角度」的门槛通常取 θ₀ ≤ 10°（有的书写 5°），课件把分界画在量角器刻度上。",
        "读数 2.01 → 2.03 s：变化不到 1%，但方向是确定的——变大。",
        "机械钟把摆角限得很小，就是在买「等时性」这份保险。",
        "去掉这一步：学生以为周期跟「摆多远」有关，做题时看到振幅变大就改周期。",
      ],
      exam: "高频：单摆做简谐运动的条件（最大摆角很小 / 线不可伸长 / 空气阻力可忽略）。",
      eq: "θ ≤ 10°：sin θ ≈ θ",
      eqCal: "小角度近似 · 简谐运动的条件",
      tags: ["θ₀ ≤ 10°", "ΔT < 1%"],
      start: { theta: 8 },
      cam: { box: { min: [-0.5, 0, -0.3], max: [0.2, 1.3, 0.3] }, pitch: 18 },
      chain: 0,
    },
    {
      tag: "只看摆长",
      q: "换个重一点的摆球、换个长一点的摆线，谁的周期会变？",
      unit: 0,
      layers: ["all"],
      hi: "m",
      act: { kind: "slider", key: "m", op: ">=", to: 0.2, demo: 0.3, text: "把「摆球质量」从 0.05 kg 拖到 0.2 kg，盯住周期；再把「摆长 L」拉长，看周期怎么变" },
      expect: { text: "质量 0.05 → 0.20 kg：周期读数纹丝不动（2.01 s）；摆长 1.00 → 1.50 m：周期从 2.01 s 爬到 2.46 s，摆明显变「懒」了" },
      concl: "单摆的周期与摆球质量无关，只随摆长变化：摆越长，周期越长（教材原话）。伽利略在比萨教堂里发现的正是「跟摆幅无关」，惠更斯补上了「只看摆长」。",
      ref: "选择性必修一 p.51",
      points: [
        "质量是「对照组」：0.05 → 0.20 kg 读数一位都不动。",
        "摆长 1.00 → 1.50 m：周期 +0.45 s——注意不是 +50%，因为 T 跟 √L 走。",
        "g 被摆长和周期「藏」在公式里：下一页的直线图会把它请出来。",
        "去掉这一步：学生把「重的摆得快」当常识带进考场（其实单摆恰好相反地无关）。",
      ],
      exam: "必考陷阱：周期与摆球质量、振幅均无关；只随摆长与 g 变。",
      eq: "T = 2π√(L/g)",
      eqCal: "单摆周期公式 · 小角度",
      tags: ["m 无关", "1.00 → 1.50 m", "2.01 → 2.46 s"],
      start: { l: 1.0, theta: 8, m: 0.05 },
      cam: { box: { min: [-0.5, 0, -0.3], max: [0.2, 1.3, 0.3] }, pitch: 18 },
      chain: 1,
    },
    {
      tag: "平方关系",
      q: "周期不是跟着 L 走，是跟着什么走？看图说话。",
      unit: 1,
      layers: ["all", "stopwatch"],
      hi: "l",
      act: { kind: "slider", key: "l", op: ">=", to: 0.5, demo: 1.5, text: "把摆长从 0.25 m 拖到 1.5 m，看 T²–L 图上的「当前点」怎么走" },
      expect: { text: "当前点始终落在那条过原点的直线上：L = 0.25 m 时 T ≈ 1.00 s（T² = 1.00）；L = 1.00 m 时 T² ≈ 4.04；L = 1.50 m 时 T² ≈ 6.06——横坐标翻倍，纵坐标也翻倍" },
      concl: "T² = (4π²/g)·L：把周期公式两边平方，T² 与 L 成正比，图象是过原点的直线。这条直线的斜率里藏着 g——历史上第一次在课堂上「称」出地球，用的就是这只摆。",
      ref: "选择性必修一 p.51 例题 + 实验：用单摆测定重力加速度",
      points: [
        "看图不要只看 T–L（曲线），看 T²–L（直线）——直线才好读斜率。",
        "斜率 k = 4π²/g：量出 k 就量出了 g ≈ 9.8 m/s²。",
        "「秒摆」（T = 2 s）对应的 L ≈ 0.99 m，图上一目了然。",
        "去掉这一步：学生只会背公式，不会用「图象法」处理实验数据，选择题里 T–L 曲线图直接失分。",
      ],
      exam: "高频：T²–L 图象的斜率 = 4π²/g，借图象测 g 的实验题。",
      eq: "T² = (4π²/g)·L",
      eqCal: "平方后：正比关系 · 直线斜率 4π²/g",
      tags: ["T² ∝ L", "斜率 = 4π²/g", "g ≈ 9.8"],
      start: { l: 1.0 },
      cam: { box: { min: [0.15, 0, -0.25], max: [0.75, 1.1, 0.25] }, pitch: 20 },
      chain: 2,
    },
    {
      tag: "考核 · 当钟表匠",
      q: "客户要一座「一秒一摆」的挂钟：把这只摆调成 T = 2.00 s 的秒摆，并守住它。",
      unit: -1,
      layers: ["all"],
      hi: "l",
      act: { kind: "hold", text: "两件事：把摆长拨到 0.99 m 附近；把 θ₀ 压回 10° 以内。周期读数落在 2.00 ± 0.02 s 并保持 15 s——中途 L 会被人拨乱，拨回来就行" },
      expect: { text: "周期读数进入 1.98～2.02 s 绿色区间并稳定；θ₀ ≤ 10°；第 6 秒 L 会被拨到别处，读数跳出绿区——重新调回来，保持计时重新累积" },
      concl: "考核没有新知识：秒摆就是「T = 2 s + 小角度」。把前面四步的结论同时照顾到，你就造出了一台钟——挂钟的摆杆长约 0.99 m，钟慢了调螺母升降摆长，用的还是同一个公式。",
      ref: "选择性必修一 p.52 练习与应用",
      points: [
        "先定角再定长：θ₀ 大了即使 L 对，读数也会飘出绿区。",
        "0.99 m 不是凑出来的：T = 2 s → L = gT²/(4π²) = 0.994 m。",
        "钟表匠的日常就是这道题：钟快了加长摆，钟慢了缩短摆。",
        "去掉这一步：公式停留在纸面，学生没机会体会「参数要同时落进约束」这件事。",
      ],
      exam: "综合：周期公式的正逆用（定 L 求 T / 定 T 求 L）+ 小角度条件。",
      eq: "L = gT²/(4π²) = 0.994 m",
      eqCal: "T = 2 s · g = 9.8 m/s²",
      tags: ["T = 2.00 ± 0.02 s", "θ₀ ≤ 10°", "L ≈ 0.99 m"],
      start: { l: 1.0, theta: 12 },
      chain: "all",
    },
  ],
  toast: {
    slowOn: "已放慢 4 倍：现在看的是「慢动作」，周期读数不变",
    slowOff: "已恢复真实速度",
    protractorOn: "量角器已挂上：读摆线偏离竖直方向的角度",
    protractorOff: "量角器已收起",
    examA: "有人把摆线拨长了——周期跳出绿区，调回来，保持计时重新累积！",
  },
  quiz: {
    list: [
      {
        tag: "① 装置",
        unit: 0,
        q: "单摆可视为简谐运动，必须满足的条件是",
        opts: ["摆角很小（θ ≤ 10° 左右），且摆线不可伸长", "摆球必须是金属做的", "摆线越长越好", "必须在真空中进行"],
        ans: 0,
        why: "「小角度」保证回复力与位移成正比（sin θ ≈ θ），这是简谐运动的条件；金属/真空与简谐无关，摆线过长只影响周期大小。",
      },
      {
        tag: "① 装置",
        unit: 0,
        q: "把单摆从地面移到运行中的天宫空间站里，它还能正常摆动计时吗",
        opts: ["能，周期不变", "能，但周期变大", "不能——完全失重时回复力消失，摆球漂着", "不能，周期变小"],
        ans: 2,
        why: "单摆的回复力来自重力的切向分量；完全失重时 g_eff = 0，T = 2π√(L/g) → ∞，摆不再来回——空间站里用的是发条或电子钟。",
      },
      {
        tag: "② 测量",
        unit: 1,
        q: "利用 T²–L 图象测 g，图线斜率为 k，则 g 等于",
        opts: ["k", "4π²k", "4π²/k", "√k"],
        ans: 2,
        why: "由 T² = (4π²/g)L 得斜率 k = 4π²/g，所以 g = 4π²/k。选 k 或 4π²k 的同学是把斜率公式背反了。",
      },
      {
        tag: "综合",
        unit: 0,
        q: "一摆钟在山下（g 较大）走时准确，搬到高山上后它会",
        opts: ["变快，应缩短摆长", "变慢，应缩短摆长", "变快，应加长摆长", "变慢，应加长摆长"],
        ans: 1,
        why: "山上 g 变小，由 T = 2π√(L/g) 周期变大——每摆一次用时更久，钟走慢了；要调回原周期必须缩短摆长。",
      },
    ],
  },
  help: {
    head: "怎么玩",
    items: [
      ["拖动", "环绕视角（滚轮缩放）"],
      ["滑杆", "改摆长 / 摆角 / 质量"],
      ["下一步", "没动手会自动演示一遍"],
      ["Esc", "回到控制台"],
    ],
    goal: "本课目标：调出一座 T = 2.00 s 的秒摆并守住 15 秒；顺便在 T²–L 图上把 g 读出来。",
  },
  foot: {
    note: "周期按 T = 2π√(L/g) 计算，g = 9.8 m/s²；θ₀–周期失真关系为课件示意（教材未给数值）；摆动动画为真实速度（可选 4 倍慢放）。",
    keys: [["N", "名牌"], ["Q", "检测"], ["F", "全屏"], ["Esc", "回到控制台"]],
  },
};

/* ============================================================
 * model · 仿真模型（evaluate 纯函数 + 状态演化）
 * ============================================================ */

export const model = {
  ref: { l: 1.0, theta: 8, m: 0.05, slow: false, protractor: true },

  evaluate(S) {
    const L = Math.max(0.1, S.l);
    const T = 2 * Math.PI * Math.sqrt(L / G);
    const T2 = T * T;
    const thetaOk = S.theta <= 10;
    /* 大角度失真（课件示意）：小角度归一，θ₀=30° 约失真 3.5% */
    const distort = S.theta <= 10 ? 1 : 1 + 0.0022 * (S.theta - 10);
    const Treal = T * distort;
    return {
      T: Treal,
      T2: Treal * Treal,
      Tideal: T,
      L,
      thetaOk,
      n50: 50 / Treal,
      risk: clamp01((S.theta - 10) / 20),
      secL: (G * 4) / (4 * Math.PI * Math.PI), // 秒摆摆长 0.994
      inBand: Math.abs(Treal - 2.0) <= 0.02 && thetaOk,
    };
  },

  /* 摆动相位：tick 维护周期性动画的「钟」，与教学模型分离 */
  tick(dt, S, ctx) {
    const R = ctx.R || this.evaluate(S);
    const speed = (S.slow ? 0.25 : 1) * (2 * Math.PI) / R.T;
    S._phase = (S._phase ?? 0) + dt * speed;
  },
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/* ============================================================
 * world · 3D 世界（TONE/CAMERA/LAYERS + build）
 * ============================================================ */

const PAL = {
  floor: "#eceef0", bench: "#e7e3da", benchTop: "#d9d2c4",
  iron: "#8d949b", steel: "#c2cad1", dark: "#3c4248",
  bob: "#c0392b", bobAlt: "#3f73ff", line: "#5b6676",
  paper: "#fbfaf6", ink: "#1d2633", inkSoft: "#5b6676",
  glass: "#dfe9ef", green: "#10B981",
};

export const world = {
  TONE: { preset: "studio", size: 1.6, floor: "disc" },
  CAMERA: {
    pitch: 20, yaw: -0.2, air: 1.05, ty: 0.15,   // 极角自由环绕；如需锁仰角才写 clampPolar:true + polar:[下,上]
    homeBox: { min: [-0.55, -0.03, -0.35], max: [0.75, 1.35, 0.35] },
  },
  LAYERS: {
    protractor: { inAll: false },
    stopwatch: { inAll: false },
  },

  build(ctx) {
    const { scene } = ctx;
    const kit = makeKit(ctx.renderer);
    const root = new THREE.Group();
    scene.add(root);

    /* 实验台 */
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.05, 0.6),
      kit.mat(PAL.benchTop, { roughness: 0.7 }),
    );
    bench.position.y = -0.025;
    bench.receiveShadow = true;
    root.add(bench);
    const benchBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.36, 0.72, 0.56),
      kit.mat(PAL.bench, { roughness: 0.8 }),
    );
    benchBody.position.y = -0.41;
    benchBody.castShadow = true;
    root.add(benchBody);

    /* ① 单摆装置：铁架台 + 摆线 + 摆球 */
    const unitP = new THREE.Group();
    root.add(unitP);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.26), kit.mat(PAL.iron, { metalness: 0.6, roughness: 0.5 }));
    base.position.set(-0.18, 0.01, 0);
    base.castShadow = true;
    unitP.add(base);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 1.25, 12), kit.mat(PAL.iron, { metalness: 0.6, roughness: 0.45 }));
    rod.position.set(-0.18, 0.64, -0.09);
    rod.castShadow = true;
    unitP.add(rod);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.24, 10), kit.mat(PAL.iron, { metalness: 0.6, roughness: 0.45 }));
    arm.rotation.z = Math.PI / 2;
    arm.position.set(-0.06, 1.24, -0.09);
    unitP.add(arm);

    /* 摆：pivot 在悬点，子件向下挂 */
    const pivot = new THREE.Group();
    pivot.position.set(0.06, 1.22, -0.09);
    unitP.add(pivot);
    const lineLen = () => ctx.R?.L ?? 1.0;
    const lineMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0016, 0.0016, 1, 6),
      kit.mat(PAL.line, { roughness: 0.8 }),
    );
    lineMesh.geometry.translate(0, -0.5, 0); // 从悬点向下
    pivot.add(lineMesh);
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 24, 18), kit.mat(PAL.bob, { metalness: 0.35, roughness: 0.35 }));
    bob.castShadow = true;
    pivot.add(bob);

    /* 量角器（canvas 刻度盘，挂在悬点） */
    const pro = textPlate({ w: 256, h: 256, bg: null, px: 0 });
    {
      const cv = document.createElement("canvas");
      cv.width = 256; cv.height = 256;
      const g = cv.getContext("2d");
      g.strokeStyle = "rgba(29,38,51,.75)";
      g.lineWidth = 3;
      for (let a = -60; a <= 60; a += 5) {
        const r1 = 108, r2 = a % 15 === 0 ? 88 : 98;
        const rad = ((a - 90) * Math.PI) / 180;
        g.beginPath();
        g.moveTo(128 + r1 * Math.cos(rad), 118 + r1 * Math.sin(rad));
        g.lineTo(128 + r2 * Math.cos(rad), 118 + r2 * Math.sin(rad));
        g.stroke();
      }
      g.fillStyle = "#c8324a";
      g.font = "600 22px sans-serif";
      g.textAlign = "center";
      g.fillText("0°", 128, 40);
      pro.redraw = (theta) => {
        g.clearRect(0, 0, 256, 256);
        g.strokeStyle = "rgba(29,38,51,.75)";
        g.lineWidth = 3;
        for (let a = -60; a <= 60; a += 5) {
          const r1 = 108, r2 = a % 15 === 0 ? 88 : 98;
          const rad = ((a - 90) * Math.PI) / 180;
          g.beginPath();
          g.moveTo(128 + r1 * Math.cos(rad), 118 + r1 * Math.sin(rad));
          g.lineTo(128 + r2 * Math.cos(rad), 118 + r2 * Math.sin(rad));
          g.stroke();
        }
        g.fillStyle = "#c8324a";
        g.beginPath();
        g.moveTo(128, 118);
        g.lineTo(128 + 108 * Math.sin((theta * Math.PI) / 180), 118 - 108 * Math.cos((theta * Math.PI) / 180));
        g.lineWidth = 5;
        g.stroke();
        g.fillStyle = "#1d2633";
        g.font = "600 26px sans-serif";
        g.textAlign = "center";
        g.fillText(`θ = ${theta.toFixed(0)}°`, 128, 246);
        pro.tex.needsUpdate = true;
      };
      pro.redraw(8);
    }
    const proMat = new THREE.MeshBasicMaterial({ map: pro.tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const proMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), proMat);
    proMesh.position.set(0.06, 1.22, -0.085);
    proMesh.renderOrder = 4;
    unitP.add(proMesh);

    /* ② 测量台：光电门 + 秒表读数牌 */
    const unitS = new THREE.Group();
    unitS.position.set(0.55, 0, 0.05);
    root.add(unitS);
    const gate = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.34, 0.02), kit.mat(PAL.dark, { roughness: 0.5 }));
    gate.position.set(0, 0.19, 0.1);
    gate.castShadow = true;
    unitS.add(gate);
    const gateArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.012), kit.mat(PAL.steel, { metalness: 0.7 }));
    gateArm.position.set(0.05, 0.32, 0.1);
    unitS.add(gateArm);
    const watchPlate = textPlate({ w: 256, h: 96, bg: "#122a4a", fg: "#eef4ff", px: 40, radius: 20 });
    watchPlate.set("T = 2.01 s");
    const watchMesh = watchPlate.mesh(0.19, 0.072);
    watchMesh.position.set(0, 0.12, 0.12);
    unitS.add(watchMesh);
    const card = textPlate({ w: 192, h: 64, bg: PAL.paper, fg: PAL.ink, px: 32, edge: "#5b6676" });
    card.set("秒表台");
    const cardMesh = card.mesh(0.11, 0.037);
    cardMesh.position.set(0, 0.02, 0.1);
    cardMesh.rotation.x = -0.5;
    unitS.add(cardMesh);

    /* 刻度尺（贴在架子上） */
    const rulerPlate = textPlate({ w: 64, h: 256, bg: PAL.paper, fg: PAL.ink, px: 0 });
    {
      const cv = document.createElement("canvas");
      cv.width = 64; cv.height = 256;
      const g = cv.getContext("2d");
      const draw = () => {
        g.fillStyle = "#fbfaf6";
        g.fillRect(0, 0, 64, 256);
        g.strokeStyle = "#5b6676";
        g.lineWidth = 3;
        g.strokeRect(4, 4, 56, 248);
        g.fillStyle = "#1d2633";
        g.font = "600 20px sans-serif";
        g.textAlign = "left";
        g.fillText("L", 26, 34);
        const L = ctx.R?.L ?? 1;
        const y = 60 + (1 - Math.min(1.5, L) / 1.5) * 170;
        g.fillStyle = "#c8324a";
        g.fillRect(12, y, 40, 4);
        g.fillStyle = "#1d2633";
        g.font = "600 16px sans-serif";
        g.fillText(`${L.toFixed(2)}m`, 8, y - 6);
        rulerPlate.tex.needsUpdate = true;
      };
      draw();
      rulerPlate.redraw = draw;
    }
    const rulerMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.2), new THREE.MeshBasicMaterial({ map: rulerPlate.tex, transparent: true }));
    rulerMesh.position.set(-0.125, 0.72, -0.078);
    unitP.add(rulerMesh);

    /* 单元包围盒 + 名牌锚点 */
    const boxOf = (g) => new THREE.Box3().setFromObject(g);
    ctx.scene.updateMatrixWorld(true);
    const units = [
      { box: boxOf(unitP), group: unitP, label: new THREE.Vector3(-0.05, 1.38, 0), ring: { x: -0.05, z: 0.08, r: 0.28, w: 0.006, y: 0.001 } },
      { box: boxOf(unitS), group: unitS, label: new THREE.Vector3(0.55, 0.42, 0.1), ring: { x: 0.55, z: 0.08, r: 0.18, w: 0.005, y: 0.001 } },
    ];

    const labels = [
      { id: "smallAngle", text: (c) => C.world.labels.smallAngle, tone: "sci", layer: "protractor", anchor: () => new THREE.Vector3(0.06, 1.45, -0.09), visible: (c) => c.S.theta <= 10 },
      { id: "bigAngle", text: (c) => C.world.labels.bigAngle, tone: "warn", layer: "protractor", anchor: () => new THREE.Vector3(0.06, 1.45, -0.09), visible: (c) => c.S.theta > 10 },
      { id: "stopwatch", text: (c) => C.world.labels.stopwatch, tone: "sci", layer: "stopwatch", anchor: () => new THREE.Vector3(0.55, 0.36, 0.1), visible: () => true },
    ];

    let t = 0;
    let lastKey = "";
    const w = {
      units, labels, pickables: [bob], picked: null,
      onPick({ pick }) { w.picked = pick; return !!pick; },
      dbg: {},
      state: {},
      live(ctx2) {
        const { S: s, R: r } = ctx2;
        return { T: r.T, L: r.L, theta: s.theta, thetaOk: r.thetaOk, inBand: r.inBand, swing: +Math.sin(s._phase ?? 0).toFixed(3) };
      },
      update(dt, c) {
        t += dt;
        const { S: s, R: r, layers } = c;
        const on = (k) => c.layerOn(k);
        /* 摆动 */
        const L = r.L;
        lineMesh.scale.set(1, L / 1, 1);
        lineMesh.position.y = 0;
        bob.position.y = -L;
        const amp = Math.min(60, s.theta) * (Math.PI / 180);
        pivot.rotation.z = Math.sin(s._phase ?? 0) * amp;
        /* 量角器 */
        proMesh.visible = on("protractor") && !!s.protractor;
        const key = `${Math.round(s.theta)}|${Math.round(L * 100)}`;
        if (key !== lastKey) { lastKey = key; pro.redraw(s.theta); rulerPlate.redraw(); }
        /* 秒表读数 */
        watchPlate.set(`T = ${r.T.toFixed(2)} s`);
        w.state = { swingDeg: +(Math.sin(s._phase ?? 0) * Math.min(60, s.theta)).toFixed(1), L };
      },
    };
    return w;
  },
};

/* ============================================================
 * console · 中控台配置
 * ============================================================ */

export const consoleCfg = {
  ref: model.ref,
  main: {
    key: "T",
    label: C.panel.readT,
    fmt: (v) => v.toFixed(2),
    smooth: 0.35,
    cal: C.panel.calT,
    pill: { ok: (S, R) => R.inBand, okText: "秒摆", noText: "未达标" },
  },
  subs: [
    { key: "L", label: C.panel.readL, value: (S, R) => R.L.toFixed(2) + " m", cal: C.panel.calL },
    { key: "theta", label: C.panel.readTheta, value: (S, R) => S.theta + "° " + (R.thetaOk ? "小角度" : "大角度"), cal: C.panel.calTheta, bad: (S) => S.theta > 10 },
    { key: "m", label: C.panel.readMass, value: (S) => (S.m * 1000).toFixed(0) + " g", cal: C.panel.calMass },
  ],
  sliders: [
    { key: "l", label: C.panel.l, icon: "gauge", min: 0.25, max: 1.5, step: 0.01, unit: C.panel.unitM, ref: 1.0,
      fmt: (v) => v.toFixed(2), ticks: [{ v: 1.0, t: C.panel.tickL1 }, { v: 0.994, t: C.panel.tickL0994 }] },
    { key: "theta", label: C.panel.theta, icon: "gauge", min: 2, max: 30, step: 1, unit: C.panel.unitDeg, ref: 8,
      fmt: (v) => v.toFixed(0), ticks: [{ v: 5, t: C.panel.tickTheta5 }, { v: 10, t: C.panel.tickTheta10 }, { v: 30, t: C.panel.tickTheta30 }] },
    { key: "m", label: C.panel.m, icon: "gauge", min: 0.05, max: 0.3, step: 0.05, unit: C.panel.unitKg, ref: 0.05,
      fmt: (v) => v.toFixed(2) },
  ],
  switches: [
    { key: "slow", label: C.panel.slow, icon: "gauge", on: C.panel.slowOn, off: C.panel.slowOff,
      toast: { on: C.toast.slowOn, off: C.toast.slowOff } },
    { key: "protractor", label: C.panel.protractor, icon: "target", on: C.panel.protractorOn, off: C.panel.protractorOff,
      toast: { on: C.toast.protractorOn, off: C.toast.protractorOff } },
  ],
  chart: {
    title: C.panel.curve,
    legend: C.panel.legend,
    x: { min: 0, max: 1.5, ticks: [0, 0.5, 1.0, 1.5] },
    y: { min: 0, max: 10, ticks: [0, 2.5, 5, 7.5, 10] },
    line: null,
    data: (S, R) => {
      const k = 4 * Math.PI * Math.PI / G;
      const pts = [];
      for (let L = 0; L <= 1.5; L += 0.05) pts.push([L, k * L]);
      return { curve: pts, at: [R.L, R.T2] };
    },
  },
  risk: { label: C.panel.riskLabel, cal: C.panel.riskCal, value: (S, R) => R.risk, warn: 0.4 },
  exam: {
    ok: (S, R) => R.inBand,
    hold: 15,
    score: 15,
    events: [{ at: 6, set: { l: 1.3 }, toast: C.toast.examA }],
    solve: { l: 0.994, theta: 5, m: 0.05, slow: false, protractor: true },
    goal: { title: C.panel.goal, tip: C.panel.goalTip, short: C.panel.goalShort },
  },
};
