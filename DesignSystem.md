# Design System — 칸반 보드

---

## 1. 디자인 철학

- **클린 라이트**: 밝고 깔끔한 기본 테마, 불필요한 장식 배제
- **정보 계층**: 우선순위 → 제목 → 메타 정보 순으로 시각적 무게감 설계
- **다이나믹 피드백**: 사용자 액션에 즉각적인 물리 기반 반응 제공
- **테마 유연성**: 라이트/다크 전환 시 모든 컴포넌트가 CSS 변수 하나로 일관 적용

---

## 2. 색상 시스템

### 2.1 토큰 (CSS Custom Properties)

```css
/* ───── Light Theme ───── */
:root {
  /* 배경 */
  --bg:        #f0f2f5;   /* 앱 전체 배경 */
  --col-bg:    #ebecf0;   /* 컬럼 배경 */
  --card-bg:   #ffffff;   /* 카드 배경 */

  /* 텍스트 */
  --text:      #172b4d;   /* 본문 / 제목 */
  --text-sub:  #5e6c84;   /* 보조 텍스트 (마감일, 설명 미리보기) */
  --text-inv:  #ffffff;   /* 반전 텍스트 (버튼 위) */

  /* 브랜드 */
  --primary:   #0052cc;   /* 주 강조 (버튼, 링크, 포커스) */
  --primary-h: #0747a6;   /* 호버 상태 */

  /* 시맨틱 */
  --success:   #00875a;   /* Done 컬럼 도트, Low 우선순위 */
  --warning:   #ff991f;   /* Mid 우선순위 */
  --danger:    #de350b;   /* High 우선순위, 삭제 버튼 */
  --danger-h:  #bf2600;   /* 삭제 버튼 호버 */

  /* 보더 / 그림자 */
  --border:     rgba(9, 30, 66, 0.08);
  --shadow-sm:  0 1px 3px rgba(9, 30, 66, 0.12);
  --shadow-md:  0 4px 12px rgba(9, 30, 66, 0.20);
  --shadow-lg:  0 16px 32px rgba(9, 30, 66, 0.30);
}

/* ───── Dark Theme ───── */
[data-theme="dark"] {
  --bg:        #1a1a2e;
  --col-bg:    #16213e;
  --card-bg:   #0f3460;
  --text:      #e0e0e0;
  --text-sub:  #a0a8b8;
  --text-inv:  #172b4d;
  --primary:   #6fa3ef;
  --primary-h: #93bcf4;
  --border:     rgba(255, 255, 255, 0.08);
  --shadow-sm:  0 1px 3px rgba(0, 0, 0, 0.30);
  --shadow-md:  0 4px 12px rgba(0, 0, 0, 0.45);
  --shadow-lg:  0 16px 32px rgba(0, 0, 0, 0.60);
}
```

### 2.2 우선순위 색상

| 우선순위 | 컬러 | CSS 변수 | 카드 좌측 보더 |
|---------|------|----------|----------------|
| High | 🔴 `#de350b` | `--danger` | 4px solid |
| Mid | 🟡 `#ff991f` | `--warning` | 4px solid |
| Low | 🟢 `#00875a` | `--success` | 4px solid |

### 2.3 컬럼 아이덴티티

| 컬럼 | 도트 색 | 의미 |
|------|---------|------|
| TO-DO | `#0052cc` (primary) | 예정 |
| In Progress | `#ff991f` (warning) | 진행 중 |
| Done | `#00875a` (success) | 완료 |

---

## 3. 타이포그래피

| 요소 | 폰트 | 크기 | 굵기 | 색상 |
|------|------|------|------|------|
| 앱 로고 | 시스템 산세리프 | 20px | 700 | `--text` |
| 컬럼 제목 | 시스템 산세리프 | 14px | 600 | `--text` |
| 카드 제목 | 시스템 산세리프 | 14px | 600 | `--text` |
| 카드 설명 | 시스템 산세리프 | 12px | 400 | `--text-sub` |
| 마감일 | 시스템 산세리프 | 11px | 400 | `--text-sub` |
| 뱃지 | 시스템 산세리프 | 11px | 700 | `--primary` |
| 버튼 | 시스템 산세리프 | 13px | 500 | — |

폰트 스택: `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`

---

## 4. 간격 시스템

| 토큰 | 값 | 용도 |
|------|----|----|
| `--space-xs` | 4px | 인라인 요소 간 최소 간격 |
| `--space-sm` | 8px | 카드 간 gap, 패딩 소형 |
| `--space-md` | 16px | 컬럼 간 gap, 컬럼 패딩 |
| `--space-lg` | 24px | 섹션 간 간격 |

---

## 5. 테두리 반경 (Border Radius)

| 토큰 | 값 | 용도 |
|------|----|------|
| `--radius-sm` | 4px | 뱃지, 입력창 |
| `--radius-md` | 8px | 카드, 버튼, 모달 |
| `--radius-lg` | 12px | 컬럼 |
| `--radius-full` | 9999px | 도트, 원형 버튼 |

---

## 6. 컴포넌트 명세

### 6.1 Card

