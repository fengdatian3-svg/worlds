/* ── HANZI APP — shared logic ── */
'use strict';

let CHARS = [];
let appMode = 'basic';
let curMode = 'learn';
let activeLevel = 'ALL';
let filteredChars = [];

let idx = 0, fIdx = 0, qIdx = 0;
let qCor = 0, qTot = 0, qStr = 0;
let qAnswered = false, flipFlipped = false, ghostVisible = true;
let waveTimer = null, isDrawing = false, lastX = 0, lastY = 0;

/* ── INIT ── */
async function initApp(mode) {
  appMode = mode;
  const dataFile = mode === 'business' ? '../data/business.json' : '../data/basic.json';
  try {
    const res = await fetch(dataFile);
    CHARS = await res.json();
  } catch (e) {
    // fallback: try relative path (for local file:// opening)
    try {
      const res2 = await fetch(dataFile.replace('../', './'));
      CHARS = await res2.json();
    } catch (e2) {
      document.body.innerHTML = '<div style="padding:40px;text-align:center;color:#666">Could not load data. Please serve via a local server or GitHub Pages.<br><br><code>python3 -m http.server 8080</code><br>then open <code>http://localhost:8080/src/index.html</code></div>';
      return;
    }
  }
  window.speechSynthesis && window.speechSynthesis.getVoices();
  buildLevelTabs();
  applyLevel('ALL');
  setupCanvas();
  clearCanvas();
  updateCollCount();
}

/* ── LEVEL TABS ── */
function buildLevelTabs() {
  const container = document.getElementById('levelTabs');
  if (!container) return;
  const levels = ['ALL', ...new Set(CHARS.map(c => c.level || c.category))];
  container.innerHTML = '';
  levels.forEach(lv => {
    const b = document.createElement('button');
    b.className = 'lvl-tab' + (lv === 'ALL' ? ' on' : '');
    b.textContent = lv === 'ALL' ? 'All' : lv.toUpperCase();
    b.onclick = () => applyLevel(lv);
    container.appendChild(b);
  });
}

function applyLevel(lv) {
  activeLevel = lv;
  filteredChars = lv === 'ALL' ? CHARS : CHARS.filter(c => (c.level || c.category) === lv);
  if (!filteredChars.length) filteredChars = CHARS;
  idx = 0; fIdx = 0; qIdx = 0;
  document.querySelectorAll('.lvl-tab').forEach(b => b.classList.toggle('on', b.textContent === (lv === 'ALL' ? 'All' : lv.toUpperCase())));
  renderLearn();
}

/* ── SEARCH ── */
function onSearch(q) {
  const clearBtn = document.getElementById('searchClear');
  const resultsDiv = document.getElementById('searchResults');
  const mainContent = document.getElementById('mainContent');
  q = q.trim().toLowerCase();
  clearBtn.style.display = q ? 'block' : 'none';
  if (!q) {
    resultsDiv.style.display = 'none';
    mainContent.style.display = 'block';
    return;
  }
  mainContent.style.display = 'none';
  resultsDiv.style.display = 'block';
  const results = CHARS.filter(c =>
    c.char.includes(q) ||
    (c.pin && c.pin.toLowerCase().replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, m => 'aeiouv'[' āáǎà ēéěè īíǐì ōóǒò ūúǔù ǖǘǚǜ'.indexOf(m) >> 2] || m).includes(q)) ||
    c.pin.toLowerCase().includes(q) ||
    c.mean.toLowerCase().includes(q) ||
    (c.phrase && c.phrase.toLowerCase().includes(q)) ||
    (c.phraseMean && c.phraseMean.toLowerCase().includes(q)) ||
    (c.usage && c.usage.toLowerCase().includes(q))
  ).slice(0, 20);
  if (!results.length) {
    resultsDiv.innerHTML = '<div class="search-empty">No results for "' + q + '"</div>';
    return;
  }
  resultsDiv.innerHTML = results.map(c => {
    const badge = (c.level || c.category || '');
    const isBiz = !!c.category;
    const phraseHtml = c.phrase ? `<div class="sr-phrase">${c.phrase} — ${c.phraseMean || ''}</div>` : '';
    return `<div class="search-result-item" onclick="jumpToChar('${c.char}')">
      <div class="sr-char">${c.char}</div>
      <div class="sr-right">
        <div class="sr-pin">${c.pin}</div>
        <div class="sr-mean">${c.mean}</div>
        ${phraseHtml}
      </div>
      <span class="sr-badge${isBiz ? ' biz' : ''}">${badge}</span>
    </div>`;
  }).join('');
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').style.display = 'none';
  document.getElementById('searchResults').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';
}

