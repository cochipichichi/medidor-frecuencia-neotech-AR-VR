// app.js final - asegura que el botón sí abre el viewer y que hay canvas
import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js";

const hero = document.getElementById("hero");
const viewer = document.getElementById("viewer");
const openViewer = document.getElementById("open-viewer");
const openViewerNav = document.getElementById("open-viewer-nav");
const closeViewer = document.getElementById("close-viewer");
const xrBadge = document.getElementById("xr-badge");

const searchOverlay = document.getElementById("search-overlay");
const searchInput = document.getElementById("search-input");
const searchClose = document.getElementById("search-close");

const btnHome = document.getElementById("btn-home");
const btnVoice = document.getElementById("btn-voice");
const btnTheme = document.getElementById("btn-theme");
const btnPlus = document.getElementById("btn-plus");
const btnMinus = document.getElementById("btn-minus");
const btnLang = document.getElementById("btn-lang");
const btnFocus = document.getElementById("btn-focus");
const btnSearch = document.getElementById("btn-search");

const canvas = document.getElementById("three-canvas");
const btnMic = document.getElementById("btn-mic");
const btnDemo = document.getElementById("btn-demo");
const smoothingEl = document.getElementById("smoothing");
const binsEl = document.getElementById("bins");
const btnAR = document.getElementById("btn-ar");
const btnVR = document.getElementById("btn-vr");
const xrStatus = document.getElementById("xr-status");
const logList = document.getElementById("event-log-list");
const presetRainbow = document.getElementById("preset-rainbow");
const presetDense = document.getElementById("preset-dense");
const presetSpace = document.getElementById("preset-space");

let scene, camera, renderer, controls;
let analyser = null;
let dataArray = null;
let bars = [];
let currentBins = 48;
let audioCtx = null;
let sourceNode = null;
let wavePlane, wavePlaneGeo;
let currentLang = "es";
let useDemo = false;

function logEvent(msg) {
  if (!logList) return;
  const li = document.createElement("li");
  const time = new Date().toLocaleTimeString();
  li.textContent = `[${time}] ${msg}`;
  logList.prepend(li);
  if (logList.childNodes.length > 40) {
    logList.removeChild(logList.lastChild);
  }
}

function showViewer() {
  hero.classList.add("hidden");
  viewer.classList.remove("hidden");
  if (!window.__threeInited) {
    init3D();
    animate();
    window.__threeInited = true;
    logEvent("3D inicializado");
  }
}

if (openViewer) openViewer.addEventListener("click", showViewer);
if (openViewerNav) openViewerNav.addEventListener("click", showViewer);
if (closeViewer) closeViewer.addEventListener("click", () => {
  viewer.classList.add("hidden");
  hero.classList.remove("hidden");
  logEvent("Volvió al inicio");
});

// inclusive controls
if (btnHome) btnHome.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
if (btnTheme) btnTheme.addEventListener("click", () => document.body.classList.toggle("theme-light"));
if (btnPlus) btnPlus.addEventListener("click", () => {
  const c = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--font-base") || "16");
  document.documentElement.style.setProperty("--font-base", Math.min(c + 1, 22) + "px");
});
if (btnMinus) btnMinus.addEventListener("click", () => {
  const c = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--font-base") || "16");
  document.documentElement.style.setProperty("--font-base", Math.max(c - 1, 12) + "px");
});
if (btnFocus) btnFocus.addEventListener("click", () => document.body.classList.toggle("focus-mode"));
if (btnSearch) btnSearch.addEventListener("click", () => {
  searchOverlay.classList.add("show");
  document.body.classList.add("no-scroll");
  searchInput.focus();
});
if (searchClose) searchClose.addEventListener("click", () => {
  searchOverlay.classList.remove("show");
  document.body.classList.remove("no-scroll");
  btnSearch && btnSearch.focus();
});
if (searchOverlay) searchOverlay.addEventListener("click", (e) => {
  if (e.target === searchOverlay) {
    searchOverlay.classList.remove("show");
    document.body.classList.remove("no-scroll");
  }
});
if (searchInput) {
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = searchInput.value.toLowerCase();
      const target = [...document.querySelectorAll("h1,h2,h3,p,span,button")].find(n => n.textContent.toLowerCase().includes(q));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      searchOverlay.classList.remove("show");
      document.body.classList.remove("no-scroll");
    }
  });
}
if (btnVoice) btnVoice.addEventListener("click", () => {
  const txt = currentLang === "es"
    ? "Estás en el visualizador sonoro de Neotech. Pulsa abrir visualizador para ver el espectro en 3D."
    : "You are in the Neotech sound visualizer. Press open viewer to see the 3D spectrum.";
  if ("speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = currentLang === "es" ? "es-ES" : "en-US";
    speechSynthesis.speak(u);
  } else {
    alert(txt);
  }
});

