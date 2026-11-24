import { idbGet, idbSet, idbDelete, seal, unseal, deriveKey, newSalt, ITERATIONS, isValidBlob } from './vault.js';

/* ================= 常數 ================= */
const LOCK_AFTER_MS = 5 * 60 * 1000;   // 閒置 5 分鐘上鎖
const CLIP_CLEAR_MS = 30 * 1000;       // 複製後 30 秒清除剪貼簿
const BACKUP_REMIND_DAYS = 14;

const COLORS = {
  sakura:   { name: '櫻花', main: '#f4a6c0', soft: '#fbe1ea', ink: '#e07fa6' },
  sky:      { name: '天空', main: '#9fc4ef', soft: '#dfeafb', ink: '#6f9fd8' },
  lavender: { name: '薰衣草', main: '#c2b2ec', soft: '#ebe5fa', ink: '#9a85d6' },
  mint:     { name: '薄荷', main: '#9fd9c4', soft: '#def3eb', ink: '#5fb596' },
  peach:    { name: '蜜桃', main: '#f6c09f', soft: '#fde7da', ink: '#e0946a' },
  lemon:    { name: '檸檬', main: '#f0d88a', soft: '#fbf2d4', ink: '#c9a640' },
  cloud:    { name: '雲朵', main: '#b8c1d1', soft: '#e7ebf2', ink: '#8a95aa' },
};

const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  sort: '<path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15h-.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/>',
  open: '<path d="M14 4h6v6M20 4l-9 9M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.1" fill="currentColor"/><circle cx="15" cy="15" r="1.1" fill="currentColor"/><circle cx="15" cy="9" r="1.1" fill="currentColor"/><circle cx="9" cy="15" r="1.1" fill="currentColor"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  grip: '<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width="3.2"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
  share: '<path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
};
const icon = (n) => `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

const MASCOT = `<svg viewBox="0 0 80 80" aria-hidden="true">
  <rect x="14" y="13" width="52" height="56" rx="13" fill="#fde3ec"/>
  <rect x="29" y="5" width="22" height="13" rx="2.5" fill="#bcd3f5" opacity=".9" transform="rotate(-7 40 11)"/>
  <circle cx="31" cy="39" r="3.3" fill="#8d82a8"/><circle cx="49" cy="39" r="3.3" fill="#8d82a8"/>
  <circle cx="32.2" cy="37.8" r="1" fill="#fff"/><circle cx="50.2" cy="37.8" r="1" fill="#fff"/>
  <ellipse cx="24.5" cy="47" rx="4.6" ry="2.8" fill="#f7b3c9"/><ellipse cx="55.5" cy="47" rx="4.6" ry="2.8" fill="#f7b3c9"/>
  <path d="M35.5 46.5q4.5 4.5 9 0" stroke="#8d82a8" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <rect x="33" y="55" width="14" height="10" rx="3" fill="#f4a6c0"/>
  <path d="M36 55v-2.5a4 4 0 0 1 8 0V55" stroke="#f4a6c0" stroke-width="2.4" fill="none"/>
  <circle cx="40" cy="60" r="1.5" fill="#fff"/>
</svg>`;

/* ================= 小工具 ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');
const now = () => Date.now();
const uid = () => [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const colorOf = (k) => COLORS[k] || COLORS.sakura;
const colorVars = (k) => { const c = colorOf(k); return `--c-main:${c.main};--c-soft:${c.soft};--c-ink:${c.ink}`; };
const fmtDate = (ts) => new Date(ts).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

function toast(msg, ms = 2200) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), ms);
}

function normUrl(u) {
  u = (u || '').trim();
  if (!u) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
  try {
    const x = new URL(u);
    return x.protocol === 'http:' || x.protocol === 'https:' ? x.href : '';
  } catch { return ''; }
}
function hostOf(u) {
  const h = normUrl(u);
  try { return h ? new URL(h).hostname.replace(/^www\./, '') : ''; } catch { return ''; }
}
const firstLine = (s) => (s || '').split('\n').find((l) => l.trim())?.trim() || '';
const letterOf = (n) => ([...(n.title || hostOf(n.url) || '?').trim()][0] || '?').toUpperCase();

function strength(pw) {
  if (!pw) return { bits: 0, label: '', pct: 0, color: '' };
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/\d/.test(pw)) pool += 10;
  if (/[!-/:-@[-`{-~ ]/.test(pw)) pool += 33;
  if (/[^\x00-\x7f]/.test(pw)) pool += 200;
  const len = [...pw].length;
  let bits = Math.log2(Math.max(pool, 2)) * len;
  if (new Set(pw).size <= len / 2) bits *= 0.6;
  return rate(bits);
}
function rate(bits) {
  const [label, color] =
    bits < 36 ? ['很弱', '#ee8f99'] :
    bits < 50 ? ['弱', '#f1a77f'] :
    bits < 70 ? ['普通', '#f0c96b'] :
    bits < 90 ? ['強', '#8fd0b4'] : ['很強', '#6fc3a0'];
  return { bits: Math.round(bits), label, color, pct: Math.min(100, Math.max(8, bits)) };
}

/* ================= 資料 ================= */
let S = null; // { session: {key, salt, iterations}, data }
const view = { cat: 'all', q: '', sorting: false };

const emptyData = () => ({ notes: [], categories: [], images: [], settings: { lastBackupAt: 0 } });

function cleanNote(n) {
  if (!n || typeof n.id !== 'string' || !n.id) return null;
  const base = { id: n.id.slice(0, 64), updatedAt: Number(n.updatedAt) || 0 };
  if (n.deleted) return { ...base, deleted: true };
  return {
    ...base,
    title: str(n.title, 200), username: str(n.username, 500), password: str(n.password, 1000),
    url: str(n.url, 2000), notes: str(n.notes, 20000),
    color: COLORS[n.color] ? n.color : 'sakura',
    categoryId: str(n.categoryId, 64),
    // 小圖示與橫幅分開設定；舊版只有一張 imageId，就同時套用到兩處
    iconId: str(n.iconId ?? n.imageId, 64),
    bannerId: str(n.bannerId ?? n.imageId, 64),
    order: Number.isFinite(n.order) ? n.order : 0,
    createdAt: Number(n.createdAt) || 0,
  };
}
function cleanCat(c) {
  if (!c || typeof c.id !== 'string' || !c.id) return null;
  const base = { id: c.id.slice(0, 64), updatedAt: Number(c.updatedAt) || 0 };
  if (c.deleted) return { ...base, deleted: true };
  return { ...base, name: str(c.name, 40) || '未命名', order: Number.isFinite(c.order) ? c.order : 0 };
}
const IMG_RE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
function cleanImage(i) {
  if (!i || typeof i.id !== 'string' || !i.id) return null;
  const base = { id: i.id.slice(0, 64), updatedAt: Number(i.updatedAt) || 0 };
  if (i.deleted) return { ...base, deleted: true };
  if (typeof i.data !== 'string' || i.data.length > 4e6 || !IMG_RE.test(i.data)) return null;
  const kind = i.kind === 'square' || i.kind === 'wide' ? i.kind : '';
  return { ...base, data: i.data, ...(kind && { kind }) };
}
function normalizeData(d) {
  d = d && typeof d === 'object' ? d : {};
  const arr = (a, f) => (Array.isArray(a) ? a.map(f).filter(Boolean) : []);
  return {
    notes: arr(d.notes, cleanNote),
    categories: arr(d.categories, cleanCat),
    images: arr(d.images, cleanImage),
    settings: { lastBackupAt: Number(d.settings?.lastBackupAt) || 0 },
  };
}

