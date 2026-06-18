# Database Design — 칸반 보드

> 단계별 데이터 저장 전략을 정의한다.  
> **현재(v0)**: 순수 localStorage (백엔드 없음).  
> **v2**: Supabase PostgreSQL 연동 (이전 구현).  
> **v3(향후)**: 자체 MySQL 또는 PostgreSQL 호스팅.

---

## 1. 버전별 스토리지 구성

| 버전 | 저장소 | 비고 |
|------|--------|------|
| **v0 (현재)** | `localStorage` | 브라우저 단일 사용자, 서버 없음 |
| v2 | Supabase PostgreSQL + Auth | 멀티유저, RLS 기반 격리 |
| v3 (향후) | 자체 MySQL 또는 PostgreSQL | 독립 백엔드 + JWT 인증 |

---

## 2. v0 — localStorage 스키마 (현재 구현)

### 2.1 localStorage 키

| 키 | 내용 |
|----|------|
| `kanban-cards` | `Card[]` JSON 배열 |
| `kanban-theme` | `'light'` 또는 `'dark'` |

### 2.2 Card 타입

```ts
type Priority = 'high' | 'mid' | 'low';
type Column   = 'todo' | 'inprogress' | 'done';

interface Card {
  id:        string;    // crypto.randomUUID() 또는 Date.now() 기반
  title:     string;    // 1~60자
  desc:      string;    // 설명 (빈 문자열 허용)
  due:       string;    // 'YYYY-MM-DD' 또는 ''
  priority:  Priority;
  column:    Column;
  order:     number;    // 컬럼 내 정렬 순서 (0-based)
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
}
```

### 2.3 CRUD 패턴

```js
// 조회
const cards = JSON.parse(localStorage.getItem('kanban-cards') ?? '[]');

// 저장
localStorage.setItem('kanban-cards', JSON.stringify(cards));

// 생성
const newCard = { id: crypto.randomUUID(), ...fields, order: colCards.length };
cards.push(newCard);

// 수정
const idx = cards.findIndex(c => c.id === id);
cards[idx] = { ...cards[idx], ...patch, updatedAt: new Date().toISOString() };

// 삭제
cards.splice(cards.findIndex(c => c.id === id), 1);

// 순서 재정렬 (드래그앤드롭 후)
cards.filter(c => c.column === col).forEach((c, i) => { c.order = i; });
```

---

## 3. v2 — Supabase PostgreSQL (이전 구현)

### 3.1 스토리지 구성

| 저장소 | 키 / 테이블 | 내용 |
|--------|-------------|------|
| Supabase Auth | `auth.users` | 사용자 계정 (Supabase 자동 관리) |
| Supabase DB | `public.cards` | 카드 데이터 (user_id 포함) |
| localStorage | `kanban-theme` | `'light'` 또는 `'dark'` (클라이언트 전용) |

### 3.2 논리 ERD

```
auth.users (Supabase 관리)
  id (UUID, PK)
  email
    │ 1
    ▼ N
public.cards
  id (UUID, PK)
  user_id (UUID, FK → auth.users.id)
  title
  description
  due_date
  priority
  col
  sort_order
  created_at
  updated_at
```

### 3.3 DDL — Supabase (PostgreSQL)

