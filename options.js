// options.js — DopaMin Options Page

const DEFAULT_SLOP = [
  'youtube.com/shorts',
  'tiktok.com',
  'instagram.com/reels',
  'twitter.com',
  'x.com',
  'reddit.com'
];

const MAX_WHY_LENGTH = 280;
const MAX_GOAL_LENGTH = 140;
const MAX_GOALS = 10;
const MAX_SLOP_LENGTH = 100;
const MAX_SLOP_ENTRIES = 30;

let slopList = [];
let goals = [];

// ─── Load ───────────────────────────────────────────────────────────────────
async function load() {
  const data = await chrome.storage.local.get(['settings', 'usage']);
  const s = data.settings || {};
  const u = data.usage || { dailySeconds: 0, bonusSeconds: 0 };

  // Why
  document.getElementById('input-why').value = s.why || '';

  // Goals
  goals = s.goals || [];
  renderGoals();

  // Slop
  slopList = s.slopList || [...DEFAULT_SLOP];
  renderSlop();

  // Budget
  const budgetSelect = document.getElementById('input-budget');
  if (s.budgetMinutes) budgetSelect.value = String(s.budgetMinutes);

  // Status
  updateStatus(s, u);
}

// ─── Save ───────────────────────────────────────────────────────────────────
async function save() {
  const why = document.getElementById('input-why').value.trim().slice(0, MAX_WHY_LENGTH);
  const budgetMinutes = parseInt(document.getElementById('input-budget').value, 10);

  // Sanitise goals
  const sanitisedGoals = goals
    .map(g => g.trim().slice(0, MAX_GOAL_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_GOALS);

  // Sanitise slop list
  const sanitisedSlop = slopList
    .map(s => s.trim().toLowerCase().replace(/^https?:\/\//, '').slice(0, MAX_SLOP_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_SLOP_ENTRIES);

  const settings = { why, goals: sanitisedGoals, slopList: sanitisedSlop, budgetMinutes };
  await chrome.storage.local.set({ settings });

  const msg = document.getElementById('save-msg');
  msg.classList.add('visible');
  setTimeout(() => msg.classList.remove('visible'), 2500);
}

// ─── Goals ──────────────────────────────────────────────────────────────────
function renderGoals() {
  const container = document.getElementById('goals-list');
  container.innerHTML = '';

  if (goals.length === 0) {
    const row = makeGoalRow('');
    container.appendChild(row);
  } else {
    goals.forEach((g, i) => container.appendChild(makeGoalRow(g, i)));
  }
}

function makeGoalRow(value, index) {
  const row = document.createElement('div');
  row.className = 'goal-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.maxLength = MAX_GOAL_LENGTH;
  input.placeholder = 'e.g. Pass all four accounting exams with distinction';
  input.addEventListener('input', () => {
    if (index !== undefined) goals[index] = input.value;
  });

  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn-icon';
  removeBtn.textContent = '×';
  removeBtn.title = 'Remove';
  removeBtn.addEventListener('click', () => {
    if (index !== undefined) {
      goals.splice(index, 1);
      renderGoals();
    } else {
      row.remove();
    }
  });

  row.appendChild(input);
  row.appendChild(removeBtn);
  return row;
}

document.getElementById('btn-add-goal').addEventListener('click', () => {
  // Collect current values from DOM before re-rendering
  collectGoalsFromDOM();
  goals.push('');
  renderGoals();
  // Focus last input
  const rows = document.querySelectorAll('#goals-list .goal-row input');
  if (rows.length) rows[rows.length - 1].focus();
});

function collectGoalsFromDOM() {
  const inputs = document.querySelectorAll('#goals-list .goal-row input');
  goals = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);
}

// ─── Slop ────────────────────────────────────────────────────────────────────
function renderSlop() {
  const grid = document.getElementById('slop-grid');
  grid.innerHTML = '';
  slopList.forEach((url, i) => {
    const tag = document.createElement('div');
    tag.className = 'slop-tag';
    tag.innerHTML = `<span>${escapeHTML(url)}</span><button class="slop-tag-remove" data-i="${i}" title="Remove">×</button>`;
    grid.appendChild(tag);
  });

  grid.querySelectorAll('.slop-tag-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      slopList.splice(parseInt(btn.dataset.i, 10), 1);
      renderSlop();
    });
  });
}

document.getElementById('btn-add-slop').addEventListener('click', addSlopEntry);
document.getElementById('input-slop-new').addEventListener('keydown', e => {
  if (e.key === 'Enter') addSlopEntry();
});

function addSlopEntry() {
  const input = document.getElementById('input-slop-new');
  const val = input.value.trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .slice(0, MAX_SLOP_LENGTH);
  if (!val) return;
  if (slopList.length >= MAX_SLOP_ENTRIES) return;
  if (!slopList.includes(val)) {
    slopList.push(val);
    renderSlop();
  }
  input.value = '';
}

// ─── Status ──────────────────────────────────────────────────────────────────
function updateStatus(settings, usage) {
  const budget = (settings.budgetMinutes || 15) * 60;
  const used = usage.dailySeconds || 0;
  const bonus = usage.bonusSeconds || 0;
  const pct = Math.min(100, Math.round((used / budget) * 100));

  document.getElementById('stat-used').textContent = formatSecs(used);
  document.getElementById('stat-budget').textContent = formatSecs(budget);
  document.getElementById('stat-bonus').textContent = bonus > 0 ? `+${formatSecs(bonus)}` : 'None earned';
  document.getElementById('stat-bar').style.width = `${pct}%`;
  document.getElementById('stat-bar').style.background = pct >= 100 ? 'var(--red)' : 'var(--accent)';
}

document.getElementById('btn-reset-today').addEventListener('click', async () => {
  await chrome.storage.local.set({
    usage: { dailySeconds: 0, lastDate: new Date().toDateString(), bonusSeconds: 0 }
  });
  document.getElementById('stat-used').textContent = '0:00';
  document.getElementById('stat-bar').style.width = '0%';
  document.getElementById('stat-bonus').textContent = 'None earned';
});

// ─── Save btn ────────────────────────────────────────────────────────────────
document.getElementById('btn-save').addEventListener('click', () => {
  collectGoalsFromDOM();
  save();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatSecs(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── Init ────────────────────────────────────────────────────────────────────
load();