const notes = () => S.data.notes.filter((n) => !n.deleted).sort((a, b) => a.order - b.order || b.createdAt - a.createdAt);
const cats = () => S.data.categories.filter((c) => !c.deleted).sort((a, b) => a.order - b.order);
const noteById = (id) => S.data.notes.find((n) => n.id === id && !n.deleted);
const catById = (id) => id && S.data.categories.find((c) => c.id === id && !c.deleted);
const imageData = (id) => (id && S.data.images.find((i) => i.id === id && !i.deleted)?.data) || '';

let saveChain = Promise.resolve();
function persist() {
  const snapshot = S;
  saveChain = saveChain
    .then(async () => { await idbSet('vault', await seal(snapshot.session, snapshot.data)); })
    .catch((e) => { console.error(e); toast('儲存失敗，請再試一次'); });
  return saveChain;
}

function mergeList(local, incoming) {
  const map = new Map(local.map((x) => [x.id, x]));
  let added = 0, updated = 0;
  for (const it of incoming) {
    const cur = map.get(it.id);
    if (!cur) { map.set(it.id, it); if (!it.deleted) added++; }
    else if (it.updatedAt > cur.updatedAt) { map.set(it.id, it); updated++; }
  }
  return { list: [...map.values()], added, updated };
}
function mergeData(raw) {
  const inc = normalizeData(raw);
  const r = {};
  for (const k of ['notes', 'categories', 'images']) {
    const m = mergeList(S.data[k], inc[k]);
    S.data[k] = m.list;
    r[k] = m;
  }
  return r;
}

/* ================= 對話框堆疊（支援手機返回鍵） ================= */
const stack = [];
const popWaiters = [];
const modalRoot = $('#modal-root');

function openModal(html, { onClose } = {}) {
  const el = document.createElement('div');
  el.className = 'modal';
  el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.closest('[data-close]')) closeModal();
  });
  modalRoot.append(el);
  stack.push({ el, onClose });
  history.pushState({ m: stack.length }, '');
  return el;
}
function closeModal(n = 1) {
  return new Promise((resolve) => {
    if (!stack.length) return resolve();
    popWaiters.push(resolve);
    history.go(-Math.min(n, stack.length));
  });
}
const closeAll = () => closeModal(stack.length);
addEventListener('popstate', () => {
  const depth = history.state?.m || 0;
  while (stack.length > depth) {
    const m = stack.pop();
    m.el.remove();
    m.onClose?.();
  }
  popWaiters.splice(0).forEach((r) => r());
});

function ask({ title, message = '', input = null, ok = '確定', cancel = '取消', danger = false, check = null }) {
  return new Promise((resolve) => {
    let result = null;
    const el = openModal(`
      <div class="sheet-head"><h2>${esc(title)}</h2></div>
      ${message ? `<p style="margin:0 0.125rem 0.875rem">${message}</p>` : ''}
      ${input ? `<input class="input ${input.type === 'password' ? 'mono' : ''}" id="ask-in" type="${input.type || 'text'}" placeholder="${esc(input.placeholder || '')}" value="${esc(input.value || '')}" autocomplete="${input.type === 'password' ? 'current-password' : 'off'}" maxlength="${input.maxlength || 200}">` : ''}
      <p class="error" id="ask-err"></p>
      <div class="sheet-foot">
        ${cancel ? `<button class="btn ghost" data-close>${esc(cancel)}</button>` : ''}
        <button class="btn ${danger ? 'danger' : ''}" id="ask-ok">${esc(ok)}</button>
      </div>`, { onClose: () => resolve(result) });
    const inp = $('#ask-in', el);
    const btn = $('#ask-ok', el);
    if (inp) { setTimeout(() => inp.focus(), 60); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); }); }
    btn.addEventListener('click', async () => {
      const v = inp ? inp.value : true;
      if (check) {
        btn.disabled = true;
        const label = btn.textContent;
        btn.textContent = '處理中…';
        let err;
        try { err = await check(v); } catch (e) { err = e.message || '發生錯誤'; }
        btn.disabled = false;
        btn.textContent = label;
        if (err) { $('#ask-err', el).textContent = err; return; }
      }
      result = v;
      closeModal();
    });
  });
}

/* ================= 剪貼簿 ================= */
let clipDeadline = 0;
let clipTicker = 0;
const pill = $('#clip-pill');

function legacyCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.append(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch {}
  ta.remove();
  return ok;
}
async function copyText(text, label) {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch { ok = legacyCopy(text); }
  if (!ok) return toast('複製失敗');
  toast(`已複製${label}`);
  clipDeadline = now() + CLIP_CLEAR_MS;
  clearInterval(clipTicker);
  clipTicker = setInterval(tickClip, 1000);
  tickClip();
}
function tickClip() {
  if (!clipDeadline) return;
  const left = Math.ceil((clipDeadline - now()) / 1000);
  pill.hidden = false;
  if (left > 0) {
    pill.textContent = `📋 剪貼簿將在 ${left} 秒後清除・點此立即清除`;
  } else {
    clearClipboard();
  }
}
async function clearClipboard() {
  if (!clipDeadline) return;
  try {
    await navigator.clipboard.writeText('');
    clipDeadline = 0;
    clearInterval(clipTicker);
    pill.hidden = true;
  } catch {
    // 瀏覽器不允許在背景寫入剪貼簿：等使用者下一次點擊時再清
    pill.textContent = '📋 點一下這裡清除剪貼簿';
  }
}
pill.addEventListener('click', () => { clipDeadline = clipDeadline || 1; clearClipboard(); });
// 手機上「使用者操作」才允許寫入剪貼簿，所以逾時後的下一次點擊順便清除
['click', 'keydown', 'touchend'].forEach((ev) => addEventListener(ev, () => {
  if (clipDeadline && now() >= clipDeadline) clearClipboard();
}, { capture: true }));

/* ================= 自動上鎖 ================= */
let lastActive = now();
let lockTimer = 0;
['pointerdown', 'keydown', 'touchstart', 'wheel', 'input', 'scroll'].forEach((ev) =>
  addEventListener(ev, () => { lastActive = now(); }, { capture: true, passive: true }));

function startAutoLock() {
  lastActive = now();
  clearInterval(lockTimer);
  lockTimer = setInterval(checkIdle, 5000);
}
function checkIdle() { if (S && now() - lastActive > LOCK_AFTER_MS) lock(); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkIdle(); });

async function lock() {
  if (clipDeadline) { try { await navigator.clipboard.writeText(''); } catch {} }
  S = null;
  // 重新載入頁面，確保記憶體中的金鑰和明文都被丟棄
  location.replace(location.pathname);
}

/* ================= 鎖定／設定畫面 ================= */
function lockShell(inner) {
  modalRoot.innerHTML = '';
  app.innerHTML = `<div class="lock"><div class="lock-card">
    <div class="logo">秘密の手帳</div>
    <div class="mascot portrait"><img src="icons/mascot.png" alt=""></div>
    ${inner}
  </div></div>`;
}

const pwInput = (id, label, ac, extra = '') => `
  <label class="field"><span>${label}</span>
    <div class="input-row">
      <input class="input mono" type="password" id="${id}" autocomplete="${ac}" autocapitalize="off" spellcheck="false" ${extra}>
      <button type="button" class="icon-btn flat" data-toggle="${id}" aria-label="顯示密碼">${icon('eye')}</button>
    </div>
  </label>`;

function bindMeter(input, meter, hint) {
  const upd = () => {
    const s = strength(input.value);
    meter.style.width = s.pct + '%';
    meter.style.background = s.color;
    hint.textContent = input.value ? `強度：${s.label}（約 ${s.bits} bits）` : '建議用一句好記的長句子，例如「我家貓咪每天早上6點叫我起床!」';
  };
  input.addEventListener('input', upd);
  upd();
}

