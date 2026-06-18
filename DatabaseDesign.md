# Database Design — 칸반 보드

> **현재 구현**: 서버 없이 브라우저 `localStorage`를 단일 저장소로 사용.  
> **향후 계획**: MySQL 또는 PostgreSQL 연동을 전제로 스키마를 설계하며, localStorage 단계에서도 동일한 데이터 구조를 유지한다.

---

## 1. 데이터 스토어 로드맵

| 단계 | 저장소 | 비고 |
|------|--------|------|
| **현재 (v1)** | `localStorage` (JSON) | 서버 불필요, 브라우저 전용 |
| **v2 계획** | REST API + MySQL / PostgreSQL | 서버 사이드 영속성, 멀티 사용자 |
| **v3 계획** | 실시간 동기화 (WebSocket) | 협업 기능 |

---

## 2. 논리적 데이터 모델

### 2.1 엔티티 목록

| 엔티티 | 설명 |
|--------|------|
| `users` | 사용자 계정 (v2 예정) |
| `boards` | 칸반 보드 단위 (v2 예정) |
| `columns` | 보드 내 컬럼 (`todo`, `inprogress`, `done`) |
| `cards` | 칸반 카드 — 현재 핵심 엔티티 |

### 2.2 ERD (텍스트)

```
users (v2)
  │ 1
  │
  ▼ N
boards (v2)
  │ 1
  │
  ▼ N
columns ──(1)──────────(N)── cards
```

---

## 3. Card 스키마 (공통)

현재 localStorage와 미래 RDB 모두 동일한 논리 구조를 사용한다.

### 3.1 타입 정의

```ts
type Priority = 'high' | 'mid' | 'low';
type Column   = 'todo' | 'inprogress' | 'done';

interface Card {
  id:        string;   // PK — UUID v4
  title:     string;   // 1~60자, NOT NULL
  desc:      string;   // 설명, 빈 문자열 허용
  due:       string;   // 마감일 ISO 8601 'YYYY-MM-DD', 없으면 ''
  priority:  Priority; // 우선순위
  column:    Column;   // 속한 컬럼
  order:     number;   // 컬럼 내 정렬 순서 (0-based)
  createdAt: string;   // ISO 8601 datetime
  updatedAt: string;   // ISO 8601 datetime
}
```

### 3.2 필드 상세

| 필드 | 타입 | 제약 | 기본값 |
|------|------|------|--------|
| `id` | string (UUID) | PK, 고유, NOT NULL | `crypto.randomUUID()` |
| `title` | string | 1~60자, NOT NULL | — |
| `desc` | string | 선택, 빈 문자열 허용 | `''` |
| `due` | string | `'YYYY-MM-DD'` 또는 `''` | `''` |
| `priority` | enum | `high`/`mid`/`low`, NOT NULL | `'mid'` |
| `column` | enum | `todo`/`inprogress`/`done`, NOT NULL | 버튼 클릭 컬럼 |
| `order` | number (int) | ≥ 0, NOT NULL | 컬럼 내 마지막 + 1 |
| `createdAt` | string (datetime) | NOT NULL | `new Date().toISOString()` |
| `updatedAt` | string (datetime) | NOT NULL | `new Date().toISOString()` |

---

## 4. RDB 스키마 (MySQL / PostgreSQL)

향후 백엔드 연동 시 아래 DDL을 기준으로 테이블을 생성한다.

### 4.1 MySQL DDL

```sql
-- 데이터베이스
CREATE DATABASE IF NOT EXISTS kanban
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE kanban;

-- cards 테이블
CREATE TABLE cards (
  id          CHAR(36)        NOT NULL,                  -- UUID v4
  title       VARCHAR(60)     NOT NULL,
  `desc`      TEXT            NOT NULL DEFAULT '',
  due         DATE            NULL,                       -- NULL = 마감일 없음
  priority    ENUM('high','mid','low') NOT NULL DEFAULT 'mid',
  col         ENUM('todo','inprogress','done') NOT NULL DEFAULT 'todo',
  `order`     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_col_order (col, `order`)   -- 컬럼별 정렬 조회 최적화
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> **컬럼명 주의**: `desc`, `order`, `column`은 SQL 예약어이므로 백틱 또는 별칭 사용.  
> 실제 컬럼명은 `col`로 정의하고 애플리케이션 레이어에서 매핑한다.

---

### 4.2 PostgreSQL DDL

```sql
-- ENUM 타입 정의
CREATE TYPE priority_enum AS ENUM ('high', 'mid', 'low');
CREATE TYPE column_enum   AS ENUM ('todo', 'inprogress', 'done');

