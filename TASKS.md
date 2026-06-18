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

- [ ] **T-01** `<html data-theme="light">` 루트 및 기본 메타 태그 작성
- [ ] **T-02** `<header>` — 로고, 검색창, 테마 토글 버튼
- [ ] **T-03** `<main class="board">` — 3개 컬럼 섹션 (`todo`, `inprogress`, `done`)
- [ ] **T-04** 각 컬럼 내부 — 헤더(도트 + 제목 + 뱃지), 카드 리스트 영역, 카드 추가 버튼
- [ ] **T-05** 카드 추가/편집 모달 — 폼 필드 (제목, 설명, 마감일, 우선순위), 저장/취소 버튼
- [ ] **T-06** `<canvas id="confetti-canvas">` 선언
- [ ] **T-07** `aria-*` 접근성 속성 — 모달 role, aria-modal, aria-labelledby

---

## Phase 2. CSS 스타일 (`style.css`)

### 2-1. 토큰 & 리셋
- [ ] **T-08** CSS 변수 라이트 테마 정의 (`--bg`, `--col-bg`, `--card-bg`, `--text`, `--primary` 등)
- [ ] **T-09** CSS 변수 다크 테마 오버라이드 (`[data-theme="dark"]`)
- [ ] **T-10** 박스 리셋 (`*, *::before, *::after { box-sizing: border-box; margin: 0; }`)

### 2-2. 레이아웃
- [ ] **T-11** `body` 전체 배경, 폰트 스택
- [ ] **T-12** `.header` — flex, space-between, 스티키 포지션, 그림자
- [ ] **T-13** `.toolbar` — flex, gap, 검색창 스타일
- [ ] **T-14** `.board` — flex, gap:16px, padding, overflow-x:auto
- [ ] **T-15** `.column` — flex-col, min/max-width, border-radius, background

### 2-3. 컴포넌트
- [ ] **T-16** `.column-header` — flex, align-center, gap, 컬럼 도트 색상
- [ ] **T-17** `.badge` — 작은 pill 형태, 배경/텍스트 색상
- [ ] **T-18** `.card` — border-radius, padding, shadow, cursor:grab, border-left 우선순위 색상
- [ ] **T-19** `.card:hover` — translateY(-2px), shadow 강화
- [ ] **T-20** `.card.dragging` — opacity, rotate(3deg) scale(1.05), shadow-lg
- [ ] **T-21** `.column.drag-over` — outline dashed, pulse 애니메이션
- [ ] **T-22** `.card .card-meta` — 우선순위 뱃지 + 마감일 flex 배치
- [ ] **T-23** `.card .card-actions` — 편집/삭제 버튼 호버 시 표시
- [ ] **T-24** `.add-card-btn` — 전폭, 점선 테두리, 호버 배경
- [ ] **T-25** `.modal` / `.modal-overlay` / `.modal-content` — 포지션, 딤, 페이드 등
- [ ] **T-26** `.btn-primary`, `.btn-secondary`, `.btn-danger` 버튼 변형
- [ ] **T-27** 폼 요소 스타일 — input, textarea, select, label

### 2-4. 애니메이션
- [ ] **T-28** `@keyframes popIn` — 카드 생성 스프링 효과
- [ ] **T-29** `@keyframes pulse` — 컬럼 드래그 오버 배경 진동
- [ ] **T-30** `@keyframes fadeSlideUp` — 모달 열기 효과

### 2-5. 반응형
- [ ] **T-31** `@media (max-width: 768px)` — 보드 flex-direction:column, 컬럼 full-width

---

## Phase 3. JavaScript 로직 (`app.js`)

### 3-1. 데이터 & 스토리지
- [ ] **T-32** 전역 변수 — `cards`, `dragId`, `editingCardId` 선언
- [ ] **T-33** `loadFromStorage()` — localStorage 파싱, 오류 시 빈 배열
- [ ] **T-34** `saveToStorage()` — JSON.stringify → localStorage
- [ ] **T-35** `generateId()` — crypto.randomUUID() + 폴백
- [ ] **T-36** `migrateIfNeeded()` — 구버전 데이터 필드 보완