async function renderGate() {
  const blob = await idbGet('vault');
  if (blob) renderUnlock(); else renderSetup();
}

function renderSetup() {
  lockShell(`
    <h1>建立主密碼</h1>
    <p class="sub">資料只會存在這台裝置</p>
    <form id="f" novalidate>
      ${pwInput('p1', '主密碼（至少 8 個字元）', 'new-password')}
      <div class="meter"><i id="meter"></i></div><p class="hint" id="hint"></p>
      <div style="height:0.625rem"></div>
      ${pwInput('p2', '再輸入一次', 'new-password')}
      <div class="warn">⚠ 主密碼<b>無法找回</b>。忘記的話，這裡的資料和所有備份檔都將永遠打不開，請一定要記好。</div>
      <button class="btn block" id="go">建立</button>
      <p class="error" id="err"></p>
    </form>
    <button class="link-btn" id="restore">已經有備份檔？從備份還原</button>`);
  bindMeter($('#p1'), $('#meter'), $('#hint'));
  $('#restore').onclick = renderRestore;
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const p1 = $('#p1').value, p2 = $('#p2').value, err = $('#err');
    if ([...p1].length < 8) return (err.textContent = '主密碼至少要 8 個字元');
    if (p1 !== p2) return (err.textContent = '兩次輸入的密碼不一樣');
    $('#go').disabled = true; $('#go').textContent = '建立中…';
    const salt = newSalt();
    const key = await deriveKey(p1, salt, ITERATIONS);
    S = { session: { key, salt, iterations: ITERATIONS }, data: emptyData() };
    await persist();
    enterApp();
  };
}

function renderRestore() {
  lockShell(`
    <h1>從備份還原</h1>
    <p class="sub">還原後，備份檔的密碼就是這台裝置的主密碼</p>
    <form id="f" novalidate>
      <label class="field"><span>備份檔（.json）</span><input class="input" type="file" id="file" accept=".json,application/json"></label>
      ${pwInput('pw', '備份檔的密碼', 'current-password')}
      <button class="btn block" id="go">還原</button>
      <p class="error" id="err"></p>
    </form>
    <button class="link-btn" id="back">返回</button>`);
  $('#back').onclick = renderGate;
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const err = $('#err'), go = $('#go');
    const file = $('#file').files[0];
    if (!file) return (err.textContent = '請先選擇備份檔');
    let blob;
    try { blob = JSON.parse(await file.text()); } catch { blob = null; }
    if (!isValidBlob(blob)) return (err.textContent = '這不是密碼便利貼的備份檔');
    go.disabled = true; go.textContent = '驗證中…'; err.textContent = '';
    try {
      const { session, data } = await unseal(blob, $('#pw').value);
      S = { session, data: normalizeData(data) };
      await persist();
      enterApp();
      toast(`已還原 ${notes().length} 張便利貼`);
    } catch (ex) {
      go.disabled = false; go.textContent = '還原';
      err.textContent = ex.message === 'BAD_PASSWORD' ? '密碼不正確，或檔案已損毀' : '無法讀取這個備份檔';
    }
  };
}

function renderUnlock() {
  lockShell(`
    <h1>歡迎回來</h1>
    <p class="sub">輸入主密碼來解鎖</p>
    <form id="f" novalidate>
      ${pwInput('pw', '主密碼', 'current-password')}
      <button class="btn block" id="go">解鎖</button>
      <p class="error" id="err"></p>
    </form>
    <button class="link-btn" id="forgot">忘記主密碼？</button>`);
  setTimeout(() => $('#pw')?.focus(), 100);
  $('#forgot').onclick = forgot;
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const err = $('#err'), go = $('#go');
    go.disabled = true; go.textContent = '解鎖中…'; err.textContent = '';
    try {
      const { session, data } = await unseal(await idbGet('vault'), $('#pw').value);
      S = { session, data: normalizeData(data) };
      enterApp();
    } catch (ex) {
      go.disabled = false; go.textContent = '解鎖';
      err.textContent = ex.message === 'BAD_PASSWORD' ? '密碼不正確' : '資料讀取失敗';
      $('#pw').select();
    }
  };
}

async function forgot() {
  const v = await ask({
    title: '忘記主密碼',
    message: '主密碼沒有辦法找回，這是為了確保只有你能打開資料。<br><br>你可以<b>清除這台裝置上的所有資料</b>重新開始，再用「從備份還原」（需要記得備份檔的密碼）。<br><br>確定要清除的話，請輸入「<b>刪除</b>」：',
    input: { placeholder: '刪除' }, ok: '清除所有資料', danger: true,
    check: (v) => (v.trim() === '刪除' ? null : '請輸入「刪除」兩個字'),
  });
  if (v) { await idbDelete('vault'); renderSetup(); toast('已清除'); }
}

function enterApp() {
  navigator.storage?.persist?.().catch(() => {});
  startAutoLock();
  renderMain();
}

/* ================= 主畫面 ================= */
function avatarHTML(n, size = '') {
  const img = imageData(n.iconId);
  return `<span class="avatar ${size}">${img ? `<img src="${esc(img)}" alt="">` : esc(letterOf(n))}</span>`;
}

function renderMain() {
  app.innerHTML = `
  <div class="wrap ${view.sorting ? 'sorting' : ''}" id="main">
    <header class="top">
      <div class="title-block"><div class="logo">秘密の手帳</div><small>PASS MEMO</small></div>
      <div class="actions">
        <button class="icon-btn ${view.sorting ? 'on' : ''}" id="sortBtn" aria-label="排序">${icon(view.sorting ? 'check' : 'sort')}</button>
        <button class="icon-btn" id="lockBtn" aria-label="上鎖">${icon('lock')}</button>
        <button class="icon-btn" id="menuBtn" aria-label="選單">${icon('menu')}</button>
      </div>
    </header>
    <div class="search">${icon('search')}<input class="input" id="q" type="search" placeholder="搜尋標題、帳號、網址、備註" value="${esc(view.q)}" autocomplete="off" ${view.sorting ? 'disabled' : ''}></div>
    <nav class="chips" id="chips"></nav>
    <div id="notice"></div>
    <ul class="list" id="list"></ul>
  </div>
  <button class="fab" id="fab" aria-label="新增便利貼">${icon('plus')}</button>`;

  $('#q').addEventListener('input', (e) => { view.q = e.target.value; renderList(); });
  $('#sortBtn').onclick = toggleSort;
  $('#lockBtn').onclick = lock;
  $('#menuBtn').onclick = openMenu;
  $('#fab').onclick = () => openEdit(null);
  $('#list').addEventListener('click', (e) => {
    if (view.sorting) return;
    const li = e.target.closest('.strip');
    if (li) openDetail(li.dataset.id);
  });
  $('#list').addEventListener('pointerdown', (e) => {
    const h = e.target.closest('.handle');
    if (h && view.sorting) startDrag(e, h);
  });
  renderChips();
  renderNotice();
  renderList();
}

function renderChips() {
  const cs = cats();
  if (view.cat !== 'all' && view.cat !== 'none' && !catById(view.cat)) view.cat = 'all';
  const hasUncat = cs.length > 0 && notes().some((n) => !catById(n.categoryId));
  if (view.cat === 'none' && !hasUncat) view.cat = 'all';
  const chip = (id, label) => `<button class="chip ${view.cat === id ? 'on' : ''}" data-cat="${esc(id)}">${esc(label)}</button>`;
  const box = $('#chips');
  box.innerHTML = chip('all', '全部') + cs.map((c) => chip(c.id, c.name)).join('') +
    (hasUncat ? chip('none', '未分類') : '') +
    `<button class="chip add" id="catAdd">${cs.length ? '✎ 分類' : '＋ 新增分類'}</button>`;
  box.onclick = (e) => {
    const b = e.target.closest('[data-cat]');
    if (b) { view.cat = b.dataset.cat; renderChips(); renderList(); }
    else if (e.target.closest('#catAdd')) openCategories();
  };
}

