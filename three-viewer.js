import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const wrapper = document.querySelector('.three-viewer');
const canvas = document.getElementById('three-canvas');

if (wrapper && canvas) {
  initThreeViewer(wrapper, canvas);
}

function initThreeViewer(wrapper, canvas) {
  const modelUrl = wrapper.dataset.model;

  if (!modelUrl) {
    showViewerMessage(wrapper, 'Modello 3D non trovato');
    return;
  }

  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: false,
    powerPreference: 'high-performance'
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color((0xffffff);

  const initialRect = wrapper.getBoundingClientRect();
  const initialWidth = Math.max(1, Math.round(initialRect.width));
  const initialHeight = Math.max(1, Math.round(initialRect.height));

  renderer.setSize(initialWidth, initialHeight, false);
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  const camera = new THREE.PerspectiveCamera(
    38,
    initialWidth / initialHeight,
    0.01,
    1000
  );
  camera.position.set(0, 2.2, 6.8);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.enableZoom = true;
  controls.enableRotate = true;
  controls.zoomSpeed = 0.9;
  controls.rotateSpeed = 0.8;
  controls.panSpeed = 0.8;
  controls.minDistance = 1;
  controls.maxDistance = 80;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI / 2.02;
  controls.target.set(0, 1.0, 0);
  controls.update();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe7e7e7, 0.55);
  hemiLight.position.set(0, 10, 0);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 3.4);
  sunLight.position.set(5.5, 8.0, 4.5);
  sunLight.castShadow = true;

  const shadowMapSize = isMobile ? 1024 : 2048;
  sunLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sunLight.shadow.bias = -0.00005;
  sunLight.shadow.normalBias = 0.03;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
  fillLight.position.set(-4.0, 3.5, -2.0);
  scene.add(fillLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1
  })
);

  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.002;
  floor.receiveShadow = true;
  scene.add(floor);

const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.ShadowMaterial({ opacity: 0.14 })
);

  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  showViewerMessage(wrapper, 'Caricamento modello 3D...');

  const loader = new GLTFLoader();

  loader.load(
    modelUrl,
    (gltf) => {
      const modelRoot = gltf.scene;

      modelRoot.traverse((obj) => {
        if (!obj.isMesh) return;

        if (obj.name === 'Glass') {
          obj.castShadow = false;
          obj.receiveShadow = false;
        } else {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }

        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];

        materials.forEach((material) => {
          if (!material) return;

          if (material.map) {
            material.map.colorSpace = THREE.SRGBColorSpace;
          }

          if (material.emissiveMap) {
            material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
          }

          material.needsUpdate = true;
        });
      });

      scene.add(modelRoot);
      centerAndFitModel(modelRoot, camera, controls, sunLight, floor, shadowPlane, isMobile);
      resizeViewer();
      hideViewerMessage(wrapper);
      animate();
    },
    undefined,
    (error) => {
      console.error('Errore caricamento GLB:', error);
      showViewerMessage(wrapper, 'Errore nel caricamento del modello 3D');
    }
  );

  function centerAndFitModel(model, cameraRef, controlsRef, mainLight, floorRef, shadowRef, mobile) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());

    model.position.x -= center.x;
    model.position.y -= box.min.y;
    model.position.z -= center.z;

    const fittedBox = new THREE.Box3().setFromObject(model);
    const fittedSize = fittedBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(fittedSize.x, fittedSize.y, fittedSize.z);

const targetY = Math.max(fittedSize.y * 0.32, 0.6);
controlsRef.target.set(0, targetY, 0);

const fov = THREE.MathUtils.degToRad(cameraRef.fov);
let distance = maxDim / (2 * Math.tan(fov / 2));
distance *= mobile ? 1.02 : 0.88;

cameraRef.near = Math.max(distance / 100, 0.01);
cameraRef.far = Math.max(distance * 30, 100);
cameraRef.updateProjectionMatrix();

cameraRef.position.set(
  -distance * 0.62,
  distance * 1.08,
  distance * 0.52
);
cameraRef.lookAt(controlsRef.target);

    controlsRef.minDistance = Math.max(maxDim * 0.4, 0.8);
    controlsRef.maxDistance = Math.max(maxDim * 6, 30);
    controlsRef.update();

    mainLight.target.position.copy(controlsRef.target);
    mainLight.position.set(
      maxDim * 0.45,
      maxDim * 1.2,
      maxDim * 0.75
    );

    const shadowHalfSize = Math.max(maxDim * 1.2, 6);
    mainLight.shadow.camera.left = -shadowHalfSize;
    mainLight.shadow.camera.right = shadowHalfSize;
    mainLight.shadow.camera.top = shadowHalfSize;
    mainLight.shadow.camera.bottom = -shadowHalfSize;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = Math.max(maxDim * 5, 25);
    mainLight.shadow.camera.updateProjectionMatrix();

    shadowRef.position.y = 0;
    floorRef.position.y = -0.002;
  }

  function resizeViewer() {
    const rect = wrapper.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);

    canvas.style.width = '100%';
    canvas.style.height = '100%';

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
  }

  let animationFrameId = null;

  function animate() {
    if (animationFrameId) return;

    const tick = () => {
      animationFrameId = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };

    tick();
  }

  function stopAnimation() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  const resizeObserver = new ResizeObserver(() => {
    resizeViewer();
  });
  resizeObserver.observe(wrapper);

  window.addEventListener('resize', resizeViewer);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAnimation();
    } else {
      resizeViewer();
      animate();
    }
  });

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    stopAnimation();
    showViewerMessage(wrapper, 'Il contesto WebGL è stato perso');
  });

  canvas.addEventListener('webglcontextrestored', () => {
    hideViewerMessage(wrapper);
    resizeViewer();
    animate();
  });
}

function showViewerMessage(wrapper, text) {
  let message = wrapper.querySelector('.three-viewer-message');

  if (!message) {
    message = document.createElement('div');
    message.className = 'three-viewer-message';
    wrapper.appendChild(message);
  }

  message.textContent = text;
}

function hideViewerMessage(wrapper) {
  const message = wrapper.querySelector('.three-viewer-message');
  if (message) {
    message.remove();
  }
}