/**
 * world3d.js · 3D 基础设施（渲染器/影棚灯光/相机轨道/材质套件/canvas 纹理）
 *
 * 这是「清透实验室」质感的地基：课程 world.build(ctx) 收到的 ctx.scene / ctx.kit
 * 都来自这里。所有课件共用，一般不需要按课程修改。
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/* ---------------- 小工具 ---------------- */

export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const col = (hex) => new THREE.Color(hex);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** 帧率无关的目标缓动：cur 向 target 靠近，rate 越大越快 */
export function easeToward(cur, target, dt, rate) {
  return cur + (target - cur) * Math.min(1, dt * rate);
}

/* ---------------- 补间（tween） ---------------- */

const tweens = new Set();

/** 数值补间：把 obj[key] 从当前值补到 to，dur 秒 */
export function tween(obj, key, to, dur = 0.5, onDone) {
  const from = typeof obj[key] === "number" ? obj[key] : Number(obj[key]) || 0;
  if (!Number.isFinite(from) || !Number.isFinite(to) || dur <= 0) {
    obj[key] = to;
    onDone && onDone();
    return;
  }
  // 同一对象同一键只保留最新补间
  for (const t of tweens) if (t.obj === obj && t.key === key) tweens.delete(t);
  tweens.add({ obj, key, from, to, t: 0, dur, onDone });
}

/** 相机飞行：pos/target 一起缓动（步骤运镜用）。非有限输入直接忽略，绝不让 NaN 进入相机。 */
export function flyCamera(cam, controls, pos, tgt, dur = 0.8) {
  if (!isFiniteV3(pos) || !isFiniteV3(tgt) || !isFiniteV3(cam.position) || !isFiniteV3(controls.target)) return;
  const p0 = cam.position.clone(), t0 = controls.target.clone();
  const state = { k: 0 };
  for (const t of [...tweens]) if (t.tag === "cam") tweens.delete(t);
  tweens.add({
    tag: "cam", obj: state, key: "k", from: 0, to: 1, dur,
    onDone: null,
    __custom: (k) => {
      const e = easeInOut(k);
      cam.position.lerpVectors(p0, pos, e);
      controls.target.lerpVectors(t0, tgt, e);
      cam.lookAt(controls.target);
      controls.update();
    },
  });
}

/** 取消某对象某键的补间（用户输入打断） */
export function cancelTween(obj, key) {
  for (const t of [...tweens]) if (t.obj === obj && t.key === key) tweens.delete(t);
}

export function stepTweens(dt) {
  for (const t of [...tweens]) {
    t.t += dt;
    const k = clamp(t.t / t.dur, 0, 1);
    if (t.__custom) t.__custom(k);
    else t.obj[t.key] = lerp(t.from, t.to, easeInOut(k));
    if (k >= 1) {
      tweens.delete(t);
      if (!t.__custom && t.onDone) t.onDone();
    }
  }
}

/* ---------------- 渲染器 / 场景 / 影棚 ---------------- */

/**
 * 初始化渲染器与场景。
 * @param tone  world.TONE：{ preset:"studio", size:场景特征尺度(米), sun:[x,y,z], envIntensity, floor:"none"|色值, bg:背景色 }
 */