function renderNotice() {
  const box = $('#notice');
  if (!box) return;
  const last = S.data.settings.lastBackupAt;
  const days = last ? Math.floor((now() - last) / 86400000) : Infinity;
  if (!notes().length || days < BACKUP_REMIND_DAYS) { box.innerHTML = ''; return; }
  box.innerHTML = `<div class="notice">${icon('shield')}<span>${last ? `已經 ${days} 天沒有備份了` : '還沒有備份過喔，清除瀏覽器資料就會遺失'}</span><button class="btn" id="bk">備份</button></div>`;
  $('#bk').onclick = exportBackup;
}

function visibleNotes() {
  let list = notes();
  if (view.cat === 'none') list = list.filter((n) => !catById(n.categoryId));
  else if (view.cat !== 'all') list = list.filter((n) => n.categoryId === view.cat);
  const q = view.q.trim().toLowerCase();
  if (q && !view.sorting) list = list.filter((n) => [n.title, n.username, n.url, n.notes].some((f) => f.toLowerCase().includes(q)));
  return list;
}

function stripHTML(n) {
  const img = imageData(n.bannerId);
  const sub = hostOf(n.url) || firstLine(n.notes) || catById(n.categoryId)?.name || '';
  return `<li class="strip" data-id="${esc(n.id)}" style="${colorVars(n.color)}">
    <div class="strip-main">
      <div class="strip-head">${avatarHTML(n)}<div class="strip-title">${esc(n.title || '未命名')}</div></div>
      <div class="strip-sub">${esc(sub) || '&nbsp;'}</div>
    </div>
    <div class="strip-banner">${img ? `<img src="${esc(img)}" alt="">` : `<span class="big-letter">${esc(letterOf(n))}</span>`}</div>
    <span class="handle" aria-label="拖曳排序">${icon('grip')}</span>
  </li>`;
}

function renderList() {
  const box = $('#list');
  if (!box) return;
  const list = visibleNotes();
  if (list.length) { box.innerHTML = list.map(stripHTML).join(''); return; }
  const none = !notes().length;
  box.innerHTML = `<li class="empty"><div class="mascot">${MASCOT}</div>${none ? '還沒有便利貼<br>按右下角的 ＋ 新增第一張吧' : '沒有符合的便利貼'}</li>`;
}

/* ---------- 拖曳排序 ---------- */
function toggleSort() {
  view.sorting = !view.sorting;
  if (view.sorting) {
    view.q = '';
    // 合併備份後順序值可能重複，先重新編號
    const all = notes();
    if (new Set(all.map((n) => n.order)).size !== all.length) {
      all.forEach((n, i) => { n.order = i; n.updatedAt = now(); });
      persist();
    }
    toast('拖曳右側的把手來調整順序');
  }
  renderMain();
}

function startDrag(e, handle) {
  e.preventDefault();
  const li = handle.closest('.strip');
  const list = li.parentElement;
  const items = [...list.children];
  const from = items.indexOf(li);
  const step = items.length > 1
    ? items[1].getBoundingClientRect().top - items[0].getBoundingClientRect().top
    : li.offsetHeight + 14;
  const startY = e.clientY, startScroll = scrollY;
  let y = startY, to = from, raf = 0;
  li.classList.add('dragging');
  items.forEach((x) => { if (x !== li) x.style.transition = 'transform .18s'; });

  // 拖曳中不移動 DOM（iOS 上移動元素會中斷觸控事件），只用位移動畫，放開後才重新排序
  const update = () => {
    const dy = y - startY + (scrollY - startScroll);
    li.style.transform = `translateY(${dy}px)`;
    to = Math.max(0, Math.min(items.length - 1, from + Math.round(dy / step)));
    items.forEach((x, i) => {
      if (x === li) return;
      const shift = from < to && i > from && i <= to ? -step : from > to && i >= to && i < from ? step : 0;
      x.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  };
  const loop = () => {
    if (y < 80) window.scrollBy(0, -10);
    else if (y > innerHeight - 80) window.scrollBy(0, 10);
    update();
    raf = requestAnimationFrame(loop);
  };
  const move = (ev) => { if (ev.pointerId === e.pointerId) y = ev.clientY; };
  const end = (ev) => {
    if (ev.pointerId !== e.pointerId) return;
    cancelAnimationFrame(raf);
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', end);
    removeEventListener('pointercancel', end);
    const ids = items.map((x) => x.dataset.id);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    commitOrder(ids);
    renderList();
  };
  addEventListener('pointermove', move);
  addEventListener('pointerup', end);
  addEventListener('pointercancel', end);
  raf = requestAnimationFrame(loop);
}

function commitOrder(ids) {
  const ns = ids.map(noteById).filter(Boolean);
  const orders = ns.map((n) => n.order).sort((a, b) => a - b);
  let changed = false;
  ns.forEach((n, i) => {
    if (n.order !== orders[i]) { n.order = orders[i]; n.updatedAt = now(); changed = true; }
  });
  if (changed) persist();
}

/* ================= 詳細資料 ================= */
function openDetail(id) {
  const n = noteById(id);
  if (!n) return;
  const img = imageData(n.bannerId);
  const href = normUrl(n.url);
  const cat = catById(n.categoryId);
  const row = (label, value, buttons, cls = '', vid = '') => `
    <div class="row"><div class="row-body"><div class="row-label">${label}</div>
      <div class="row-value ${cls} ${value ? '' : 'dim'}" ${vid ? `id="${vid}"` : ''}>${value || '—'}</div></div>${value ? buttons : ''}</div>`;
  const copyBtn = (field, label) => `<button class="icon-btn flat" data-copy="${field}" data-label="${label}" aria-label="複製${label}">${icon('copy')}</button>`;

  const el = openModal(`
    <div class="hero" style="${colorVars(n.color)}">${img ? `<img src="${esc(img)}" alt="">` : ''}
      <button class="icon-btn" data-close aria-label="關閉" style="position:absolute;top:0.625rem;right:0.625rem;width:2.125rem;height:2.125rem">${icon('x')}</button>
    </div>
    <div class="hero-title" style="${colorVars(n.color)}">${avatarHTML(n, 'lg')}<h2>${esc(n.title || '未命名')}</h2></div>
    <div class="rows">
      ${row('帳號', esc(n.username), copyBtn('username', '帳號'))}
      ${row('密碼', n.password ? '••••••••' : '', `
        <button class="icon-btn flat" id="reveal" aria-label="顯示密碼">${icon('eye')}</button>${copyBtn('password', '密碼')}`, 'mono', 'pwv')}
      ${row('網址', esc(n.url), `
        ${href ? `<a class="icon-btn flat" href="${esc(href)}" target="_blank" rel="noopener noreferrer" aria-label="開啟網址">${icon('open')}</a>` : ''}${copyBtn('url', '網址')}`)}
      ${row('備註', esc(n.notes), copyBtn('notes', '備註'), 'multi')}
      ${row('分類', esc(cat?.name || ''), '')}
    </div>
    <div class="sheet-foot">
      <button class="btn ghost" id="del">${icon('trash')}刪除</button>
      <button class="btn" id="edit">${icon('edit')}編輯</button>
    </div>
    <p class="meta">最後修改：${fmtDate(n.updatedAt)}</p>`);

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-copy]');
    if (b) copyText(n[b.dataset.copy], b.dataset.label);
  });
  const reveal = $('#reveal', el);
  if (reveal) {
    let shown = false;
    reveal.onclick = () => {
      shown = !shown;
      $('#pwv', el).textContent = shown ? n.password : '••••••••';
      reveal.innerHTML = icon(shown ? 'eyeoff' : 'eye');
    };
  }
  $('#edit', el).onclick = () => openEdit(id);
  $('#del', el).onclick = async () => {
    const ok = await ask({ title: '刪除便利貼', message: `確定要刪除「${esc(n.title || '未命名')}」嗎？`, ok: '刪除', danger: true });
    if (!ok) return;
    const i = S.data.notes.findIndex((x) => x.id === id);
    S.data.notes[i] = { id, deleted: true, updatedAt: now() };
    await persist();
    await closeAll();
    renderChips(); renderList();
    toast('已刪除');
  };
}