-- cards 테이블
CREATE TABLE cards (
  id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(60)     NOT NULL,
  description TEXT            NOT NULL DEFAULT '',
  due_date    DATE            NULL,
  priority    priority_enum   NOT NULL DEFAULT 'mid',
  col         column_enum     NOT NULL DEFAULT 'todo',
  sort_order  SMALLINT        NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 컬럼별 정렬 조회 인덱스
CREATE INDEX idx_cards_col_order ON cards (col, sort_order);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

### 4.3 v2 확장 스키마 (users, boards, columns)

```sql
-- 사용자 (v2)
CREATE TABLE users (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 보드 (v2)
CREATE TABLE boards (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 컬럼 (v2 — 현재 고정 3개, 향후 커스터마이징 가능)
CREATE TABLE columns (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id    UUID         NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title       VARCHAR(60)  NOT NULL,
  sort_order  SMALLINT     NOT NULL DEFAULT 0,
  color       CHAR(7)      NOT NULL DEFAULT '#ebecf0',  -- hex
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- cards v2 — column_id FK 추가
ALTER TABLE cards
  ADD COLUMN board_id  UUID REFERENCES boards(id)  ON DELETE CASCADE,
  ADD COLUMN col_id    UUID REFERENCES columns(id) ON DELETE CASCADE;
```

---

## 5. localStorage 저장 형태 (현재 v1)

### 5.1 kanban-cards

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "디자인 시안 작성",
    "desc": "메인 랜딩 페이지 UI 시안 3가지 제출",
    "due": "2026-06-20",
    "priority": "high",
    "column": "todo",
    "order": 0,
    "createdAt": "2026-06-18T09:00:00.000Z",
    "updatedAt": "2026-06-18T09:00:00.000Z"
  }
]
```

### 5.2 kanban-theme

```
"dark"
```

---

## 6. CRUD 연산 명세

### 6.1 카드 생성 (Create)

```js
function createCard(data, column) {
  const card = {
    id:        crypto.randomUUID(),
    title:     data.title.trim(),
    desc:      data.desc.trim(),
    due:       data.due,
    priority:  data.priority,
    column,
    order:     cards.filter(c => c.column === column).length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  cards.push(card);
  saveToStorage(cards);
  return card;
}
```

**RDB 대응 SQL:**
```sql
INSERT INTO cards (id, title, description, due_date, priority, col, sort_order)
VALUES ($1, $2, $3, $4, $5, $6, $7);
```

---

### 6.2 카드 조회 (Read)

```js
// 컬럼별 조회 (order 오름차순)
function getCardsByColumn(column) {
  return cards
    .filter(c => c.column === column)
    .sort((a, b) => a.order - b.order);
}
```

**RDB 대응 SQL:**
```sql
SELECT * FROM cards WHERE col = $1 ORDER BY sort_order ASC;
```

---

### 6.3 카드 수정 (Update)

```js
function updateCard(id, patch) {
  const idx = cards.findIndex(c => c.id === id);
  if (idx === -1) return;
  cards[idx] = { ...cards[idx], ...patch, updatedAt: new Date().toISOString() };
  saveToStorage(cards);
}
```

**RDB 대응 SQL:**
```sql
UPDATE cards
SET title=$2, description=$3, due_date=$4, priority=$5, updated_at=NOW()
WHERE id = $1;
```

---

### 6.4 카드 이동 (Move)

```js
function moveCard(id, targetColumn, targetOrder) {
  updateCard(id, { column: targetColumn, order: targetOrder });
  reorderColumn(targetColumn);
}
```

**RDB 대응 SQL (트랜잭션):**
```sql
BEGIN;
UPDATE cards SET col = $2, sort_order = $3, updated_at = NOW() WHERE id = $1;
-- 같은 컬럼 내 순서 재정렬
UPDATE cards
SET sort_order = sort_order + 1
WHERE col = $2 AND sort_order >= $3 AND id != $1;
COMMIT;
```

---

### 6.5 카드 삭제 (Delete)

```js
function deleteCard(id) {
  const card = getCardById(id);
  cards = cards.filter(c => c.id !== id);
  reorderColumn(card.column);
  saveToStorage(cards);
}
```

**RDB 대응 SQL:**
```sql
DELETE FROM cards WHERE id = $1;
```

---

## 7. 스토리지 입출력 (v1)

```js
const STORAGE_KEY = 'kanban-cards';
const THEME_KEY   = 'kanban-theme';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? migrateIfNeeded(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function saveToStorage(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}
```

---

## 8. 데이터 마이그레이션 전략

### 8.1 localStorage → RDB 마이그레이션

v1(localStorage)에서 v2(RDB)로 전환 시:

```js
async function migrateToServer(apiBaseUrl) {
  const cards = loadFromStorage();
  // 서버에 일괄 전송
  await fetch(`${apiBaseUrl}/cards/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cards),
  });
  // 마이그레이션 완료 플래그 저장
  localStorage.setItem('kanban-migrated', 'true');
}
```

### 8.2 스키마 버전 호환성

구버전 localStorage 데이터 보완 (신규 필드 없을 때):

```js
function migrateIfNeeded(cards) {
  return cards.map(card => ({
    order:     card.order     ?? 0,
    createdAt: card.createdAt ?? new Date().toISOString(),
    updatedAt: card.updatedAt ?? new Date().toISOString(),
    ...card,
  }));
}
```

---

## 9. 인덱스 전략 (RDB)

| 인덱스 | 대상 컬럼 | 목적 |
|--------|-----------|------|
| PRIMARY KEY | `id` | 단건 조회/수정/삭제 |
| `idx_cards_col_order` | `(col, sort_order)` | 컬럼별 정렬 조회 |
| `idx_cards_board` (v2) | `board_id` | 보드별 전체 카드 조회 |

---

## 10. 네이밍 컨벤션 매핑

JavaScript camelCase ↔ DB snake_case 변환:

| JS (camelCase) | DB (snake_case) |
|----------------|-----------------|
| `id` | `id` |
| `desc` | `description` |
| `due` | `due_date` |
| `column` | `col` |
| `order` | `sort_order` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
