/**
 * hud.js · 外壳 DOM（顶栏/步骤条/左栏/右栏中控台/底栏/名牌层/横幅/提示）
 *
 * DOM 结构与 class 命名跟 assets/step-shell.css 一一对应。
 * 引擎（engine.js）只调这里暴露的方法，不直接碰 DOM。
 */
import { SHELL_CSS } from "./style.js";

/* ---------------- 微型 DOM 助手 ---------------- */

export function z(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(9)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

/* ---------------- 图标（stroke 风格，16px） ---------------- */

const P = {
  home: '<path d="M3 10.5 10 4l7 6.5"/><path d="M5.5 9.5V16h9V9.5"/>',
  search: '<circle cx="7.2" cy="7.2" r="4.2"/><path d="M10.4 10.4 14 14"/>',
  expand: '<path d="M9 3h6v6"/><path d="M15 3 8.5 9.5"/><path d="M11 17H5v-6"/><path d="M5 17l6.5-6.5"/>',
  check: '<path d="M3.5 9.5l4 4 9-9"/>',
  hand: '<path d="M8 12V5.2a1.2 1.2 0 0 1 2.4 0V11"/><path d="M10.4 11V4.2a1.2 1.2 0 0 1 2.4 0V11"/><path d="M12.8 11V6a1.2 1.2 0 0 1 2.4 0v6.5c0 3.2-2.2 5.5-5.2 5.5-2.6 0-4-1.2-5.2-3.4L3.4 12c-.5-1 .2-2 1.3-2 .7 0 1.2.3 1.7 1l1.6 2"/>',
  eye: '<path d="M2.5 10C4 6.8 6.8 5 10 5s6 1.8 7.5 5C16 13.2 13.2 15 10 15s-6-1.8-7.5-5Z"/><circle cx="10" cy="10" r="2.4"/>',
  bulb: '<path d="M10 3a5 5 0 0 0-2.6 9.3c.6.4 1 1 1.1 1.7h3c.1-.7.5-1.3 1.1-1.7A5 5 0 0 0 10 3Z"/><path d="M8.5 16.5h3"/>',
  file: '<path d="M5 3h6.5L14 5.5V17H5Z"/><path d="M11 3v3h3"/>',
  gauge: '<path d="M4 13a6.5 6.5 0 1 1 12 0"/><path d="M10 13 13 8"/>',
};

export function icon(name, cls = "ico") {
  return z("span", { class: cls, html: `<svg viewBox="0 0 20 20">${P[name] || P.check}</svg>` });
}

/* ==================== HUD 主体 ==================== */

export function createHUD({ C, K, callbacks }) {
  document.head.append(z("style", {}, SHELL_CSS));
  if (C.styleSection) document.head.append(z("style", {}, C.styleSection));

  const unitVars = (u) => {
    const c = C.units?.[u]?.color;
    return c
      ? `--uc:var(--u${c});--ucs:var(--u${c}s);--ucg:var(--u${c});--ucsg:var(--u${c}s);--uh:var(--u${c}-halo)`
      : "";
  };
  const foldBtn = (side) =>
    z("button", { class: "fold", title: "折叠", onclick: () => hud.fold(side, true) }, side === "L" ? "‹" : "›");

  const hud = {};
  const kbdBtn = (label, key, fn, icoName) => {
    const b = z("button", { class: "btn", title: label }, icoName ? icon(icoName) : null, label);
    if (key) b.append(z("kbd", {}, key));
    b.addEventListener("click", fn);
    return b;
  };

  /* --- 顶栏 --- */
  hud.statEl = z("div", { class: "stat" }, z("i"), z("span", {}, "就绪"));
  hud.statText = hud.statEl.querySelector("span");
  hud.scoreVal = z("b", { style: { fontFamily: "var(--num)" } }, "0");
  hud.mq = z("div", { class: "mq" }, z("span", { class: "k" }, "主线"),
    z("b", { title: C.mainline.q }, C.mainline.q));
  hud.top = z("header", { id: "top" }, z("div", { class: "row1" },
    z("a", { class: "home", href: "./index.html", title: "返回课程列表" }, icon("home"), "课程"),
    z("div", { class: "brand" },
      z("h1", {}, C.top.title),
      C.top.total ? z("span", { class: "eq", title: C.top.total }, C.top.total) : null),
    hud.mq,
    z("div", { class: "spacer" }),
    z("div", { class: "hud" }, hud.statEl,
      z("div", { class: "score" }, "得分 ", hud.scoreVal),
      kbdBtn("检测", "Q", () => callbacks.quiz(), "search"),
      kbdBtn("全屏", "F", () => callbacks.full(), "expand"))),
    z("div", { class: "chain5" }));
  const chainRow = hud.top.querySelector(".chain5");
  chainRow.append(z("span", { class: "ct" }, "知识链"));
  hud.chainNodes = C.mainline.chain.map((n, i) => {
    const d = z("div", { class: "cd", "data-i": i, "data-ring": i, title: `${n.k}：${n.t}` },
      z("i", { class: "dot" }), z("b", {}, n.k), z("span", {}, n.t));
    chainRow.append(d);
    if (i < C.mainline.chain.length - 1)
      chainRow.append(z("i", { class: "ar" }, z("i", {}, (C.mainline.seps || [])[i] || "→")));
    return d;
  });
  document.body.append(hud.top);

  /* --- 步骤条 --- */
  hud.chips = C.steps.map((st, i) => {
    const b = z("button", { class: "chip", "data-i": i, title: st.tag, style: unitVars(st.unit) },
      z("span", { class: "node" }, String(i + 1)),
      z("span", { class: "nm" }, st.tag),
      z("span", { class: "ck", html: `<svg viewBox="0 0 20 20">${P.check}</svg>` }));
    b.addEventListener("click", () => callbacks.goto(i));
    return b;
  });
  document.body.append(z("nav", { id: "steps" }, z("span", { class: "sb" }, "步骤"), ...hud.chips));

  /* --- 左栏「本步」 --- */
  hud.cardNo = z("span", { class: "cno" }, "");
  hud.cardQ = z("b", { class: "cq" }, "");
  hud.cardSub = z("span", { class: "csub" }, "");
  hud.tagRow = z("div", { class: "tagrow" });
  hud.actTxt = z("div", { class: "atxt" }, "");
  hud.actBadge = z("span", { class: "exbadge todo" }, "待动手");
  hud.expectTxt = z("span", { class: "ev" }, "");
  hud.conclTxt = z("p", { class: "ctxt" }, "");
  hud.refTxt = z("div", { class: "ref" }, "");
  hud.pointsEl = z("ul", { class: "pts" }, "");
  hud.examTxt = z("span", {}, "");
  hud.cardmore = z("div", { class: "cardmore" },
    z("div", { class: "conclbox" }, z("div", { class: "lb" }, icon("file"), "结论"), hud.conclTxt, hud.refTxt),
    z("div", { class: "lb ptslb" }, "讲解要点"),
    hud.pointsEl,
    z("div", { class: "whybox" }, z("b", {}, icon("bulb"), "考试怎么考"), hud.examTxt));
  hud.revealBtn = z("button", { class: "btn pri", onclick: () => {
    const on = !hud.cardmore.classList.contains("on");
    hud.cardmore.classList.toggle("on", on);
    hud.revealBtn.textContent = on ? "收起讲解" : "讲解";
  } }, "讲解");
  hud.resetBtn = z("button", { class: "btn", onclick: () => callbacks.resetStep() }, "重置本步");
  hud.crumb = z("ol", { class: "crumb" }, z("span", { class: "ck" }, C.ui?.crumb || "站位"));
  hud.crumbItems = (C.units || []).map((u, i) => {
    const c = z("span", { class: "ci", style: unitVars(i), title: u.brief || u.name },
      `${u.no} ${u.short || u.name}`);
    c.addEventListener("click", () => callbacks.focusUnit(i));
    return c;
  });
  hud.left = z("aside", { id: "left" },
    z("div", { class: "phead" }, z("h2", {}, "本步"),
      z("span", { class: "sub" }, C.ui?.subAll || ""), foldBtn("L")),
    z("div", { class: "pbody" },
      z("div", { class: "cardhead", style: unitVars(0) }, hud.cardNo,
        z("div", { class: "ct" }, hud.cardQ, hud.cardSub)),
      hud.tagRow,
      z("div", { class: "block act" },
        z("div", { class: "lb" }, icon("hand"), z("span", {}, "动手"), hud.actBadge),
        hud.actTxt,
        z("div", { class: "etxt" }, z("b", {}, icon("eye"), "观察："), hud.expectTxt)),
      hud.cardmore,
      z("div", { class: "acts" }, hud.revealBtn, hud.resetBtn),
      hud.crumb));
  document.body.append(hud.left);

  /* --- 右栏：中控台 / 检测 / 复盘 --- */
  const modeBtn = z("button", { class: "back", onclick: () => callbacks.mode("console") }, "返回控制台");
  const consolePane = buildConsole(K, callbacks.consoleApi(), callbacks.ref);
  hud.paneConsole = consolePane;
  hud.paneQuiz = z("div", { id: "quiz", class: "pane quiz" });
  hud.paneReview = z("div", { id: "review", class: "pane review" });
  hud.right = z("aside", { id: "right" },
    z("div", { class: "phead" }, z("h2", {}, "中控台"),
      z("span", { class: "sub", id: "rsub" }, C.ui?.panel?.sub || "动一个控件，读数与画面一起变"),
      modeBtn, foldBtn("R")),
    z("div", { class: "pbody" }, consolePane.pane, hud.paneQuiz, hud.paneReview));
  document.body.append(hud.right);

  /* --- 名牌层 / 横幅 / 浮层 / 底栏 --- */
  hud.labelBox = z("div", { id: "labels" });
  hud.eqb = z("div", { id: "eqb", style: "display:none" }, z("div", { class: "bk" }, "本步式子"),
    z("div", { class: "beq" }, ""), z("div", { class: "bcal" }, ""), z("div", { class: "btags" }, ""));
  hud.cd = z("div", { id: "countdown" }, z("div", { class: "cdbox" },
    z("div", { class: "k" }, "危险"), z("div", { class: "n" }, "3"), z("div", { class: "s" }, "")));
  hud.cdN = hud.cd.querySelector(".n");
  hud.cdS = hud.cd.querySelector(".s");
  hud.flashEl = z("div", { id: "flash" });
  hud.toastEl = z("div", { id: "toast" });
  document.body.append(hud.labelBox, hud.eqb, hud.cd, hud.flashEl, hud.toastEl);

  hud.curStep = z("span", { class: "cur" }, "");
  hud.prevBtn = z("button", { class: "btn navbtn", onclick: () => callbacks.prev() }, "‹ 上一步");
  hud.nextBtn = z("button", { class: "btn navbtn pri", onclick: () => callbacks.next() }, "下一步 ›");
  hud.foot = z("footer", { id: "foot" },
    z("div", { class: "nav" }, hud.prevBtn, hud.curStep, hud.nextBtn),
    z("div", { class: "foot2" },
      z("span", { class: "note" }, C.foot?.note || ""),
      z("span", { class: "fhint" }, "N 名牌 · Q 检测 · F 全屏 · Esc 回控制台 · ←→ 切步"),
      z("span", { class: "keys" }, (C.help?.keys || []).map(([k, v]) => `${k}=${v}`).join(" · "))));
  document.body.append(hud.foot);

  hud.tabL = z("button", { class: "tab", id: "tabL", onclick: () => hud.fold("L", false) }, "本步");
  hud.tabR = z("button", { class: "tab", id: "tabR", onclick: () => hud.fold("R", false) }, "中控台");
  document.body.append(hud.tabL, hud.tabR);

  /* --- 折叠 / 面板切换 / 名牌开关 --- */
  const collapsed = { L: false, R: false };
  hud.fold = (side, v) => {
    collapsed[side] = v ?? !collapsed[side];
    (side === "L" ? hud.left : hud.right).classList.toggle("collapsed", collapsed[side]);
    (side === "L" ? hud.tabL : hud.tabR).style.display = collapsed[side] ? "grid" : "none";
    callbacks.reframe && callbacks.reframe();
  };
  hud.setMode = (m) => {
    consolePane.pane.style.display = m === "console" ? "" : "none";
    hud.paneQuiz.style.display = m === "quiz" ? "flex" : "none";
    hud.paneReview.style.display = m === "review" ? "flex" : "none";
    modeBtn.style.visibility = m === "console" ? "hidden" : "visible";
  };
  hud.setMode("console");
  hud.namesOn = true;
  hud.setNames = (v) => { hud.namesOn = v; hud.labelBox.style.display = v ? "" : "none"; };

  /* ==================== 左栏内容 ==================== */

  hud.setStep = (st, i, n) => {
    const u = st.unit >= 0 && C.units[st.unit] ? C.units[st.unit] : null;
    hud.cardNo.textContent = st.no || String(i + 1);
    hud.cardQ.textContent = st.q;
    hud.cardSub.textContent = u ? `${u.no} ${u.name}` : C.ui?.subAll || "";
    hud.left.querySelector(".cardhead").setAttribute("style", unitVars(st.unit));
    hud.tagRow.innerHTML = "";
    for (const t of st.tags || []) hud.tagRow.append(z("span", { class: "tg" }, t));
    hud.actTxt.textContent = st.act?.text || "";
    hud.actBadge.className = "exbadge todo";
    hud.actBadge.textContent = "待动手";
    hud.expectTxt.textContent = st.expect?.text || st.expect || "";
    hud.conclTxt.textContent = st.concl || "";
    hud.refTxt.textContent = st.ref || "";
    hud.pointsEl.innerHTML = "";
    for (const p of st.points || []) {
      hud.pointsEl.append(z("li", { class: p.startsWith("去掉这一步") ? "cut" : "" }, p));
    }
    hud.examTxt.textContent = st.exam || "";
    hud.cardmore.classList.remove("on");
    hud.revealBtn.textContent = "讲解";
    hud.crumbItems.forEach((c, k) => c.classList.toggle("on", k === st.unit));
    hud.chips.forEach((c, k) => {
      c.classList.toggle("on", k === i);
      if (k > i) c.classList.remove("done");
    });
    hud.curStep.textContent = `${i + 1} / ${n}`;
    hud.prevBtn.disabled = i === 0;
    hud.nextBtn.disabled = i === n - 1;
    hud.setEq(st.eq, st.eqCal, st.tags);
  };

  hud.markActDone = () => {
    if (hud.actBadge.classList.contains("ok")) return;
    hud.actBadge.className = "exbadge ok";
    hud.actBadge.textContent = "已完成";
    hud.cardmore.classList.add("on");
    hud.revealBtn.textContent = "收起讲解";
  };

  hud.setEq = (eq, eqCal, tags) => {
    if (!eq) { hud.eqb.style.display = "none"; return; }
    hud.eqb.style.display = "";
    hud.eqb.querySelector(".beq").textContent = eq;
    hud.eqb.querySelector(".bcal").textContent = eqCal || "";
    const bt = hud.eqb.querySelector(".btags");
    bt.innerHTML = "";
    for (const t of tags || []) bt.append(z("span", { class: "bt" }, t));
  };
  hud.eqbAnchor = (x, y) => { hud.eqb.style.left = `${x}px`; hud.eqb.style.top = `${y}px`; };

  /* ==================== toast / 倒计时 / 红闪 / 状态 / 得分 ==================== */

  let toastTimer = 0;
  hud.toast = (text) => {
    hud.toastEl.textContent = text;
    hud.toastEl.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => hud.toastEl.classList.remove("on"), 3600);
  };
  hud.countdown = (n, sub) => {
    if (n == null) { hud.cd.classList.remove("on"); return; }
    hud.cd.classList.add("on");
    hud.cdN.textContent = n;
    if (sub != null) hud.cdS.textContent = sub;
  };
  hud.flash = () => {
    hud.flashEl.classList.add("on");
    setTimeout(() => hud.flashEl.classList.remove("on"), 450);
  };
  hud.setStatus = (kind, text) => {
    hud.statEl.className = "stat" + (kind && kind !== "run" ? " " + kind : "");
    hud.statText.textContent = text;
  };
  hud.setScore = (v) => { hud.scoreVal.textContent = String(v); };

  /* ==================== 名牌 ==================== */

  hud.labEls = new Map();
  hud.buildUnitLabels = () => {
    hud.labelBox.innerHTML = "";
    hud.labEls.clear();
    (C.units || []).forEach((u, i) => {
      const el = z("div", { class: "lab", "data-u": i, style: unitVars(i) },
        z("i", { class: "ud" }), z("div", { class: "n" }, `${u.no} ${u.name}`));
      hud.labelBox.append(el);
      hud.labEls.set(`unit${i}`, { el });
    });
  };
  hud.addLabel = (id, { text, tone, icon: ic }, anchorFn, visibleFn) => {
    const el = z("div", { class: "lab", "data-tone": tone || "sci", style: "display:none" },
      z("i", { class: "ud" }), ic ? icon(ic) : null, z("div", { class: "n" }, text || ""));
    hud.labelBox.append(el);
    hud.labEls.set(id, { el, anchor: anchorFn, visible: visibleFn, custom: true });
    return el;
  };
  hud.clearCustomLabels = () => {
    for (const [id, L] of [...hud.labEls])
      if (L.custom) { L.el.remove(); hud.labEls.delete(id); }
  };
  /** 每帧投影：entries = [{id, x, y, visible, sel, dim}] */
  hud.placeLabels = (entries) => {
    for (const e of entries) {
      const L = hud.labEls.get(e.id);
      if (!L) continue;
      if (!e.visible) { L.el.style.display = "none"; continue; }
      L.el.style.display = "";
      L.el.style.transform = `translate3d(${e.x}px,${e.y}px,0) translate(-50%,-100%)`;
      L.el.classList.toggle("sel", !!e.sel);
      L.el.classList.toggle("dim", !!e.dim);
    }
  };

  return hud;
}

