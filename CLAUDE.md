# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 프로젝트 개요

순수 HTML5 / CSS3 / Vanilla JS로 구현하는 반응형 칸반 보드. 외부 라이브러리 없음. 서버 불필요, `index.html`을 브라우저에서 직접 열어 동작한다.

---

## 작업 범위

- **이 디렉토리만 작업 대상**으로 한다. 상위 폴더(`day03/`, `ksw19627/` 등)는 읽거나 수정하지 않는다.

---

## 파일 구성

| 파일 | 역할 |
|------|------|
| `index.html` | 전체 DOM 골격 — 헤더, 3개 컬럼, 모달, 컨페티 캔버스 |
| `style.css` | CSS 변수 기반 테마, 레이아웃(Flexbox), 컴포넌트, 애니메이션 |
| `app.js` | 카드 CRUD, localStorage, 드래그앤드롭, 검색/필터, 컨페티, 테마 토글 |

설계 문서 (`*.md`) 는 구현 레퍼런스이며 수정 대상이 아니다 (TASKS.md의 체크박스 업데이트는 예외).

---

## 아키텍처 핵심

### 데이터 흐름

```
사용자 액션
  → app.js 함수 호출 (CRUD)
  → cards 배열 갱신
  → saveToStorage()  [localStorage]
  → renderAll()      [DOM 재생성]
  → updateBadges()
```

`cards` 배열이 단일 진실의 원천(single source of truth). 렌더링은 항상 배열 전체를 기반으로 재생성한다.

### 이벤트 위임

카드에 이벤트를 직접 붙이지 않는다. `#board` 하나에서 모든 카드 이벤트(클릭, 드래그)를 위임 처리한다.

### 테마 시스템

`document.documentElement.dataset.theme = 'dark' | 'light'` 한 줄로 전환. CSS 변수 오버라이드로 모든 컴포넌트가 자동 반영된다.

### localStorage 키

| 키 | 내용 |
|----|------|
| `kanban-cards` | 카드 배열 (JSON) |
| `kanban-theme` | `'light'` 또는 `'dark'` |

### Card 객체 구조

```js
{
  id:        string,   // UUID v4
  title:     string,   // 1~60자
  desc:      string,
  due:       string,   // 'YYYY-MM-DD' 또는 ''
  priority:  'high' | 'mid' | 'low',
  column:    'todo' | 'inprogress' | 'done',
  order:     number,
  createdAt: string,
  updatedAt: string,
}
```

---

## 실행 방법

```bash
# 서버 필요 없음 — 파일 직접 열기
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

---

## 검증 방법

Playwright는 사용하지 않는다. 브라우저에서 `index.html`을 직접 열어 수동으로 확인한다.

**체크리스트 (TASKS.md Phase 4 참고):**

- 카드 추가 → 새로고침 후 유지
- 드래그 → 컬럼 이동
- Done 드롭 → 컨페티 이펙트
- 검색어 입력 → 실시간 필터링
- 다크모드 토글 → 새로고침 후 유지
- 모바일 375px → 세로 스택 레이아웃

---

## Git 규칙

- 브랜치 병합은 항상 **merge** 사용
- **rebase 금지**

---

## 코딩 컨벤션

- JS: ES6+, 클래스 미사용, 함수형으로 작성
- CSS: 값을 하드코딩하지 않고 반드시 CSS 변수 사용
- 한국어 주석 허용
- `column` 은 SQL 예약어이므로 DB 컬럼명은 `col` 사용 (DatabaseDesign.md 참고)