function jumpToChar(char) {
  const i = CHARS.findIndex(c => c.char === char);
  if (i < 0) return;
  clearSearch();
  // switch level to ALL so char is visible
  applyLevel('ALL');
  idx = CHARS.findIndex(c => c.char === char);
  filteredChars = CHARS;
  setMode('learn');
  renderLearn();
}

/* ── RENDER LEARN ── */
function renderLearn() {
  const c = filteredChars[idx];
  if (!c) return;
  const card = document.getElementById('learnCard');
  if (card) { card.style.animation = 'none'; requestAnimationFrame(() => card.style.animation = 'fadeUp .35s ease'); }

  setText('lCh', c.char);
  setText('lPin', c.pin);
  setText('lTone', c.tone);
  setText('lHint', c.hint);
  setText('lMean', c.mean);
  setText('lExZh', c.exZh || c.usage || '');
  setText('lExEn', c.exEn || '');
  setText('lLevel', (c.level || c.category || '').toUpperCase());
  setText('lPhrase', c.phrase || '');
  setText('lPhrasePin', c.phrasePin ? `${c.phrasePin} — ${c.phraseMean || ''}` : '');
  setText('lFormal', c.formal || '');
  setHtml('storyTxt', c.story || c.strokeTip || '');

  // radicals (basic mode only)
  const strip = document.getElementById('radStrip');
  if (strip && c.rads) {
    strip.innerHTML = '';
    c.rads.forEach((r, i) => {
      if (i > 0) { const op = document.createElement('div'); op.className = 'rad-op'; op.textContent = '+'; strip.appendChild(op); }
      const b = document.createElement('div'); b.className = 'rad-box';
      b.innerHTML = `<div class="rad-ch">${r.c}</div><div class="rad-lbl">${r.l}</div>`;
      b.onclick = () => { b.style.transform = 'scale(0.88)'; setTimeout(() => b.style.transform = '', 150); };
      strip.appendChild(b);
    });
    const eq = document.createElement('div'); eq.className = 'rad-op'; eq.textContent = '='; strip.appendChild(eq);
    const res = document.createElement('div'); res.className = 'rad-res';
    res.innerHTML = `<div class="rad-ch">${c.char}</div><div class="rad-lbl">${c.mean.split('/')[0].toLowerCase().trim()}</div>`;
    strip.appendChild(res);
  }

  updateReviewBtn(idx);
}

function animChar() {
  const el = document.getElementById('lCh');
  if (el) { el.style.animation = 'none'; requestAnimationFrame(() => el.style.animation = 'popIn .32s ease'); }
  playSound();
}

function go(d) {
  idx = Math.max(0, Math.min(filteredChars.length - 1, idx + d));
  renderLearn();
  if (curMode === 'write') renderWrite();
  if (curMode === 'flip') { fIdx = idx; renderFlip(); }
}

/* ── SOUND ── */
function playSound() {
  const c = filteredChars[idx]; if (!c) return;
  const btn = document.getElementById('sndBtn'), lbl = document.getElementById('sndLbl');
  stopWave(); btn && btn.classList.add('playing'); if (lbl) lbl.textContent = 'Playing…'; startWave();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(c.char);
    u.lang = 'zh-TW'; u.rate = 0.65; u.pitch = 1.05;
    const vs = window.speechSynthesis.getVoices();
    const v = vs.find(x => x.lang === 'zh-TW') || vs.find(x => x.lang.startsWith('zh'));
    if (v) u.voice = v;
    u.onend = u.onerror = () => { stopWave(); btn && btn.classList.remove('playing'); if (lbl) lbl.textContent = 'Hear it in Mandarin'; };
    setTimeout(() => window.speechSynthesis.speak(u), 50);
  } else {
    setTimeout(() => { stopWave(); btn && btn.classList.remove('playing'); if (lbl) lbl.textContent = 'Hear it in Mandarin'; }, 1800);
  }
}
function startWave() {
  const ids = ['wb1','wb2','wb3','wb4','wb5'], h = [4,9,14,7,11];
  waveTimer = setInterval(() => ids.forEach((id,i) => { const el = document.getElementById(id); if (el) el.style.height = (h[i] + Math.random()*10) + 'px'; }), 110);
}
function stopWave() {
  if (waveTimer) { clearInterval(waveTimer); waveTimer = null; }
  [['wb1',4],['wb2',9],['wb3',14],['wb4',7],['wb5',11]].forEach(([id,h]) => { const el = document.getElementById(id); if (el) el.style.height = h + 'px'; });
}

