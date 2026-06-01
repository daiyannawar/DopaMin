// content.js — DopaMin Content Script
// Runs on every page, checks if it's a "slop" site, tracks time, injects overlay

(function () {
  'use strict';

  let tickInterval = null;
  let overlayInjected = false;
  let isRestrictedSite = false;
  let currentSettings = null;

  // ─── Bootstrap ─────────────────────────────────────────────────────────────
  async function init() {
    const state = await sendMessage({ type: 'GET_STATE' });
    currentSettings = state.settings;

    if (!currentSettings || !currentSettings.slopList) return;

    isRestrictedSite = isSlopSite(currentSettings.slopList);
    if (!isRestrictedSite) return;

    if (state.blocked) {
      injectOverlay(state);
    } else {
      startTicking();
    }
  }

  function isSlopSite(slopList) {
    const href = window.location.href.toLowerCase();
    return slopList.some(entry => href.includes(entry.toLowerCase().replace(/^https?:\/\//, '')));
  }

  // ─── Tick loop ──────────────────────────────────────────────────────────────
  function startTicking() {
    if (tickInterval) return;
    tickInterval = setInterval(async () => {
      const result = await sendMessage({ type: 'TICK' });
      if (result && result.blocked && !overlayInjected) {
        clearInterval(tickInterval);
        tickInterval = null;
        const state = await sendMessage({ type: 'GET_STATE' });
        injectOverlay(state);
      }
    }, 1000);
  }

  // ─── Overlay Injection ──────────────────────────────────────────────────────
  function injectOverlay(state) {
    if (overlayInjected) return;
    overlayInjected = true;

    const settings = state.settings || {};
    const goals = settings.goals || [];
    const why = settings.why || 'your goal';

    // Build reset time string
    const resetTime = getMidnightCountdown();

    const overlay = document.createElement('div');
    overlay.id = 'dr-overlay';
    overlay.innerHTML = buildOverlayHTML(goals, why, resetTime);
    document.body.appendChild(overlay);

    // Prevent scrolling on underlying page
    document.body.style.overflow = 'hidden';

    // Wire up the unlock game
    wireUnlockGame(settings, overlay);

    // Start countdown timer
    startResetCountdown(overlay);

    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add('dr-visible');
    });

    // Guard against DevTools removal
    startOverlayWatchdog(state);
  }

  function buildOverlayHTML(goals, why, resetTime) {
    const goalItems = goals.length > 0
      ? goals.map(g => `<li class="dr-goal-item"><span class="dr-goal-bullet">◆</span>${escapeHTML(g)}</li>`).join('')
      : `<li class="dr-goal-item"><span class="dr-goal-bullet">◆</span>Your goals (set them in Options)</li>`;

    return `
      <div class="dr-overlay-inner">
        <div class="dr-noise"></div>

        <div class="dr-header">
          <div class="dr-logo">DM</div>
          <div class="dr-status-badge">BUDGET EXPIRED</div>
        </div>

        <div class="dr-main">
          <h1 class="dr-headline">
            <span class="dr-headline-top">Dopamine</span>
            <span class="dr-headline-bottom">Budget<br>Expired.</span>
          </h1>

          <div class="dr-divider"></div>

          <div class="dr-focus-block">
            <p class="dr-focus-label">GET BACK TO</p>
            <ul class="dr-goals-list">${goalItems}</ul>
          </div>

          <div class="dr-reset-block">
            <p class="dr-reset-label">BUDGET RESETS IN</p>
            <div class="dr-countdown" id="dr-countdown">${resetTime}</div>
          </div>
        </div>

        <div class="dr-unlock-section">
          <button class="dr-unlock-toggle" id="dr-unlock-toggle">
            Need in? Pay the cognitive price →
          </button>

          <div class="dr-unlock-game" id="dr-unlock-game" style="display:none;">
            <div class="dr-game-header">
              <span class="dr-game-title">THE TYPO TRAP</span>
              <span class="dr-game-sub">Type your goal <strong>3×</strong> perfectly. Earn 2 minutes.</span>
            </div>
            <div class="dr-game-target" id="dr-game-target"></div>
            <div class="dr-progress-dots" id="dr-progress-dots">
              <span class="dr-dot" id="dr-dot-0"></span>
              <span class="dr-dot" id="dr-dot-1"></span>
              <span class="dr-dot" id="dr-dot-2"></span>
            </div>
            <input
              class="dr-game-input"
              id="dr-game-input"
              type="text"
              placeholder="Type it exactly..."
              autocomplete="off"
              spellcheck="false"
            />
            <p class="dr-game-feedback" id="dr-game-feedback"></p>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Unlock Game ────────────────────────────────────────────────────────────
  function wireUnlockGame(settings, overlay) {
    const toggleBtn = overlay.querySelector('#dr-unlock-toggle');
    const gameSection = overlay.querySelector('#dr-unlock-game');
    const targetEl = overlay.querySelector('#dr-game-target');
    const input = overlay.querySelector('#dr-game-input');
    const feedback = overlay.querySelector('#dr-game-feedback');

    // Pick the goal statement to type — use first goal or why
    const goals = settings.goals || [];
    const targetText = goals[0] || settings.why || 'I will stay focused on what matters.';
    if (targetEl) targetEl.textContent = `"${targetText}"`;

    let successCount = 0;
  let failCount = 0;
  let lockoutUntil = 0;

    toggleBtn.addEventListener('click', () => {
      const open = gameSection.style.display === 'none';
      gameSection.style.display = open ? 'block' : 'none';
      toggleBtn.textContent = open ? 'Hide unlock ↑' : 'Need in? Pay the cognitive price →';
      if (open) input.focus();
    });

    input.addEventListener('input', () => {
      const val = input.value;
      const target = targetText;

      // Colour feedback as they type
      if (target.startsWith(val)) {
        input.classList.remove('dr-input-error');
        input.classList.add('dr-input-ok');
      } else {
        input.classList.remove('dr-input-ok');
        input.classList.add('dr-input-error');
      }
    });

    input.addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter') return;

      // Lockout check
      if (Date.now() < lockoutUntil) {
        const secsLeft = Math.ceil((lockoutUntil - Date.now()) / 1000);
        feedback.textContent = `✗ Too many attempts. Wait ${secsLeft}s.`;
        feedback.style.color = 'var(--dr-red)';
        return;
      }

      const val = input.value.trim();

      if (val === targetText) {
        failCount = 0;
        successCount++;
        updateDots(overlay, successCount);
        input.value = '';
        input.classList.remove('dr-input-ok', 'dr-input-error');
        feedback.textContent = `✓ ${successCount}/3 — ${3 - successCount} more to go`;
        feedback.style.color = 'var(--dr-green)';

        if (successCount >= 3) {
          feedback.textContent = '✓ Unlocked! 2 minutes granted. Use it wisely.';
          await sendMessage({ type: 'UNLOCK_BONUS' });
          setTimeout(() => dismissOverlay(overlay), 1800);
        }
      } else {
        failCount++;
        feedback.style.color = 'var(--dr-red)';
        input.classList.add('dr-input-shake');
        setTimeout(() => input.classList.remove('dr-input-shake'), 400);

        if (failCount >= 5) {
          lockoutUntil = Date.now() + 30000; // 30 second lockout
          failCount = 0;
          feedback.textContent = '✗ Too many attempts. Locked out for 30s.';
          input.disabled = true;
          setTimeout(() => {
            input.disabled = false;
            feedback.textContent = 'Lockout lifted. Try again.';
            feedback.style.color = 'var(--dr-muted)';
            input.focus();
          }, 30000);
        } else {
          feedback.textContent = `✗ Not quite. Try again. (${5 - failCount} attempts before lockout)`;
          // Progressive delay: 1s, 2s, 3s, 4s...
          input.disabled = true;
          setTimeout(() => { input.disabled = false; input.focus(); }, failCount * 1000);
        }
      }
    });
  }

  function updateDots(overlay, count) {
    for (let i = 0; i < 3; i++) {
      const dot = overlay.querySelector(`#dr-dot-${i}`);
      if (dot) dot.classList.toggle('dr-dot-filled', i < count);
    }
  }

  function dismissOverlay(overlay) {
    overlay.classList.remove('dr-visible');
    overlay.classList.add('dr-hiding');
    document.body.style.overflow = '';
    overlayInjected = false;
    setTimeout(() => overlay.remove(), 600);
    startTicking(); // resume counting
  }

  // Watchdog: if overlay is removed from DOM while budget is zero, re-inject
  function startOverlayWatchdog(state) {
    const watchdog = setInterval(async () => {
      if (!overlayInjected) { clearInterval(watchdog); return; }
      if (!document.getElementById('dr-overlay')) {
        overlayInjected = false;
        clearInterval(watchdog);
        const fresh = await sendMessage({ type: 'GET_STATE' });
        if (fresh && fresh.blocked) injectOverlay(fresh);
      }
    }, 1500);
  }

  // ─── Reset Countdown ────────────────────────────────────────────────────────
  function getMidnightCountdown() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const secs = Math.floor((midnight - now) / 1000);
    return formatTime(secs);
  }

  function formatTime(secs) {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function startResetCountdown(overlay) {
    const el = overlay.querySelector('#dr-countdown');
    if (!el) return;
    setInterval(() => {
      el.textContent = getMidnightCountdown();
    }, 1000);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function sendMessage(msg) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (response) => {
          if (chrome.runtime.lastError) { resolve(null); return; }
          resolve(response);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  function escapeHTML(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ─── Go ─────────────────────────────────────────────────────────────────────
  init();
})();
