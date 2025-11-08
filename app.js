// app.js - versión real con WebXR (si el navegador lo soporta)
import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js";
import { XRButton } from "https://unpkg.com/three@0.161.0/examples/jsm/webxr/XRButton.js";

const canvas = document.getElementById("three-canvas");
const btnMic = document.getElementById("btn-mic");
const smoothingEl = document.getElementById("smoothing");
const binsEl = document.getElementById("bins");
const btnAR = document.getElementById("btn-ar");
const btnVR = document.getElementById("btn-vr");
const xrStatus = document.getElementById("xr-status");

let scene, camera, renderer, controls;
let analyser = null;
let dataArray = null;
let bars = [];
let currentBins = parseInt(binsEl.value, 10);
let audioCtx = null;
let sourceNode = null;

// init three
init3D();
animate();

function init3D() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(65, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 2.5, 5);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  resizeRenderer();

  renderer.xr.enabled = true;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // luz
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 1);
  dir.position.set(3, 5, 2);
  scene.add(dir);

  // base
  const grid = new THREE.GridHelper(8, 16, 0x2dd4bf, 0x0f172a);
  grid.position.y = -0.01;
  scene.add(grid);

  createBars(currentBins);

  window.addEventListener("resize", resizeRenderer);
}

function createBars(count) {
  // clean previous
  bars.forEach(b => scene.remove(b));
  bars = [];
  // place them in a circle
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

function resizeRenderer() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
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
    xrStatus.textContent = "Micrófono activo ✅";
  } catch (err) {
    console.error(err);
    xrStatus.textContent = "No se pudo acceder al micrófono: " + err.message;
  }
});

smoothingEl.addEventListener("input", () => {
  if (analyser) {
    analyser.smoothingTimeConstant = parseFloat(smoothingEl.value);
  }
});
binsEl.addEventListener("input", () => {
  currentBins = parseInt(binsEl.value, 10);
  createBars(currentBins);
});

// XR buttons (real)
btnAR.addEventListener("click", async () => {
  if (!navigator.xr) {
    xrStatus.textContent = "navigator.xr no disponible (usa HTTPS / navegador con WebXR)";
    return;
  }
  const supported = await navigator.xr.isSessionSupported("immersive-ar");
  if (!supported) {
    xrStatus.textContent = "AR no soportado en este dispositivo/navegador.";
    return;
  }
  xrStatus.textContent = "Iniciando AR...";
  try {
    const session = await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["local"]
    });
    renderer.xr.setSession(session);
    xrStatus.textContent = "AR activo ✅";
  } catch (err) {
    xrStatus.textContent = "Error AR: " + err.message;
  }
});

btnVR.addEventListener("click", async () => {
  if (!navigator.xr) {
    xrStatus.textContent = "navigator.xr no disponible (usa HTTPS / navegador con WebXR)";
    return;
  }
  const supported = await navigator.xr.isSessionSupported("immersive-vr");
  if (!supported) {
    xrStatus.textContent = "VR no soportado.";
    return;
  }
  xrStatus.textContent = "Iniciando VR...";
  try {
    const session = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor"]
    });
    renderer.xr.setSession(session);
    xrStatus.textContent = "VR activo ✅";
  } catch (err) {
    xrStatus.textContent = "Error VR: " + err.message;
  }
});

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  // actualizar espectro
  if (analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray);
    // usamos solo los primeros currentBins valores
    for (let i = 0; i < currentBins; i++) {
      const mesh = bars[i];
      if (!mesh) continue;
      const v = dataArray[i] / 255; // 0 - 1
      const h = 0.4 + v * 3.5;
      mesh.scale.y = h;
      mesh.position.y = h / 2;
      // levísimo pulso
      mesh.rotation.y += 0.002 + v * 0.01;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}
