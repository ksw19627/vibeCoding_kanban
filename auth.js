'use strict';

const BASE_URL = (() => {
  const { hostname, pathname } = location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return location.origin + pathname.replace(/auth\.html$/, '');
  }
  return 'https://ksw19627.github.io/vibeCoding_kanban/';
})();

let currentTab = 'signin';

/* ── 진입점 ── */
function initAuthPage() {
  const theme = localStorage.getItem('kanban-theme') || 'light';
  document.documentElement.dataset.theme = theme;

  /* 이벤트 먼저 등록 (세션 확인과 무관하게 버튼이 즉시 동작) */
  document.getElementById('btn-google').addEventListener('click', () => handleOAuth('google'));
  document.getElementById('btn-github').addEventListener('click', () => handleOAuth('github'));
  document.getElementById('auth-form').addEventListener('submit', handleFormSubmit);
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  document.getElementById('toggle-tab').addEventListener('click', () => {
    switchTab(currentTab === 'signin' ? 'signup' : 'signin');
  });

  /* 이미 로그인된 경우에만 보드로 이동 */
  const { data: { subscription } } = window._sb.auth.onAuthStateChange((event, session) => {
    if (event !== 'INITIAL_SESSION') return;
    subscription.unsubscribe();
    if (session) location.href = BASE_URL + 'index.html';
  });
}

/* ── OAuth ── */
async function handleOAuth(provider) {
  clearMessage();
  const { error } = await window._sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo: BASE_URL + 'index.html' },
  });
  if (error) showMessage(error.message, 'error');
}

/* ── 이메일 폼 ── */
async function handleFormSubmit(e) {
  e.preventDefault();
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;

  if (!email || !password) {
    showMessage('이메일과 패스워드를 모두 입력해주세요.', 'error');
    return;
  }
  if (password.length < 6) {
    showMessage('패스워드는 6자 이상이어야 합니다.', 'error');
    return;
  }

  const btn = document.getElementById('auth-submit');
  btn.disabled = true;
  btn.textContent = '처리 중...';

  if (currentTab === 'signin') {
    await handleEmailSignIn(email, password);
  } else {
    await handleEmailSignUp(email, password);
  }

  btn.disabled = false;
  btn.textContent = currentTab === 'signin' ? '로그인' : '회원가입';
}

async function handleEmailSignIn(email, password) {
  const { error } = await window._sb.auth.signInWithPassword({ email, password });
  if (error) {
    const msg = error.message.includes('Invalid login')
      ? '이메일 또는 패스워드가 올바르지 않습니다.'
      : error.message.includes('Email not confirmed')
      ? '이메일 확인이 필요합니다. 받은 편지함을 확인해주세요.'
      : error.message;
    showMessage(msg, 'error');
  } else {
    location.href = BASE_URL + 'index.html';
  }
}

async function handleEmailSignUp(email, password) {
  const { error } = await window._sb.auth.signUp({ email, password });
  if (error) {
    const msg = error.message.includes('already registered')
      ? '이미 가입된 이메일입니다. 로그인해주세요.'
      : error.message;
    showMessage(msg, 'error');
  } else {
    showMessage('가입 확인 이메일을 발송했습니다. 받은 편지함을 확인해주세요. ✉️', 'info');
  }
}

/* ── 탭 전환 ── */
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  const submitBtn  = document.getElementById('auth-submit');
  const toggleLink = document.getElementById('toggle-tab');
  const footer     = document.querySelector('.auth-footer');
  const pwdInput   = document.getElementById('auth-password');

  if (tab === 'signin') {
    submitBtn.textContent  = '로그인';
    toggleLink.textContent = '회원가입';
    footer.firstChild.textContent = '계정이 없으신가요? ';
    pwdInput.autocomplete  = 'current-password';
  } else {
    submitBtn.textContent  = '회원가입';
    toggleLink.textContent = '로그인';
    footer.firstChild.textContent = '이미 계정이 있으신가요? ';
    pwdInput.autocomplete  = 'new-password';
  }

  clearMessage();
}

/* ── 메시지 ── */
function showMessage(text, type) {
  const el = document.getElementById('auth-message');
  el.textContent = text;
  el.className = `auth-message ${type}`;
  el.classList.remove('hidden');
}

function clearMessage() {
  const el = document.getElementById('auth-message');
  el.textContent = '';
  el.className = 'auth-message hidden';
}

document.addEventListener('DOMContentLoaded', initAuthPage);
