// popup.js

async function init() {
  const data = await chrome.storage.local.get(['settings', 'usage']);
  const s = data.settings || {};
  const u = data.usage || { dailySeconds: 0, bonusSeconds: 0 };

  const budget = (s.budgetMinutes || 15) * 60;
  const bonus = u.bonusSeconds || 0;
  const total = budget + bonus;
  const used = u.dailySeconds || 0;
  const left = Math.max(0, total - used);
  const pct = Math.min(100, Math.round((used / total) * 100));
  const blocked = left <= 0;

  const badge = document.getElementById('status-badge');
  badge.textContent = blocked ? 'BLOCKED' : 'ACTIVE';
  badge.className = 'popup-status ' + (blocked ? 'blocked' : 'active');

  document.getElementById('p-used').textContent = fmt(used);
  document.getElementById('p-left').textContent = blocked ? '0:00' : fmt(left);

  const bar = document.getElementById('p-bar');
  bar.style.width = `${pct}%`;
  bar.style.background = blocked ? 'var(--red)' : pct > 80 ? 'var(--red)' : 'var(--accent)';

  if (s.why) {
    document.getElementById('p-why').style.display = 'block';
    document.getElementById('p-why-text').textContent = s.why;
  }
}

function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

document.getElementById('btn-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

init();
