# Database Design — 칸반 보드

> **현재 구현 (v2)**: Supabase PostgreSQL을 단일 데이터 저장소로 사용한다.  
> 인증은 Supabase Auth (`auth.users`)를 통해 처리하며, 카드 데이터는 `public.cards` 테이블에 user_id를 기반으로 저장한다.  
> 테마 설정(dark/light)만 `localStorage`에 유지한다.

---

## 1. 스토리지 구성

| 저장소 | 키 / 테이블 | 내용 |
|--------|-------------|------|
| Supabase Auth | `auth.users` | 사용자 계정 (Supabase 자동 관리) |
| Supabase DB | `public.cards` | 카드 데이터 (user_id 포함) |
| localStorage | `kanban-theme` | `'light'` 또는 `'dark'` (클라이언트 전용) |

> ※ v1의 `kanban-cards` localStorage 키는 v2에서 완전히 제거됨

---

## 2. 데이터 모델

### 2.1 논리 ERD

```
auth.users (Supabase 관리)
  id (UUID, PK)
  email
  ...
    │ 1
    │
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

---

## 3. DDL — Supabase (PostgreSQL)

### 3.1 ENUM 타입 정의

```sql
CREATE TYPE priority_enum AS ENUM ('high', 'mid', 'low');
CREATE TYPE column_enum   AS ENUM ('todo', 'inprogress', 'done');
```

### 3.2 cards 테이블

```sql
CREATE TABLE public.cards (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       VARCHAR(60)  NOT NULL,
  description TEXT         NOT NULL DEFAULT '',
  due_date    DATE         NULL,                            -- NULL = 마감일 없음
  priority    priority_enum NOT NULL DEFAULT 'mid',
  col         column_enum   NOT NULL DEFAULT 'todo',
  sort_order  SMALLINT     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

### 3.3 인덱스

```sql
-- 사용자 + 컬럼별 정렬 조회 최적화
CREATE INDEX idx_cards_user_col ON public.cards (user_id, col, sort_order);
```

### 3.4 Row Level Security (RLS)

```sql
-- RLS 활성화
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- 정책: 본인 카드만 SELECT / INSERT / UPDATE / DELETE 가능
CREATE POLICY "본인 카드만 접근" ON public.cards
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 3.5 updated_at 자동 갱신 트리거

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

---

## 4. Supabase 설정 (SQL Editor에서 실행)

위 3.1 ~ 3.5를 순서대로 Supabase SQL Editor에 붙여넣고 실행한다.

```sql
-- 전체 실행 순서
-- 1. ENUM 타입 생성
CREATE TYPE priority_enum AS ENUM ('high', 'mid', 'low');
CREATE TYPE column_enum   AS ENUM ('todo', 'inprogress', 'done');

-- 2. 테이블 생성
CREATE TABLE public.cards (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       VARCHAR(60)  NOT NULL,
  description TEXT         NOT NULL DEFAULT '',
  due_date    DATE         NULL,
  priority    priority_enum NOT NULL DEFAULT 'mid',
  col         column_enum   NOT NULL DEFAULT 'todo',
  sort_order  SMALLINT     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 3. 인덱스
CREATE INDEX idx_cards_user_col ON public.cards (user_id, col, sort_order);

-- 4. RLS
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "본인 카드만 접근" ON public.cards
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. 트리거
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

---

## 5. Card 스키마 (JS ↔ DB 매핑)

### 5.1 JS 타입 정의

```ts
type Priority = 'high' | 'mid' | 'low';
type Column   = 'todo' | 'inprogress' | 'done';

interface Card {
  id:        string;    // UUID
  title:     string;    // 1~60자
  desc:      string;    // 설명 (빈 문자열 허용)
  due:       string;    // 'YYYY-MM-DD' 또는 ''
  priority:  Priority;
  column:    Column;    // JS에서는 'column' 사용 (SQL 예약어 충돌 피하기 위해 DB는 'col')
  order:     number;    // 컬럼 내 정렬 순서
  createdAt: string;    // ISO 8601
  updatedAt: string;    // ISO 8601
}
```

### 5.2 필드명 변환

| JS (camelCase) | DB (snake_case) | 비고 |
|----------------|-----------------|------|
| `id` | `id` | — |
| — | `user_id` | currentUser.id 자동 삽입 |
| `title` | `title` | — |
| `desc` | `description` | `desc`는 SQL 예약어 |
| `due` | `due_date` | `''` → `null` 변환 필요 |
| `priority` | `priority` | — |
| `column` | `col` | `column`은 SQL 예약어 |
| `order` | `sort_order` | `order`는 SQL 예약어 |
| `createdAt` | `created_at` | — |
| `updatedAt` | `updated_at` | DB 트리거가 자동 갱신 |

---

## 6. CRUD 연산 (Supabase JS SDK)

### 6.1 조회 (Read)

```js
const { data, error } = await supabase
  .from('cards')
  .select('*')
  .eq('user_id', currentUser.id)
  .order('col')
  .order('sort_order');

const cards = data.map(dbToJs);
```

### 6.2 생성 (Create)

```js
await supabase.from('cards').insert({
  user_id:     currentUser.id,
  title:       card.title,
  description: card.desc,
  due_date:    card.due || null,
  priority:    card.priority,
  col:         card.column,
  sort_order:  card.order,
});
```

### 6.3 수정 (Update)

```js
await supabase.from('cards')
  .update({
    title:       patch.title,
    description: patch.desc,
    due_date:    patch.due || null,
    priority:    patch.priority,
    col:         patch.column,
    sort_order:  patch.order,
  })
  .eq('id', id);
// updated_at은 트리거가 자동 갱신
```

### 6.4 이동 (Move — 드래그앤드롭)

```js
// 이동 카드 update
await supabase.from('cards')
  .update({ col: targetColumn, sort_order: targetOrder })
  .eq('id', dragId);

// 같은 컬럼 내 나머지 카드 sort_order 일괄 재정렬
const updates = colCards.map((c, i) => ({ id: c.id, sort_order: i }));
await supabase.from('cards').upsert(updates);
```

### 6.5 삭제 (Delete)

```js
await supabase.from('cards').delete().eq('id', id);
```

---

## 7. 인증 (Supabase Auth)

Supabase Auth가 `auth.users` 테이블을 자동 관리한다. 앱에서는 세션만 사용한다.

```js
// 세션 확인
const { data: { session } } = await supabase.auth.getSession();
const currentUser = session?.user;

// OAuth 로그인
await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
await supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo } });

// 이메일 로그인/가입
await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.signUp({ email, password });

// 로그아웃
await supabase.auth.signOut();
```

---

## 8. 마이그레이션 전략

### v1 (localStorage) → v2 (Supabase) 이행 안내

v1에서 localStorage에 저장된 카드 데이터는 자동으로 마이그레이션되지 않는다.
필요 시 아래 절차를 수동으로 실행:

```js
async function migrateLocalStorageToSupabase() {
  const raw = localStorage.getItem('kanban-cards');
  if (!raw) return;
  const localCards = JSON.parse(raw);

  const dbCards = localCards.map(c => ({
    user_id:     currentUser.id,
    title:       c.title,
    description: c.desc || '',
    due_date:    c.due || null,
    priority:    c.priority || 'mid',
    col:         c.column || 'todo',
    sort_order:  c.order || 0,
  }));

  await supabase.from('cards').insert(dbCards);
  localStorage.removeItem('kanban-cards');
}
```

---

## 9. 인덱스 전략

| 인덱스 | 컬럼 | 목적 |
|--------|------|------|
| PK | `id` | 단건 조회/수정/삭제 |
| `idx_cards_user_col` | `(user_id, col, sort_order)` | 사용자+컬럼별 정렬 조회 |
