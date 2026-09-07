/**
 * ==========================================================================
 * AETHERIA — QUIET DIGITAL POETRY ROOM
 * Pure Vanilla JavaScript
 * Background Audio: Local audio file (song.mp3)
 * Admin: Multi-poem Studio & Homepage Selector
 * ==========================================================================
 */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     1. Curated Classic Poems (Initial Defaults)
     -------------------------------------------------------------------------- */

  const DEFAULT_POEMS = [];

  // Automatically purge the 6 removed sample poems from existing localStorage
  const REMOVED_POEM_IDS = new Set([
    'frost-woods',
    'rilke-limits',
    'oliver-geese',
    'dickinson-hope',
    'thomas-goodnight',
    'basho-moon'
  ]);

  /* --------------------------------------------------------------------------
     2. Application State
     -------------------------------------------------------------------------- */

  const state = {
    // Poems Library & Active Homepage Poem
    poemLibrary: [],
    activePoemId: null,
    activePoem: null,

    // Background Audio
    isPlaying: false
  };

  /* --------------------------------------------------------------------------
     3. DOM Elements
     -------------------------------------------------------------------------- */

  // Homepage Poem Elements
  const poemContainer = document.getElementById('poem-container');
  const poemTitleEl = document.getElementById('poem-title');
  const poemAuthorEl = document.getElementById('poem-author');
  const poemBodyEl = document.getElementById('poem-body');

  // Background Audio Element
  const localAudio = document.getElementById('local-audio');

  /* --------------------------------------------------------------------------
     4. Continuous Background Audio (Always-On, Uninterrupted Loop & Autoplay Guard)
     -------------------------------------------------------------------------- */

  function initContinuousBackgroundAudio() {
    if (!localAudio) return;

    localAudio.loop = true;
    localAudio.volume = 1.0;

    const unlockHint = document.getElementById('audio-unlock-hint');

    // Restore playback timestamp for smooth transition across pages
    try {
      const savedTime = parseFloat(sessionStorage.getItem('aetheria_audio_time'));
      if (!isNaN(savedTime) && savedTime > 0) {
        localAudio.currentTime = savedTime;
      }
    } catch (e) {}

    // Save playback position periodically
    setInterval(() => {
      if (localAudio && !localAudio.paused && localAudio.currentTime > 0) {
        try {
          sessionStorage.setItem('aetheria_audio_time', localAudio.currentTime.toString());
        } catch (e) {}
      }
    }, 1000);

    // Fallback path resolution if song.mp3 is not loaded
    localAudio.addEventListener('error', () => {
      const candidatePaths = ['song.mp3', '../song.mp3', '/song.mp3'];
      const currentSrc = localAudio.getAttribute('src');
      const nextCandidate = candidatePaths.find((p) => p !== currentSrc);
      if (nextCandidate) {
        console.log('Retrying audio with alternate path:', nextCandidate);
        localAudio.src = nextCandidate;
        localAudio.load();
        localAudio.play().catch(() => {});
      }
    });

    function tryPlayAudio() {
      const promise = localAudio.play();
      if (promise !== undefined) {
        promise
          .then(() => {
            state.isPlaying = true;
            if (unlockHint) unlockHint.hidden = true;
          })
          .catch((err) => {
            // Autoplay blocked by browser policy until interaction
            console.log('Autoplay pending user gesture:', err.message);
            if (unlockHint) unlockHint.hidden = false;
            attachUnlockListeners();
          });
      }
    }

    let unlockAttached = false;
    function attachUnlockListeners() {
      if (unlockAttached) return;
      unlockAttached = true;

      const triggerUnlock = () => {
        localAudio.play()
          .then(() => {
            state.isPlaying = true;
            if (unlockHint) unlockHint.hidden = true;
            removeUnlockListeners();
          })
          .catch(() => {});
      };

      const events = ['click', 'pointerdown', 'mousedown', 'touchstart', 'touchend', 'keydown', 'scroll'];
      events.forEach((evt) => {
        window.addEventListener(evt, triggerUnlock, { capture: true, passive: true });
        document.addEventListener(evt, triggerUnlock, { capture: true, passive: true });
      });

      unlockHint?.addEventListener('click', triggerUnlock);

      function removeUnlockListeners() {
        events.forEach((evt) => {
          window.removeEventListener(evt, triggerUnlock, { capture: true });
          document.removeEventListener(evt, triggerUnlock, { capture: true });
        });
      }
    }

    // Always-on loop protection: if anything pauses, immediately resume
    localAudio.addEventListener('pause', () => {
      setTimeout(() => {
        localAudio.play().catch(() => {});
      }, 50);
    });

    localAudio.addEventListener('ended', () => {
      localAudio.currentTime = 0;
      localAudio.play().catch(() => {});
    });

    // Resume when tab returns to foreground
    document.addEventListener('visibilitychange', () => {
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

    // Also attempt on canplay
    localAudio.addEventListener('canplay', () => {
      if (localAudio.paused) {
        tryPlayAudio();
      }
    });
  }

  /* --------------------------------------------------------------------------
     5. Poem Library & Homepage Presentation
     -------------------------------------------------------------------------- */

  function loadPoemLibrary() {
    try {
      const savedLibrary = localStorage.getItem('aetheria_poem_library');
      if (savedLibrary) {
        const parsed = JSON.parse(savedLibrary);
        // Automatically purge any of the 6 removed default poems
        state.poemLibrary = Array.isArray(parsed)
          ? parsed.filter((p) => p && !REMOVED_POEM_IDS.has(p.id))
          : [];
      } else {
        state.poemLibrary = [];
      }
    } catch (e) {
      state.poemLibrary = [];
    }

    // Persist cleaned library
    try {
      localStorage.setItem('aetheria_poem_library', JSON.stringify(state.poemLibrary));
    } catch (e) {}

    // Load active poem ID for homepage
    const savedActiveId = localStorage.getItem('aetheria_active_poem_id');
    const found = state.poemLibrary.find((p) => p.id === savedActiveId);
    if (found) {
      state.activePoemId = found.id;
      state.activePoem = found;
    } else if (state.poemLibrary.length > 0) {
      state.activePoemId = state.poemLibrary[0].id;
      state.activePoem = state.poemLibrary[0];
      try {
        localStorage.setItem('aetheria_active_poem_id', state.activePoemId);
      } catch (e) {}
    } else {
      state.activePoemId = null;
      state.activePoem = null;
      try {
        localStorage.removeItem('aetheria_active_poem_id');
      } catch (e) {}
    }

    renderHomepagePoem(state.activePoem);
  }

  function renderHomepagePoem(poem) {
    poemContainer?.classList.add('fading-out');

    setTimeout(() => {
      if (!poem) {
        if (poemTitleEl) poemTitleEl.textContent = 'Digital Poetry Sanctuary';
        if (poemAuthorEl) poemAuthorEl.textContent = '';
        if (poemBodyEl) {
          poemBodyEl.innerHTML = `
            <div class="poem-stanza" style="margin-top: 1.5rem;">
              <span class="poem-line" style="opacity: 0.45; font-style: italic;">No poems in collection yet.</span>
              <span class="poem-line" style="opacity: 0.45; font-style: italic;">Create and share your poems via the Admin Studio.</span>
            </div>
          `;
        }
      } else {
        if (poemTitleEl) poemTitleEl.textContent = poem.title;
        if (poemAuthorEl) poemAuthorEl.textContent = poem.author ? `— ${poem.author}` : '';

        if (poemBodyEl) {
          poemBodyEl.innerHTML = '';
          poem.stanzas.forEach((stanzaLines) => {
            const stanzaEl = document.createElement('div');
            stanzaEl.className = 'poem-stanza';

            stanzaLines.forEach((line) => {
              const lineEl = document.createElement('span');
              lineEl.className = 'poem-line';
              lineEl.textContent = line || ' ';
              stanzaEl.appendChild(lineEl);
            });

            poemBodyEl.appendChild(stanzaEl);
          });
        }
      }

      poemContainer?.classList.remove('fading-out');
    }, 250);
  }

  // Cross-tab real-time sync with Admin Studio
  function setupStorageListener() {
    window.addEventListener('storage', (e) => {
      if (e.key === 'aetheria_active_poem_id' || e.key === 'aetheria_poem_library') {
        loadPoemLibrary();
      }
    });
  }



  /* --------------------------------------------------------------------------
     6. Particle Canvas & Parallax Motion Engine
     -------------------------------------------------------------------------- */

  function setupAtmosphericCanvas() {
    const canvas = document.getElementById('ambient-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetParallaxX = 0;
    let targetParallaxY = 0;
    let currentParallaxX = 0;
    let currentParallaxY = 0;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    const cursorGlow = document.getElementById('cursor-glow');
    const ambientBlobs = document.getElementById('ambient-blobs');

    let glowX = width / 2;
    let glowY = height / 2;
    let targetGlowX = glowX;
    let targetGlowY = glowY;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }, { passive: true });

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;

      document.body.classList.add('cursor-active');
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
     7. Initialization
     -------------------------------------------------------------------------- */

  function init() {
    loadPoemLibrary();
    setupStorageListener();
    setupAtmosphericCanvas();

    // Start continuous, non-stop background audio loop
    initContinuousBackgroundAudio();

    console.log('✨ Digital Poetry Sanctuary initialized.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
