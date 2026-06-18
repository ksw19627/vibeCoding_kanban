# TASKS — 칸반 보드 구현 태스크

---

## 진행 상황

| 상태 | 심볼 |
|------|------|
| 대기 | `[ ]` |
| 진행 중 | `[~]` |
| 완료 | `[x]` |

---

## Phase 1. HTML 마크업 (`index.html`)

- [x] **T-01** `<html data-theme="light">` 루트 및 기본 메타 태그 작성
- [x] **T-02** `<header>` — 로고, 검색창, 테마 토글 버튼
- [x] **T-03** `<main class="board">` — 3개 컬럼 섹션 (`todo`, `inprogress`, `done`)
- [x] **T-04** 각 컬럼 내부 — 헤더(도트 + 제목 + 뱃지), 카드 리스트 영역, 카드 추가 버튼
- [x] **T-05** 카드 추가/편집 모달 — 폼 필드 (제목, 설명, 마감일, 우선순위), 저장/취소 버튼
- [x] **T-06** `<canvas id="confetti-canvas">` 선언
- [x] **T-07** `aria-*` 접근성 속성 — 모달 role, aria-modal, aria-labelledby
- [x] **T-08** Supabase JS CDN + supabase-config.js 로드 추가
- [x] **T-09** 헤더에 `.user-area` (이메일 + 로그아웃 버튼) 추가

---

## Phase 2. CSS 스타일 (`style.css`)

### 2-1. 토큰 & 리셋
- [x] **T-10** CSS 변수 라이트/다크 테마 정의
- [x] **T-11** 박스 리셋

### 2-2. 레이아웃
- [x] **T-12** 헤더, 보드, 컬럼 레이아웃
- [x] **T-13** 반응형 브레이크포인트 (min-width: 769px)

### 2-3. 컴포넌트
- [x] **T-14** 카드, 카드 상태(hover/dragging/filtered-out), 우선순위 보더
- [x] **T-15** 모달, 폼 요소, 버튼 변형
- [x] **T-16** 컬럼 drag-over, 뱃지, 카드 추가 버튼

### 2-4. 애니메이션
- [x] **T-17** `@keyframes popIn`, `pulse`, `fadeSlideUp`, `slideOut` (삭제), `placeholderPulse`

### 2-5. auth 페이지 스타일 (신규)
- [x] **T-18** `.auth-page`, `.auth-card` — 중앙 정렬 레이아웃
- [x] **T-19** `.oauth-btn` — Google/GitHub 버튼
- [x] **T-20** `.divider` — "또는" 구분선
- [x] **T-21** `.auth-tabs`, `.tab-btn` — Sign In/Up 탭
- [x] **T-22** `.auth-message` — error/info 메시지 박스
- [x] **T-23** `.user-area`, `.user-email`, `.btn-logout` — 헤더 유저 영역

---

## Phase 3. JavaScript — 칸반 로직 (`app.js`)

### 3-1. 인증 (신규)
- [x] **T-24** `checkAuth()` — Supabase 세션 확인, 없으면 auth.html 리디렉트
- [x] **T-25** `handleLogout()` — signOut → auth.html 리디렉트
- [x] **T-26** `setupLogout()` — 로그아웃 버튼 이벤트 등록

### 3-2. DB 연동 (신규)
- [x] **T-27** `dbToJs()` / `jsToDb()` — 필드명 변환 유틸
- [x] **T-28** `loadCardsFromDB()` — Supabase SELECT
- [x] **T-29** `insertCardToDB()` — Supabase INSERT
- [x] **T-30** `updateCardInDB()` — Supabase UPDATE
- [x] **T-31** `deleteCardFromDB()` — Supabase DELETE
- [x] **T-32** `bulkUpdateOrderInDB()` — 드래그 후 sort_order 일괄 upsert

### 3-3. 렌더링
- [x] **T-33** `renderAll()`, `renderCard()`, `updateBadges()`
- [x] **T-34** 마감일 초과 시 빨간색 강조

### 3-4. 모달 (CRUD)
- [x] **T-35** `openModal()`, `closeModal()`, `saveCard()` (async)
- [x] **T-36** 유효성 검사, Esc/Ctrl+Enter 단축키

### 3-5. 드래그 앤 드롭
- [x] **T-37** `setupDragAndDrop()`, `handleDragStart/Over/Leave/Drop/End`
- [x] **T-38** Y좌표 기반 플레이스홀더, Done 드롭 시 confetti
- [x] **T-39** 드롭 후 DB 비동기 업데이트 (UI 먼저 반영)

