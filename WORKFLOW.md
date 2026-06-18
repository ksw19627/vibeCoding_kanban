# WORKFLOW — 팀 협업 칸반 보드

> 개인 전용 칸반에서 팀 공유 칸반으로 확장하기 위한 설계 문서.  
> 워크스페이스 개념, 사용자 플로우, 권한 모델, DB 스키마, 실시간 동기화, 활동 로그를 정의한다.

---

## 1. 워크스페이스 개념

**워크스페이스(Workspace) = 하나의 공유 칸반 보드**

| 항목 | 설명 |
|------|------|
| 보드 단위 | 워크스페이스 하나 = TO-DO / In Progress / Done 3개 컬럼 공유 |
| 다중 소속 | 한 사용자가 여러 워크스페이스에 동시에 속할 수 있음 |
| 데이터 격리 | 카드는 `workspace_id` 기반 RLS로 워크스페이스 단위 격리 |
| 초대 방식 | 8자리 초대 코드 (워크스페이스 생성 시 자동 발급, 오너만 조회 가능) |
| 실시간 동기화 | Supabase Realtime — 같은 워크스페이스 내 변경사항 즉시 반영 |

```
사용자 A (오너)          사용자 B (멤버)
    │                        │
    ├─ 워크스페이스 "팀 프로젝트" ◄─┤  (invite_code: ABCD1234)
    │       │                │
    │   [TO-DO] [In Progress] [Done]
    │       ↕ 실시간 동기화   ↕
    └───────────────────────────────
```

---

## 2. 사용자 플로우

### 2-1. 워크스페이스 생성 (최초 로그인 또는 신규 보드)

```
로그인 후 index.html 진입
    │
    ▼
워크스페이스 없음 → 생성 모달 자동 표시
    │
사용자가 보드 이름 입력 → [만들기] 클릭
    │
    ▼
DB: workspaces INSERT (invite_code 자동 생성)
DB: workspace_members INSERT (role = 'owner')
    │
    ▼
헤더에 워크스페이스명 + 초대 코드 표시
카드 로드 → 보드 렌더링
```

### 2-2. 초대 코드로 워크스페이스 참가

```
index.html 헤더 → 워크스페이스 셀렉터 → [코드로 참가] 클릭
    │
참가 모달 열림 → 8자리 코드 입력 → [참가] 클릭
    │
    ▼
DB: workspaces WHERE invite_code = 입력값 조회
    │
    ├─ [없음] → "유효하지 않은 코드" 에러
    │
    └─ [있음]
          │
          ▼
        DB: workspace_members INSERT (role = 'member')
        DB: activity_logs INSERT (action = 'member_joined')
          │
          ▼
        워크스페이스 전환 → 공유 카드 로드
```

### 2-3. 워크스페이스 전환 (멀티 워크스페이스)

```
헤더 워크스페이스 셀렉터 클릭 → 드롭다운 열림
    │
    ├─ 소속된 워크스페이스 목록 표시
    ├─ [+ 새 워크스페이스] → 생성 모달
    └─ [코드로 참가] → 참가 모달
    │
워크스페이스 선택
    │
    ▼
Realtime 채널 교체 (이전 구독 해제 → 새 구독)
loadCardsFromDB(workspace_id) → renderAll()
```

### 2-4. 팀원과 실시간 협업

```
팀원 A가 카드 추가/이동/삭제
    │
    ▼
app.js → Supabase CRUD
    │
    ▼
Supabase Realtime postgres_changes 이벤트 발생
    │
    ▼
팀원 B 브라우저 → handleRealtimeCard() 수신
    │
    ├─ INSERT: 카드 로컬에 없으면 cards 배열 추가 → renderAll()
    ├─ UPDATE: 해당 카드 교체 → renderAll()
    └─ DELETE: 해당 카드 제거 → renderAll()
```

> **중복 방지**: 본인이 보낸 변경은 이미 로컬에 즉시 반영됐으므로, Realtime 수신 시 `cards.find(c => c.id === row.id)` 중복 체크로 스킵.