export function initGL(canvas, tone = {}) {
  const size = tone.size ?? 1.6;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = col(tone.bg ?? "#eef3fb");
  scene.fog = new THREE.Fog(scene.background, size * 8, size * 40);

  // 环境贴图：给 PBR 材质反射（RoomEnvironment 是 three 官方棚拍环境）
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  if (tone.envIntensity != null) scene.environmentIntensity = tone.envIntensity;

  // 影棚三点光：半球底光 + 主光（可投影）+ 补光
  const hemi = new THREE.HemisphereLight("#e8f0fa", "#ffffff", 0.85);
  scene.add(hemi);
  const sunPos = tone.sun && tone.sun[1] > 0 ? tone.sun : [size * 2.2, size * 4, size * 1.6];
  const key = new THREE.DirectionalLight("#ffffff", 1.7);
  key.position.set(...sunPos);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const cam = key.shadow.camera;
  const R = size * 2.2;
  cam.left = -R; cam.right = R; cam.top = R; cam.bottom = -R; cam.near = 0.1; cam.far = size * 14;
  key.shadow.bias = -0.00035;
  key.shadow.normalBias = size * 0.004;
  scene.add(key);
  const fill = new THREE.DirectionalLight("#dfe9f6", 0.5);
  fill.position.set(-sunPos[0] * 0.8, sunPos[1] * 0.5, -sunPos[2]);
  scene.add(fill);

  // 地面（台面之外的大地面）；floor:"none" 则不建
  if (tone.floor !== "none") {
    const floorY = tone.floorY ?? 0;
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(size * 20, 48),
      new THREE.MeshStandardMaterial({ color: col(tone.floor ?? "#eceef0"), roughness: 0.95, metalness: 0, side: THREE.DoubleSide }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = floorY - 0.001;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  return { renderer, scene, envTex };
}

/**
 * 相机 + 轨道控制。CAMERA 约定：
 * { pitch(°), yaw?(rad), polar:[min,max](°), dist?[min,max], ty, focusY:[a,b], homeBox, fov?, orbitYaw?:'free' }
 */
export function initCamera(canvas, CAMERA) {
  const fov = CAMERA.fov ?? 34;
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.01, 3000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  /* 极角（仰望/俯视角度）默认完全自由；仅当课程显式写 clampPolar:true 时才用 polar 区间夹持 */
  if (CAMERA.clampPolar && Array.isArray(CAMERA.polar)) {
    const polar = CAMERA.polar;
    controls.minPolarAngle = (polar[0] * Math.PI) / 180;
    controls.maxPolarAngle = (polar[1] * Math.PI) / 180;
  }
  if (CAMERA.dist) { controls.minDistance = CAMERA.dist[0]; controls.maxDistance = CAMERA.dist[1]; }
  camera.position.set(6, 4, 8);
  return { camera, controls };
}

/** 非有限向量检测（NaN/Infinity 任意一种都算脏） */
const isFiniteV3 = (v) =>
  !!v && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);

/** 包围盒 → 相机机位（box fit）。空包围盒/非有限输入返回 null，调用方自行兜底。 */
export function poseForBox(box3, camera, opts = {}) {
  if (!box3 || box3.isEmpty()) return null;
  const center = box3.getCenter(new THREE.Vector3());
  const size = box3.getSize(new THREE.Vector3());
  if (!isFiniteV3(center) || !isFiniteV3(size)) return null;
  const radius = Math.max(size.x, size.y, size.z, 0.001) * 0.5 + 0.001;
  const pitch = ((opts.pitch ?? 22) * Math.PI) / 180;
  const yaw = opts.yaw ?? (-0.2 * Math.PI) / 180 * 57.3; // 默认微偏，避免正对
  const fov = (camera.fov * Math.PI) / 180;
  const dist = (radius / Math.sin(fov / 2)) * 1.08 * (opts.air ?? 1.05);
  const tgt = center.clone();
  tgt.y += (opts.ty ?? 0) * size.y;
  const pos = new THREE.Vector3(
    tgt.x + dist * Math.cos(pitch) * Math.sin(yaw),
    tgt.y + dist * Math.sin(pitch),
    tgt.z + dist * Math.cos(pitch) * Math.cos(yaw),
  );
  return { pos, tgt, dist };
}

/* ---------------- 材质套件（kit） ---------------- */

/**
 * xu(renderer) 的等价物：环境反射 + 四个材质工厂。
 * 玻璃/液体用 onBeforeCompile 注入菲涅尔，配合 depthWrite:false + renderOrder 分层。
 */
export function makeKit(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  function glass(color = "#dfe9ef", o = {}) {
    const face = o.face ?? 0.08, edge = o.edge ?? 0.3, cap = o.cap ?? 0.42;
    const m = new THREE.MeshPhysicalMaterial({
      color: col(color),
      transparent: true,
      opacity: face,
      roughness: 0.12,
      metalness: 0,
      transmission: 0,
      side: o.side ?? THREE.DoubleSide,
      depthWrite: false,
      envMap: env,
      envMapIntensity: (o.env ?? 1.5),
    });
    const edgeColor = new THREE.Color(o.edgeColor ?? "#9fb4c4");
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uEdge = { value: edge };
      sh.uniforms.uCap = { value: cap };
      sh.uniforms.uEdgeColor = { value: edgeColor };
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", `#include <common>
          uniform float uEdge; uniform float uCap; uniform vec3 uEdgeColor;`)
        .replace("#include <dithering_fragment>", `
          float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.2);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uEdgeColor, clamp(fres * uEdge, 0.0, uCap));
          #include <dithering_fragment>`);
    };
    m.customProgramCacheKey = () => "glass" + face + edge + cap;
    return m;
  }

  function liquid(color = "#7d95a4", o = {}) {
    const opacity = o.opacity ?? 0.86, rim = o.rim ?? 0.45;
    const m = new THREE.MeshPhysicalMaterial({
      color: col(color),
      transparent: true,
      opacity,
      roughness: 0.25,
      metalness: 0,
      depthWrite: false,
      envMap: env,
      envMapIntensity: 0.8,
    });
    const dark = new THREE.Color(o.edgeDark != null ? shade(o.edgeDark, color) : color);
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uRim = { value: rim };
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uRim;")
        .replace("#include <dithering_fragment>", `
          float facing = abs(dot(normalize(vNormal), normalize(vViewPosition)));
          gl_FragColor.a *= mix(1.0, clamp(facing, 0.0, 1.0), uRim);
          #include <dithering_fragment>`);
    };
    m.userData.edgeColor = dark;
    m.customProgramCacheKey = () => "liquid" + opacity + rim;
    return m;
  }

  function mat(color, o = {}) {
    return new THREE.MeshStandardMaterial({
      color: col(color),
      roughness: o.roughness ?? 0.6,
      metalness: o.metalness ?? 0.05,
      envMap: env,
      envMapIntensity: o.env ?? 1,
      emissive: col(o.emissive ?? color),
      emissiveIntensity: o.glow ?? 0,
      transparent: !!o.transparent,
      opacity: o.opacity ?? 1,
      depthWrite: o.depthWrite ?? true,
      side: o.side ?? THREE.FrontSide,
    });
  }

  return { env, glass, liquid, mat };
}