/* ── WRITE ── */
function renderWrite() {
  const c = filteredChars[idx]; if (!c) return;
  setText('ghostChar', c.char);
  setText('writeTip', c.strokeTip || '');
  setText('wPin', c.pin);
  setText('wTone', c.tone);
  setText('wLevel', (c.level || c.category || '').toUpperCase());
  updateReviewBtn(idx, 'W');
  clearCanvas();
}

function setupCanvas() {
  const cv = document.getElementById('writeCanvas'); if (!cv) return;
  const ctx = cv.getContext('2d');
  ctx.strokeStyle = '#0F6E56'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  function getPos(e) {
    const r = cv.getBoundingClientRect();
    if (e.touches) return { x:(e.touches[0].clientX-r.left)*(cv.width/r.width), y:(e.touches[0].clientY-r.top)*(cv.height/r.height) };
    return { x:(e.clientX-r.left)*(cv.width/r.width), y:(e.clientY-r.top)*(cv.height/r.height) };
  }
  function down(e) { e.preventDefault(); isDrawing = true; const p = getPos(e); lastX = p.x; lastY = p.y; }
  function move(e) {
    e.preventDefault(); if (!isDrawing) return;
    const p = getPos(e);
    ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke();
    lastX = p.x; lastY = p.y;
  }
  function up() { isDrawing = false; }
  cv.addEventListener('mousedown', down); cv.addEventListener('mousemove', move);
  cv.addEventListener('mouseup', up); cv.addEventListener('mouseleave', up);
  cv.addEventListener('touchstart', down, {passive:false});
  cv.addEventListener('touchmove', move, {passive:false});
  cv.addEventListener('touchend', up);
}

function clearCanvas() {
  const cv = document.getElementById('writeCanvas'); if (!cv) return;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.save(); ctx.strokeStyle = 'rgba(29,158,117,0.15)'; ctx.lineWidth = 1; ctx.setLineDash([4,4]);
  [[120,0,120,240],[0,120,240,120],[0,0,240,240],[240,0,0,240]].forEach(([x1,y1,x2,y2]) => {
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  });
  ctx.restore(); ctx.setLineDash([]);
}

function toggleGhost() {
  ghostVisible = !ghostVisible;
  const el = document.getElementById('ghostChar');
  if (el) el.style.opacity = ghostVisible ? '.08' : '0';
  const btn = document.getElementById('ghostBtn');
  if (btn) btn.textContent = ghostVisible ? 'Hide guide' : 'Show guide';
}

/* ── FLASHCARD ── */
function renderFlip() {
  const c = filteredChars[fIdx]; if (!c) return;
  setText('fCh', c.char); setText('fPin', c.pin);
  setText('fMean', c.mean); setText('fCh2', c.char); setText('fPin2', c.pin);
  setHtml('fEx', (c.exZh || '') + (c.exEn ? '<br>' + c.exEn : '') || (c.phrase ? c.phrase + '<br>' + (c.phrasePin || '') : ''));
  flipFlipped = false;
  const fi = document.getElementById('flipInner');
  if (fi) fi.classList.remove('flipped');
}
function doFlip() {
  flipFlipped = !flipFlipped;
  const fi = document.getElementById('flipInner');
  if (fi) fi.classList.toggle('flipped', flipFlipped);
}
function fGo(d) {
  fIdx = Math.max(0, Math.min(filteredChars.length-1, fIdx+d));
  idx = fIdx; renderFlip(); renderLearn();
}

/* ── QUIZ ── */
function renderQuiz() {
  qAnswered = false;
  const c = filteredChars[qIdx]; if (!c) return;
  setText('qCh', c.char); setText('qPin', c.pin);
  setText('qFb', '');
  const fb = document.getElementById('qFb'); if (fb) fb.style.color = '';
  const allMeans = [...new Set(CHARS.map(x => x.mean))];
  const others = allMeans.filter(m => m !== c.mean).sort(() => Math.random()-.5).slice(0, 3);
  const opts = [...others, c.mean].sort(() => Math.random()-.5);
  const grid = document.getElementById('optsGrid'); if (!grid) return;
  grid.innerHTML = '';
  opts.forEach(o => {
    const b = document.createElement('button'); b.className = 'opt'; b.textContent = o;
    b.onclick = () => {
      if (qAnswered) return; qAnswered = true; qTot++;
      grid.querySelectorAll('.opt').forEach(x => x.classList.add('locked'));
      if (o === c.mean) {
        b.classList.add('correct'); qCor++; qStr++;
        const fb = document.getElementById('qFb'); if (fb) { fb.textContent = 'Correct!'; fb.style.color = 'var(--g4)'; }
      } else {
        b.classList.add('wrong'); qStr = 0;
        grid.querySelectorAll('.opt').forEach(x => { if (x.textContent === c.mean) x.classList.add('correct'); });
        const fb = document.getElementById('qFb'); if (fb) { fb.textContent = 'Answer: ' + c.mean; fb.style.color = 'var(--red)'; }
      }
      setText('qCor', qCor); setText('qTot', qTot); setText('qStr', qStr);
      setText('streakN', qStr);
      const sn = document.getElementById('streakN');
      if (sn) { sn.style.animation = 'none'; requestAnimationFrame(() => sn.style.animation = 'streakPop .4s ease'); }
    };
    grid.appendChild(b);
  });
}
function nextQ() {
  qIdx = (qIdx + 1) % filteredChars.length;
  idx = qIdx; renderQuiz(); renderLearn();
}