### 2-5. 활동 로그 조회

```
헤더 [📋 활동 로그] 버튼 클릭
    │
    ▼
activity_logs 패널 슬라이드 인
    │
loadActivityLog() → 최근 50개 로그 조회 (workspace_id 기준)
    │
    ▼
로그 목록 렌더링:
  [🎉 카드 추가] user@email.com이 "할 일 A"를 추가함  2분 전
  [✏️ 카드 편집] user@email.com이 "할 일 A"를 수정함  5분 전
  [➡️ 카드 이동] user@email.com이 "할 일 A"를 In Progress로 이동  10분 전
  [🗑️ 카드 삭제] user@email.com이 "할 일 B"를 삭제함  1시간 전
  [👋 참가]      user2@email.com이 워크스페이스에 참가함  2일 전
    │
새 활동 발생 시 Realtime으로 실시간 추가 (패널 열린 동안)
```

---

## 3. 권한 모델

| 역할 | 카드 추가 | 카드 편집 | 카드 삭제 | 드래그 이동 | 멤버 조회 | 초대 코드 조회 | 워크스페이스 삭제 |
|------|:---------:|:---------:|:---------:|:-----------:|:---------:|:--------------:|:-----------------:|
| **owner** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **member** | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |

> **초대 코드**: 오너만 헤더에서 코드를 확인할 수 있다. 멤버는 코드를 볼 수 없다.  
> **카드 삭제**: 멤버도 모든 카드를 삭제할 수 있다 (본인 작성 카드 제한 없음).

---

## 4. DB 스키마 (신규 테이블 + 변경)

### 4-1. 신규 테이블

#### `public.workspaces`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | 워크스페이스 고유 ID |
| `name` | VARCHAR(60) | 보드 이름 |
| `owner_id` | UUID FK → auth.users | 오너 |
| `invite_code` | VARCHAR(8) UNIQUE | 8자리 초대 코드 (자동 생성) |
| `created_at` | TIMESTAMPTZ | 생성 시간 |

#### `public.workspace_members`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `workspace_id` | UUID FK → workspaces | 복합 PK |
| `user_id` | UUID FK → auth.users | 복합 PK |
| `role` | VARCHAR(10) | `'owner'` 또는 `'member'` |
| `display_name` | TEXT | 표시용 이름 (email 앞부분) |
| `joined_at` | TIMESTAMPTZ | 참가 시간 |

#### `public.activity_logs`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | 로그 고유 ID |
| `workspace_id` | UUID FK → workspaces | 워크스페이스 |
| `user_id` | UUID FK → auth.users | 행위자 |
| `user_email` | TEXT | 행위자 이메일 스냅샷 (탈퇴해도 로그 유지) |
| `action` | VARCHAR(20) | 이벤트 종류 (아래 6-1 참고) |
| `card_id` | UUID (nullable) | 대상 카드 ID |
| `card_title` | VARCHAR(60) (nullable) | 대상 카드 제목 스냅샷 |
| `meta` | JSONB (nullable) | 추가 정보 `{ from_col, to_col }` 등 |
| `created_at` | TIMESTAMPTZ | 발생 시간 |

### 4-2. `public.cards` 테이블 변경

| 변경 | 내용 |
|------|------|
| 컬럼 추가 | `workspace_id UUID FK → workspaces` |
| 컬럼 추가 | `created_by UUID FK → auth.users` |
| RLS 변경 | `user_id = auth.uid()` → `workspace_id IN (멤버 테이블 서브쿼리)` |
| 기존 `user_id` | 유지 (마이그레이션 안전성) |

### 4-3. ERD 요약

```
auth.users
  │ 1
  ├─N workspaces (owner_id)
  └─N workspace_members (user_id)
          │N
          │1
       workspaces ──── N cards (workspace_id)
          │                 │ created_by → auth.users
          └─ N activity_logs (workspace_id)
                          │ user_id → auth.users
```

---