// idioma
if (btnLang) btnLang.addEventListener("click", () => {
  currentLang = currentLang === "es" ? "en" : "es";
  applyLang();
  logEvent("Idioma cambiado a " + currentLang);
});

function applyLang() {
  const dict = {
    es: {
      "hero-title": "Visualizador de frecuencia 3D",
      "hero-sub": "Analiza el audio del micrófono, míralo como una malla viva y lánzalo a AR o VR si tu dispositivo lo soporta.",
      "open-viewer": "Abrir visualizador 3D",
      "see-features": "Ver características",
      "hero-hint": "Recomendado: Chrome / Samsung Internet + HTTPS + Android con WebXR.",
      "preview-title": "Espectro en tiempo real",
      "preview-footer": "Entrada: Micrófono",
      "feat1-title": "Captura en vivo",
      "feat1-text": "Toma el audio del micrófono y lo convierte en datos de frecuencia.",
      "feat2-title": "Malla reactiva",
      "feat2-text": "Una superficie wireframe que respira con el sonido.",
      "feat3-title": "AR / VR",
      "feat3-text": "Botones dedicados para lanzar en WebXR si el navegador lo soporta.",
      "panel-title": "Panel de control",
      "btn-mic": "Activar micrófono",
      "btn-demo": "Modo demo (sin micro)",
      "lbl-smoothing": "Suavizado",
      "lbl-bins": "Barras",
      "presets": "Presets visuales",
      "xr-title": "Realidad extendida",
      "xr-status": "Sin sesión XR",
      "events": "Eventos",
      "back": "Volver al inicio",
      "note": "AR/VR requiere HTTPS y navegador con WebXR."
    },
    en: {
      "hero-title": "3D Frequency Visualizer",
      "hero-sub": "Analyze microphone audio, see it as a living mesh and send it to AR/VR if your device supports it.",
      "open-viewer": "Open 3D viewer",
      "see-features": "See features",
      "hero-hint": "Recommended: Chrome / Samsung Internet + HTTPS + Android with WebXR.",
      "preview-title": "Real-time spectrum",
      "preview-footer": "Input: Microphone",
      "feat1-title": "Live capture",
      "feat1-text": "Takes microphone audio and turns it into frequency data.",
      "feat2-title": "Reactive mesh",
      "feat2-text": "A wireframe surface that breathes with sound.",
      "feat3-title": "AR / VR",
      "feat3-text": "Dedicated buttons to launch WebXR if supported.",
      "panel-title": "Control panel",
      "btn-mic": "Enable microphone",
      "btn-demo": "Demo mode (no mic)",
      "lbl-smoothing": "Smoothing",
      "lbl-bins": "Bars",
      "presets": "Visual presets",
      "xr-title": "Extended reality",
      "xr-status": "No XR session",
      "events": "Events",
      "back": "Back to home",
      "note": "AR/VR requires HTTPS and a WebXR-enabled browser."
    }
  };
  const t = dict[currentLang];
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (t[key]) el.textContent = t[key];
  });
}
applyLang();