/* ================= 新增／編輯 ================= */
function openEdit(id) {
  const orig = id ? noteById(id) : null;
  const d = orig ? { ...orig } : {
    title: '', username: '', password: '', url: '', notes: '', color: 'sakura', iconId: '', bannerId: '',
    categoryId: catById(view.cat) ? view.cat : '',
  };

  const catOptions = () => `<option value="">未分類</option>` +
    cats().map((c) => `<option value="${esc(c.id)}" ${c.id === d.categoryId ? 'selected' : ''}>${esc(c.name)}</option>`).join('') +
    `<option value="__new">＋ 新增分類…</option>`;

  const el = openModal(`
    <div class="sheet-head"><h2>${orig ? '編輯便利貼' : '新增便利貼'}</h2>
      <button class="icon-btn flat" data-close aria-label="關閉">${icon('x')}</button></div>
    <label class="field"><span>標題</span><input class="input" id="e-title" maxlength="200" value="${esc(d.title)}" placeholder="例如：Instagram"></label>
    <label class="field"><span>帳號</span><input class="input" id="e-user" maxlength="500" value="${esc(d.username)}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
    <label class="field"><span>密碼</span>
      <div class="input-row">
        <input class="input mono" id="e-pw" type="password" maxlength="1000" value="${esc(d.password)}" autocomplete="off" autocapitalize="off" spellcheck="false">
        <button type="button" class="icon-btn flat" data-toggle="e-pw" aria-label="顯示密碼">${icon('eye')}</button>
        <button type="button" class="icon-btn flat" id="e-gen" aria-label="產生密碼">${icon('dice')}</button>
      </div></label>
    <label class="field"><span>網址</span><input class="input" id="e-url" type="url" inputmode="url" maxlength="2000" value="${esc(d.url)}" placeholder="example.com" autocapitalize="off" spellcheck="false"></label>
    <label class="field"><span>備註</span><textarea class="input" id="e-notes" maxlength="20000">${esc(d.notes)}</textarea></label>
    <label class="field"><span>分類</span><select class="input" id="e-cat">${catOptions()}</select></label>
    <div class="field"><span>顏色</span><div class="swatches" id="e-colors">
      ${Object.entries(COLORS).map(([k, c]) => `<button type="button" class="swatch ${k === d.color ? 'on' : ''}" data-color="${k}" style="${colorVars(k)}" aria-label="${c.name}"></button>`).join('')}
    </div></div>
    ${Object.entries(IMG_SLOTS).map(([kind, slot]) => `
    <div class="field"><span>${slot.label}</span><div class="img-pick">
      <span id="e-prev-${kind}"></span>
      <div class="btns">
        <button type="button" class="btn ghost" data-pick="${kind}">${icon('image')}圖庫</button>
        <button type="button" class="btn ghost" data-up="${kind}">${icon('upload')}上傳</button>
        <button type="button" class="btn ghost" data-rm="${kind}">移除</button>
      </div>
    </div></div>`).join('')}
    <input type="file" id="e-file" accept="image/*" hidden>
    <div class="sheet-foot">
      <button class="btn ghost" data-close>取消</button>
      <button class="btn" id="e-save">${icon('check')}儲存</button>
    </div>`);

  const f = (s) => $(s, el);
  const readForm = () => {
    d.title = f('#e-title').value.trim();
    d.username = f('#e-user').value.trim();
    d.password = f('#e-pw').value;
    d.url = f('#e-url').value.trim();
    d.notes = f('#e-notes').value;
  };
  const drawAvatar = () => {
    readForm();
    const banner = imageData(d.bannerId);
    f('#e-prev-square').innerHTML = `<span style="${colorVars(d.color)}">${avatarHTML(d, 'lg')}</span>`;
    f('#e-prev-wide').innerHTML = `<span class="banner-prev" style="${colorVars(d.color)}">${banner ? `<img src="${esc(banner)}" alt="">` : ''}</span>`;
    for (const [kind, slot] of Object.entries(IMG_SLOTS)) f(`[data-rm="${kind}"]`).hidden = !d[slot.key];
  };
  drawAvatar();
  f('#e-title').addEventListener('input', drawAvatar);

  f('#e-colors').onclick = (e) => {
    const b = e.target.closest('[data-color]');
    if (!b) return;
    d.color = b.dataset.color;
    $$('.swatch', el).forEach((s) => s.classList.toggle('on', s === b));
    drawAvatar();
  };
  f('#e-cat').onchange = async (e) => {
    if (e.target.value !== '__new') { d.categoryId = e.target.value; return; }
    const name = await newCategoryPrompt();
    if (name) d.categoryId = name.id;
    f('#e-cat').innerHTML = catOptions();
  };
  f('#e-gen').onclick = async () => {
    const pw = await openGenerator();
    if (pw) { f('#e-pw').value = pw; f('#e-pw').type = 'text'; }
  };
  let upKind = 'square';
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-pick],[data-up],[data-rm]');
    if (!b) return;
    if (b.dataset.pick) {
      const kind = b.dataset.pick;
      const picked = await openGallery(kind);
      if (picked) { d[IMG_SLOTS[kind].key] = picked; drawAvatar(); }
    } else if (b.dataset.up) {
      upKind = b.dataset.up;
      f('#e-file').click();
    } else if (b.dataset.rm) {
      d[IMG_SLOTS[b.dataset.rm].key] = '';
      drawAvatar();
    }
  });
  f('#e-file').onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const imgId = await addImage(file, upKind);
    if (imgId) { d[IMG_SLOTS[upKind].key] = imgId; drawAvatar(); }
  };

  f('#e-save').onclick = async () => {
    readForm();
    if (!d.title) d.title = hostOf(d.url) || '未命名';
    const t = now();
    const fields = { title: d.title, username: d.username, password: d.password, url: d.url, notes: d.notes, color: d.color, categoryId: d.categoryId, iconId: d.iconId, bannerId: d.bannerId };
    if (orig) {
      Object.assign(orig, fields, { updatedAt: t });
    } else {
      const minOrder = Math.min(0, ...notes().map((n) => n.order));
      S.data.notes.push({ id: uid(), ...fields, order: minOrder - 1, createdAt: t, updatedAt: t });
    }
    await persist();
    await closeAll();
    renderChips(); renderList();
    if (orig) openDetail(orig.id);
    else toast('已新增');
  };
}

/* ================= 密碼產生器 ================= */
const GEN_SETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/~',
};
const AMBIGUOUS = /[Il1O0o|]/g;

function randInt(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf); while (buf[0] >= limit);
  return buf[0] % max;
}
function generate(o) {
  const sets = Object.keys(GEN_SETS).filter((k) => o[k]).map((k) => (o.noAmbig ? GEN_SETS[k].replace(AMBIGUOUS, '') : GEN_SETS[k]));
  if (!sets.length) return { pw: '', bits: 0 };
  const all = sets.join('');
  for (let tries = 0; tries < 200; tries++) {
    let pw = '';
    for (let i = 0; i < o.length; i++) pw += all[randInt(all.length)];
    if (sets.every((s) => [...pw].some((c) => s.includes(c)))) return { pw, bits: o.length * Math.log2(all.length) };
  }
  return { pw: '', bits: 0 };
}

