# TRD — Technical Requirements Document
## 칸반 보드 (Kanban Board)

---

## 1. 기술 스택

| 레이어 | 기술 | 비고 |
|--------|------|------|
| 마크업 | HTML5 | 시맨틱 태그 (`<header>`, `<main>`, `<section>`) |
| 스타일 | CSS3 | CSS 변수, Flexbox, 미디어쿼리, keyframe 애니메이션 |
| 로직 | Vanilla JS (ES6+) | 클래스 미사용, 함수형 |
| 인증/DB | Supabase JS SDK v2 | CDN 로드 (`@supabase/supabase-js@2`) |
| 배포 | GitHub Pages | main 브랜치 루트 |
| 드래그앤드롭 | HTML5 DnD API | `dragstart`, `dragover`, `drop` |
| 컨페티 | Canvas 2D API | `#confetti-canvas` |

---

## 2. 파일 구성

```
index.html          — 칸반 보드 (인증 후 진입)
auth.html           — 로그인/회원가입 페이지
style.css           — 전체 스타일 + auth 컴포넌트
supabase-config.js  — Supabase 클라이언트 초기화
app.js              — 칸반 로직 (Supabase DB 연동)
auth.js             — 인증 전담 로직
```

---

## 3. HTML 구조

### 3.1 index.html

```
<html data-theme="light">
  <head>
    <link rel="stylesheet" href="style.css">
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2">
    <script src="supabase-config.js">
  </head>
  <body>
    <header.header>
      <h1.logo>
      <div.toolbar>
        <div.search-wrap> → <input#search>
        <div.user-area>   → <span#user-email> + <button#logout-btn>
        <button#theme-toggle>
    <main.board#board>
      3개 컬럼 (todo / inprogress / done)
    <div.modal#modal>
      카드 추가/편집 폼
    <canvas#confetti-canvas>
    <script src="app.js">
```

### 3.2 auth.html

```
<html data-theme="light">
  <head>
    <link rel="stylesheet" href="style.css">
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2">
    <script src="supabase-config.js">
  </head>
  <body class="auth-page">
    <div.auth-card>
      <div.auth-logo>
        <h1> Kanban Board
        <p>  작업을 관리하세요
      <div.oauth-buttons>
        <button#btn-google .oauth-btn>
        <button#btn-github .oauth-btn>
      <div.divider> 또는
      <div.auth-tabs>
        <button.tab-btn[data-tab="signin"] active>
        <button.tab-btn[data-tab="signup"]>
      <form#auth-form>
        <input#auth-email type="email">
        <input#auth-password type="password">
        <p#auth-error .auth-error hidden>
        <button#auth-submit .btn.btn-primary>
      <p.auth-toggle-link>
    <script src="auth.js">
```

---

## 4. supabase-config.js

```js
// Supabase 프로젝트 설정 — 실제 값으로 교체 필요
const SUPABASE_URL  = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_KEY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
```

---

## 5. auth.js 함수 명세

```js
/* 진입점 */
initAuthPage()
  // 1. getSession() → 세션 있으면 index.html 리디렉트
  // 2. OAuth 버튼 이벤트 등록
  // 3. 탭 전환 이벤트 등록
  // 4. 폼 submit 이벤트 등록

/* OAuth */
handleOAuth(provider: 'google' | 'github')
  // supabase.auth.signInWithOAuth({
  //   provider,
  //   options: { redirectTo: getBaseUrl() + 'index.html' }
  // })

/* 이메일 인증 */
handleEmailSignIn(email, password)
  // supabase.auth.signInWithPassword({ email, password })
  // 성공: location.href = 'index.html'
  // 실패: showError(message)

handleEmailSignUp(email, password)
  // supabase.auth.signUp({ email, password })
  // 성공: showInfo('이메일을 확인해주세요')
  // 실패: showError(message)

/* UI 유틸 */
toggleAuthTab(mode: 'signin' | 'signup')
  // 탭 active 클래스 전환
  // 버튼 텍스트 변경 ('로그인' ↔ '회원가입')

showError(message)     // #auth-error 표시
showInfo(message)      // 초록색 안내 메시지 표시
getBaseUrl()           // GitHub Pages / 로컬 경로 자동 감지
```

---

## 6. app.js 함수 명세

### 6.1 인증 (신규)

```js
let currentUser = null;

checkAuth()
  // supabase.auth.getSession()
  // { data: { session } }
  // session 없으면 → location.href = 'auth.html'
  // 있으면 currentUser = session.user
  // document.getElementById('user-email').textContent = user.email

handleLogout()
  // supabase.auth.signOut()
  // location.href = 'auth.html'
```

### 6.2 DB 연동 (localStorage 대체)

