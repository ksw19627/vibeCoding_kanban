'use strict';

/* ── 상수 ── */
const THEME_KEY       = 'kanban-theme';
const COLUMNS         = ['todo', 'inprogress', 'done'];
const PRIORITY_LABEL  = { high: 'HIGH', mid: 'MID', low: 'LOW' };
const CONFETTI_COLORS = ['#0052cc','#00875a','#ff991f','#de350b','#6554c0','#00b8d9','#ffbf00'];

/* ── 상태 ── */
let cards          = [];
let currentUser    = null;
let dragId         = null;
let editingCardId  = null;
let editingColumn  = null;
let priorityFilter = 'all';

/* ── 유틸 ── */
function uid() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(due)  { return due && due < todayStr(); }
function isDueToday(due) { return due && due === todayStr(); }

function getDueClass(due) {
  if (isOverdue(due))  return 'overdue';
  if (isDueToday(due)) return 'due-today';
  return '';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─────────────────────────────────────
   인증 (Supabase Auth)
───────────────────────────────────── */
function checkAuth() {
  return new Promise(resolve => {
    const { data: { subscription } } = window._sb.auth.onAuthStateChange((event, session) => {
      if (event !== 'INITIAL_SESSION') return;
      subscription.unsubscribe();
      if (session) {
        currentUser = session.user;
        const emailEl = document.getElementById('user-email');
        if (emailEl) emailEl.textContent = currentUser.email;
        resolve(true);
      } else {
        location.href = 'auth.html';
        resolve(false);
      }
    });
  });
}

async function handleLogout() {
  await window._sb.auth.signOut();
  location.href = 'auth.html';
}

function setupLogout() {
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
}

/* ─────────────────────────────────────
   DB 필드명 변환
───────────────────────────────────── */
function dbToJs(row) {
  return {
    id:        row.id,
    title:     row.title,
    desc:      row.description,
    due:       row.due_date ?? '',
    priority:  row.priority,
    column:    row.col,
    order:     row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function jsToDb(card) {
  return {
    id:          card.id,
    user_id:     currentUser.id,
    title:       card.title,
    description: card.desc,
    due_date:    card.due || null,
    priority:    card.priority,
    col:         card.column,
    sort_order:  card.order,
  };
}

/* ─────────────────────────────────────
   DB CRUD (Supabase)
───────────────────────────────────── */
async function loadCardsFromDB() {
  const { data, error } = await window._sb
    .from('cards')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('col')
    .order('sort_order');
  if (error) { console.error('카드 로드 실패:', error.message); return []; }
  return (data ?? []).map(dbToJs);
}

async function insertCardToDB(card) {
  const { error } = await window._sb.from('cards').insert(jsToDb(card));
  if (error) console.error('카드 추가 실패:', error.message);
}

async function updateCardInDB(id, patch) {
  const dbPatch = {
    title:       patch.title,
    description: patch.desc,
    due_date:    patch.due !== undefined ? (patch.due || null) : undefined,
    priority:    patch.priority,
    col:         patch.column,
    sort_order:  patch.order,
  };
  Object.keys(dbPatch).forEach(k => dbPatch[k] === undefined && delete dbPatch[k]);
  const { error } = await window._sb.from('cards').update(dbPatch).eq('id', id);
  if (error) console.error('카드 수정 실패:', error.message);
}

async function deleteCardFromDB(id) {
  const { error } = await window._sb.from('cards').delete().eq('id', id);
  if (error) console.error('카드 삭제 실패:', error.message);
}

async function bulkUpdateOrderInDB(col) {
  const colCards = cards
    .filter(c => c.column === col)
    .sort((a, b) => a.order - b.order);

  if (colCards.length === 0) return;

  const updates = colCards.map((c, i) => ({
    id:          c.id,
    user_id:     currentUser.id,
    title:       c.title,
    description: c.desc,
    col:         c.column,
    sort_order:  i,
    priority:    c.priority,
    due_date:    c.due || null,
  }));

  const { error } = await window._sb.from('cards').upsert(updates);
  if (error) console.error('순서 업데이트 실패:', error.message);
}

/* ─────────────────────────────────────
   렌더링
───────────────────────────────────── */
function renderAll() {
  COLUMNS.forEach(col => {
    const list = document.getElementById(`list-${col}`);
    list.innerHTML = '';
    cards
      .filter(c => c.column === col)
      .sort((a, b) => a.order - b.order)
      .forEach(c => list.appendChild(renderCard(c)));
  });
  updateBadges();
  applyFilter();
}

function renderCard(card) {
  const el = document.createElement('div');
  el.className = 'card';
  el.setAttribute('draggable', 'true');
  el.setAttribute('role', 'listitem');
  el.dataset.id       = card.id;
  el.dataset.priority = card.priority;
  el.dataset.title    = card.title;
  el.dataset.desc     = card.desc;

  const dueClass = getDueClass(card.due);
  const dueBadge = card.due
    ? `<span class="due-badge ${dueClass}">&#128197; ${card.due}</span>`
    : '';

  const descHtml = card.desc
    ? `<div class="card-desc">${escapeHtml(card.desc)}</div>`
    : '';

  el.innerHTML = `
    <div class="card-meta">
      <span class="priority-badge ${card.priority}">${PRIORITY_LABEL[card.priority]}</span>
      ${dueBadge}
    </div>
    <div class="card-title">${escapeHtml(card.title)}</div>
    ${descHtml}
    <div class="card-actions">
      <button class="btn-edit" data-id="${card.id}" data-action="edit">편집</button>
      <button class="btn-del"  data-id="${card.id}" data-action="delete">삭제</button>
    </div>
  `;
  return el;
}

function updateBadges() {
  COLUMNS.forEach(col => {
    document.getElementById(`badge-${col}`).textContent =
      cards.filter(c => c.column === col).length;
  });
}

/* ─────────────────────────────────────
   필터 (검색 + 우선순위 동시)
───────────────────────────────────── */
function applyFilter() {
  const q = (document.getElementById('search-input')?.value ?? '').toLowerCase().trim();
  document.querySelectorAll('.card').forEach(el => {
    const matchQ = !q || el.dataset.title.toLowerCase().includes(q) || el.dataset.desc.toLowerCase().includes(q);
    const matchP = priorityFilter === 'all' || el.dataset.priority === priorityFilter;
    el.classList.toggle('filtered-out', !(matchQ && matchP));
  });
}

/* ─────────────────────────────────────
   카드 CRUD
───────────────────────────────────── */
async function createCard(data, column) {
  const order = cards.filter(c => c.column === column).length;
  const now   = new Date().toISOString();
  const card  = {
    id:        uid(),
    title:     data.title.trim(),
    desc:      (data.desc ?? '').trim(),
    due:       data.due ?? '',
    priority:  data.priority ?? 'mid',
    column,
    order,
    createdAt: now,
    updatedAt: now,
  };
  cards.push(card);
  renderAll();
  await insertCardToDB(card);
}

async function updateCard(id, patch) {
  const idx = cards.findIndex(c => c.id === id);
  if (idx === -1) return;
  cards[idx] = { ...cards[idx], ...patch, updatedAt: new Date().toISOString() };
  renderAll();
  await updateCardInDB(id, patch);
}

function deleteCard(id) {
  const cardEl = document.querySelector(`.card[data-id="${id}"]`);

  const doDelete = async () => {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    cards = cards.filter(c => c.id !== id);
    reorderLocal(card.column);
    renderAll();
    await deleteCardFromDB(id);
  };

  if (cardEl) {
    cardEl.classList.add('removing');
    cardEl.addEventListener('animationend', doDelete, { once: true });
    setTimeout(doDelete, 350);
  } else {
    doDelete();
  }
}

function reorderLocal(col) {
  let order = 0;
  cards
    .filter(c => c.column === col)
    .sort((a, b) => a.order - b.order)
    .forEach(c => { c.order = order++; });
}

/* ─────────────────────────────────────
   모달
───────────────────────────────────── */
const modal      = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const inputTitle = document.getElementById('card-title');
const inputDesc  = document.getElementById('card-desc');
const inputDue   = document.getElementById('card-due');
const inputPrio  = document.getElementById('card-priority');
const titleError = document.getElementById('title-error');

function openModal(column, cardId) {
  editingColumn = column;
  editingCardId = cardId ?? null;

  titleError.classList.add('hidden');
  inputTitle.classList.remove('error');

  if (cardId) {
    const card = cards.find(c => c.id === cardId);
    modalTitle.textContent = '카드 편집';
    inputTitle.value = card.title;
    inputDesc.value  = card.desc;
    inputDue.value   = card.due;
    inputPrio.value  = card.priority;
  } else {
    modalTitle.textContent = '카드 추가';
    inputTitle.value = '';
    inputDesc.value  = '';
    inputDue.value   = '';
    inputPrio.value  = 'mid';
  }

  modal.classList.remove('hidden');
  requestAnimationFrame(() => inputTitle.focus());
}

function closeModal() {
  modal.classList.add('hidden');
  editingCardId = null;
  editingColumn = null;
}

function saveCard() {
  const title = inputTitle.value.trim();
  if (!title) {
    inputTitle.classList.add('error');
    titleError.classList.remove('hidden');
    inputTitle.focus();
    return;
  }

  const data = {
    title,
    desc:     inputDesc.value,
    due:      inputDue.value,
    priority: inputPrio.value,
  };

  // closeModal() 이 editingColumn/editingCardId를 null로 초기화하기 전에 저장
  const column = editingColumn;
  const cardId = editingCardId;
  closeModal();

  if (cardId) {
    updateCard(cardId, data);
  } else {
    createCard(data, column);
  }
}

function setupModal() {
  document.getElementById('save-card').addEventListener('click', saveCard);
  document.getElementById('cancel-card').addEventListener('click', closeModal);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', closeModal);

  inputTitle.addEventListener('input', () => {
    if (inputTitle.value.trim()) {
      inputTitle.classList.remove('error');
      titleError.classList.add('hidden');
    }
  });

  document.addEventListener('keydown', e => {
    if (!modal.classList.contains('hidden')) {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveCard();
    }
  });
}

/* ─────────────────────────────────────
   이벤트 위임 (보드)
───────────────────────────────────── */
function setupBoardEvents() {
  document.getElementById('board').addEventListener('click', e => {
    const action = e.target.dataset.action;
    const id     = e.target.dataset.id;

    if (action === 'edit') {
      const card = cards.find(c => c.id === id);
      if (card) openModal(card.column, id);
      return;
    }

    if (action === 'delete') {
      deleteCard(id);
      return;
    }

    const addBtn = e.target.closest('.add-card-btn');
    if (addBtn) openModal(addBtn.dataset.col);
  });
}

/* ─────────────────────────────────────
   검색
───────────────────────────────────── */
function setupSearch() {
  document.getElementById('search-input').addEventListener('input', applyFilter);
}

/* ─────────────────────────────────────
   우선순위 필터 칩
───────────────────────────────────── */
function setupPriorityFilter() {
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      priorityFilter = chip.dataset.priority;
      applyFilter();
    });
  });
}