```sql
-- 1. ENUM 타입
CREATE TYPE priority_enum AS ENUM ('high', 'mid', 'low');
CREATE TYPE column_enum   AS ENUM ('todo', 'inprogress', 'done');

-- 2. 테이블
CREATE TABLE public.cards (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       VARCHAR(60)   NOT NULL,
  description TEXT          NOT NULL DEFAULT '',
  due_date    DATE          NULL,
  priority    priority_enum NOT NULL DEFAULT 'mid',
  col         column_enum   NOT NULL DEFAULT 'todo',
  sort_order  SMALLINT      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 3. 인덱스
CREATE INDEX idx_cards_user_col ON public.cards (user_id, col, sort_order);

-- 4. RLS
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "본인 카드만 접근" ON public.cards
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. 역할 권한 부여 (SQL Editor로 생성 시 authenticated에 자동 부여 안 됨)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO anon;

-- 6. updated_at 트리거
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

### 3.4 JS ↔ DB 필드명 변환

| JS (camelCase) | DB (snake_case) | 비고 |
|----------------|-----------------|------|
| `id` | `id` | — |
| — | `user_id` | currentUser.id 자동 삽입 |
| `title` | `title` | — |
| `desc` | `description` | `desc`는 SQL 예약어 |
| `due` | `due_date` | `''` → `null` 변환 |
| `priority` | `priority` | — |
| `column` | `col` | `column`은 SQL 예약어 |
| `order` | `sort_order` | `order`는 SQL 예약어 |
| `createdAt` | `created_at` | — |
| `updatedAt` | `updated_at` | 트리거 자동 갱신 |

---

## 4. v3 — 자체 호스팅 RDB (향후 마이그레이션)

### 4.1 MySQL 스키마

```sql
CREATE TABLE users (
  id            CHAR(36)      PRIMARY KEY,           -- UUID v4 (앱 레벨 생성)
  email         VARCHAR(255)  UNIQUE NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cards (
  id            CHAR(36)      PRIMARY KEY,
  user_id       CHAR(36)      NOT NULL,
  title         VARCHAR(60)   NOT NULL,
  description   TEXT          NOT NULL DEFAULT '',
  due_date      DATE          NULL,
  priority      ENUM('high','mid','low')         NOT NULL DEFAULT 'mid',
  col           ENUM('todo','inprogress','done') NOT NULL DEFAULT 'todo',
  sort_order    SMALLINT      NOT NULL DEFAULT 0,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_col_order (user_id, col, sort_order)
);
```

> **UUID 처리**: MySQL 8.0+에서 `UUID()` 함수 사용 또는 앱 레벨에서 `crypto.randomUUID()` 생성 후 삽입.

### 4.2 PostgreSQL 자체 호스팅 스키마

```sql
CREATE TYPE priority_enum AS ENUM ('high', 'mid', 'low');
CREATE TYPE column_enum   AS ENUM ('todo', 'inprogress', 'done');

-- Supabase auth.users 대신 자체 users 테이블
CREATE TABLE users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT         NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE cards (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(60)   NOT NULL,
  description TEXT          NOT NULL DEFAULT '',
  due_date    DATE          NULL,
  priority    priority_enum NOT NULL DEFAULT 'mid',
  col         column_enum   NOT NULL DEFAULT 'todo',
  sort_order  SMALLINT      NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cards_user_col ON cards (user_id, col, sort_order);

-- updated_at 자동 갱신 트리거 (Supabase 버전과 동일)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 4.3 인덱스 전략

| 인덱스 | 컬럼 | 목적 |
|--------|------|------|
| PK | `id` | 단건 조회/수정/삭제 |
| `idx_user_col_order` | `(user_id, col, sort_order)` | 사용자·컬럼별 정렬 조회 |

---

## 5. REST API 설계 (v3 백엔드 전환 시)

프론트엔드의 `jsToDb` / `dbToJs` 변환 로직은 유지하고, Supabase SDK 호출을 `fetch()`로 교체하면 된다.

### 5.1 엔드포인트

```
POST   /api/auth/login       → { email, password } → JWT 발급
POST   /api/auth/logout      → 토큰 무효화
POST   /api/auth/refresh     → Refresh Token → 새 Access Token

GET    /api/cards            → 카드 목록 (Authorization: Bearer <jwt>)
POST   /api/cards            → 카드 생성
PUT    /api/cards/:id        → 카드 수정
DELETE /api/cards/:id        → 카드 삭제
PATCH  /api/cards/reorder    → body: [{ id, sort_order }] 일괄 갱신
```

### 5.2 인증 방식

```
Authorization: Bearer <access_token>
```

- Access Token: 15분 만료 (JWT)
- Refresh Token: 7일, HttpOnly 쿠키
- 백엔드에서 `user_id = jwt.sub` 조건으로 데이터 격리 (RLS 대체)

### 5.3 마이그레이션 경로 (v0 → v3)

```
localStorage(v0) → 백엔드 API POST /api/cards (일괄 삽입)
                → localStorage.removeItem('kanban-cards')
```

```js
// 마이그레이션 헬퍼 (향후 구현)
async function migrateToApi(accessToken) {
  const local = JSON.parse(localStorage.getItem('kanban-cards') ?? '[]');
  if (!local.length) return;
  await fetch('/api/cards/bulk', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(local.map(jsToDb)),
  });
  localStorage.removeItem('kanban-cards');
}
```