### 3-2. 렌더링
- [ ] **T-37** `renderAll()` — 각 컬럼 card-list 비우고 재렌더
- [ ] **T-38** `renderCard(card)` — 카드 DOM 생성, data-id, draggable, 우선순위 border, popIn
- [ ] **T-39** `updateBadges()` — 컬럼별 카드 수 badge 업데이트
- [ ] **T-40** 카드 내 마감일 표시 — 오늘 이전이면 빨간색 강조

### 3-3. 모달
- [ ] **T-41** `openModal(column, cardId?)` — 폼 채우기, 모달 표시, 포커스
- [ ] **T-42** `closeModal()` — 모달 숨기기, 편집 상태 초기화
- [ ] **T-43** `saveCard()` — 유효성 검사, 신규/수정 분기, 저장, 재렌더
- [ ] **T-44** 모달 닫기 이벤트 — 취소 버튼, 오버레이 클릭, Esc 키

### 3-4. 드래그 앤 드롭
- [ ] **T-45** `setupDragAndDrop()` — board에 이벤트 위임 등록
- [ ] **T-46** `handleDragStart()` — dragId 저장, 빈 ghost 이미지, .dragging 클래스
- [ ] **T-47** `handleDragOver()` — e.preventDefault(), .drag-over 클래스 토글
- [ ] **T-48** `handleDragLeave()` — .drag-over 클래스 제거
- [ ] **T-49** `handleDrop()` — column 이동, order 재정렬, 저장, 재렌더
- [ ] **T-50** Done 드롭 감지 → `confetti()` 호출
- [ ] **T-51** 드래그 종료 `dragend` — .dragging 클래스 제거, 초기화

### 3-5. 컨페티
- [ ] **T-52** `confetti()` — 캔버스 full-screen 배치, 파티클 100개 생성
- [ ] **T-53** RAF 루프 — 중력 적용, 회전, 화면 이탈 시 비활성화
- [ ] **T-54** 2초 후 또는 모든 파티클 완료 시 canvas 제거

### 3-6. 검색
- [ ] **T-55** `setupSearch()` — #search input 이벤트 등록
- [ ] **T-56** `filterCards(query)` — 제목/설명 매칭, 미매칭 opacity 0.25

### 3-7. 테마
- [ ] **T-57** `setupTheme()` — localStorage 저장값 복원, 버튼 아이콘 동기화
- [ ] **T-58** `toggleTheme()` — light ↔ dark, localStorage 저장, 버튼 아이콘 변경

### 3-8. 삭제
- [ ] **T-59** `deleteCard(id)` — confirm 다이얼로그, 제거, 재정렬, 저장, 재렌더

### 3-9. 진입점
- [ ] **T-60** `initApp()` — DOMContentLoaded 후 모든 init 함수 순서대로 호출

---

## Phase 4. QA 체크리스트

- [ ] **Q-01** 카드 추가 → 새로고침 → 카드 유지 확인
- [ ] **Q-02** 카드 편집 → 저장 → 변경내용 반영 확인
- [ ] **Q-03** 카드 삭제 → 취소 → 유지 / 확인 → 제거 확인
- [ ] **Q-04** 드래그 → todo→inprogress 이동 확인
- [ ] **Q-05** 드래그 → inprogress→done 이동 → 컨페티 확인
- [ ] **Q-06** 검색어 입력 → 미매칭 카드 희미해짐 확인
- [ ] **Q-07** 검색어 지우기 → 전체 카드 정상 표시 확인
- [ ] **Q-08** 다크모드 토글 → 새로고침 → 다크모드 유지 확인
- [ ] **Q-09** 모바일 375px에서 세로 스택 레이아웃 확인
- [ ] **Q-10** Esc 키로 모달 닫기 확인
- [ ] **Q-11** 제목 없이 저장 시 에러 표시 확인
- [ ] **Q-12** 컬럼 뱃지 수가 카드 추가/삭제 시 실시간 업데이트 확인
