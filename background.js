// background.js — Dopamine Restrictor Service Worker

// ─── Defaults ───────────────────────────────────────────────────────────────
const DEFAULT_BUDGET_MINUTES = 15;

// ─── Alarm: reset daily budget at midnight ───────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  scheduleMidnightReset();
  initStorage();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'midnightReset') {
    resetDailyUsage();
    scheduleMidnightReset();
  }
});

function scheduleMidnightReset() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight.getTime() - now.getTime();
  chrome.alarms.create('midnightReset', { delayInMinutes: msUntilMidnight / 60000 });
}

async function initStorage() {
  const data = await chrome.storage.local.get(['settings', 'usage']);
  if (!data.settings) {
    await chrome.storage.local.set({
      settings: {
        why: '',
        goals: [],
        slopList: [
          'youtube.com/shorts',
          'tiktok.com',
          'instagram.com/reels',
          'twitter.com',
          'x.com',
          'reddit.com'
        ],
        budgetMinutes: DEFAULT_BUDGET_MINUTES
      }
    });
  }
  if (!data.usage) {
    await chrome.storage.local.set({
      usage: {
        dailySeconds: 0,
        lastDate: new Date().toDateString(),
        bonusSeconds: 0
      }
    });
  }
}

async function resetDailyUsage() {
  await chrome.storage.local.set({
    usage: {
      dailySeconds: 0,
      lastDate: new Date().toDateString(),
      bonusSeconds: 0
    }
  });
}

// ─── Message handler from content script ────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'TICK') {
    handleTick().then(sendResponse);
    return true; // keep channel open for async
  }
  if (msg.type === 'GET_STATE') {
    getState().then(sendResponse);
    return true;
  }
  if (msg.type === 'UNLOCK_BONUS') {
    grantBonusTime(120).then(sendResponse); // 2 minutes
    return true;
  }
  if (msg.type === 'GET_SETTINGS') {
    chrome.storage.local.get('settings').then(d => sendResponse(d.settings));
    return true;
  }
});

async function handleTick() {
  const data = await chrome.storage.local.get(['settings', 'usage']);
  const settings = data.settings || {};
  const usage = data.usage || { dailySeconds: 0, bonusSeconds: 0 };

  // Auto-reset if it's a new day
  if (usage.lastDate !== new Date().toDateString()) {
    await resetDailyUsage();
    return { blocked: false, secondsLeft: (settings.budgetMinutes || DEFAULT_BUDGET_MINUTES) * 60 };
  }

  const budgetSeconds = (settings.budgetMinutes || DEFAULT_BUDGET_MINUTES) * 60;
  const totalAllowed = budgetSeconds + (usage.bonusSeconds || 0);
  const newUsed = usage.dailySeconds + 1;

  await chrome.storage.local.set({
    usage: { ...usage, dailySeconds: newUsed }
  });

  const secondsLeft = totalAllowed - newUsed;
  const blocked = secondsLeft <= 0;

  return { blocked, secondsLeft: Math.max(0, secondsLeft) };
}

async function getState() {
  const data = await chrome.storage.local.get(['settings', 'usage']);
  const settings = data.settings || {};
  const usage = data.usage || { dailySeconds: 0, bonusSeconds: 0 };

  const budgetSeconds = (settings.budgetMinutes || DEFAULT_BUDGET_MINUTES) * 60;
  const totalAllowed = budgetSeconds + (usage.bonusSeconds || 0);
  const secondsLeft = Math.max(0, totalAllowed - usage.dailySeconds);

  return {
    blocked: secondsLeft <= 0,
    secondsLeft,
    budgetSeconds,
    settings,
    usage
  };
}

async function grantBonusTime(seconds) {
  const data = await chrome.storage.local.get('usage');
  const usage = data.usage || { dailySeconds: 0, bonusSeconds: 0 };
  await chrome.storage.local.set({
    usage: { ...usage, bonusSeconds: (usage.bonusSeconds || 0) + seconds }
  });
  return { ok: true };
}