/* ==================== 中控台构建 ==================== */

/** api 由引擎提供：{ getS, setS, recordRow, recRows }；refFn 是「参考工况」按钮回调 */
function buildConsole(K, api, refFn) {
  const pane = z("div", { id: "console", class: "pane on" });
  const hud = {};
  const cur = { S: null, R: null };

  /* 主读数 kpi */
  if (K.main) {
    hud.kpiVv = z("div", { class: "vv" }, "—");
    hud.kpiPill = z("span", { class: "pill ok", style: "display:none" }, "");
    pane.append(z("div", { class: "kpi" },
      z("div", { class: "lb" }, K.main.label),
      z("div", { class: "st" }, hud.kpiPill),
      hud.kpiVv,
      z("div", { class: "cal" }, K.main.cal || "")));
  }

  /* 副读数 */
  const subs = K.subs || [];
  if (subs.length) {
    const grid = z("div", { class: "subs", style: `grid-template-columns:repeat(${Math.min(subs.length, 3)},1fr)` });
    hud.subEls = subs.map((s) => {
      const b = z("b", {}, "—");
      const bar = s.bar ? z("i") : null;
      const el = z("div", { class: "sub", "data-k": s.key },
        z("div", { class: "lb" }, s.label), b, z("div", { class: "cal" }, s.cal || ""),
        bar ? z("div", { class: "bar" }, bar) : null);
      grid.append(el);
      return { cfg: s, el, b, bar };
    });
    pane.append(grid);
  }

  /* 滑杆 */
  hud.slEls = {};
  for (const sl of K.sliders || []) {
    const discrete = (sl.max - sl.min) / (sl.step ?? 1) <= 10;
    const val = z("b", {}, "—");
    const fillEl = z("i", { class: "fill" });
    const band = sl.band
      ? z("span", { class: "band", style: {
          left: pct(sl, sl.band[0]) + "%",
          width: (pct(sl, sl.band[1]) - pct(sl, sl.band[0])) + "%",
        } })
      : null;
    const refEl = sl.ref != null
      ? z("i", { class: "ref", style: `left:calc(${pct(sl, sl.ref)}% - 1px)` })
      : null;
    const input = z("input", { type: "range", min: sl.min, max: sl.max, step: sl.step ?? 1, value: sl.ref ?? sl.min });
    const ticks = z("div", { class: "slx ticks" });
    for (const t of sl.ticks || []) {
      const c = z("span", { class: "cal" }, t.t);
      c.style.left = pct(sl, t.v) + "%";
      if (pct(sl, t.v) <= 3) c.classList.add("tk-lo");
      if (pct(sl, t.v) >= 96) c.classList.add("tk-hi");
      ticks.append(c);
    }
    const el = z("div", { class: "sl", "data-key": sl.key, "data-fill": sl.fill || "" },
      z("div", { class: "slh" }, z("span", { class: "lb" }, icon(sl.icon || "gauge"), sl.label), val),
      z("div", { class: "trk" }, band, fillEl, refEl, input),
      ticks);
    pane.append(el);
    hud.slEls[sl.key] = { cfg: sl, el, val, input, fill: fillEl };
    input.addEventListener("input", () => {
      let v = parseFloat(input.value);
      if (discrete) { v = Math.round(v); input.value = v; }
      api.setS(sl.key, v);
    });
  }

  /* 开关 */
  if ((K.switches || []).length) {
    const sws = z("div", { class: "sws" });
    hud.swEls = {};
    for (const sw of K.switches || []) {
      const st = z("span", { class: "st" }, "");
      let btn, segWrap = null, segBtns = null;
      if (sw.states) {
        segWrap = z("span", { class: "seg" });
        segBtns = sw.states.map((s) => {
          const b = z("button", {}, s.t);
          b.addEventListener("click", () => api.setS(sw.key, s.v));
          segWrap.append(b);
          return { v: s.v, b };
        });
        btn = { seg: true };
      } else {
        btn = z("button", { role: "switch" });
        btn.addEventListener("click", () => api.setS(sw.key, !api.getS(sw.key)));
      }
      const el = z("div", { class: "sw", "data-key": sw.key },
        z("span", { class: "nm" }, icon(sw.icon || "target"), sw.label),
        btn.seg ? segWrap : btn, st);
      sws.append(el);
      hud.swEls[sw.key] = { cfg: sw, el, st, btn, segBtns };
    }
    pane.append(sws);
  }

  /* 曲线图 */
  if (K.chart) {
    hud.chart = z("canvas", { id: "chart" });
    pane.append(z("div", { class: "chartwrap" },
      z("div", { class: "ch" }, z("b", {}, K.chart.title || "曲线"), z("span", {}, K.chart.legend || "")),
      hud.chart));
  }

  /* 风险条 */
  if (K.risk) {
    hud.riskBar = z("i");
    pane.append(z("div", { class: "risk" },
      z("span", { class: "lb" }, K.risk.label || "风险"),
      z("div", { class: "bar" }, hud.riskBar),
      z("span", { class: "cal" }, K.risk.cal || "")));
  }

  /* 考核目标条 */
  if (K.exam) {
    hud.goal = z("div", { class: "goal", style: "display:none" },
      z("span", { class: "gt" }, K.exam.goal?.title || "考核目标"),
      z("span", { class: "cal" }, K.exam.goal?.short || ""),
      z("span", { class: "pr" }, ""));
    pane.append(hud.goal);
  }

  /* 数据记录表 */
  if (K.record) {
    hud.recBody = z("tbody");
    const recBtn = K.record.row ? z("button", { class: "btn", onclick: () => api.recordRow() }, "记录一组") : null;
    pane.append(z("div", { class: "rec" },
      z("div", { class: "rh" }, z("b", {}, "数据记录"), recBtn),
      z("table", {}, hud.recBody)));
  }

  /* 底部操作区 */
  pane.append(z("div", { class: "acts" },
    z("button", { class: "btn", onclick: () => refFn?.() }, "参考工况")));

  /* ---------- 每帧刷新数值（不重建 DOM） ---------- */

  function refresh(S, R, exam, hiKey) {
    cur.S = S; cur.R = R;
    if (K.main) {
      const v = K.main.value ? K.main.value(S, R) : R[K.main.key];
      hud.kpiVv.textContent = K.main.fmt ? String(K.main.fmt(v)) : String(v ?? "—");
      if (K.main.pill) {
        const ok = K.main.pill.ok(S, R);
        hud.kpiPill.style.display = "";
        hud.kpiPill.className = "pill " + (ok ? "ok" : "no");
        hud.kpiPill.textContent = ok ? (K.main.pill.okText || "达标") : (K.main.pill.noText || "未达标");
      }
    }
    for (const s of hud.subEls || []) {
      const { cfg, el, b, bar } = s;
      const v = cfg.value ? cfg.value(S, R) : cfg.fmt ? cfg.fmt(R[cfg.key]) : R[cfg.key];
      b.textContent = v == null ? "—" : String(v);
      el.classList.toggle("bad", !!(cfg.bad && cfg.bad(S, R)));
      if (bar && cfg.bar) {
        const num = parseFloat(String(v).replace(/[^\d.\-eE+]/g, "")) || 0;
        bar.style.width = `${Math.min(100, Math.max(0, ((num - cfg.bar[0]) / (cfg.bar[1] - cfg.bar[0])) * 100))}%`;
      }
    }
    for (const [key, s] of Object.entries(hud.slEls || {})) {
      const { cfg, el, val, input, fill } = s;
      const v = api.getS(key);
      if (document.activeElement !== input) input.value = v;
      val.innerHTML = cfg.fmt
        ? String(cfg.fmt(v))
        : `${Number(v).toFixed((cfg.step ?? 1) < 1 ? 2 : 0)}${cfg.unit ? `<small>${cfg.unit}</small>` : ""}`;
      fill.style.width = pct(cfg, v) + "%";
      el.classList.toggle("hi", hiKey === key);
    }
    for (const [key, s] of Object.entries(hud.swEls || {})) {
      const { cfg, el, st, btn, segBtns } = s;
      const v = api.getS(key);
      if (btn.seg) {
        segBtns.forEach(({ v: sv, b }) => b.classList.toggle("on", sv === v));
        const meta = (cfg.states || []).find((m) => m.v === v);
        st.textContent = meta ? meta.t : "";
      } else {
        btn.classList.toggle("on", !!v);
        st.textContent = v ? cfg.on : cfg.off;
      }
      el.classList.toggle("bad", !!(cfg.bad && cfg.bad(S, R)));
      el.classList.toggle("hi", hiKey === key);
    }
    if (hud.chart) drawChart(S, R);
    if (K.risk) {
      const v = K.risk.value(S, R);
      hud.riskBar.style.left = `${Math.min(100, Math.max(0, v * 100))}%`;
      hud.riskBar.classList.toggle("hot", v > (K.risk.warn ?? 0.4));
    }
    if (K.exam && hud.goal) {
      hud.goal.style.display = exam.active ? "" : "none";
      hud.goal.classList.toggle("win", exam.won);
      hud.goal.querySelector(".pr").textContent = exam.won
        ? "✓ 达标"
        : exam.active
          ? `保持 ${Math.max(0, (K.exam.hold || 15) - exam.held).toFixed(0)}s`
          : "";
    }
    if (K.record && K.record.rows) refreshRows(K.record.rows(S, R), K.record);
    else if (K.record && K.record.row) refreshRows(api.recRows(), K.record);
  }

  function drawChart(S, R) {
    const cv = hud.chart;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    }
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const ch = K.chart, X = ch.x, Y = ch.y;
    const px = (x) => 30 + ((x - X.min) / (X.max - X.min || 1)) * (W - 38);
    const py = (y) => H - 16 - ((y - Y.min) / (Y.max - Y.min || 1)) * (H - 26);
    g.font = "10px sans-serif";
    g.fillStyle = "rgba(14,26,43,.45)";
    g.strokeStyle = "rgba(14,26,43,.08)";
    g.lineWidth = 1;
    g.textAlign = "center";
    for (const t of X.ticks || []) g.fillText(String(t), px(t), H - 4);
    g.textAlign = "right";
    for (const t of Y.ticks || []) {
      g.fillText(String(t), 26, py(t) + 3);
      g.beginPath(); g.moveTo(30, py(t)); g.lineTo(W - 8, py(t)); g.stroke();
    }
    const band = Array.isArray(ch.bandY) ? ch.bandY : ch.bandY?.range;
    if (band) {
      g.fillStyle = "rgba(16,185,129,.10)";
      g.fillRect(30, py(band[1]), W - 38, py(band[0]) - py(band[1]));
    }
    if (ch.line != null) {
      g.strokeStyle = "rgba(16,185,129,.6)";
      g.setLineDash([4, 3]);
      g.beginPath(); g.moveTo(30, py(ch.line)); g.lineTo(W - 8, py(ch.line)); g.stroke();
      g.setLineDash([]);
    }
    const data = ch.data ? ch.data(S, R) : null;
    if (data) {
      const stroke = (pts, dash) => {
        if (!pts || pts.length < 2) return;
        g.strokeStyle = dash ? "rgba(14,26,43,.4)" : "#2F6BFF";
        g.lineWidth = dash ? 1.5 : 2;
        g.setLineDash(dash ? [5, 4] : []);
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(px(x), py(y)) : g.moveTo(px(x), py(y))));
        g.stroke();
        g.setLineDash([]);
      };
      stroke(data.curve, false);
      stroke(data.dash, true);
      if (data.dots) {
        g.fillStyle = "#13B8C6";
        for (const [x, y] of data.dots) { g.beginPath(); g.arc(px(x), py(y), 2.5, 0, 7); g.fill(); }
      }
      if (data.at) {
        const [x, y] = data.at;
        g.fillStyle = "#2F6BFF";
        g.beginPath(); g.arc(px(x), py(y), 4, 0, 7); g.fill();
        g.strokeStyle = "rgba(47,107,255,.35)";
        g.beginPath(); g.arc(px(x), py(y), 8, 0, 7); g.stroke();
      }
    }
  }

  function refreshRows(rows, cfg) {
    hud.recBody.innerHTML = "";
    if (!rows || !rows.length) {
      hud.recBody.append(z("tr", { class: "empty" },
        z("td", { colspan: String((cfg.cols || []).length + 1) }, "还没有记录")));
      return;
    }
    hud.recBody.append(z("tr", {}, z("th", {}, "#"),
      ...(cfg.cols || []).map((c) => z("th", {}, c.label + (c.unit || "")))));
    const hi = cfg.hi ? cfg.hi(cur.S, cur.R, rows) : null;
    rows.forEach((r, i) => {
      hud.recBody.append(z("tr", { class: hi === i ? "hi" : "" },
        z("td", {}, String(i + 1)),
        ...(cfg.cols || []).map((c) => z("td", {}, c.fmt ? String(c.fmt(r[c.key])) : String(r[c.key])))));
    });
  }

  function redrawChart(S, R) { if (hud.chart) drawChart(S, R); }

  return { pane, refresh, redrawChart };
}

function pct(sl, v) {
  return Math.max(0, Math.min(100, ((v - sl.min) / (sl.max - sl.min || 1)) * 100));
}