### 3-6. 검색/우선순위 필터/테마/컨페티
- [x] **T-40** `setupSearch()`, `applyFilter()` — 검색 + 우선순위 필터 동시 적용
- [x] **T-40b** `setupPriorityFilter()` — HIGH/MID/LOW 필터 칩 클릭 이벤트
- [x] **T-41** `setupTheme()`, `applyTheme()` — localStorage 테마 저장
- [x] **T-42** `confetti()` — Canvas RAF 루프, 2초

### 3-7. 진입점
- [x] **T-43** `initApp()` — async, checkAuth → loadCardsFromDB → renderAll → setupBoardEvents, setupDragAndDrop, setupSearch, setupPriorityFilter, setupModal, setupLogout

---

## Phase 4. JavaScript — 인증 (`auth.js` + `auth.html`)

- [x] **T-44** `auth.html` — OAuth 버튼, 탭, 이메일 폼, 에러 영역 마크업
- [x] **T-45** `initAuthPage()` — 세션 확인, 이미 로그인 시 index.html 리디렉트
- [x] **T-46** `handleOAuth(provider)` — Google/GitHub signInWithOAuth
- [x] **T-47** `handleEmailSignIn()` — signInWithPassword + 에러 처리
- [x] **T-48** `handleEmailSignUp()` — signUp + 확인 이메일 안내
- [x] **T-49** `switchTab()` — Sign In ↔ Sign Up UI 전환
- [x] **T-50** `getBaseUrl()` — 로컬/GitHub Pages 자동 감지
- [x] **T-51** `supabase-config.js` — 실제 URL/Key 기입 완료

---

## Phase 5. Supabase 수동 설정

- [x] **T-52** Supabase 프로젝트 생성 + URL/Key 확인
- [x] **T-53** SQL 실행 — cards 테이블, ENUM, 인덱스, RLS, 트리거
- [x] **T-54** Google OAuth — Google Cloud Console 앱 생성 + Supabase에 Client ID/Secret 입력
- [x] **T-55** GitHub OAuth — GitHub OAuth Apps 생성 + Supabase에 Client ID/Secret 입력
- [x] **T-56** Supabase → Authentication → URL Configuration
  - Site URL: `https://ksw19627.github.io/vibeCoding_kanban/`
  - Additional Redirect URLs:
    - `https://ksw19627.github.io/vibeCoding_kanban/index.html`
    - `http://localhost:5500/index.html`
    - `http://127.0.0.1:5500/index.html`
    - `http://localhost:3000/index.html`

---

## Phase 6. GitHub Pages 배포

- [ ] **T-57** Repository Settings → Pages → Source: main / root 활성화
- [x] **T-58** 전체 파일 commit & push → GitHub Pages 빌드 확인
- [ ] **T-59** 배포 URL(`https://ksw19627.github.io/vibeCoding_kanban`) 접속 확인

---

## Phase 7. QA 체크리스트

### 인증
- [ ] **Q-01** `index.html` 접속 → `auth.html` 리디렉트 확인
- [ ] **Q-02** Google OAuth 로그인 → 칸반 보드 진입 확인
- [ ] **Q-03** GitHub OAuth 로그인 → 칸반 보드 진입 확인
- [ ] **Q-04** 이메일 회원가입 → 확인 이메일 안내 표시 확인
- [ ] **Q-05** 이메일 로그인 → 칸반 보드 진입 확인
- [ ] **Q-06** 로그아웃 → `auth.html` 리디렉트 확인

### 칸반 기능
- [ ] **Q-07** 카드 추가 → Supabase Table Editor에서 DB 저장 확인
- [ ] **Q-08** 카드 편집 → DB 반영 확인
- [ ] **Q-09** 카드 삭제 → DB 삭제 확인
- [ ] **Q-10** 드래그 → 컬럼 이동 + DB `col` 업데이트 확인
- [ ] **Q-11** Done 드롭 → 컨페티 이펙트 확인
- [ ] **Q-12** 검색어 입력 → 카드 필터링 확인
- [ ] **Q-13** 다크모드 토글 → 새로고침 후 유지 확인
- [ ] **Q-14** 다른 계정 로그인 → 카드 분리 확인 (RLS 검증)
- [ ] **Q-15** 모바일 375px 세로 스택 레이아웃 확인
