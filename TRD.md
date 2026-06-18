# TRD — Technical Requirements Document
## 칸반 보드 (Kanban Board)

---

## 1. 기술 스택

| 레이어 | 기술 | 비고 |
|--------|------|------|
| 마크업 | HTML5 | 시맨틱 태그 사용 (`<header>`, `<main>`, `<section>`) |
| 스타일 | CSS3 | CSS 변수, Flexbox, 미디어쿼리, keyframe 애니메이션 |
| 로직 | Vanilla JS (ES6+) | 모듈 없음, 단일 파일, 클래스 미사용 |
| 저장소 | localStorage | JSON 직렬화/역직렬화 |
| 렌더링 | Canvas 2D API | 컨페티 이펙트 전용 |
| 드래그앤드롭 | HTML5 DnD API | `dragstart`, `dragover`, `drop` 이벤트 |

---

## 2. 파일 구성

```
index.html    — 전체 DOM 골격, 모달, 캔버스 선언
style.css     — 테마 변수, 레이아웃, 컴포넌트, 애니메이션
app.js        — 데이터, 렌더링, 이벤트, 유틸리티 함수
```

---

## 3. index.html 구조

```
<html data-theme="light">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
    <header.header>
      <h1.logo>
      <div.toolbar>
        <div.search-wrap> → <input#search>
        <button#theme-toggle>
    <main.board#board>
      <section.column[data-column="todo"]   #col-todo>
      <section.column[data-column="inprogress"] #col-inprogress>
      <section.column[data-column="done"]   #col-done>
        각 컬럼:
          <div.column-header>
            <span.col-dot>
            <h2>
            <span.badge#badge-{col}>
          <div.card-list#list-{col}>
          <button.add-card-btn[data-column]>
    <div.modal#modal>
      <div.modal-overlay#modal-overlay>
      <div.modal-content>
        <div.modal-header>
          <h3#modal-title>
          <button.modal-close#modal-close>
        <label> + <input#card-title>
        <label> + <textarea#card-desc>
        <div.form-row>
          <div.form-group> → <input#card-due type="date">
          <div.form-group> → <select#card-priority>
        <div.modal-actions>
          <button#cancel-card>
          <button#save-card>
    <canvas#confetti-canvas>
    <script src="app.js">
```

---

## 4. app.js 함수 명세

### 4.1 진입점 및 스토리지

```js
initApp()
  // DOMContentLoaded 후 호출
  // loadFromStorage() → renderAll() → setupDragAndDrop()
  // → setupSearch() → setupTheme() → setupModal()

loadFromStorage() → Card[]
  // localStorage.getItem('kanban-cards')
  // JSON.parse 실패 시 [] 반환

saveToStorage(cards: Card[]) → void
  // JSON.stringify → localStorage.setItem('kanban-cards', ...)
```

### 4.2 렌더링

```js
renderAll() → void
  // 각 컬럼 card-list 비우기
  // cards.filter(c => c.column === col).forEach(renderCard)
  // updateBadges()

renderCard(card: Card) → void
  // DOM 요소 생성
  // dataset.id = card.id
  // draggable = true
  // popIn 애니메이션 class 부여
  // 우선순위에 따른 border-color 적용
  // [편집] [삭제] 버튼 이벤트 연결

updateBadges() → void
  // 각 컬럼별 badge 요소에 count 업데이트
```

### 4.3 카드 CRUD

```js
openModal(column: string, cardId?: string) → void
  // modal-title, 폼 필드 초기화 또는 기존 카드 데이터 채우기
  // modal.classList.remove('hidden')
  // #card-title.focus()

saveCard() → void
  // 제목 유효성 검사 (trim().length > 0)
  // cardId 있으면 수정, 없으면 신규 추가
  // saveToStorage → renderAll → closeModal

deleteCard(id: string) → void
  // confirm() 다이얼로그
  // cards = cards.filter(c => c.id !== id)
  // saveToStorage → renderAll

closeModal() → void
  // modal.classList.add('hidden')
  // 편집 상태 변수 초기화

generateId() → string
  // crypto.randomUUID() 또는 Date.now().toString(36) + Math.random()
```

### 4.4 드래그 앤 드롭

```js
setupDragAndDrop() → void
  // board에 이벤트 위임
  // dragstart, dragover, dragleave, drop 등록

handleDragStart(e: DragEvent) → void
  // e.dataTransfer.setData('text/plain', cardId)
  // 빈 ghost 이미지 설정 (투명 1x1 이미지)
  // 카드에 .dragging 클래스 추가
  // setTimeout으로 실제 카드는 반투명 유지

handleDragOver(e: DragEvent) → void
  // e.preventDefault()
  // 가장 가까운 .column에 .drag-over 추가
  // Y 좌표 기반 삽입 위치 placeholder 표시

handleDragLeave(e: DragEvent) → void
  // 컬럼 .drag-over 제거
  // placeholder 제거

handleDrop(e: DragEvent) → void
  // 드래그된 cardId 추출
  // 대상 column 파악
  // cards 배열에서 해당 카드의 column 업데이트
  // saveToStorage → renderAll
  // 대상이 'done'이면 confetti() 호출
```