// detect XR
(async () => {
  if (!xrBadge) return;
  if (!navigator.xr) {
    xrBadge.textContent = "XR no disponible en este navegador";
    xrBadge.className = "xr-badge xr-bad";
    return;
  }
  try {
    const supAR = await navigator.xr.isSessionSupported("immersive-ar");
    const supVR = await navigator.xr.isSessionSupported("immersive-vr");
    if (supAR || supVR) {
      xrBadge.textContent = "XR disponible ✅";
      xrBadge.className = "xr-badge xr-ok";
    } else {
      xrBadge.textContent = "XR no soportado en este dispositivo";
      xrBadge.className = "xr-badge xr-bad";
    }
  } catch (e) {
    xrBadge.textContent = "No se pudo detectar XR";
    xrBadge.className = "xr-badge xr-bad";
  }
})();

// 3D
function init3D() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(65, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 2.6, 5);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  resizeRenderer();
  renderer.xr.enabled = true;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 1.1);
  dir.position.set(3, 5, 2);
  scene.add(dir);

  // malla
  wavePlaneGeo = new THREE.PlaneGeometry(6, 6, 48, 48);
  const waveMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("hsl(200, 80%, 35%)"),
    wireframe: true,
    emissive: 0x001122,
    metalness: 0.1,
    roughness: 0.6
  });
  wavePlane = new THREE.Mesh(wavePlaneGeo, waveMat);
  wavePlane.rotation.x = -Math.PI / 2;
  wavePlane.position.y = -0.2;
  scene.add(wavePlane);

  createBars(currentBins);

  window.addEventListener("resize", resizeRenderer);
}

function createBars(count) {
  bars.forEach(b => scene.remove(b));
  bars = [];
  const radius = 1.6;
  for (let i = 0; i < count; i++) {
    const geo = new THREE.BoxGeometry(0.08, 0.5, 0.08);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("hsl(" + (i / count) * 240 + ", 80%, 55%)"),
      emissive: 0x000000
    });
    const mesh = new THREE.Mesh(geo, mat);
    const angle = (i / count) * Math.PI * 2;
    mesh.position.set(Math.cos(angle) * radius, 0.25, Math.sin(angle) * radius);
    mesh.userData.angle = angle;
    scene.add(mesh);
    bars.push(mesh);
  }
}

// mic
btnMic.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = parseFloat(smoothingEl.value);
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    sourceNode = audioCtx.createMediaStreamSource(stream);
    sourceNode.connect(analyser);
    xrStatus.textContent = currentLang === "es" ? "Micrófono activo ✅" : "Microphone active ✅";
    useDemo = false;
    logEvent("Micrófono activado");
  } catch (err) {
    xrStatus.textContent = (currentLang === "es" ? "No se pudo acceder al micrófono: " : "Cannot access mic: ") + err.message;
    logEvent("Error mic: " + err.message);
  }
});

// demo
btnDemo.addEventListener("click", () => {
  useDemo = !useDemo;
  btnDemo.classList.toggle("on", useDemo);
  xrStatus.textContent = useDemo
    ? (currentLang === "es" ? "Modo demo activo 🎧" : "Demo mode active 🎧")
    : (currentLang === "es" ? "Modo demo apagado" : "Demo mode off");
  logEvent(useDemo ? "Modo demo activado" : "Modo demo desactivado");
});

smoothingEl.addEventListener("input", () => {
  if (analyser) analyser.smoothingTimeConstant = parseFloat(smoothingEl.value);
});
binsEl.addEventListener("input", () => {
  currentBins = parseInt(binsEl.value, 10);
  createBars(currentBins);
  logEvent("Barras ajustadas a " + currentBins);
});

// presets
presetRainbow.addEventListener("click", () => {
  bars.forEach((mesh, i) => {
    mesh.material.color = new THREE.Color("hsl(" + (i / bars.length) * 360 + ", 80%, 55%)");
  });
  logEvent("Preset arcoíris aplicado");
});
presetDense.addEventListener("click", () => {
  if (wavePlane) {
    const newGeo = new THREE.PlaneGeometry(6, 6, 80, 80);
    wavePlane.geometry.dispose();
    wavePlane.geometry = newGeo;
    wavePlaneGeo = newGeo;
    logEvent("Preset malla densa aplicado");
  }
});
presetSpace.addEventListener("click", () => {
  scene.background = new THREE.Color(0x020617);
  logEvent("Preset fondo espacio aplicado");
});

