const frameAEl = document.getElementById("sceneFrameA");
const frameBEl = document.getElementById("sceneFrameB");
const videoEl = document.getElementById("transitionVideo");
const hotspotLeft = document.getElementById("hotspotLeft");
const hotspotRight = document.getElementById("hotspotRight");
const statusEl = document.getElementById("viewerStatus");
const viewerStage = document.getElementById("viewerStage");
const introVideo = document.getElementById("introVideo");

const scenes = ["A", "B", "C", "D"];

let currentIndex = 0;
let isTransitioning = false;
let startX = 0;
let endX = 0;

let activeFrameEl = frameAEl;
let inactiveFrameEl = frameBEl;

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
  if (preloadedFrames.has(scene)) {
    return preloadedFrames.get(scene);
  }

  const img = new Image();
  img.src = getFramePath(scene);

  const ready = new Promise((resolve) => {
    if (img.complete && img.naturalWidth > 0) {
      resolve(img);
      return;
    }

    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
  });

  const entry = { img, ready };
  preloadedFrames.set(scene, entry);
  return entry;
}

function preloadVideo(path) {
  if (preloadedVideos.has(path)) {
    return preloadedVideos.get(path);
  }

  const v = document.createElement("video");
  v.preload = "auto";
  v.muted = true;
  v.playsInline = true;
  v.src = path;
  v.load();

  preloadedVideos.set(path, v);
  return v;
}

async function prepareInactiveFrame(scene) {
  const entry = preloadFrame(scene);
  await entry.ready;

  inactiveFrameEl.src = entry.img.src;
  inactiveFrameEl.alt = `Camera ${scene} - CASTELLO`;

  // forza decode/presentazione del frame target anche su mobile
  if (inactiveFrameEl.decode) {
    try {
      await inactiveFrameEl.decode();
    } catch (_) {}
  }
}

function swapFrames() {
  activeFrameEl.classList.remove("is-active");
  inactiveFrameEl.classList.add("is-active");

  const temp = activeFrameEl;
  activeFrameEl = inactiveFrameEl;
  inactiveFrameEl = temp;
}

function applyInitialScene(scene) {
  const path = getFramePath(scene);
  frameAEl.src = path;
  frameAEl.alt = `Camera ${scene} - CASTELLO`;
  frameAEl.classList.add("is-active");

  frameBEl.src = path;
  frameBEl.alt = "";
  frameBEl.classList.remove("is-active");

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

  preloadFrame(currentScene);
  preloadFrame(prevScene);
  preloadFrame(nextScene);

  preloadVideo(getVideoPath(currentScene, prevScene));
  preloadVideo(getVideoPath(currentScene, nextScene));
}

async function endTransition(newIndex) {
  const targetScene = scenes[newIndex];

  // IMPORTANTISSIMO:
  // preparo il frame target nel layer inattivo PRIMA di togliere il video
  await prepareInactiveFrame(targetScene);

  currentIndex = newIndex;
  setStatus(targetScene);

  // ora sotto al video c'è già il frame corretto
  swapFrames();

  // al frame successivo tolgo il video, così il browser ha tempo di paintare
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resetVideoLayer();
      preloadAdjacentAssets();
      isTransitioning = false;
    });
  });
}

async function playTransition(targetIndex) {
  if (isTransitioning) return;
  if (targetIndex === currentIndex) return;

  const fromScene = scenes[currentIndex];
  const toScene = scenes[targetIndex];
  const videoPath = getVideoPath(fromScene, toScene);

  isTransitioning = true;

  // preparo già sotto il frame target PRIMA che il video finisca
  await prepareInactiveFrame(toScene);

  videoEl.classList.add("hidden");
  videoEl.classList.remove("is-ready");
  videoEl.poster = activeFrameEl.src;
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

  if (diff > 0) {
    goPrev();
  }

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

/* hero video */
if (introVideo) {
  introVideo.addEventListener("ended", () => {
    introVideo.currentTime = 0;
    const playPromise = introVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  });

  const tryPlay = () => {
    const playPromise = introVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  };

  introVideo.addEventListener("loadeddata", tryPlay, { once: true });
}

/* init */
applyInitialScene(getCurrentScene());
resetVideoLayer();
preloadAdjacentAssets();