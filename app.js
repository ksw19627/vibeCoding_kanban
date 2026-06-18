'use strict';

const supabase = window._sb; // supabase-config.js 에서 생성한 클라이언트

/* ── 상수 ── */
const THEME_KEY      = 'kanban-theme';
const COLUMNS        = ['todo', 'inprogress', 'done'];
const PRIORITY_LABEL = { high: '🔴 High', mid: '🟡 Mid', low: '🟢 Low' };
const CONFETTI_COLORS = ['#0052cc','#00875a','#ff991f','#de350b','#6554c0','#00b8d9'];

/* ── 상태 ── */
let cards         = [];
let currentUser   = null;
let dragId        = null;
let editingCardId = null;
let editingColumn = null;

/* ── 유틸 ── */
function today() {
  return new Date().toISOString().slice(0, 10);
}
function isOverdue(due) {
  return due && due < today();
}

/* ── DB 필드명 변환 ── */
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

/* ── 인증 ── */
async function checkAuth() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      location.href = 'auth.html';
      return false;
    }
    currentUser = session.user;
    document.body.style.display = ''; // 인증 확인 후 화면 표시
    const emailEl = document.getElementById('user-email');
    if (emailEl) emailEl.textContent = currentUser.email;
    return true;
  } catch (err) {
    console.error('checkAuth 오류:', err);
    location.href = 'auth.html';
    return false;
  }
}

async function handleLogout() {
  await supabase.auth.signOut();
  location.href = 'auth.html';
}

function setupLogout() {
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
}

/* ── DB CRUD ── */
async function loadCardsFromDB() {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('col')
    .order('sort_order');

  if (error) { console.error('카드 로드 실패:', error.message); return []; }
  return (data || []).map(dbToJs);
}

async function insertCardToDB(card) {
  const { error } = await supabase.from('cards').insert(jsToDb(card));
  if (error) console.error('카드 추가 실패:', error.message);
}

async function updateCardInDB(id, patch) {
  const dbPatch = {
    title:       patch.title,
    description: patch.desc,
    due_date:    patch.due || null,
    priority:    patch.priority,
    col:         patch.column,
    sort_order:  patch.order,
  };
  Object.keys(dbPatch).forEach(k => dbPatch[k] === undefined && delete dbPatch[k]);
  const { error } = await supabase.from('cards').update(dbPatch).eq('id', id);
  if (error) console.error('카드 수정 실패:', error.message);
}

async function deleteCardFromDB(id) {
  const { error } = await supabase.from('cards').delete().eq('id', id);
  if (error) console.error('카드 삭제 실패:', error.message);
}

async function bulkUpdateOrderInDB(col) {
  const colCards = cards
    .filter(c => c.column === col)
    .sort((a, b) => a.order - b.order);

  const updates = colCards.map((c, i) => ({
    id:         c.id,
    user_id:    currentUser.id,
    title:      c.title,
    description: c.desc,
    col:        c.column,
    sort_order: i,
    priority:   c.priority,
  }));

  if (updates.length === 0) return;
  const { error } = await supabase.from('cards').upsert(updates);
  if (error) console.error('순서 업데이트 실패:', error.message);
}

/* ── 렌더링 ── */
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
}

function renderCard(card) {
  const el = document.createElement('div');
  el.className = 'card';
  el.setAttribute('draggable', 'true');
  el.dataset.id       = card.id;
  el.dataset.priority = card.priority;
  el.dataset.title    = card.title;
  el.dataset.desc     = card.desc;

  const dueBadge = card.due
    ? `<span class="due-badge ${isOverdue(card.due) ? 'overdue' : ''}">📅 ${card.due}</span>`
    : '';

  el.innerHTML = `
    <div class="card-meta">
      <span class="priority-badge ${card.priority}">${PRIORITY_LABEL[card.priority]}</span>
      ${dueBadge}
    </div>
    <div class="card-title">${escapeHtml(card.title)}</div>
    ${card.desc ? `<div class="card-desc">${escapeHtml(card.desc)}</div>` : ''}
    <div class="card-actions">
      <button class="btn-edit" data-id="${card.id}" data-action="edit">편집</button>
      <button class="btn-del"  data-id="${card.id}" data-action="delete">삭제</button>
    </div>
  `;
  return el;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function updateBadges() {
  COLUMNS.forEach(col => {
    document.getElementById(`badge-${col}`).textContent =
      cards.filter(c => c.column === col).length;
  });
}

/* ── 카드 CRUD ── */
async function createCard(data, column) {
  const order = cards.filter(c => c.column === column).length;
  const card = {
    id:        crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
    title:     data.title.trim(),
    desc:      data.desc.trim(),
    due:       data.due,
    priority:  data.priority,
    column,
    order,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  cards.push(card);
  await insertCardToDB(card);
  renderAll();
}

async function updateCard(id, patch) {
  const idx = cards.findIndex(c => c.id === id);
  if (idx === -1) return;
  cards[idx] = { ...cards[idx], ...patch, updatedAt: new Date().toISOString() };
  await updateCardInDB(id, patch);
  renderAll();
}

async function deleteCard(id) {
  if (!confirm('이 카드를 삭제하시겠습니까?')) return;
  const card = cards.find(c => c.id === id);
  cards = cards.filter(c => c.id !== id);
  reorderLocal(card.column);
  await deleteCardFromDB(id);
  renderAll();
}

function reorderLocal(col) {
  let order = 0;
  cards
    .filter(c => c.column === col)
    .sort((a, b) => a.order - b.order)
    .forEach(c => { c.order = order++; });
}

/* ── 모달 ── */
const modal      = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const inputTitle = document.getElementById('card-title');
const inputDesc  = document.getElementById('card-desc');
const inputDue   = document.getElementById('card-due');
const inputPrio  = document.getElementById('card-priority');
const titleError = document.getElementById('title-error');

function openModal(column, cardId) {
  editingColumn = column;
  editingCardId = cardId || null;

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

async function saveCard() {
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

  closeModal();

  if (editingCardId) {
    await updateCard(editingCardId, data);
  } else {
    await createCard(data, editingColumn);
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
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
    if (e.key === 'Enter' && e.ctrlKey && !modal.classList.contains('hidden')) saveCard();
  });
}

/* ── 이벤트 위임 ── */
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
    if (addBtn) openModal(addBtn.dataset.column);
  });
}

