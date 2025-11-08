// app.js - viewer 3D con malla reactiva y AR/VR, mostrado al hacer click
import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js";

const hero = document.getElementById("hero");
const viewer = document.getElementById("viewer");
const openViewer = document.getElementById("open-viewer");
const closeViewer = document.getElementById("close-viewer");

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
let currentBins = 48;
let audioCtx = null;
let sourceNode = null;
let wavePlane, wavePlaneGeo;

openViewer.addEventListener("click", () => {
  hero.classList.add("hidden");
  viewer.classList.remove("hidden");
  if (!window.__threeInited) {
    init3D();
    animate();
    window.__threeInited = true;
  }
});

closeViewer.addEventListener("click", () => {
  viewer.classList.add("hidden");
  hero.classList.remove("hidden");
});

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

  // malla reactiva
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

function resizeRenderer() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

// micrófono
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
  if (analyser) analyser.smoothingTimeConstant = parseFloat(smoothingEl.value);
});
binsEl.addEventListener("input", () => {
  currentBins = parseInt(binsEl.value, 10);
  createBars(currentBins);
});

// AR real
btnAR.addEventListener("click", async () => {
  if (!navigator.xr) {
    xrStatus.textContent = "navigator.xr no disponible (HTTPS / WebXR necesario)";
    return;
  }
  const supported = await navigator.xr.isSessionSupported("immersive-ar");
  if (!supported) {
    xrStatus.textContent = "AR no soportado aquí.";
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

// VR real
btnVR.addEventListener("click", async () => {
  if (!navigator.xr) {
    xrStatus.textContent = "navigator.xr no disponible (HTTPS / WebXR necesario)";
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

let t = 0;
function render() {
  t += 0.015;

  let audioLevel = 0;
  if (analyser && dataArray) {
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

  // animar malla
  if (wavePlaneGeo) {
    const pos = wavePlaneGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      const wave = Math.sin(dist * 2.5 - t * 4) * 0.12;
      const audioBump = audioLevel ? audioLevel * 0.35 * Math.cos(dist * 3 - t * 5) : 0;
      pos.setY(i, wave + audioBump);
    }
    pos.needsUpdate = true;
    wavePlaneGeo.computeVertexNormals();
  }

  controls.update();
  renderer.render(scene, camera);
}