/* ─────────────────────────────────────
   드래그 앤 드롭
───────────────────────────────────── */
function setupDragAndDrop() {
  const board = document.getElementById('board');
  board.addEventListener('dragstart',  handleDragStart);
  board.addEventListener('dragover',   handleDragOver);
  board.addEventListener('dragleave',  handleDragLeave);
  board.addEventListener('drop',       handleDrop);
  board.addEventListener('dragend',    handleDragEnd);
}

function handleDragStart(e) {
  const card = e.target.closest('.card');
  if (!card) return;
  dragId = card.dataset.id;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragId);

  const ghost = document.createElement('div');
  ghost.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;';
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, 0, 0);
  setTimeout(() => {
    document.body.removeChild(ghost);
    card.classList.add('dragging');
  }, 0);
}

function getTargetColumn(e) {
  return e.target.closest('.column');
}

function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll('.card:not(.dragging)')];
  return els.reduce((closest, child) => {
    const box    = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > (closest.offset ?? -Infinity)) {
      return { offset, element: child };
    }
    return closest;
  }, {}).element ?? null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const col = getTargetColumn(e);
  if (!col) return;

  document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
  col.classList.add('drag-over');

  document.querySelectorAll('.drag-placeholder').forEach(p => p.remove());
  const list    = col.querySelector('.card-list');
  const afterEl = getDragAfterElement(list, e.clientY);
  const ph      = document.createElement('div');
  ph.className  = 'drag-placeholder';
  if (afterEl) list.insertBefore(ph, afterEl);
  else         list.appendChild(ph);
}