/* ── REVIEW LATER ── */
const COLL_KEY_PREFIX = 'hanzi_review_';
function collKey() { return COLL_KEY_PREFIX + appMode; }
function loadColl() { try { return JSON.parse(localStorage.getItem(collKey()) || '[]'); } catch(e) { return []; } }
function saveColl(arr) { try { localStorage.setItem(collKey(), JSON.stringify(arr)); } catch(e) {} updateCollCount(); }

function updateCollCount() {
  const n = loadColl().length;
  setText('collCount', n);
}

function updateReviewBtn(i, suffix='') {
  const charObj = filteredChars[i];
  if (!charObj) return;
  const inColl = loadColl().includes(charObj.char);
  const btn = document.getElementById('reviewBtn' + suffix);
  if (!btn) return;
  btn.classList.toggle('on', inColl);
  btn.textContent = inColl ? '↩ In review list' : '↩ Review later';
}

function toggleReview() {
  const c = filteredChars[idx]; if (!c) return;
  const arr = loadColl();
  const pos = arr.indexOf(c.char);
  if (pos >= 0) {
    arr.splice(pos, 1);
    showToast('Removed from review list');
  } else {
    arr.push(c.char);
    showToast('↩ Added to review later');
  }
  saveColl(arr);
  updateReviewBtn(idx);
  updateReviewBtn(idx, 'W');
}

/* ── COLLECTION PAGE ── */
function openCollection() {
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('collPage').style.display = 'block';
  renderCollection();
}
function closeCollection() {
  document.getElementById('collPage').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
}
function renderCollection() {
  const arr = loadColl();
  const total = arr.length;
  setText('collSubtitle', total === 0 ? 'Nothing yet' : `${total} character${total===1?'':'s'} to review`);
  const cont = document.getElementById('collContent'); if (!cont) return;
  cont.innerHTML = '';
  if (!total) {
    cont.innerHTML = `<div class="coll-empty"><span class="coll-empty-icon">漢</span><div class="coll-empty-text">No characters in your review list yet.<br>Tap ↩ Review later while studying<br>to add them here.</div></div>`;
    return;
  }
  const grid = document.createElement('div'); grid.className = 'coll-grid';
  arr.forEach(char => {
    const c = CHARS.find(x => x.char === char); if (!c) return;
    const card = document.createElement('div'); card.className = 'coll-card';
    card.innerHTML = `<div class="coll-card-ch">${c.char}</div><div class="coll-card-pin">${c.pin}</div><div class="coll-card-mean">${c.mean}</div><button class="coll-remove" onclick="removeFromColl(event,'${char}')">✕</button>`;
    card.onclick = () => studyFromColl(char);
    grid.appendChild(card);
  });
  cont.appendChild(grid);
}
function removeFromColl(e, char) {
  e.stopPropagation();
  const arr = loadColl().filter(x => x !== char);
  saveColl(arr); renderCollection(); updateReviewBtn(idx); updateReviewBtn(idx,'W');
  showToast('Removed');
}
function studyFromColl(char) {
  closeCollection();
  jumpToChar(char);
}

/* ── MODE SWITCH ── */
function setMode(m) {
  curMode = m;
  const modes = ['learn','write','flip','quiz'];
  modes.forEach(n => {
    const el = document.getElementById('p' + n.charAt(0).toUpperCase() + n.slice(1));
    if (el) el.style.display = n === m ? 'block' : 'none';
  });
  document.querySelectorAll('.tab').forEach((t,i) => t.classList.toggle('on', modes[i] === m));
  stopWave();
  if (m === 'write') { renderWrite(); }
  if (m === 'flip') { fIdx = idx; renderFlip(); }
  if (m === 'quiz') { qIdx = idx; renderQuiz(); }
  if (m === 'learn') { renderLearn(); }
}

/* ── TOAST ── */
function showToast(msg) {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

/* ── HELPERS ── */
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setHtml(id, val) { const el = document.getElementById(id); if (el) el.innerHTML = val; }