```
┌─────────────────────────────────────┐
│ ◀4px border (우선순위 색)             │
│                                     │
│  🔴 High          📅 2026-06-20     │
│  디자인 시안 작성                      │
│  메인 랜딩 페이지 UI 시안 3가지 제출    │
│                                     │
│  [편집]  [삭제]                       │
└─────────────────────────────────────┘
```

**상태별 스타일:**

| 상태 | 스타일 |
|------|--------|
| 기본 | `box-shadow: var(--shadow-sm)` |
| 호버 | `box-shadow: var(--shadow-md)`, `translateY(-2px)` |
| 드래그 중 | `opacity: 0.5`, `rotate(3deg) scale(1.05)`, `box-shadow: var(--shadow-lg)` |
| 신규 생성 | `animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)` |
| 검색 미매칭 | `opacity: 0.25`, `pointer-events: none` |

### 6.2 Column

```
┌──────────────────────────────────────┐  ← border-radius: 12px
│ ● TO-DO                           [3] │  ← column-header
├──────────────────────────────────────┤
│  [Card]                               │
│  [Card]                               │  ← card-list (min-height: 100px)
│  [Card]                               │
│                                       │
│  [+ 카드 추가]                         │  ← add-card-btn
└──────────────────────────────────────┘
```

**드래그 오버 상태:**
```css
.column.drag-over {
  outline: 2px dashed var(--primary);
  animation: pulse 0.8s ease infinite;
}
```

### 6.3 Badge (카드 수)

```css
.badge {
  background: rgba(0, 82, 204, 0.1);
  color: var(--primary);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  min-width: 20px;
  text-align: center;
}
```

### 6.4 Modal

```
┌─────────────── 오버레이 (dim) ───────────────────┐
│                                                  │
│   ┌────────── modal-content ───────────────┐    │
│   │ 카드 추가                          [×] │    │
│   ├─────────────────────────────────────┤    │
│   │ 제목 *                              │    │
│   │ [입력창]                             │    │
│   │                                     │    │
│   │ 설명                                 │    │
│   │ [텍스트에리어]                        │    │
│   │                                     │    │
│   │ 마감일          우선순위              │    │
│   │ [날짜 입력]     [셀렉트]             │    │
│   │                                     │    │
│   │            [취소]  [저장]            │    │
│   └─────────────────────────────────────┘    │
│                                                  │
└──────────────────────────────────────────────────┘
```

**모달 열기 애니메이션:**
```css
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.modal-content { animation: fadeSlideUp 0.25s ease; }
```

### 6.5 Button 변형

| 변형 | 배경 | 텍스트 | 용도 |
|------|------|--------|------|
| `.btn-primary` | `--primary` | `--text-inv` | 저장 |
| `.btn-secondary` | transparent | `--text-sub` | 취소 |
| `.btn-danger` | `--danger` | `--text-inv` | 삭제 |
| `.add-card-btn` | transparent | `--text-sub` | 카드 추가 |
| `.icon-btn` | transparent | `--text` | 테마 토글 |

### 6.6 Header

```
┌─────────────────────────────────────────────────────────┐
│  Kanban Board        [🔍 카드 검색...]         [🌙]     │
└─────────────────────────────────────────────────────────┘
```

---

## 7. 애니메이션 명세

### 7.1 카드 팝인

```css
@keyframes popIn {
  0%   { opacity: 0; transform: scale(0.6); }
  80%  { transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
}
/* timing: cubic-bezier(0.34, 1.56, 0.64, 1) — 스프링 느낌 */
/* duration: 0.3s */
```

### 7.2 컬럼 펄스 (드래그 오버)

```css
@keyframes pulse {
  0%, 100% { background: var(--col-bg); }
  50%       { background: rgba(0, 82, 204, 0.08); }
}
/* duration: 0.8s, iteration: infinite */
```

### 7.3 모달 페이드슬라이드업

```css
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
/* duration: 0.25s, easing: ease */
```

### 7.4 컨페티 이펙트 (Canvas)

- **파티클 수**: 100개
- **색상 풀**: `['#0052cc', '#00875a', '#ff991f', '#de350b', '#6554c0', '#00b8d9']`
- **초기 속도**: x ±5, y -8 ~ -15 (위쪽)
- **중력**: 0.3px/frame
- **회전**: ±5°/frame
- **지속 시간**: 최대 2초 (120 프레임)
- **완료 후**: canvas 제거

---

## 8. 반응형 브레이크포인트

```css
/* 모바일 퍼스트 */
.board { flex-direction: column; }

@media (min-width: 769px) {
  .board { flex-direction: row; }
  .column { min-width: 280px; max-width: 360px; }
}
```

| 브레이크포인트 | 레이아웃 |
|----------------|----------|
| < 769px | 1열 세로 스택, 컬럼 full-width |
| ≥ 769px | 3열 가로 flex, 컬럼 min 280 / max 360 |

---

## 9. 접근성

| 요소 | 처리 |
|------|------|
| 모달 | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |
| 닫기 버튼 | `aria-label="닫기"` |
| 폼 레이블 | `<label for="">` 연결 필수 |
| Esc 키 | 모달 닫기 |
| 포커스 트랩 | 모달 열릴 때 제목 입력창 자동 포커스 |
| 색상 대비 | 라이트 테마 기준 WCAG AA 이상 |