/* ── 드래그 앤 드롭 ── */
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
  ghost.style.cssText = 'position:absolute;top:-9999px;left:-9999px;';
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, 0, 0);
  setTimeout(() => { document.body.removeChild(ghost); card.classList.add('dragging'); }, 0);
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
  const list      = col.querySelector('.card-list');
  const afterEl   = getDragAfterElement(list, e.clientY);
  const ph        = document.createElement('div');
  ph.className    = 'drag-placeholder';
  if (afterEl) list.insertBefore(ph, afterEl);
  else list.appendChild(ph);
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

  const targetColumn = col.dataset.column;
  const list         = col.querySelector('.card-list');
  const afterEl      = getDragAfterElement(list, e.clientY);

  const colCards = cards
    .filter(c => c.column === targetColumn && c.id !== dragId)
    .sort((a, b) => a.order - b.order);

  let targetOrder;
  if (!afterEl) {
    targetOrder = colCards.length;
  } else {
    const afterIdx = colCards.findIndex(c => c.id === afterEl.dataset.id);
    targetOrder = afterIdx === -1 ? colCards.length : afterIdx;
  }

  const moved      = cards.find(c => c.id === dragId);
  const prevColumn = moved.column;

  cards = cards.filter(c => c.id !== dragId);
  reorderLocal(prevColumn);

  cards
    .filter(c => c.column === targetColumn)
    .sort((a, b) => a.order - b.order)
    .forEach((c, i) => { c.order = i >= targetOrder ? i + 1 : i; });

  moved.column    = targetColumn;
  moved.order     = targetOrder;
  moved.updatedAt = new Date().toISOString();
  cards.push(moved);

  col.classList.remove('drag-over');
  col.querySelectorAll('.drag-placeholder').forEach(p => p.remove());

  renderAll();

  /* DB 업데이트 (비동기, UI 먼저 반영) */
  await updateCardInDB(dragId, { column: targetColumn, order: targetOrder });
  await bulkUpdateOrderInDB(targetColumn);
  if (prevColumn !== targetColumn) await bulkUpdateOrderInDB(prevColumn);

  if (targetColumn === 'done' && prevColumn !== 'done') confetti();
}

function handleDragEnd() {
  dragId = null;
  document.querySelectorAll('.card.dragging').forEach(c => c.classList.remove('dragging'));
  document.querySelectorAll('.column.drag-over').forEach(c => c.classList.remove('drag-over'));
  document.querySelectorAll('.drag-placeholder').forEach(p => p.remove());
}

/* ── 검색 / 필터 ── */
function setupSearch() {
  document.getElementById('search').addEventListener('input', e => {
    filterCards(e.target.value.trim());
  });
}

function filterCards(query) {
  document.querySelectorAll('.card').forEach(el => {
    if (!query) { el.classList.remove('filtered-out'); return; }
    const q       = query.toLowerCase();
    const matched = el.dataset.title.toLowerCase().includes(q) ||
                    el.dataset.desc.toLowerCase().includes(q);
    el.classList.toggle('filtered-out', !matched);
  });
}

/* ── 테마 ── */
function setupTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(saved);
  document.getElementById('theme-toggle').addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  document.getElementById('theme-toggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}

/* ── 컨페티 ── */
function confetti() {
  const canvas  = document.getElementById('confetti-canvas');
  const ctx     = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';

  const particles = Array.from({ length: 100 }, () => ({
    x:        Math.random() * canvas.width,
    y:        Math.random() * canvas.height * 0.4,
    vx:       (Math.random() - 0.5) * 6,
    vy:       -(Math.random() * 8 + 6),
    rotation: Math.random() * 360,
    dRot:     (Math.random() - 0.5) * 8,
    size:     Math.random() * 8 + 4,
    color:    CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    alive:    true,
  }));

  const startTime = performance.now();

  function draw(now) {
    if (now - startTime > 2000) {
      canvas.style.display = 'none';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let anyAlive = false;
    particles.forEach(p => {
      if (!p.alive) return;
      p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.rotation += p.dRot;
      if (p.y > canvas.height + 20) { p.alive = false; return; }
      anyAlive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    });
    if (anyAlive) requestAnimationFrame(draw);
    else { canvas.style.display = 'none'; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
  requestAnimationFrame(draw);
}

/* ── 진입점 ── */
async function initApp() {
  try {
    const authed = await checkAuth();
    if (!authed) return;

    setupTheme();
    cards = await loadCardsFromDB();
    renderAll();
    setupBoardEvents();
    setupDragAndDrop();
    setupSearch();
    setupModal();
    setupLogout();
  } catch (err) {
    console.error('initApp 오류:', err);
    location.href = 'auth.html';
  }
}

document.addEventListener('DOMContentLoaded', initApp);