function openGenerator() {
  return new Promise((resolve) => {
    let o = { length: 16, upper: true, lower: true, digits: true, symbols: true, noAmbig: true };
    try { o = { ...o, ...JSON.parse(localStorage.getItem('gen-opts') || '{}') }; } catch {}
    let current = '';
    let result = null;
    const tog = (k, label) => `<label class="toggle-row"><span>${label}</span><span class="switch"><input type="checkbox" data-opt="${k}" ${o[k] ? 'checked' : ''}><i></i></span></label>`;
    const el = openModal(`
      <div class="sheet-head"><h2>密碼產生器</h2><button class="icon-btn flat" data-close aria-label="關閉">${icon('x')}</button></div>
      <div class="gen-out mono" id="g-out"></div>
      <div class="meter" style="margin:-4px 0.25rem 0.25rem"><i id="g-meter"></i></div><p class="hint" id="g-hint" style="margin-bottom:0.875rem"></p>
      <label class="field"><span>長度：<b id="g-len">${o.length}</b></span><input type="range" id="g-range" min="8" max="48" value="${o.length}"></label>
      <div class="rows" style="padding:0.125rem 0.75rem">
        ${tog('upper', '大寫字母 A–Z')}${tog('lower', '小寫字母 a–z')}${tog('digits', '數字 0–9')}${tog('symbols', '符號 !@#…')}${tog('noAmbig', '排除易混淆字元（I l 1 O 0 o）')}
      </div>
      <div class="sheet-foot">
        <button class="btn ghost" id="g-again">${icon('dice')}重新產生</button>
        <button class="btn" id="g-use">使用這組</button>
      </div>`, { onClose: () => resolve(result) });
    const regen = () => {
      try { localStorage.setItem('gen-opts', JSON.stringify(o)); } catch {}
      const { pw, bits } = generate(o);
      current = pw;
      $('#g-out', el).textContent = pw || '請至少選一種字元';
      const r = rate(bits);
      $('#g-meter', el).style.width = r.pct + '%';
      $('#g-meter', el).style.background = r.color;
      $('#g-hint', el).textContent = pw ? `強度：${r.label}（約 ${r.bits} bits）` : '';
    };
    $('#g-range', el).oninput = (e) => { o.length = +e.target.value; $('#g-len', el).textContent = o.length; regen(); };
    el.addEventListener('change', (e) => { const k = e.target.dataset?.opt; if (k) { o[k] = e.target.checked; regen(); } });
    $('#g-again', el).onclick = regen;
    $('#g-use', el).onclick = () => { if (current) { result = current; closeModal(); } };
    regen();
  });
}

/* ================= 圖庫 ================= */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('IMG')); };
    img.src = url;
  });
}
// 選圖 → 剪裁 → 縮圖 → 加密存進圖庫。回傳圖片 id（取消則回傳空字串）
async function addImage(file, kind) {
  let img;
  try { img = await loadImage(file); } catch { toast('無法讀取這張圖片'); return ''; }
  const data = await openCropper(img, kind);
  if (!data) return '';
  const id = uid();
  S.data.images.push({ id, data, kind, updatedAt: now() });
  await persist();
  return id;
}

// 兩種圖片：小圖示（便利貼左側、詳細頁頭像）與橫幅（便利貼右側、詳細頁大圖）
const IMG_SLOTS = {
  square: { label: '小圖示（1:1）', key: 'iconId', r: 1, outW: 480 },
  wide: { label: '橫幅圖片（2:1）', key: 'bannerId', r: 2, outW: 800 },
};

function openCropper(img, kind) {
  return new Promise((resolve) => {
    let result = null;
    const ratio = IMG_SLOTS[kind];
    const el = openModal(`
      <div class="sheet-head"><h2>剪裁${ratio.label}</h2><button class="icon-btn flat" data-close aria-label="關閉">${icon('x')}</button></div>
      <div class="crop-stage" id="cr-stage"><div class="crop-frame" id="cr-frame"></div></div>
      <p class="hint" style="text-align:center">拖曳移動・雙指縮放</p>
      <label class="field crop-zoom">${icon('search')}<input type="range" id="cr-zoom" min="0" max="1000" value="0" aria-label="縮放"></label>
      <div class="sheet-foot"><button class="btn ghost" data-close>取消</button><button class="btn" id="cr-ok">${icon('check')}完成</button></div>`,
    { onClose: () => resolve(result) });

    const stage = $('#cr-stage', el), frameEl = $('#cr-frame', el), zoom = $('#cr-zoom', el);
    const imgEl = img; // 已載入的圖片元素直接放進畫面
    imgEl.alt = '';
    imgEl.draggable = false;
    stage.prepend(imgEl);
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const F = { x: 0, y: 0, w: 0, h: 0 }; // 剪裁框（相對於 stage）
    let s = 1, tx = 0, ty = 0, minS = 1;  // 圖片的縮放與位移
    const MAX_ZOOM = 5;

    const clamp = () => {
      s = Math.min(Math.max(s, minS), minS * MAX_ZOOM);
      tx = Math.min(F.x, Math.max(F.x + F.w - iw * s, tx));
      ty = Math.min(F.y, Math.max(F.y + F.h - ih * s, ty));
    };
    const draw = () => {
      clamp();
      imgEl.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
      zoom.value = Math.round((Math.log(s / minS) / Math.log(MAX_ZOOM)) * 1000);
    };
    // 以 (cx, cy) 為中心縮放
    const zoomTo = (ns, cx, cy) => {
      ns = Math.min(Math.max(ns, minS), minS * MAX_ZOOM);
      tx = cx - ((cx - tx) * ns) / s;
      ty = cy - ((cy - ty) * ns) / s;
      s = ns;
      draw();
    };
    const layout = () => {
      const sw = stage.clientWidth, sh = stage.clientHeight, pad = 18;
      F.w = Math.min(sw - pad * 2, (sh - pad * 2) * ratio.r);
      F.h = F.w / ratio.r;
      F.x = (sw - F.w) / 2;
      F.y = (sh - F.h) / 2;
      Object.assign(frameEl.style, { left: F.x + 'px', top: F.y + 'px', width: F.w + 'px', height: F.h + 'px' });
      minS = Math.max(F.w / iw, F.h / ih);
      s = minS;
      tx = F.x + (F.w - iw * s) / 2;
      ty = F.y + (F.h - ih * s) / 2;
      draw();
    };
    requestAnimationFrame(layout);

    zoom.addEventListener('input', () => {
      zoomTo(minS * Math.pow(MAX_ZOOM, zoom.value / 1000), F.x + F.w / 2, F.y + F.h / 2);
    });

    // 拖曳與雙指縮放
    const pts = new Map();
    let last = null;
    const pos = (e) => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const gesture = () => {
      const p = [...pts.values()];
      if (p.length === 1) return { x: p[0].x, y: p[0].y, d: 0 };
      return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2, d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) };
    };
    stage.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      stage.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, pos(e));
      last = gesture();
    });
    stage.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId) || !last) return;
      pts.set(e.pointerId, pos(e));
      const g = gesture();
      tx += g.x - last.x;
      ty += g.y - last.y;
      if (g.d && last.d) zoomTo((s * g.d) / last.d, g.x, g.y); else draw();
      last = g;
    });
    const up = (e) => { pts.delete(e.pointerId); last = pts.size ? gesture() : null; };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = pos(e);
      zoomTo(s * Math.exp(-e.deltaY / 400), p.x, p.y);
    }, { passive: false });

    $('#cr-ok', el).onclick = () => {
      // 換算回原圖座標；原圖不夠大時不放大，避免變糊
      const sx = (F.x - tx) / s, sy = (F.y - ty) / s, sw = F.w / s, sh = F.h / s;
      const outW = Math.max(1, Math.round(Math.min(ratio.outW, sw)));
      const outH = Math.max(1, Math.round(outW / ratio.r));
      const c = document.createElement('canvas');
      c.width = outW;
      c.height = outH;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
      let data = c.toDataURL('image/webp', 0.86);
      if (!data.startsWith('data:image/webp')) {
        data = c.toDataURL('image/png');
        if (data.length > 400000) data = c.toDataURL('image/jpeg', 0.86);
      }
      result = data;
      closeModal();
    };
  });
}

