/**
 * engine.js · 步骤引擎与启动器（对照铜匠实验室框架行为规格实现）
 *
 * boot({C, world, model, console}) 是唯一入口：
 *  1. 契约校验（中文报错，与资料库一致）
 *  2. 3D 初始化 + 外壳 HUD
 *  3. 步骤推进：act 门控判定 / 「下一步」自动演示 / 讲解揭示 / 重置本步
 *  4. 考核（hold 保持 + events 中途注入 + goal 条）、检测（quiz 加分）、事故（倒计时→boom→复盘→抢修）
 *  5. 主循环：model.tick → evaluate → 主读数平滑 → world.update → HUD 刷新 → 渲染
 */
import * as THREE from "three";
import { initGL, initCamera, poseForBox, flyCamera, stepTweens, tween, cancelTween, makeRing, clamp } from "./world3d.js";
import { createHUD, z } from "./hud.js";

/* ---------------- 契约校验 ---------------- */

function validate(C, wld, world, model, K) {
  const errs = [];
  const ctrlKeys = new Set([
    ...(K.sliders || []).map((s) => s.key),
    ...(K.switches || []).map((s) => s.key),
  ]);
  if (wld.units && C.units && wld.units.length !== C.units.length)
    errs.push(`units 数量与 world.build().units 不一致（${C.units.length} vs ${wld.units.length}）`);
  (C.units || []).forEach((u, i) => {
    if (!(u.color >= 1 && u.color <= 5)) errs.push(`C.units[${i}].color=${u.color}：识别色只能是 1–5（规范 §2.4）`);
  });
  const polar = wld.CAMERA?.polar ?? [8, 62];
  const enumSw = Object.fromEntries((K.switches || []).filter((s) => s.states).map((s) => [s.key, s.states.map((x) => x.v)]));
  C.steps.forEach((st, i) => {
    const d = `steps[${i}]「${st.tag}」`;
    if (st.cam?.pitch != null && (st.cam.pitch < polar[0] || st.cam.pitch > polar[1]))
      errs.push(`${d}.cam.pitch=${st.cam.pitch} 超出 CAMERA.polar [${polar[0]}, ${polar[1]}]`);
    for (const k of st.layers || [])
      if (k !== "all" && !(k in (world.LAYERS || {}))) errs.push(`${d}.layers 里的 '${k}' 不在 world.LAYERS`);
    for (const k of Object.keys(st.start || {}))
      if (!ctrlKeys.has(k) && !(k in (K.ref || {}))) errs.push(`${d}.start.${k} 不是中控台控件`);
    if (st.hi && !ctrlKeys.has(st.hi)) errs.push(`${d}.hi='${st.hi}' 不是中控台控件`);
    const a = st.act || {};
    if (!a.text) errs.push(`${d}.act.text 必写（每种 kind 都要操作指令文案）`);
    if (a.key && !ctrlKeys.has(a.key)) errs.push(`${d}.act.key='${a.key}' 不是中控台控件`);
    if (a.kind === "custom" && (typeof a.ok !== "function" || typeof a.demo !== "function"))
      errs.push(`${d}.act：custom 步要同时有 ok(ctx) 与 demo(ctx)`);
    if (a.kind === "toggle" && enumSw[a.key] && !enumSw[a.key].includes(a.want))
      errs.push(`${d}.act.want=${a.want} 不是多档开关 '${a.key}' 的档位`);
    if (a.kind === "hold" && !K.exam) errs.push("有 hold 步但 CONSOLE.exam 没写");
    if (st.prep != null && typeof st.prep !== "function") errs.push(`${d}.prep 要是函数 (ctx, want) => void`);
  });
  if (K.record) {
    const cols = K.record.cols || [];
    if (!cols.length) errs.push("CONSOLE.record.cols 要是 [{key,label,unit?,fmt?}]，至少一列");
    if (new Set(cols.map((c) => c.key)).size !== cols.length) errs.push("CONSOLE.record.cols 的 key 重复了");
    if ((typeof K.record.row === "function") === (typeof K.record.rows === "function"))
      errs.push("CONSOLE.record 的 row(S,R) 和 rows(S,R) 二选一：row 按「记录一组」存行，rows 整表由工况算出");
    if (K.record.max != null && !(Number.isInteger(K.record.max) && K.record.max >= 1 && K.record.max <= 20))
      errs.push(`CONSOLE.record.max=${K.record.max}：要是 1–20 的整数（缺省 8）`);
    if (K.record.plot) {
      const ks = new Set(cols.map((c) => c.key));
      if (!ks.has(K.record.plot.x) || !ks.has(K.record.plot.y))
        errs.push(`CONSOLE.record.plot 的 x / y 要是 cols 里的 key`);
      if (!K.chart) errs.push("CONSOLE.record.plot 画在中控台曲线上，要有 CONSOLE.chart");
    }
  }
  if (errs.length) throw new Error("步骤条外壳契约错误：\n" + errs.join("\n"));
}