## 5. 실시간 동기화 전략

### 5-1. 구독 채널

```
채널명: workspace:<workspace_id>

구독 대상:
  - public.cards       (event: *)      filter: workspace_id=eq.<id>
  - public.activity_logs (event: INSERT) filter: workspace_id=eq.<id>
```

### 5-2. 중복 처리

```
INSERT 수신 시:
  → cards.find(c => c.id === row.id) 존재하면 스킵 (본인 변경)
  → 없으면 추가 + renderAll()

UPDATE 수신 시:
  → cards 배열에서 해당 id 교체 + renderAll()

DELETE 수신 시:
  → cards 배열에서 해당 id 제거 + renderAll()
  (이미 로컬에서 제거됐으면 filter로 무해하게 처리)
```

### 5-3. 채널 수명

```
selectWorkspace() 호출 시:
  이전 채널 removeChannel() → 새 채널 subscribe()
로그아웃 시:
  현재 채널 removeChannel()
```

---

## 6. 활동 로그 이벤트 정의

### 6-1. action 종류

| action | 발생 조건 | meta 내용 |
|--------|-----------|-----------|
| `card_created` | 카드 추가 | `{ col }` |
| `card_updated` | 카드 편집 (제목/설명/마감일/우선순위) | `{}` |
| `card_moved` | 드래그로 다른 컬럼 이동 | `{ from_col, to_col }` |
| `card_deleted` | 카드 삭제 | `{}` |
| `member_joined` | 초대 코드로 워크스페이스 참가 | `{}` |

### 6-2. 표시 텍스트 (renderActivityLog)

| action | 표시 아이콘 | 텍스트 템플릿 |
|--------|-------------|---------------|
| `card_created` | 🎉 | `{email}이 "{title}"을 추가함` |
| `card_updated` | ✏️ | `{email}이 "{title}"을 수정함` |
| `card_moved` | ➡️ | `{email}이 "{title}"을 {to_col}로 이동함` |
| `card_deleted` | 🗑️ | `{email}이 "{title}"을 삭제함` |
| `member_joined` | 👋 | `{email}이 워크스페이스에 참가함` |

---

## 7. 구현 단계

| 단계 | 내용 | 담당 |
|------|------|------|
| **Phase 0** | WORKFLOW.md 작성 | Dev |
| **Phase 1** | Supabase SQL 실행 (신규 테이블 + 변경) | User (SQL Editor) |
| **Phase 2** | app.js — 워크스페이스 관리 + 활동 로그 + Realtime | Dev |
| **Phase 3** | index.html — 워크스페이스 UI + 로그 패널 + 모달 | Dev |
| **Phase 4** | style.css — 워크스페이스/로그 패널 스타일 | Dev |
| **Phase 5** | DatabaseDesign.md, TASKS.md 갱신 | Dev |
| **Phase 6** | QA 검증 (W-01~W-08) | User |

---

## 8. 검증 체크리스트 (W-01~W-08)

| # | 항목 | 확인 방법 |
|---|------|-----------|
| W-01 | 워크스페이스 생성 → invite_code 자동 발급 | Supabase Table Editor + 헤더 표시 |
| W-02 | 초대 코드 입력 → 참가 → 카드 로드 | 두 번째 계정으로 참가 테스트 |
| W-03 | 다른 탭에서 카드 추가 → 실시간 반영 | 같은 계정 두 탭 동시 오픈 |
| W-04 | 카드 CRUD → 활동 로그 기록 | 활동 로그 패널 확인 |
| W-05 | 활동 로그 패널 → 최근 50개 표시 | 다양한 action 확인 |
| W-06 | 멤버 참가 → 'member_joined' 로그 | activity_logs 테이블 확인 |
| W-07 | 멀티 워크스페이스 전환 → 카드 목록 교체 | 셀렉터 클릭 후 다른 보드 선택 |
| W-08 | RLS 격리 — 다른 워크스페이스 카드 접근 불가 | Supabase Table Editor 또는 콘솔 |