function shade(f, hex) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return "#" + c.getHexString();
}

/* ---------------- canvas 纹理（无图片资源的全部秘密） ---------------- */

/**
 * 文字板：canvas 画字 → CanvasTexture。脏检查：set(text) 只在变化时重绘。
 * 返回 { tex, set(text), mesh(w,h) }
 */
export function textPlate({ w = 256, h = 96, bg = "#fbfaf6", fg = "#1d2633", edge, px = 42, weight = 600, radius = 18 } = {}) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  let cur = null;
  function draw(text) {
    if (text === cur) return;
    cur = text;
    g.clearRect(0, 0, w, h);
    if (bg) {
      g.fillStyle = bg;
      g.beginPath();
      g.roundRect(2, 2, w - 4, h - 4, radius);
      g.fill();
    }
    if (edge) {
      g.strokeStyle = edge;
      g.lineWidth = 3;
      g.beginPath();
      g.roundRect(6, 6, w - 12, h - 12, Math.max(4, radius - 4));
      g.stroke();
    }
    if (text) {
      g.fillStyle = fg;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = `${weight} ${px}px "PingFang SC","Microsoft YaHei",sans-serif`;
      g.fillText(text, w / 2, h / 2 + 1, w - 20);
    }
    tex.needsUpdate = true;
  }
  draw("");
  return {
    tex,
    set: draw,
    mesh(wm = w / 200, hm = h / 200) {
      return new THREE.Mesh(
        new THREE.PlaneGeometry(wm, hm),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
      );
    },
  };
}

/** 旋转体剖面助手：点列 [ [r,y]… ] → LatheGeometry */
export function lathe(points, seg = 40, mat) {
  const pts = points.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0002), y));
  return new THREE.Mesh(new THREE.LatheGeometry(pts, seg), mat);
}

/** 释放：遍历释放 geometry / material / map */
export function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      if (m.map) m.map.dispose();
      m.dispose();
    }
  });
}

/** 站位聚焦环（地上识别色圆环，随 unit 选中亮起） */
export function makeRing({ x, z, r = 0.09, w = 0.004, y = 0.001 }, colorHex, kit) {
  const geo = new THREE.RingGeometry(r - w, r, 48);
  const m = new THREE.MeshBasicMaterial({
    color: col(colorHex), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.renderOrder = 2;
  return {
    mesh,
    set(k) { m.opacity = 0.85 * k; mesh.visible = k > 0.02; },
  };
}