### 4.5 컨페티

```js
confetti() → void
  // canvas를 전체 화면(fixed, z-index: 9999)에 배치
  // 100개 파티클 생성 (색상, 위치, 속도, 회전 랜덤)
  // requestAnimationFrame 루프:
  //   각 파티클: y += vy, vy += gravity, x += vx, rotation += dRotation
  //   화면 아래 벗어나면 비활성화
  //   모든 파티클 비활성화 시 canvas 제거
  // 최대 실행 시간: 2초 (성능 보호)
```

### 4.6 검색 / 필터

```js
setupSearch() → void
  // #search input 이벤트 → filterCards(e.target.value)

filterCards(query: string) → void
  // 모든 .card 순회
  // card의 data-title, data-desc에 query 포함 여부 확인
  // 미매칭: opacity 0.25, pointer-events none
  // 매칭: opacity 1, pointer-events auto
  // query 비어있으면 모두 표시
```

### 4.7 테마

```js
setupTheme() → void
  // localStorage.getItem('kanban-theme') 확인
  // 저장값 있으면 document.documentElement.dataset.theme = 저장값
  // #theme-toggle 클릭 이벤트 연결

toggleTheme() → void
  // 현재 theme 반전 ('light' ↔ 'dark')
  // document.documentElement.dataset.theme 업데이트
  // localStorage.setItem('kanban-theme', newTheme)
  // 버튼 아이콘 업데이트 (🌙 / ☀️)
```

---

## 5. CSS 아키텍처

### 5.1 CSS 변수 (토큰)

```css
/* 라이트 테마 기본값 */
:root {
  --bg:       #f0f2f5;
  --col-bg:   #ebecf0;
  --card-bg:  #ffffff;
  --text:     #172b4d;
  --text-sub: #5e6c84;
  --primary:  #0052cc;
  --success:  #00875a;
  --danger:   #de350b;
  --warning:  #ff991f;
  --border:   rgba(0, 0, 0, 0.08);
  --shadow-sm: 0 1px 3px rgba(9, 30, 66, 0.12);
  --shadow-md: 0 4px 12px rgba(9, 30, 66, 0.20);
  --shadow-lg: 0 16px 32px rgba(9, 30, 66, 0.30);
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --transition: 0.2s ease;
}

/* 다크 테마 오버라이드 */
[data-theme="dark"] {
  --bg:       #1a1a2e;
  --col-bg:   #16213e;
  --card-bg:  #0f3460;
  --text:     #e0e0e0;
  --text-sub: #a0a8b8;
  --primary:  #6fa3ef;
  --border:   rgba(255, 255, 255, 0.08);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.30);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.45);
  --shadow-lg: 0 16px 32px rgba(0, 0, 0, 0.60);
}
```

### 5.2 레이아웃 구조

```
body
└── .header (flex, space-between)
    ├── .header-left → h1.logo
    └── .toolbar → .search-wrap + #theme-toggle

.board (flex, gap:16px, overflow-x:auto)
└── .column × 3 (flex:1, min-width:280px, max-width:360px)
    ├── .column-header (flex, align-center)
    ├── .card-list (flex-col, gap:8px, min-height:100px)
    │   └── .card × N
    └── .add-card-btn (full width)

.modal (fixed, inset:0, z-index:1000)
├── .modal-overlay (absolute, backdrop)
└── .modal-content (relative, z-index:1001)
```

### 5.3 반응형 브레이크포인트

| 너비 | 레이아웃 |
|------|----------|
| ≥ 769px | 3열 가로 배치 |
| ≤ 768px | 1열 세로 스택 |

---

## 6. 애니메이션 명세

| 이름 | keyframe | 용도 |
|------|----------|------|
| `popIn` | scale 0.6→1.05→1 | 카드 신규 생성 |
| `pulse` | bg color 진동 | 드래그 오버 컬럼 |
| `fadeSlideUp` | opacity+translateY | 모달 열기 |
| `spin` | rotate 0→360 | 컨페티 파티클 |

---

## 7. 이벤트 위임 전략

이벤트를 각 카드에 직접 붙이지 않고 상위 컨테이너에 위임하여 렌더링 후에도 정상 동작:

| 이벤트 | 위임 대상 | 처리 |
|--------|-----------|------|
| `click .add-card-btn` | `.board` | openModal(column) |
| `click .card-edit-btn` | `.board` | openModal(column, id) |
| `click .card-del-btn` | `.board` | deleteCard(id) |
| `dragstart` | `.board` | handleDragStart |
| `dragover` | `.board` | handleDragOver |
| `dragleave` | `.board` | handleDragLeave |
| `drop` | `.board` | handleDrop |

---

## 8. 브라우저 API 의존성

| API | 용도 | 폴백 |
|-----|------|------|
| `localStorage` | 카드 영속성 | 없음 (필수) |
| `crypto.randomUUID()` | 카드 ID 생성 | `Date.now().toString(36)` |
| `HTMLCanvasElement` / Canvas 2D | 컨페티 | 없음 (기능 생략) |
| HTML5 Drag and Drop API | 카드 이동 | 없음 (필수) |
| CSS Custom Properties | 테마 시스템 | 없음 (필수) |
