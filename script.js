const header = document.getElementById("siteHeader");
const menuToggle = document.getElementById("menuToggle");
const siteNav = document.getElementById("siteNav");

const clipsTrack = document.getElementById("clipsTrack");
const slides = Array.from(document.querySelectorAll(".clip-slide"));
const dots = Array.from(document.querySelectorAll(".dot"));
const prevBtn = document.getElementById("prevClip");
const nextBtn = document.getElementById("nextClip");

let currentSlide = 0;
let startX = 0;
let endX = 0;

function handleHeader() {
  if (window.scrollY > 20) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
}

handleHeader();
window.addEventListener("scroll", handleHeader);

menuToggle?.addEventListener("click", () => {
  siteNav.classList.toggle("is-open");
});

document.querySelectorAll('.site-nav a').forEach((link) => {
  link.addEventListener("click", () => {
    siteNav.classList.remove("is-open");
  });
});

function pauseAllVideos() {
  document.querySelectorAll(".clip-slide video").forEach((video, index) => {
    if (index !== currentSlide) {
      video.pause();
    }
  });
}

function updateSlider() {
  clipsTrack.style.transform = `translateX(-${currentSlide * 100}%)`;

  slides.forEach((slide, index) => {
    slide.classList.toggle("active", index === currentSlide);
  });

  dots.forEach((dot, index) => {
    dot.classList.toggle("active", index === currentSlide);
  });

  pauseAllVideos();
}

function goToSlide(index) {
  if (index < 0) {
    currentSlide = slides.length - 1;
  } else if (index >= slides.length) {
    currentSlide = 0;
  } else {
    currentSlide = index;
  }

  updateSlider();
}

prevBtn?.addEventListener("click", () => {
  goToSlide(currentSlide - 1);
});

nextBtn?.addEventListener("click", () => {
  goToSlide(currentSlide + 1);
});

dots.forEach((dot) => {
  dot.addEventListener("click", () => {
    goToSlide(Number(dot.dataset.slide));
  });
});

clipsTrack?.addEventListener("touchstart", (event) => {
  startX = event.changedTouches[0].clientX;
});

clipsTrack?.addEventListener("touchend", (event) => {
  endX = event.changedTouches[0].clientX;
  handleSwipe();
});

clipsTrack?.addEventListener("mousedown", (event) => {
  startX = event.clientX;
});

clipsTrack?.addEventListener("mouseup", (event) => {
  endX = event.clientX;
  handleSwipe();
});

function handleSwipe() {
  const diff = startX - endX;

  if (Math.abs(diff) < 50) return;

  if (diff > 0) {
    goToSlide(currentSlide + 1);
  } else {
    goToSlide(currentSlide - 1);
  }
}

const revealElements = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  {
    threshold: 0.15,
  }
);

revealElements.forEach((element) => revealObserver.observe(element));

updateSlider();
