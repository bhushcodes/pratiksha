/**
 * ==========================================================================
 * AETHERIA — ADMIN POEM STUDIO CONTROLLER
 * Isolated Admin Portal (http://127.0.0.1:5500/admin)
 * Pure Vanilla JavaScript
 * Manages Poem Library & Homepage Selection via localStorage
 * ==========================================================================
 */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     1. Curated Classic Poems Defaults
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

  const DEFAULT_ADMIN_PASS = 'admin';

  /* --------------------------------------------------------------------------
     2. Application State
     -------------------------------------------------------------------------- */

  const state = {
    poemLibrary: [],
    activePoemId: null
  };

  /* --------------------------------------------------------------------------
     3. DOM Elements
     -------------------------------------------------------------------------- */

  // Background Audio Element
  const localAudio = document.getElementById('local-audio');

  // Auth Screen Elements
  const authSection = document.getElementById('auth-section');
  const adminAuthForm = document.getElementById('admin-auth-form');
  const adminPassInput = document.getElementById('admin-pass-input');
  const authErrorMsg = document.getElementById('auth-error-msg');

  // Studio Dashboard Elements
  const studioSection = document.getElementById('studio-section');
  const lockBtn = document.getElementById('lock-btn');

  // Views inside Studio
  const poemLibraryView = document.getElementById('poem-library-view');
  const poemEditorView = document.getElementById('poem-editor-view');
  const adminPoemList = document.getElementById('admin-poem-list');
  const adminCreateNewBtn = document.getElementById('admin-create-new-btn');
  const backToLibraryBtn = document.getElementById('back-to-library-btn');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const editorModeLabel = document.getElementById('editor-mode-label');

  // Form Fields
  const poemEditForm = document.getElementById('poem-edit-form');
  const editingPoemId = document.getElementById('editing-poem-id');
  const poemTitleInput = document.getElementById('poem-title-input');
  const poemAuthorInput = document.getElementById('poem-author-input');
  const poemBodyInput = document.getElementById('poem-body-input');
  const setLiveCheckbox = document.getElementById('set-live-checkbox');

  // Security Settings
  const newAdminPass = document.getElementById('new-admin-pass');
  const saveNewPassBtn = document.getElementById('save-new-pass-btn');
  const resetLibraryBtn = document.getElementById('reset-library-btn');

  // Toast
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  /* --------------------------------------------------------------------------
     4. Helper Functions
     -------------------------------------------------------------------------- */

  let toastTimer = null;
  function showToast(message, duration = 3000) {
    if (!toast || !toastMessage) return;
    toastMessage.textContent = message;
    toast.hidden = false;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.hidden = true;
      }, 300);
    }, duration);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getAdminPasscode() {
    return localStorage.getItem('aetheria_admin_pass') || DEFAULT_ADMIN_PASS;
  }

  function isSessionAdmin() {
    return sessionStorage.getItem('aetheria_is_admin') === 'true';
  }

  /* --------------------------------------------------------------------------
     5. Authentication Flow
     -------------------------------------------------------------------------- */

  function renderAuthState() {
    if (isSessionAdmin()) {
      if (authSection) authSection.hidden = true;
      if (studioSection) studioSection.hidden = false;
      loadPoemLibrary();
      showLibraryView();
    } else {
      if (authSection) authSection.hidden = false;
      if (studioSection) studioSection.hidden = true;
      if (authErrorMsg) authErrorMsg.style.display = 'none';
      if (adminPassInput) {
        adminPassInput.value = '';
        setTimeout(() => adminPassInput.focus(), 100);
      }
    }
  }

  function handleAuthSubmit(e) {
    e.preventDefault();
    const enteredPass = adminPassInput.value;
    const actualPass = getAdminPasscode();

    if (enteredPass === actualPass) {
      sessionStorage.setItem('aetheria_is_admin', 'true');
      renderAuthState();
      showToast('Admin verified. Welcome to Poem Studio.');
    } else {
      if (authErrorMsg) {
        authErrorMsg.textContent = 'Incorrect passcode. Access denied.';
        authErrorMsg.style.display = 'block';
      }
      adminPassInput?.select();
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('aetheria_is_admin');
    renderAuthState();
    showToast('Studio locked.');
  }

  /* --------------------------------------------------------------------------
     6. Library Management & Live Homepage Synchronization
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

    savePoemLibrary();

    const savedActiveId = localStorage.getItem('aetheria_active_poem_id');
    const found = state.poemLibrary.find((p) => p.id === savedActiveId);
    if (found) {
      state.activePoemId = found.id;
    } else if (state.poemLibrary.length > 0) {
      state.activePoemId = state.poemLibrary[0].id;
      try {
        localStorage.setItem('aetheria_active_poem_id', state.activePoemId);
      } catch (e) {}
    } else {
      state.activePoemId = null;
      try {
        localStorage.removeItem('aetheria_active_poem_id');
      } catch (e) {}
    }

    renderAdminPoemList();
  }

  function savePoemLibrary() {
    try {
      localStorage.setItem('aetheria_poem_library', JSON.stringify(state.poemLibrary));
    } catch (e) {}
  }

  function setActiveHomepagePoem(poemId) {
    const poem = state.poemLibrary.find((p) => p.id === poemId);
    if (!poem) return;

    state.activePoemId = poem.id;
    try {
      localStorage.setItem('aetheria_active_poem_id', poem.id);
    } catch (e) {}

    renderAdminPoemList();
    showToast(`Shared "${poem.title}" on homepage!`);
  }

  function showLibraryView() {
    if (poemLibraryView) poemLibraryView.hidden = false;
    if (poemEditorView) poemEditorView.hidden = true;
    renderAdminPoemList();
  }

  function showEditorView(poemToEdit = null) {
    if (poemLibraryView) poemLibraryView.hidden = true;
    if (poemEditorView) poemEditorView.hidden = false;

    if (poemToEdit) {
      if (editorModeLabel) editorModeLabel.textContent = 'Edit Poem';
      if (editingPoemId) editingPoemId.value = poemToEdit.id;
      if (poemTitleInput) poemTitleInput.value = poemToEdit.title;
      if (poemAuthorInput) poemAuthorInput.value = poemToEdit.author;
      if (poemBodyInput) {
        poemBodyInput.value = poemToEdit.stanzas.map((s) => s.join('\n')).join('\n\n');
      }
      if (setLiveCheckbox) setLiveCheckbox.checked = (poemToEdit.id === state.activePoemId);
    } else {
      if (editorModeLabel) editorModeLabel.textContent = 'New Poem';
      if (editingPoemId) editingPoemId.value = '';
      if (poemTitleInput) poemTitleInput.value = '';
      if (poemAuthorInput) poemAuthorInput.value = '';
      if (poemBodyInput) poemBodyInput.value = '';
      if (setLiveCheckbox) setLiveCheckbox.checked = true;
    }

    setTimeout(() => poemTitleInput?.focus(), 100);
  }

  function renderAdminPoemList() {
    if (!adminPoemList) return;
    adminPoemList.innerHTML = '';

    if (state.poemLibrary.length === 0) {
      adminPoemList.innerHTML = `
        <div class="empty-state-card">
          <p class="empty-state-title">Your poem collection is empty.</p>
          <p class="empty-state-sub">Click "+ Create Poem" above to write or paste your first poem.</p>
        </div>
      `;
      return;
    }

    state.poemLibrary.forEach((poem) => {
      const isLive = poem.id === state.activePoemId;
      const card = document.createElement('div');
      card.className = `poem-card ${isLive ? 'is-live' : ''}`;

      const previewLine = poem.stanzas[0]?.[0] || '...';

      card.innerHTML = `
        <div class="poem-card-info">
          <div class="poem-card-header">
            <span class="poem-card-title">${escapeHtml(poem.title)}</span>
            <span class="poem-card-author">— ${escapeHtml(poem.author || 'Anonymous')}</span>
            ${isLive ? '<span class="badge-live">★ Live on Homepage</span>' : ''}
          </div>
          <p class="poem-card-preview">“${escapeHtml(previewLine)}”</p>
        </div>
        <div class="poem-card-actions">
          ${
            !isLive
              ? `<button type="button" class="action-btn small-btn set-active-btn" data-action="set-live" data-id="${poem.id}">Share on Homepage</button>`
              : ''
          }
          <button type="button" class="action-btn small-btn secondary-btn" data-action="edit" data-id="${poem.id}">Edit</button>
          <button type="button" class="delete-poem-btn" data-action="delete" data-id="${poem.id}" title="Delete poem">Delete</button>
        </div>
      `;

      adminPoemList.appendChild(card);
    });
  }

  function handleSavePoem(e) {
    e.preventDefault();
    const title = poemTitleInput.value.trim();
    const author = poemAuthorInput.value.trim();
    const body = poemBodyInput.value.trim();
    const targetId = editingPoemId.value;
    const makeLive = setLiveCheckbox.checked;

    if (!title || !body) {
      showToast('Please enter both poem title and verses.');
      return;
    }

    const stanzas = body
      .split(/\n\s*\n/)
      .map((stanza) => stanza.split('\n').map((line) => line.trim()).filter((l) => l.length > 0))
      .filter((stanza) => stanza.length > 0);

    if (targetId) {
      const poemIndex = state.poemLibrary.findIndex((p) => p.id === targetId);
      if (poemIndex !== -1) {
        state.poemLibrary[poemIndex].title = title;
        state.poemLibrary[poemIndex].author = author;
        state.poemLibrary[poemIndex].stanzas = stanzas;

        if (makeLive || state.activePoemId === targetId) {
          setActiveHomepagePoem(targetId);
        }
        showToast('Poem updated successfully.');
      }
    } else {
      const newPoem = {
        id: 'custom-' + Date.now(),
        title: title,
        author: author,
        stanzas: stanzas,
        isCustom: true
      };

      state.poemLibrary.unshift(newPoem);

      if (makeLive) {
        setActiveHomepagePoem(newPoem.id);
      }
      showToast('New poem created!');
    }

    savePoemLibrary();
    showLibraryView();
  }

  function handleDeletePoem(poemId) {
    if (!confirm('Are you sure you want to delete this poem?')) return;

    state.poemLibrary = state.poemLibrary.filter((p) => p.id !== poemId);
    if (state.activePoemId === poemId) {
      if (state.poemLibrary.length > 0) {
        setActiveHomepagePoem(state.poemLibrary[0].id);
      } else {
        state.activePoemId = null;
        try {
          localStorage.removeItem('aetheria_active_poem_id');
        } catch (e) {}
      }
    }
    savePoemLibrary();
    renderAdminPoemList();
    showToast('Poem removed.');
  }

  /* --------------------------------------------------------------------------
     7. Event Bindings & Init
     -------------------------------------------------------------------------- */

  function setupEventListeners() {
    // Passcode Form
    adminAuthForm?.addEventListener('submit', handleAuthSubmit);

    // Logout / Lock
    lockBtn?.addEventListener('click', handleLogout);

    // View Navigation
    adminCreateNewBtn?.addEventListener('click', () => showEditorView(null));
    backToLibraryBtn?.addEventListener('click', showLibraryView);
    cancelEditBtn?.addEventListener('click', showLibraryView);

    // Save Poem
    poemEditForm?.addEventListener('submit', handleSavePoem);

    // Card Action Delegation
    adminPoemList?.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const poemId = btn.getAttribute('data-id');

      if (action === 'set-live') {
        setActiveHomepagePoem(poemId);
      } else if (action === 'edit') {
        const poem = state.poemLibrary.find((p) => p.id === poemId);
        if (poem) showEditorView(poem);
      } else if (action === 'delete') {
        handleDeletePoem(poemId);
      }
    });

    // Update Admin Passcode
    saveNewPassBtn?.addEventListener('click', () => {
      const newPass = newAdminPass.value.trim();
      if (!newPass || newPass.length < 3) {
        showToast('Passcode must be at least 3 characters.');
        return;
      }
      localStorage.setItem('aetheria_admin_pass', newPass);
      newAdminPass.value = '';
      showToast('Admin passcode updated.');
    });

    // Clear Entire Library
    resetLibraryBtn?.addEventListener('click', () => {
      if (state.poemLibrary.length === 0) {
        showToast('Poem collection is already empty.');
        return;
      }
      if (!confirm('Are you sure you want to delete all poems from the collection?')) return;
      state.poemLibrary = [];
      state.activePoemId = null;
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      localStorage.removeItem(ACTIVE_POEM_KEY);
      showLibraryView();
      showToast('All poems cleared from collection.');
    });
  }

  /* --------------------------------------------------------------------------
     8. Continuous Background Audio
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
            if (unlockHint) unlockHint.hidden = true;
          })
          .catch((err) => {
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

  function init() {
    setupEventListeners();
    renderAuthState();
    initContinuousBackgroundAudio();
    console.log('✨ Admin Poem Studio ready.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