// AR
btnAR.addEventListener("click", async () => {
  if (!navigator.xr) {
    xrStatus.textContent = currentLang === "es"
      ? "navigator.xr no disponible (HTTPS / WebXR necesario)"
      : "navigator.xr not available (HTTPS / WebXR needed)";
    logEvent("AR: navigator.xr no disponible");
    return;
  }
  const supported = await navigator.xr.isSessionSupported("immersive-ar");
  if (!supported) {
    xrStatus.textContent = currentLang === "es" ? "AR no soportado aquí." : "AR not supported here.";
    logEvent("AR no soportado");
    return;
  }
  xrStatus.textContent = currentLang === "es" ? "Iniciando AR..." : "Starting AR...";
  try {
    const session = await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["local"]
    });
    renderer.xr.setSession(session);
    xrStatus.textContent = currentLang === "es" ? "AR activo ✅" : "AR active ✅";
    logEvent("AR activo");
  } catch (err) {
    xrStatus.textContent = (currentLang === "es" ? "Error AR: " : "AR error: ") + err.message;
    logEvent("Error AR: " + err.message);
  }
});

// VR
btnVR.addEventListener("click", async () => {
  if (!navigator.xr) {
    xrStatus.textContent = currentLang === "es"
      ? "navigator.xr no disponible (HTTPS / WebXR necesario)"
      : "navigator.xr not available (HTTPS / WebXR needed)";
    logEvent("VR: navigator.xr no disponible");
    return;
  }
  const supported = await navigator.xr.isSessionSupported("immersive-vr");
  if (!supported) {
    xrStatus.textContent = currentLang === "es" ? "VR no soportado." : "VR not supported.";
    logEvent("VR no soportado");
    return;
  }
  xrStatus.textContent = currentLang === "es" ? "Iniciando VR..." : "Starting VR...";
  try {
    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor"]
    });
    renderer.xr.setSession(session);
    xrStatus.textContent = currentLang === "es" ? "VR activo ✅" : "VR active ✅";
    logEvent("VR activo");
  } catch (err) {
    xrStatus.textContent = (currentLang === "es" ? "Error VR: " : "VR error: ") + err.message;
    logEvent("Error VR: " + err.message);
  }
});

function animate() {
  renderer.setAnimationLoop(render);
}

let t = 0;
function render() {
  t += 0.015;

  let audioLevel = 0;
  if (useDemo) {
    audioLevel = 0.4 + 0.3 * Math.sin(t * 2.0);
    bars.forEach((mesh, i) => {
      const v = 0.3 + 0.6 * Math.abs(Math.sin(t * 2 + i * 0.2));
      const h = 0.4 + v * 3.5;
      mesh.scale.y = h;
      mesh.position.y = h / 2;
      mesh.rotation.y += 0.003 + v * 0.01;
    });
  } else if (analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray);
    for (let i = 0; i < currentBins; i++) {
      const mesh = bars[i];
      if (!mesh) continue;
      const v = dataArray[i] / 255;
      const h = 0.4 + v * 3.5;
      mesh.scale.y = h;
      mesh.position.y = h / 2;
      mesh.rotation.y += 0.002 + v * 0.01;
      audioLevel += v;
    }
    audioLevel = audioLevel / currentBins;
  }

  if (wavePlaneGeo) {
    const pos = wavePlaneGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      const baseWave = Math.sin(dist * 2.5 - t * 4) * 0.12;
      const audioBump = audioLevel ? audioLevel * 0.35 * Math.cos(dist * 3 - t * 5) : 0;
      pos.setY(i, baseWave + audioBump);
    }
    pos.needsUpdate = true;
    wavePlaneGeo.computeVertexNormals();
  }

  controls.update();
  renderer.render(scene, camera);
}

function resizeRenderer() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
