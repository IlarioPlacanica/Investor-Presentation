const frameEl = document.getElementById("sceneFrame");
const videoEl = document.getElementById("transitionVideo");
const hotspotLeft = document.getElementById("hotspotLeft");
const hotspotRight = document.getElementById("hotspotRight");
const statusEl = document.getElementById("viewerStatus");
const viewerStage = document.getElementById("viewerStage");

const scenes = ["A", "B", "C", "D"];

let currentIndex = 0;
let isTransitioning = false;
let startX = 0;
let endX = 0;

// cache asset precaricati
const preloadedVideos = new Map();
const preloadedFrames = new Map();

function getCurrentScene() {
  return scenes[currentIndex];
}

function getPrevIndex(index) {
  return (index - 1 + scenes.length) % scenes.length;
}

function getNextIndex(index) {
  return (index + 1) % scenes.length;
}

function getFramePath(scene) {
  return `assets/frames/${scene}.png`;
}

function getVideoPath(fromScene, toScene) {
  return `assets/videos/${fromScene}-${toScene}.mp4`;
}

function setStatus(scene) {
  statusEl.textContent = `Camera ${scene}`;
}

function preloadFrame(scene) {
  const path = getFramePath(scene);

  if (preloadedFrames.has(scene)) {
    return preloadedFrames.get(scene);
  }

  const img = new Image();
  img.src = path;
  preloadedFrames.set(scene, img);

  return img;
}

function preloadVideo(path) {
  if (preloadedVideos.has(path)) return preloadedVideos.get(path);

  const v = document.createElement("video");
  v.preload = "auto";
  v.muted = true;
  v.playsInline = true;
  v.src = path;
  v.load();

  preloadedVideos.set(path, v);
  return v;
}

function applyStaticScene(scene) {
  const cachedImg = preloadFrame(scene);

  frameEl.src = cachedImg.src;
  frameEl.alt = `Camera ${scene} - CASTELLO`;
  setStatus(scene);
}

function resetVideoLayer() {
  videoEl.pause();
  videoEl.removeAttribute("src");
  videoEl.removeAttribute("poster");
  videoEl.load();
  videoEl.classList.add("hidden");
  videoEl.classList.remove("is-ready");
  videoEl.onended = null;
  videoEl.onerror = null;
  videoEl.onloadeddata = null;
}

function preloadAdjacentAssets() {
  const currentScene = scenes[currentIndex];
  const prevScene = scenes[getPrevIndex(currentIndex)];
  const nextScene = scenes[getNextIndex(currentIndex)];

  // frame corrente + vicini
  preloadFrame(currentScene);
  preloadFrame(prevScene);
  preloadFrame(nextScene);

  // video vicini
  preloadVideo(getVideoPath(currentScene, prevScene));
  preloadVideo(getVideoPath(currentScene, nextScene));
}

function endTransition(newIndex) {
  const targetScene = scenes[newIndex];
  const targetImg = preloadFrame(targetScene);

  const finalize = () => {
    currentIndex = newIndex;

    // metto prima il frame corretto sotto al video
    frameEl.src = targetImg.src;
    frameEl.alt = `Camera ${targetScene} - CASTELLO`;
    setStatus(targetScene);

    // solo adesso tolgo il video
    resetVideoLayer();

    preloadAdjacentAssets();
    isTransitioning = false;
  };

  if (targetImg.complete && targetImg.naturalWidth > 0) {
    finalize();
  } else {
    targetImg.onload = finalize;
    targetImg.onerror = finalize;
  }
}

function playTransition(targetIndex) {
  if (isTransitioning) return;
  if (targetIndex === currentIndex) return;

  const fromScene = scenes[currentIndex];
  const toScene = scenes[targetIndex];
  const videoPath = getVideoPath(fromScene, toScene);

  isTransitioning = true;

  // tengo visibile il frame attuale finché il video non è pronto
  videoEl.classList.add("hidden");
  videoEl.classList.remove("is-ready");

  // poster = frame corrente, per evitare flash neri
  videoEl.poster = frameEl.src;
  videoEl.src = videoPath;
  videoEl.currentTime = 0;
  videoEl.load();

  const revealAndPlay = () => {
    videoEl.classList.remove("hidden");

    requestAnimationFrame(() => {
      videoEl.classList.add("is-ready");

      const playPromise = videoEl.play();

      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("Errore playback video:", error);
          endTransition(targetIndex);
        });
      }
    });
  };

  videoEl.onloadeddata = revealAndPlay;

  videoEl.onended = () => {
    endTransition(targetIndex);
  };

  videoEl.onerror = () => {
    console.error(`Video non trovato o non leggibile: ${videoPath}`);
    endTransition(targetIndex);
  };
}

function goNext() {
  playTransition(getNextIndex(currentIndex));
}

function goPrev() {
  playTransition(getPrevIndex(currentIndex));
}

function handleSwipe() {
  if (isTransitioning) return;

  const diff = endX - startX;
  const threshold = 50;

  if (Math.abs(diff) < threshold) return;

  // swipe sinistra -> destra = camera precedente
  if (diff > 0) {
    goPrev();
  }

  // swipe destra -> sinistra = camera successiva
  if (diff < 0) {
    goNext();
  }
}

hotspotLeft.addEventListener("click", goPrev);
hotspotRight.addEventListener("click", goNext);

viewerStage.addEventListener("touchstart", (event) => {
  startX = event.changedTouches[0].clientX;
});

viewerStage.addEventListener("touchend", (event) => {
  endX = event.changedTouches[0].clientX;
  handleSwipe();
});

viewerStage.addEventListener("mousedown", (event) => {
  startX = event.clientX;
});

viewerStage.addEventListener("mouseup", (event) => {
  endX = event.clientX;
  handleSwipe();
});

// init
applyStaticScene(getCurrentScene());
resetVideoLayer();
preloadAdjacentAssets();