function handleDragLeave(e) {
  const col = getTargetColumn(e);
  if (col && !col.contains(e.relatedTarget)) {
    col.classList.remove('drag-over');
    col.querySelectorAll('.drag-placeholder').forEach(p => p.remove());
  }
}

async function handleDrop(e) {
  e.preventDefault();
  const col = getTargetColumn(e);
  if (!col || !dragId) return;

  const targetCol = col.dataset.col;
  const list      = col.querySelector('.card-list');
  const afterEl   = getDragAfterElement(list, e.clientY);

  const colCards = cards
    .filter(c => c.column === targetCol && c.id !== dragId)
    .sort((a, b) => a.order - b.order);

  let targetOrder;
  if (!afterEl) {
    targetOrder = colCards.length;
  } else {
    const afterIdx = colCards.findIndex(c => c.id === afterEl.dataset.id);
    targetOrder    = afterIdx === -1 ? colCards.length : afterIdx;
  }

  const moved   = cards.find(c => c.id === dragId);
  const prevCol = moved.column;

  cards = cards.filter(c => c.id !== dragId);
  reorderLocal(prevCol);

  cards
    .filter(c => c.column === targetCol)
    .sort((a, b) => a.order - b.order)
    .forEach((c, i) => { c.order = i >= targetOrder ? i + 1 : i; });

  moved.column    = targetCol;
  moved.order     = targetOrder;
  moved.updatedAt = new Date().toISOString();
  cards.push(moved);

  col.classList.remove('drag-over');
  col.querySelectorAll('.drag-placeholder').forEach(p => p.remove());

  renderAll();

  /* UI 먼저 반영 후 DB 비동기 업데이트 */
  await updateCardInDB(dragId, { column: targetCol, order: targetOrder });
  await bulkUpdateOrderInDB(targetCol);
  if (prevCol !== targetCol) await bulkUpdateOrderInDB(prevCol);

  if (targetCol === 'done' && prevCol !== 'done') confetti();
}