/* ---------------- 启动 ---------------- */

export function boot({ C, world, model, console: K }) {
  const canvas = document.getElementById("gl");
  const TONE = world.TONE || { preset: "studio", size: 1.6, floor: "none" };
  const UNIT_COLORS = { 1: "#3730A3", 2: "#0EA5E9", 3: "#9333EA", 4: "#D97706", 5: "#057A55" };

  /* 3D 基础 */
  const { renderer, scene } = initGL(canvas, TONE);
  const { camera, controls } = initCamera(canvas, world.CAMERA || {});
  const ctx = {
    canvas, renderer, scene, camera, controls, C,
    S: null, R: null, step: 0, layers: {},
    layerOn: (k) => !!(ctx.layers[k] || ctx.layers.all),
    markDone: () => markDone(),
  };

  const wld = world.build(ctx);
  validate(C, wld, world, model, K);

  /* 聚焦环 */
  const rings = (wld.units || []).map((u, i) => {
    if (!u.ring) return null;
    const r = makeRing(u.ring, UNIT_COLORS[C.units[i]?.color] || "#2F6BFF");
    scene.add(r.mesh);
    return r;
  });

  /* 状态 */
  const S = { ...(model.init ? model.init() : {}), ...(K.ref || {}), running: true, won: false };
  ctx.S = S;
  let R = model.evaluate(S);
  ctx.R = R;
  let phase = "run"; // run | accident
  let score = 0;
  const recRows = [];

  /* HUD */
  const hud = createHUD({ C, K, callbacks: {
    goto, prev: () => goto(stepI - 1), next: () => nextStep(),
    quiz: () => openQuiz(), full: toggleFull, mode: (m) => hud.setMode(m),
    resetStep, reveal: () => {},
    focusUnit: (i) => focusUnit(i),
    reframe: () => flyToStep(stepI, false),
    ref: () => { toRef(); },
    consoleApi: () => ({
      getS: (k) => S[k],
      setS: setControl,
      recordRow,
      recRows: () => recRows,
    }),
  } });
  hud.buildUnitLabels();
  for (const L of wld.labels || [])
    hud.addLabel(L.id, L, L.anchor, (c) => (L.visible ? L.visible(c) : true));
  hud.setScore(score);

  /* 控件写入（带开关 toast + 考核触控标记 + 取消该键的进行中补间） */
  function setControl(key, v) {
    if (S[key] === v) return;
    cancelTween(S, key); // 用户输入打断 start 补间（与原框架行为一致）
    S[key] = v;
    if (exam.active) S.taskActive = true;
    const sw = (K.switches || []).find((s) => s.key === key);
    if (sw?.toast && phase === "run") hud.toast(v ? sw.toast.on : sw.toast.off);
  }
  function toRef() {
    Object.assign(S, model.init ? model.init() : {}, K.ref);
    hud.toast("已回到参考工况");
  }

  /* ---------------- 步骤推进 ---------------- */

  let stepI = 0;
  const done = new Set();
  const revealed = new Set();
  let act = { orbitDrag: 0, dwell: 0 };
  let eventsQueue = [];
  let stepT = 0;
  const exam = { active: false, won: false, held: 0, progress: 0 };
  let demoBtn = null;
  let autoRunning = false;

  function applyStart(instant) {
    const st = C.steps[stepI];
    const keep = st.startMode === "keep";
    const want = keep ? { ...S, ...st.start } : { ...(model.init ? model.init() : {}), ...K.ref, ...st.start };
    st.prep?.(ctx, want);
    for (const [k, v] of Object.entries(want)) {
      if (typeof v === "number" && typeof S[k] === "number" && !instant) tween(S, k, v, 0.8);
      else S[k] = v;
    }
    act = { orbitDrag: 0, dwell: 0 };
    exam.active = st.act?.kind === "hold";
    exam.won = false;
    exam.held = 0;
    S.taskActive = exam.active;
    S.won = false;
    eventsQueue = (K.exam?.events || []).map((e) => ({ ...e, fired: false }));
    stepT = 0;
    hud.setStep(st, stepI, C.steps.length);
    hud.chips.forEach((c, k) => c.classList.toggle("done", done.has(k)));
    if (done.has(stepI)) {
      hud.markActDone();
    }
    hud.setStatus(exam.active ? "warn" : "run", exam.active ? "考核中" : "运行中");
    /* 看示范按钮 */
    demoBtn?.remove();
    demoBtn = null;
    if (st.act?.demo) {
      demoBtn = z("button", { class: "btn", style: { marginLeft: "6px" } }, "看示范");
      demoBtn.addEventListener("click", () => runDemo(st.act, () => markDone()));
      hud.left.querySelector(".block.act").append(demoBtn);
    }
  }

  function goto(i, instant = false) {
    stepI = clamp(i, 0, C.steps.length - 1);
    const st = C.steps[stepI];
    ctx.step = stepI;
    ctx.layers = Object.fromEntries((st.layers || ["all"]).map((k) => [k, true]));
    applyStart(instant);
    flyToStep(stepI, instant);
    hud.setMode("console");
    saveProgress();
  }

  function markDone() {
    if (done.has(stepI)) return;
    done.add(stepI);
    revealed.add(stepI);
    hud.markActDone();
    hud.chips[stepI].classList.add("done");
    saveProgress();
  }

  /** 「下一步」：没动手就自动演示（教师流程的关键） */
  function nextStep() {
    if (stepI >= C.steps.length - 1) { hud.toast(`已经是第 ${C.steps.length} 步了——去点右上角「检测」试试`); return; }
    if (done.has(stepI) || autoRunning) { goto(stepI + 1); return; }
    const st = C.steps[stepI];
    if (!st.act?.demo && !["orbit", "toggle", "slider", "watch"].includes(st.act?.kind)) {
      hud.toast("先完成本步的动手操作，再点下一步");
      return;
    }
    autoRunning = true;
    hud.toast("没动手也行：先自动演示一遍这一步…");
    runDemo(st.act, () => {
      markDone();
      setTimeout(() => { autoRunning = false; goto(stepI + 1); }, 600);
    });
  }

  /** 自动演示：各 kind 的内置行为，或课程提供的 demo(ctx) */
  async function runDemo(a, finished) {
    const D = (ms) => new Promise((r) => setTimeout(r, ms));
    try {
      if (a.demo) {
        await a.demo(ctx);
        await D((a.secs ?? 1.2) * 1000);
      } else if (a.kind === "orbit") {
        const p0 = camera.position.clone();
        const axis = new THREE.Vector3(0, 1, 0);
        const t0 = performance.now();
        await new Promise((res) => {
          const spin = () => {
            const k = clamp((performance.now() - t0) / 1300, 0, 1);
            const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            const off = p0.clone().sub(controls.target).applyAxisAngle(axis, 0.42 * e);
            camera.position.copy(controls.target).add(off);
            camera.lookAt(controls.target);
            k < 1 ? requestAnimationFrame(spin) : res();
          };
          spin();
        });
        finished && finished();
        return;
      } else if (a.kind === "toggle") {
        setControl(a.key, a.want);
        await D(1100);
      } else if (a.kind === "slider") {
        tween(S, a.key, a.demo ?? a.to, 1.2);
        await D(1450);
      } else if (a.kind === "watch") {
        await D((a.secs ?? 4) * 1000);
      } else if (a.kind === "record") {
        const states = typeof a.states === "function" ? a.states(S, R) : a.states;
        for (const s of states || []) {
          Object.assign(S, s);
          recordRow();
          await D(350);
        }
      } else {
        await D(900);
      }
    } finally {
      finished && finished();
    }
  }

  function resetStep() {
    const st = C.steps[stepI];
    applyStart(true);
    done.delete(stepI);
    hud.chips[stepI].classList.remove("done");
    hud.toast("已重置本步");
    st.act?.demo && hud.toast("已重置本步");
  }

  function flyToStep(i, instant) {
    const st = C.steps[i];
    let pose = null;
    if (st.cam?.box) {
      const b = new THREE.Box3(new THREE.Vector3(...st.cam.box.min), new THREE.Vector3(...st.cam.box.max));
      pose = poseForBox(b, camera, { pitch: st.cam.pitch ?? 22, yaw: st.cam.yaw, ty: 0.12 });
    } else if (st.unit >= 0 && wld.units?.[st.unit]?.box) {
      pose = poseForBox(wld.units[st.unit].box, camera, { pitch: st.cam?.pitch ?? 22, ty: 0.12 });
    } else if ((world.CAMERA || {}).homeBox) {
      const b = new THREE.Box3(new THREE.Vector3(...world.CAMERA.homeBox.min), new THREE.Vector3(...world.CAMERA.homeBox.max));
      pose = poseForBox(b, camera, { pitch: world.CAMERA.pitch ?? 22, ty: 0.15 });
    }
    if (!pose) return;
    if (instant) {
      camera.position.copy(pose.pos);
      controls.target.copy(pose.tgt);
      controls.update();
    } else flyCamera(camera, controls, pose.pos, pose.tgt, 0.8);
  }
  function focusUnit(i) {
    if (wld.units?.[i]?.box) flyCamera(camera, controls,
      poseForBox(wld.units[i].box, camera, { pitch: 22, ty: 0.12 }).pos,
      wld.units[i].box.getCenter(new THREE.Vector3()), 0.6);
  }

  /* ---------------- 检测（quiz） ---------------- */

  let quiz = null;
  function openQuiz() {
    if (!C.quiz?.list?.length) { hud.toast("本课没有配置检测题"); return; }
    quiz = { i: 0, ans: [], scored: false };
    hud.setMode("quiz");
    renderQuiz();
  }
  function renderQuiz() {
    const I = C.ui?.quiz || {};
    const box = hud.paneQuiz;
    box.innerHTML = "";
    const list = C.quiz.list;
    if (quiz.i >= list.length) {
      const right = quiz.ans.filter((a, k) => a === list[k].ans).length;
      const msg = right === list.length ? (I.allRight || "全对！")
        : right >= list.length * 0.75 ? (I.good || "不错！")
        : (I.retry || "建议回看主线。");
      if (!quiz.scored) {
        quiz.scored = true;
        score += right * 5;
        hud.setScore(score);
        hud.toast(`检测完成 +${right * 5}`);
        saveProgress({ finished: true, quiz: right, of: list.length });
      }
      box.append(
        z("div", { class: "qz-res" },
          z("div", { class: "cal" }, "检测结果"),
          z("div", { class: "big" }, `${right} / ${list.length}`),
          z("p", {}, msg)),
        z("div", { class: "acts" },
          z("button", { class: "btn", onclick: () => { quiz.i = 0; quiz.ans = []; renderQuiz(); } }, "再做一次"),
          z("button", { class: "btn pri", onclick: () => hud.setMode("console") }, "关闭")));
      return;
    }
    const q = list[quiz.i];
    const picked = quiz.ans[quiz.i];
    box.append(z("div", { class: "qz-head" }, z("span", {}, q.tag || ""), z("span", {}, `${quiz.i + 1} / ${list.length}`)));
    box.append(z("p", { class: "qz-q" }, q.q));
    const opts = z("div", { class: "qz-opts" });
    q.opts.forEach((o, k) => {
      const b = z("button", {
        onclick: () => { if (quiz.ans[quiz.i] === undefined) { quiz.ans[quiz.i] = k; renderQuiz(); } },
      });
      b.innerHTML = `<b>${"ABCD"[k]}</b>${o}`;
      if (picked !== undefined) {
        b.disabled = true;
        if (k === q.ans) b.className = "ok";
        else if (k === picked) b.className = "no";
      }
      opts.append(b);
    });
    box.append(opts);
    if (picked !== undefined) {
      const ok = picked === q.ans;
      const fb = z("div", { class: "qz-fb " + (ok ? "ok" : "no") },
        z("b", {}, `${ok ? "答对了" : "答错了"} · 为什么`), q.why || "");
      if (!ok && q.unit !== undefined && C.units[q.unit]) {
        const u = C.units[q.unit];
        const go = z("span", { class: "go" }, `回看 ${u.no} ${u.name}`);
        go.addEventListener("click", () => { hud.setMode("console"); goto(q.unit); });
        fb.append(z("div", { style: "margin-top:3px" }, "这道题考的是第 ", go));
      }
      box.append(fb);
      box.append(z("div", { class: "acts" },
        z("button", { class: "btn pri", onclick: () => { quiz.i++; renderQuiz(); } }, quiz.i + 1 >= list.length ? "完成" : "下一题")));
    }
  }

  /* ---------------- 事故（accident） ---------------- */

  let accTimer = 0;
  let accKind = null;
  function renderReview(kind) {
    const A = C.accident?.[kind];
    if (!A) return;
    const box = hud.paneReview;
    box.innerHTML = "";
    box.append(z("span", { class: "acc-tag" }, A.title || "事故复盘"));
    box.append(z("div", { class: "chain" },
      (A.chain || []).map(([h, p]) => z("div", {}, z("h4", {}, h), z("p", {}, p)))));
    box.append(z("div", { class: "prev" }, z("h4", {}, A.preventHead || "工程上怎么防"),
      z("ul", {}, (A.prevent || []).map((p) => z("li", {}, p)))));
    box.append(z("div", { class: "lesson" }, A.lesson || ""));
    box.append(z("div", { class: "acts" },
      z("button", { class: "btn", onclick: () => hud.setMode("console") }, "先看看现场"),
      z("button", { class: "btn pri", onclick: repair }, "抢修并重开")));
  }
  function repair() {
    K.accident?.estop?.(S);
    wld.repair?.();
    phase = "run";
    accTimer = 0; accKind = null;
    hud.countdown(null);
    applyStart(true);
    hud.setMode("console");
    hud.setStatus("run", "已抢修复产");
    hud.toast("已抢修：参数回到安全区，重新来过");
  }

  /* ---------------- 其他 ---------------- */

  function toggleFull() {
    document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.();
  }
  function recordRow() {
    if (!K.record?.row) return;
    const row = K.record.row(S, R);
    if (row == null) { hud.toast("现在读数不稳，不能记录"); return; }
    const ser = JSON.stringify(row);
    if (recRows.some((r) => JSON.stringify(r) === ser)) { hud.toast("这一组已经记过了"); return; }
    recRows.push(row);
    const max = K.record.max ?? 8;
    while (recRows.length > max) recRows.shift();
    hud.toast("已记录一组数据");
  }

  /* 进度存档 */
  function saveProgress(patch) {
    try {
      const key = "lab3d:" + C.meta.slug;
      const prev = JSON.parse(localStorage.getItem(key) || "{}");
      localStorage.setItem(key, JSON.stringify({
        ...prev, si: stepI,
        pct: Math.max(prev.pct || 0, stepI / Math.max(1, C.steps.length - 1)),
        ...patch,
      }));
    } catch { /* 隐私模式忽略 */ }
  }

  addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const k = e.key.toLowerCase();
    if (k === "n") hud.setNames(!hud.namesOn);
    else if (k === "q") openQuiz();
    else if (k === "f") toggleFull();
    else if (k === "escape") hud.setMode("console");
    else if (e.key === "ArrowRight") nextStep();
    else if (e.key === "ArrowLeft") goto(stepI - 1);
  });

  /* ---------------- 尺寸 / 拾取 / 轨道累计 ---------------- */

  let vw = 1, vh = 1;
  let uiT = 0, chartT = 1, introT = 0;
  function resize() {
    vw = innerWidth || 1; vh = innerHeight || 1;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    chartT = 1; // 立即重绘
  }
  addEventListener("resize", resize);
  resize();

  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let downAt = [0, 0];
  canvas.addEventListener("pointerdown", (e) => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointerup", (e) => {
    if (Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    mouse.set((e.clientX / vw) * 2 - 1, -(e.clientY / vh) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const picks = wld.pickables || [];
    const hit = picks.length && ray.intersectObjects(picks, true)[0];
    if (hit) wld.onPick?.({ pick: hit.object.userData?.pick ?? picks[0].userData?.pick, object: hit.object, point: hit.point }, ctx);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (e.buttons) act.orbitDrag += Math.hypot(e.movementX || 0, e.movementY || 0);
  });

  /* ---------------- 主循环 ---------------- */

  const labelPts = new THREE.Vector3();
  const fps = { acc: 0, n: 0, low: 0, grace: 3 };
  let last = performance.now();
  let mainSm = null;

  function checkAct() {
    const st = C.steps[stepI];
    const a = st.act || {};
    if (done.has(stepI)) return true;
    let ok = false;
    switch (a.kind) {
      case "orbit": ok = act.orbitDrag > 300; break; // 累计拖动约一圈的量
      case "slider": {
        const v = S[a.key];
        ok = a.op === "<" ? v < a.to : a.op === "<=" ? v <= a.to : a.op === ">" ? v > a.to : v >= a.to;
        break;
      }
      case "toggle": ok = S[a.key] === a.want; break;
      case "watch": act.dwell += uiT; ok = act.dwell >= (a.secs ?? 4); break;
      case "custom": ok = !!a.ok?.(ctx); break;
      case "record": ok = recRows.length >= (a.n ?? 1); break;
      case "hold": ok = exam.won; break;
      default: ok = true;
    }
    if (ok) { markDone(); hud.toast("本步完成 ✓ 看看「结论」，再点下一步"); }
    return ok;
  }

  function tickExam(dt) {
    if (!exam.active || phase !== "run") { exam.progress = 0; return; }
    stepT += dt;
    /* 事件注入（考核中途出变故：清保持计时，强制视为已动手） */
    for (const e of eventsQueue) {
      if (!e.fired && stepT >= e.at) {
        e.fired = true;
        Object.assign(S, e.set);
        S.taskActive = true;
        exam.held = 0;
        e.toast && hud.toast(e.toast);
      }
    }
    /* 达标保持：必须连续保持（断了就清零重来） */
    const ok = K.exam.ok(S, R) && S.taskActive !== false && phase === "run";
    exam.held = ok ? exam.held + dt : 0;
    exam.progress = clamp(exam.held / (K.exam.hold || 15), 0, 1);
    if (!exam.won && exam.held >= (K.exam.hold || 15)) {
      exam.won = true;
      S.won = true;
      score += K.exam.score || 15;
      hud.setScore(score);
      hud.setStatus("run", "考核通过");
      hud.toast(`达标：保持住了 +${K.exam.score || 15} 分`);
    }
    /* 事故联锁：check 命中 → 3s 倒计时（可把参数调回安全区解除）→ boom → 复盘 */
    if (K.accident?.check && !exam.won) {
      const kind = K.accident.check(S);
      if (kind) {
        if (accKind !== kind) { accKind = kind; accTimer = 0; }
        accTimer += dt;
        hud.countdown(Math.max(1, Math.ceil(3 - accTimer)), K.accident.countdown?.(kind, R) || "");
        hud.setStatus("bad", "参数越界");
        if (accTimer >= 3) {
          phase = "accident";
          hud.countdown(null);
          hud.flash();
          if (K.accident.unit >= 0) focusUnit(K.accident.unit);
          wld.boom?.(ctx, kind);
          renderReview(kind);
          setTimeout(() => { hud.setMode("review"); hud.setStatus("bad", "发生事故"); }, 900);
        }
      } else if (accKind) {
        accKind = null;
        accTimer = 0;
        hud.countdown(null);
        if (!exam.won) hud.setStatus("warn", "考核中");
        hud.toast("参数已回到安全区");
      }
    }
  }

  function updateLabels() {
    const st = C.steps[stepI];
    const entries = [];
    const proj = (v3) => {
      labelPts.copy(v3).project(camera);
      return {
        x: (labelPts.x * 0.5 + 0.5) * vw,
        y: (-labelPts.y * 0.5 + 0.5) * vh,
        behind: labelPts.z > 1,
      };
    };
    (wld.units || []).forEach((u, i) => {
      if (!u.label) return;
      const vis = u.labelVisible ? !!u.labelVisible(ctx) : true;
      const p = proj(u.label);
      entries.push({ id: `unit${i}`, x: p.x, y: p.y, visible: vis && !p.behind, sel: st.unit === i, dim: st.unit >= 0 && st.unit !== i });
    });
    for (const L of wld.labels || []) {
      if (!L.anchor) continue;
      const vis = L.visible ? !!L.visible(ctx) : true;
      if (!vis) { entries.push({ id: L.id, visible: false }); continue; }
      const p = proj(L.anchor(ctx));
      entries.push({ id: L.id, x: p.x, y: p.y, visible: !p.behind, sel: false, dim: false });
      if (typeof L.text === "function") {
        const el = hud.labEls.get(L.id);
        if (el) el.el.querySelector(".n").textContent = L.text(ctx);
      }
    }
    hud.placeLabels(entries);
    /* 式子横幅锚点：聚焦站位顶缘，否则屏中 */
    if (st.eq) {
      if (st.unit >= 0 && wld.units?.[st.unit]?.box) {
        const b = wld.units[st.unit].box;
        const p = proj(new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2));
        hud.eqbAnchor(clamp(p.x, 300, vw - 300), Math.max(p.y + 14, 150));
      } else hud.eqbAnchor(vw / 2, 150);
    }
  }

  function loop(now) {
    requestAnimationFrame(loop);
    try {
      tickFrame(now);
    } catch (err) {
      /* 自愈：单帧异常不让 rAF 链死掉；错误可见化 */
      console.error("[frame]", err);
      window.__frameErr = String(err && err.stack || err);
    }
  }

  function tickFrame(now) {
    const rawDt = (now - last) / 1000;
    last = now;
    const dt = clamp(Math.min(0.05, rawDt), 0, 0.05); // 负 dt（时钟回拨/pump 后）一律按 0 处理
    stepTweens(dt);
    introT = Math.min(1, introT + dt / 0.8);
    ctx.introK = introT;

    if (phase === "run") {
      model.tick?.(dt, S, ctx);
      R = model.evaluate(S);
      ctx.R = R;
      /* 主读数平滑（smooth 秒） */
      if (K.main?.smooth && K.main.smooth > 0.01) {
        const target = K.main.value ? K.main.value(S, R) : R[K.main.key];
        mainSm = mainSm == null ? target : mainSm + (target - mainSm) * Math.min(1, dt / K.main.smooth);
      } else mainSm = null;
      checkAct();
    }

    tickExam(dt);
    /* 顶栏状态灯：风险报警 */
    if (K.risk && phase === "run" && !exam.active) {
      const rv = K.risk.value(S, R);
      if (rv > (K.risk.warn ?? 0.4)) hud.setStatus("warn", "报警");
      else if (!exam.active) hud.setStatus("run", "运行中");
    }

    /* 世界更新（唯一逐帧课程钩子） */
    wld.update?.(dt, { ...ctx, layers: ctx.layers, exam, phase });

    /* 聚焦环 */
    const st = C.steps[stepI];
    rings.forEach((r, i) => r && r.set(i === st.unit ? 1 : 0));

    /* HUD 刷新：0.12s 节流；曲线 0.35s 节流 */
    uiT += dt;
    if (uiT >= 0.12) {
      const Reff = mainSm != null ? { ...R, [K.main.key]: mainSm } : R;
      hud.paneConsole.refresh(S, Reff, exam, st.hi);
      uiT = 0;
    }
    chartT += dt;
    if (chartT >= 0.35) { hud.paneConsole.redrawChart?.(S, R); chartT = 0; }

    updateLabels();
    renderer.render(scene, camera);

    /* lowfps 降级：启动 3s 宽限，连续低帧 4 窗口 → body.lowfps */
    fps.acc += rawDt; fps.n++;
    if (fps.acc > 0.5) {
      const avg = fps.n / fps.acc;
      if (avg < 30 && fps.grace <= 0) fps.low++; else if (avg >= 30) fps.low = 0;
      fps.grace -= fps.acc;
      if (fps.low >= 4) document.body.classList.add("lowfps");
      fps.acc = 0; fps.n = 0;
    }
  }

  /* 恢复进度 */
  try {
    const saved = JSON.parse(localStorage.getItem("lab3d:" + C.meta.slug) || "null");
    if (saved && Number.isInteger(saved.si) && saved.si > 0 && saved.si < C.steps.length) {
      setTimeout(() => { goto(saved.si, true); hud.toast(`已回到上次进度：第 ${saved.si + 1} 步`); }, 60);
    }
  } catch { /* ignore */ }

  /* 全局调试接口 */
  window.__lab = {
    C, S, model, STEPS: C.steps, CONSOLE: K, scene, camera, renderer, controls, hud, world: wld, ctx,
    get score() { return score; },
    get step() { return stepI; },
    goto, prev: () => goto(stepI - 1), next: nextStep,
    reveal: markDone, resetStep,
    set: (k, v) => setControl(k, v),
    ref: toRef,
    live: (c = ctx) => wld.live?.(c),
    repair, quiz: openQuiz,
    /** 调试：手动快进 n 帧（后台标签 rAF 被节流时也能推进） */
    pump(n = 30, step = 1 / 60) {
      for (let i = 0; i < n; i++) tickFrame(last + step * 1000); // tickFrame 内部会更新 last
      last = performance.now(); // 与真实时钟重新对齐，避免接下来的 rAF 出现异常 dt
    },
  };

  goto(0, true);
  requestAnimationFrame(loop);
  return { goto, hud, S };
}