// pickKind 為 'square' / 'wide' 時是「選圖」模式，只顯示該比例的圖；null 時是管理模式
function openGallery(pickKind = null) {
  return new Promise((resolve) => {
    let result = null;
    let upKind = pickKind || 'square';
    const title = pickKind ? `選擇${IMG_SLOTS[pickKind].label}` : '圖庫';
    const el = openModal(`
      <div class="sheet-head"><h2>${title}</h2><button class="icon-btn flat" data-close aria-label="關閉">${icon('x')}</button></div>
      <p class="hint" style="margin:-6px 0.125rem 0.875rem">上傳時可以剪裁範圍，圖片會自動縮小、加密存在本機，也會包含在備份檔裡。</p>
      <div id="gal"></div>
      <input type="file" id="g-file" accept="image/*" multiple hidden>`, { onClose: () => resolve(result) });
    const tile = (i) => `<div class="g-item" data-img="${esc(i.id)}" role="button" tabindex="0"><img src="${esc(i.data)}" alt=""><button class="del" data-del="${esc(i.id)}" aria-label="刪除圖片">${icon('x')}</button></div>`;
    const grid = (kind, list, upload) => `<div class="gallery ${kind === 'wide' ? 'wide' : ''}">${upload ? `<button class="g-item upload" data-gup="${kind}" aria-label="上傳圖片">${icon('plus')}</button>` : ''}${list.map(tile).join('')}</div>`;
    const draw = () => {
      const imgs = S.data.images.filter((i) => !i.deleted);
      const legacy = imgs.filter((i) => !i.kind);
      if (pickKind) {
        // 舊版沒有比例資訊的圖片兩邊都可以選
        $('#gal', el).innerHTML = grid(pickKind, imgs.filter((i) => i.kind === pickKind || !i.kind), true);
        return;
      }
      $('#gal', el).innerHTML = Object.entries(IMG_SLOTS).map(([kind, slot]) =>
        `<h3 class="g-title">${slot.label}</h3>${grid(kind, imgs.filter((i) => i.kind === kind), true)}`).join('') +
        (legacy.length ? `<h3 class="g-title">舊圖片</h3>${grid('square', legacy, false)}` : '');
    };
    draw();
    $('#g-file', el).onchange = async (e) => {
      let lastId = '';
      for (const file of e.target.files) lastId = (await addImage(file, upKind)) || lastId;
      e.target.value = '';
      draw();
      // 選圖模式下上傳完直接選用
      if (pickKind && lastId) { result = lastId; closeModal(); }
    };
    $('#gal', el).onclick = async (e) => {
      const up = e.target.closest('[data-gup]');
      if (up) { upKind = up.dataset.gup; return $('#g-file', el).click(); }
      const del = e.target.closest('[data-del]');
      if (del) {
        const id = del.dataset.del;
        const used = notes().filter((n) => n.iconId === id || n.bannerId === id);
        const ok = await ask({
          title: '刪除圖片',
          message: used.length ? `有 ${used.length} 張便利貼正在使用這張圖片，刪除後會改回預設圖示。` : '確定要刪除這張圖片嗎？',
          ok: '刪除', danger: true,
        });
        if (!ok) return;
        const t = now();
        used.forEach((n) => {
          if (n.iconId === id) n.iconId = '';
          if (n.bannerId === id) n.bannerId = '';
          n.updatedAt = t;
        });
        const i = S.data.images.findIndex((x) => x.id === id);
        S.data.images[i] = { id, deleted: true, updatedAt: t };
        await persist();
        draw();
        renderList();
        return;
      }
      const item = e.target.closest('[data-img]');
      if (item && pickKind) { result = item.dataset.img; closeModal(); }
    };
  });
}

/* ================= 分類 ================= */
async function newCategoryPrompt() {
  const name = await ask({
    title: '新增分類', input: { placeholder: '例如：社群、購物、工作', maxlength: 40 }, ok: '新增',
    check: (v) => (!v.trim() ? '請輸入名稱' : cats().some((c) => c.name === v.trim()) ? '已經有這個分類了' : null),
  });
  if (!name) return null;
  const c = { id: uid(), name: name.trim(), order: Math.max(-1, ...cats().map((x) => x.order)) + 1, updatedAt: now() };
  S.data.categories.push(c);
  await persist();
  renderChips();
  return c;
}

function openCategories() {
  const el = openModal(`
    <div class="sheet-head"><h2>管理分類</h2><button class="icon-btn flat" data-close aria-label="關閉">${icon('x')}</button></div>
    <div class="rows" id="cat-list"></div>
    <div class="sheet-foot"><button class="btn" id="cat-new">${icon('plus')}新增分類</button></div>`);
  const draw = () => {
    const cs = cats();
    $('#cat-list', el).innerHTML = cs.length ? cs.map((c, i) => `
      <div class="cat-row" data-id="${esc(c.id)}">
        <span class="name">${esc(c.name)}</span>
        <span class="count">${notes().filter((n) => n.categoryId === c.id).length} 張</span>
        <button class="icon-btn flat" data-a="up" ${i === 0 ? 'disabled style="opacity:.3"' : ''} aria-label="上移">${icon('up')}</button>
        <button class="icon-btn flat" data-a="down" ${i === cs.length - 1 ? 'disabled style="opacity:.3"' : ''} aria-label="下移">${icon('down')}</button>
        <button class="icon-btn flat" data-a="rename" aria-label="重新命名">${icon('edit')}</button>
        <button class="icon-btn flat" data-a="del" aria-label="刪除">${icon('trash')}</button>
      </div>`).join('') : '<p class="hint" style="padding:0.875rem;text-align:center">還沒有分類</p>';
  };
  draw();
  $('#cat-new', el).onclick = async () => { if (await newCategoryPrompt()) draw(); };
  $('#cat-list', el).onclick = async (e) => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const id = b.closest('[data-id]').dataset.id;
    const cs = cats();
    const i = cs.findIndex((c) => c.id === id);
    const c = cs[i];
    const t = now();
    if (b.dataset.a === 'up' || b.dataset.a === 'down') {
      const j = b.dataset.a === 'up' ? i - 1 : i + 1;
      if (!cs[j]) return;
      cs.forEach((x, k) => { x.order = k; });
      [c.order, cs[j].order] = [cs[j].order, c.order];
      cs.forEach((x) => { x.updatedAt = t; });
    } else if (b.dataset.a === 'rename') {
      const name = await ask({
        title: '重新命名', input: { value: c.name, maxlength: 40 }, ok: '儲存',
        check: (v) => (!v.trim() ? '請輸入名稱' : cats().some((x) => x.name === v.trim() && x.id !== id) ? '已經有這個分類了' : null),
      });
      if (!name) return;
      c.name = name.trim();
      c.updatedAt = t;
    } else if (b.dataset.a === 'del') {
      const count = notes().filter((n) => n.categoryId === id).length;
      const ok = await ask({
        title: '刪除分類',
        message: `確定要刪除「${esc(c.name)}」嗎？${count ? `<br>裡面的 ${count} 張便利貼不會被刪除，會變成「未分類」。` : ''}`,
        ok: '刪除', danger: true,
      });
      if (!ok) return;
      const k = S.data.categories.findIndex((x) => x.id === id);
      S.data.categories[k] = { id, deleted: true, updatedAt: t };
    }
    await persist();
    draw();
    renderChips();
    renderList();
  };
}

