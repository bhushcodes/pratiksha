/**
 * ==========================================================================
 * AETHERIA — QUIET DIGITAL POETRY ROOM
 * Pure Vanilla JavaScript (No Backend, No Admin, Simple & Lightweight)
 * - Continuous Background Ambient Audio (Always-on loop & Autoplay guard)
 * - Atmospheric Star Particles & Parallax Motion
 * ==========================================================================
 */

(function () {
  "use strict";

  /* --------------------------------------------------------------------------
     1. Continuous Background Audio (Always On & Looping)
     -------------------------------------------------------------------------- */

  function initContinuousBackgroundAudio() {
    const localAudio = document.getElementById("local-audio");
    const unlockHint = document.getElementById("audio-unlock-hint");
    if (!localAudio) return;

    localAudio.loop = true;
    localAudio.volume = 1.0;

    // Restore playback timestamp if available
    try {
      const savedTime = parseFloat(sessionStorage.getItem("aetheria_audio_time"));
      if (!isNaN(savedTime) && savedTime > 0) {
        localAudio.currentTime = savedTime;
      }
    } catch (e) {}

    // Track playback position
    setInterval(() => {
      if (localAudio && !localAudio.paused && localAudio.currentTime > 0) {
        try {
          sessionStorage.setItem("aetheria_audio_time", localAudio.currentTime.toString());
        } catch (e) {}
      }
    }, 2000);

    function tryPlayAudio() {
      const playPromise = localAudio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (unlockHint) unlockHint.hidden = true;
          })
          .catch(() => {
            // Autoplay restricted by browser policy -> show gentle unlock hint
            if (unlockHint) unlockHint.hidden = false;
            setupInteractionUnlock();
          });
      }
    }

    function setupInteractionUnlock() {
      function triggerUnlock() {
        localAudio.play()
          .then(() => {
            if (unlockHint) unlockHint.hidden = true;
            removeUnlockListeners();
          })
          .catch(() => {});
      }

      const events = ["click", "pointerdown", "mousedown", "touchstart", "touchend", "keydown", "scroll"];
      events.forEach((evt) => {
        window.addEventListener(evt, triggerUnlock, { capture: true, passive: true });
        document.addEventListener(evt, triggerUnlock, { capture: true, passive: true });
      });

      unlockHint?.addEventListener("click", triggerUnlock);

      function removeUnlockListeners() {
        events.forEach((evt) => {
          window.removeEventListener(evt, triggerUnlock, { capture: true });
          document.removeEventListener(evt, triggerUnlock, { capture: true });
        });
      }
    }

    // Always-on loop protection: if anything pauses, immediately resume
    localAudio.addEventListener("pause", () => {
      setTimeout(() => {
        localAudio.play().catch(() => {});
      }, 50);
    });

    localAudio.addEventListener("ended", () => {
      localAudio.currentTime = 0;
      localAudio.play().catch(() => {});
    });

    // Resume when tab returns to foreground
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && localAudio.paused) {
        localAudio.play().catch(() => {});
      }
    });

    // Watchdog check: ensure audio stays playing
    setInterval(() => {
      if (localAudio && localAudio.paused) {
        localAudio.play().catch(() => {});
      }
    }, 2500);

    // Initial attempt
    tryPlayAudio();

    localAudio.addEventListener("canplay", () => {
      if (localAudio.paused) {
        tryPlayAudio();
      }
    });
  }

  /* --------------------------------------------------------------------------
     2. Atmospheric Canvas Particles & Parallax Motion Engine
     -------------------------------------------------------------------------- */

  function setupAtmosphericCanvas() {
    const canvas = document.getElementById("ambient-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetParallaxX = 0;
    let targetParallaxY = 0;
    let currentParallaxX = 0;
    let currentParallaxY = 0;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const PARTICLE_COUNT = Math.min(50, Math.floor((width * height) / 30000));
    const particles = [];

    class StarParticle {
      constructor() {
        this.reset(true);
      }

      reset(init = false) {
        this.x = Math.random() * width;
        this.y = init ? Math.random() * height : height + 10;
        this.size = Math.random() * 1.8 + 0.6;
        this.baseSpeed = Math.random() * 0.22 + 0.1;
        this.speed = this.baseSpeed;
        this.opacity = Math.random() * 0.45 + 0.2;
        this.pulseSpeed = Math.random() * 0.02 + 0.008;
        this.pulseAngle = Math.random() * Math.PI * 2;
        this.driftAngle = Math.random() * Math.PI * 2;
        this.depth = Math.random() * 0.6 + 0.4;
      }

      update() {
        if (prefersReducedMotion) return;

        this.y -= this.speed;
        this.pulseAngle += this.pulseSpeed;
        this.driftAngle += 0.015;
        this.x += Math.sin(this.driftAngle) * 0.2;

        if (this.y < -10) {
          this.reset();
        }
      }

      draw() {
        const parallaxOffsetX = currentParallaxX * this.depth * 22;
        const parallaxOffsetY = currentParallaxY * this.depth * 22;

        const currentOpacity = this.opacity * (0.7 + Math.sin(this.pulseAngle) * 0.3);
        ctx.fillStyle = `rgba(225, 235, 255, ${currentOpacity})`;
        ctx.beginPath();
        ctx.arc(this.x + parallaxOffsetX, this.y + parallaxOffsetY, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new StarParticle());
    }

    const cursorGlow = document.getElementById("cursor-glow");
    const ambientBlobs = document.getElementById("ambient-blobs");

    let glowX = width / 2;
    let glowY = height / 2;
    let targetGlowX = glowX;
    let targetGlowY = glowY;

    window.addEventListener("resize", () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }, { passive: true });

    window.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;

      document.body.classList.add("cursor-active");
      mouseX = e.clientX;
      mouseY = e.clientY;
      targetGlowX = e.clientX;
      targetGlowY = e.clientY;

      targetParallaxX = (mouseX / width - 0.5) * 2;
      targetParallaxY = (mouseY / height - 0.5) * 2;
    }, { passive: true });

    function animate() {
      ctx.clearRect(0, 0, width, height);

      currentParallaxX += (targetParallaxX - currentParallaxX) * 0.04;
      currentParallaxY += (targetParallaxY - currentParallaxY) * 0.04;

      if (!prefersReducedMotion && cursorGlow) {
        glowX += (targetGlowX - glowX) * 0.1;
        glowY += (targetGlowY - glowY) * 0.1;
        cursorGlow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0)`;

        if (ambientBlobs) {
          ambientBlobs.style.transform = `translate3d(${currentParallaxX * -10}px, ${currentParallaxY * -10}px, 0)`;
        }
      }

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }

      requestAnimationFrame(animate);
    }

    animate();
  }

  /* --------------------------------------------------------------------------
     3. Initialization
     -------------------------------------------------------------------------- */

  function init() {
    setupAtmosphericCanvas();
    initContinuousBackgroundAudio();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