function handleDragEnd() {
  dragId = null;
  document.querySelectorAll('.card.dragging').forEach(c => c.classList.remove('dragging'));
  document.querySelectorAll('.column.drag-over').forEach(c => c.classList.remove('drag-over'));
  document.querySelectorAll('.drag-placeholder').forEach(p => p.remove());
}

/* ─────────────────────────────────────
   테마
───────────────────────────────────── */
function setupTheme() {
  const saved = localStorage.getItem(THEME_KEY) ?? 'light';
  applyTheme(saved);
  document.getElementById('theme-toggle').addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  document.querySelector('.theme-icon').textContent = theme === 'dark' ? '☀' : '☾';
}

/* ─────────────────────────────────────
   컨페티
───────────────────────────────────── */
function confetti() {
  const canvas  = document.getElementById('confetti-canvas');
  const ctx     = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';

  const particles = Array.from({ length: 110 }, () => ({
    x:     Math.random() * canvas.width,
    y:     Math.random() * canvas.height * 0.35,
    vx:    (Math.random() - 0.5) * 7,
    vy:    -(Math.random() * 9 + 7),
    rot:   Math.random() * 360,
    dRot:  (Math.random() - 0.5) * 9,
    size:  Math.random() * 9 + 4,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    alive: true,
  }));

  const startTime = performance.now();

  function draw(now) {
    if (now - startTime > 2200) {
      canvas.style.display = 'none';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let anyAlive = false;
    particles.forEach(p => {
      if (!p.alive) return;
      p.x += p.vx; p.y += p.vy; p.vy += 0.38; p.rot += p.dRot;
      if (p.y > canvas.height + 20) { p.alive = false; return; }
      anyAlive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    });
    if (anyAlive) requestAnimationFrame(draw);
    else { canvas.style.display = 'none'; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
  requestAnimationFrame(draw);
}

/* ─────────────────────────────────────
   진입점
───────────────────────────────────── */
async function initApp() {
  try {
    setupTheme();

    const authed = await checkAuth();
    if (!authed) return;

    cards = await loadCardsFromDB();
    renderAll();
    setupBoardEvents();
    setupDragAndDrop();
    setupSearch();
    setupPriorityFilter();
    setupModal();
    setupLogout();
  } catch (err) {
    console.error('initApp 오류:', err);
    location.href = 'auth.html';
  }
}

document.addEventListener('DOMContentLoaded', initApp);