/* ================= 選單、備份 ================= */
function openMenu() {
  const last = S.data.settings.lastBackupAt;
  const el = openModal(`
    <div class="sheet-head"><h2>選單</h2><button class="icon-btn flat" data-close aria-label="關閉">${icon('x')}</button></div>
    <div class="menu">
      <button data-m="export">${icon('download')}<span class="grow">匯出備份<small>上次備份：${last ? fmtDate(last) : '從未備份'}</small></span></button>
      <button data-m="import">${icon('upload')}<span class="grow">匯入備份<small>和目前的資料合併，較新的修改優先</small></span></button>
    </div>
    <div class="menu">
      <button data-m="cats">${icon('tag')}<span class="grow">管理分類</span></button>
      <button data-m="gallery">${icon('image')}<span class="grow">圖庫</span></button>
    </div>
    ${installPrompt ? `<div class="menu"><button data-m="install">${icon('download')}<span class="grow">安裝到主畫面<small>像一般 App 一樣從桌面開啟</small></span></button></div>` : ''}
    <div class="menu">
      <button data-m="pw">${icon('key')}<span class="grow">變更主密碼</span></button>
      <button data-m="lock">${icon('lock')}<span class="grow">立即上鎖</span></button>
    </div>
    <p class="hint" style="text-align:center;line-height:1.7">
      資料只存在這台裝置，以 AES-256-GCM 加密<br>閒置 5 分鐘自動上鎖・複製後 30 秒清除剪貼簿
    </p>
    <input type="file" id="m-file" accept=".json,application/json" hidden>`);
  el.querySelector('.sheet').addEventListener('click', (e) => {
    const m = e.target.closest('[data-m]')?.dataset.m;
    if (m === 'export') exportBackup();
    else if (m === 'import') $('#m-file', el).click();
    else if (m === 'cats') openCategories();
    else if (m === 'gallery') openGallery(null);
    else if (m === 'pw') changePassword();
    else if (m === 'lock') lock();
    else if (m === 'install') installApp();
  });
  $('#m-file', el).onchange = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) importBackup(file);
  };
}

function stamp() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

async function exportBackup() {
  const blob = await seal(S.session, S.data);
  const name = `pass-memo-${stamp()}.json`;
  const file = new File([JSON.stringify({ ...blob, exportedAt: new Date().toISOString() })], name, { type: 'application/json' });
  const canShare = !!(navigator.canShare && navigator.canShare({ files: [file] }));
  const done = async () => {
    S.data.settings.lastBackupAt = now();
    await persist();
    renderNotice();
  };
  const el = openModal(`
    <div class="sheet-head"><h2>匯出備份</h2><button class="icon-btn flat" data-close aria-label="關閉">${icon('x')}</button></div>
    <p style="margin:0 0.125rem 0.625rem">備份檔已用你的<b>主密碼</b>加密，沒有密碼的人打不開。</p>
    <p class="hint" style="margin:0 0.125rem 1rem">檔案會存到手機的「下載」資料夾。建議再另存一份到 Google 雲端硬碟，換手機時就能用「從備份還原」。</p>
    <div class="sheet-foot" style="flex-direction:column">
      ${canShare ? `<button class="btn" id="x-share">${icon('share')}分享／存到「檔案」</button>` : ''}
      <button class="btn ${canShare ? 'ghost' : ''}" id="x-dl">${icon('download')}下載檔案</button>
    </div>`);
  $('#x-dl', el).onclick = async () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    await done();
    await closeAll();
    toast('備份完成');
  };
  if (canShare) $('#x-share', el).onclick = async () => {
    try {
      await navigator.share({ files: [file], title: name });
      await done();
      await closeAll();
      toast('備份完成');
    } catch (e) {
      if (e.name !== 'AbortError') toast('分享失敗，請改用下載');
    }
  };
}

async function importBackup(file) {
  let blob;
  try { blob = JSON.parse(await file.text()); } catch { blob = null; }
  if (!isValidBlob(blob)) return toast('這不是密碼便利貼的備份檔');
  let data = null;
  const ok = await ask({
    title: '匯入備份',
    message: '請輸入這個備份檔的密碼（通常就是你的主密碼）。',
    input: { type: 'password', placeholder: '備份檔密碼' }, ok: '驗證並合併',
    check: async (pw) => {
      try { data = (await unseal(blob, pw)).data; return null; } catch (e) {
        return e.message === 'BAD_PASSWORD' ? '密碼不正確，或檔案已損毀' : '無法讀取這個備份檔';
      }
    },
  });
  if (!ok || !data) return;
  const r = mergeData(data);
  await persist();
  await closeAll();
  renderMain();
  const n = r.notes;
  toast(n.added || n.updated ? `合併完成：新增 ${n.added} 張、更新 ${n.updated} 張` : '合併完成：沒有需要更新的資料', 3200);
}

async function changePassword() {
  const el = openModal(`
    <div class="sheet-head"><h2>變更主密碼</h2><button class="icon-btn flat" data-close aria-label="關閉">${icon('x')}</button></div>
    ${pwInput('c0', '目前的主密碼', 'current-password')}
    ${pwInput('c1', '新的主密碼（至少 8 個字元）', 'new-password')}
    <div class="meter"><i id="c-meter"></i></div><p class="hint" id="c-hint"></p>
    <div style="height:0.625rem"></div>
    ${pwInput('c2', '再輸入一次新的主密碼', 'new-password')}
    <div class="warn">變更後，<b>舊的備份檔仍然要用舊密碼</b>才能打開。建議變更後馬上匯出一份新備份。</div>
    <p class="error" id="c-err"></p>
    <div class="sheet-foot"><button class="btn ghost" data-close>取消</button><button class="btn" id="c-go">變更</button></div>`);
  bindMeter($('#c1', el), $('#c-meter', el), $('#c-hint', el));
  $('#c-go', el).onclick = async () => {
    const err = $('#c-err', el), go = $('#c-go', el);
    const p0 = $('#c0', el).value, p1 = $('#c1', el).value, p2 = $('#c2', el).value;
    if ([...p1].length < 8) return (err.textContent = '新的主密碼至少要 8 個字元');
    if (p1 !== p2) return (err.textContent = '兩次輸入的新密碼不一樣');
    go.disabled = true; go.textContent = '處理中…'; err.textContent = '';
    try {
      await saveChain;
      await unseal(await idbGet('vault'), p0);
    } catch {
      go.disabled = false; go.textContent = '變更';
      return (err.textContent = '目前的主密碼不正確');
    }
    const salt = newSalt();
    S.session = { key: await deriveKey(p1, salt, ITERATIONS), salt, iterations: ITERATIONS };
    await persist();
    await closeAll();
    toast('主密碼已變更', 3000);
  };
}

/* ================= 安裝（Android Chrome） ================= */
let installPrompt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
addEventListener('appinstalled', () => { installPrompt = null; toast('已安裝到主畫面'); });
async function installApp() {
  if (!installPrompt) return;
  const p = installPrompt;
  installPrompt = null;
  await closeAll();
  p.prompt();
}

/* ================= 全域 ================= */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-toggle]');
  if (!t) return;
  const inp = document.getElementById(t.dataset.toggle);
  if (!inp) return;
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  t.innerHTML = icon(show ? 'eyeoff' : 'eye');
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

history.replaceState({ m: 0 }, '');
renderGate();
