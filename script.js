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

function updateStaticScene() {
  const scene = getCurrentScene();
  frameEl.src = getFramePath(scene);
  frameEl.alt = `Camera ${scene} - CASTELLO`;
  statusEl.textContent = `Camera ${scene}`;
}

function resetVideoLayer() {
  videoEl.pause();
  videoEl.removeAttribute("src");
  videoEl.load();
  videoEl.classList.add("hidden");
  videoEl.classList.remove("is-ready");
  videoEl.onended = null;
  videoEl.onerror = null;
  videoEl.onloadeddata = null;
  videoEl.oncanplay = null;
}

function endTransition(newIndex) {
  currentIndex = newIndex;
  updateStaticScene();
  resetVideoLayer();
  isTransitioning = false;
}

function playTransition(targetIndex) {
  if (isTransitioning) return;
  if (targetIndex === currentIndex) return;

  const fromScene = scenes[currentIndex];
  const toScene = scenes[targetIndex];
  const videoPath = getVideoPath(fromScene, toScene);

  isTransitioning = true;

  // tiene visibile il frame statico sotto finché il video non è davvero pronto
  videoEl.classList.add("hidden");
  videoEl.classList.remove("is-ready");
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

  // quando il primo frame è disponibile, mostriamo il video
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
  const targetIndex = getNextIndex(currentIndex);
  playTransition(targetIndex);
}

function goPrev() {
  const targetIndex = getPrevIndex(currentIndex);
  playTransition(targetIndex);
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

function handleSwipe() {
  if (isTransitioning) return;

  const diff = endX - startX;
  const threshold = 50;

  if (Math.abs(diff) < threshold) return;

  // FIX: swipe invertito rispetto a prima
  // swipe da sinistra verso destra
  if (diff > 0) {
    goPrev();
  }

  // swipe da destra verso sinistra
  if (diff < 0) {
    goNext();
  }
}

updateStaticScene();
resetVideoLayer();