```js
loadCardsFromDB()  → Promise<Card[]>
  // const { data } = await supabase
  //   .from('cards')
  //   .select('*')
  //   .eq('user_id', currentUser.id)
  //   .order('col').order('sort_order')
  // return data.map(dbToJs)   ← 필드명 변환

insertCardToDB(card)  → Promise<void>
  // await supabase.from('cards').insert(jsToDb(card))

updateCardInDB(id, patch)  → Promise<void>
  // await supabase.from('cards')
  //   .update({ ...jsToDb(patch), updated_at: new Date() })
  //   .eq('id', id)

deleteCardFromDB(id)  → Promise<void>
  // await supabase.from('cards').delete().eq('id', id)

bulkUpdateOrderInDB(col)  → Promise<void>
  // 같은 컬럼 카드 sort_order 일괄 업데이트 (드래그 후)
```

### 6.3 필드명 매핑 유틸 (신규)

```js
// JS 카멜케이스 → DB 스네이크케이스
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
    created_at:  card.createdAt,
    updated_at:  card.updatedAt,
  };
}

// DB 스네이크케이스 → JS 카멜케이스
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
```

### 6.4 변경되는 기존 함수

```js
// createCard() 내부: supabase insert 호출
// updateCard()  내부: supabase update 호출
// deleteCard()  내부: supabase delete 호출
// handleDrop()  내부: supabase update(col, sort_order) 호출

// initApp() 변경:
//   loadFromStorage() → await loadCardsFromDB()
//   checkAuth() 추가
//   setupLogout() 추가
```

### 6.5 유지되는 기존 함수 (변경 없음)

`renderAll`, `renderCard`, `updateBadges`, `escapeHtml`, `isOverdue`,
`openModal`, `closeModal`, `saveCard`,
`setupBoardEvents`, `setupDragAndDrop`,
`handleDragStart`, `handleDragOver`, `handleDragLeave`, `handleDragEnd`,
`getDragAfterElement`, `setupSearch`, `filterCards`,
`setupTheme`, `applyTheme`, `confetti`

---

## 7. 필드명 매핑 (JS ↔ DB)

| JS (camelCase) | DB (snake_case) | 타입 변환 |
|----------------|-----------------|-----------|
| `desc` | `description` | — |
| `due` | `due_date` | `''` → `null` |
| `column` | `col` | — |
| `order` | `sort_order` | — |
| `createdAt` | `created_at` | ISO string ↔ timestamptz |
| `updatedAt` | `updated_at` | ISO string ↔ timestamptz |

---

## 8. CSS 추가 (auth 페이지 + 헤더 유저 영역)

```css
/* auth 페이지 전용 */
.auth-page         /* body: flex center 배경 */
.auth-card         /* 중앙 카드 박스, max-width 440px */
.auth-logo         /* 로고 + 부제목 */
.oauth-btn         /* 소셜 로그인 버튼 (아이콘 + 텍스트) */
.oauth-btn.google  /* Google 색상 */
.oauth-btn.github  /* GitHub 색상 */
.divider           /* "또는" 좌우 가로선 */
.auth-tabs         /* Sign In / Sign Up 탭 */
.tab-btn           /* 탭 버튼 */
.tab-btn.active    /* 활성 탭 */
.auth-error        /* 빨간 에러 메시지 박스 */
.auth-info         /* 초록 안내 메시지 박스 */

/* index.html 헤더 추가 */
.user-area         /* 이메일 + 로그아웃 버튼 flex 영역 */
.user-email        /* 사용자 이메일 텍스트 */
.btn-logout        /* 로그아웃 버튼 */
```

---

## 9. OAuth 리디렉트 URL 구성

```
[로컬 개발]
  Base URL: http://127.0.0.1:5500/  (Live Server 등)

[GitHub Pages]
  Base URL: https://ksw19627.github.io/vibeCoding_kanban/

getBaseUrl() 로직:
  location.hostname === 'localhost' || '127.0.0.1'
    → 로컬 경로 반환
    → 그 외: GitHub Pages URL 반환
```

---

## 10. Supabase 설정 요구사항

| 항목 | 값 |
|------|----|
| Site URL | `https://ksw19627.github.io/vibeCoding_kanban` |
| Redirect URL | `https://ksw19627.github.io/vibeCoding_kanban/index.html` |
| Google OAuth | Google Cloud Console 앱 Client ID/Secret 필요 |
| GitHub OAuth | GitHub OAuth Apps Client ID/Secret 필요 |
| Email Auth | 기본 활성화 (SMTP 설정 선택) |

---

## 11. 브라우저 API 의존성

| API | 용도 | 폴백 |
|-----|------|------|
| Supabase JS v2 | 인증 + DB | 없음 (필수) |
| `crypto.randomUUID()` | 카드 ID (로컬 임시) | `Date.now().toString(36)` |
| Canvas 2D | 컨페티 | 없음 (기능 생략) |
| HTML5 DnD API | 카드 이동 | 없음 (필수) |
| CSS Custom Properties | 테마 시스템 | 없음 (필수) |
| `localStorage` | 테마 설정 저장 | 없음 |
