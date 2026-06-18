# 칸반 보드 구현 계획

## Context

순수 HTML/CSS/Vanilla JS + Supabase Auth/DB + GitHub Pages 조합으로 구성된 반응형 칸반 보드.
Frontend(GitHub Pages) / Backend(Supabase) 분리 구조.

---

## 확정된 선택 사항

| 항목 | 선택 |
|------|------|
| 비주얼 스타일 | 컬러풀/비비드 — 컬럼 헤더 그라디언트 (파랑/주황/초록) |
| 애니메이션 | 플레이풀 — 스프링 팝인, 드래그 회전+그림자, Done 컨페티, 삭제 슬라이드아웃 |
| 추가 기능 | 검색/실시간 필터, 우선순위 필터 칩, 마감일 경고 색상, 다크/라이트 모드 토글 |
| 데이터 저장 | Supabase PostgreSQL (카드), localStorage (테마만) |
| 인증 | Supabase Auth — Google OAuth / GitHub OAuth / 이메일+패스워드 |
| 배포 | GitHub Pages (main 브랜치 루트) |

---

## 파일 구조

```
kanban_panning/
├── PLAN.md             # 구현 계획 (현재 파일)
├── PRD.md              # 제품 요구사항 문서
├── TRD.md              # 기술 요구사항 문서
├── UserFlow.md         # 사용자 플로우
├── DatabaseDesign.md   # DB 스키마 (Supabase + 향후 자체 RDB 경로)
├── DesignSystem.md     # 디자인 시스템
├── TASKS.md            # 구현 태스크 목록
├── index.html          # 칸반 보드 메인 (Supabase CDN + 인증 후 진입)
├── style.css           # 레이아웃, 테마, 애니메이션 (컬러풀/비비드)
├── app.js              # 칸반 로직 + Supabase DB CRUD + Auth 체크
├── auth.html           # 로그인/회원가입 페이지
├── auth.js             # 인증 전담 로직 (Google/GitHub/Email)
└── supabase-config.js  # Supabase 클라이언트 초기화 (실제 값 기입 완료)
```

---

## 아키텍처

```
[사용자 브라우저]
    ↓ 정적 파일 서빙
[GitHub Pages]   index.html / style.css / app.js / auth.html / auth.js
    ↓ 인증 · CRUD
[Supabase]   Auth(Google/GitHub/Email) + PostgreSQL cards 테이블 (RLS)
```

### 데이터 흐름

```
사용자 액션
  → app.js 함수 호출 (CRUD)
  → cards 배열 갱신 (메모리)
  → renderAll()      [DOM 재생성]
  → DB 함수 async   [Supabase INSERT/UPDATE/DELETE]
```

`cards` 배열이 단일 진실의 원천. UI는 항상 먼저 반영하고 DB는 비동기 처리.

### 컬럼 색상 (그라디언트 헤더)

| 컬럼 | 헤더 그라디언트 |
|------|----------------|
| TO-DO | 파랑 `#0052cc → #1e78f0` |
| In Progress | 주황 `#ff8b00 → #ffbf00` |
| Done | 초록 `#00875a → #00c282` |

### localStorage 사용

| 키 | 내용 |
|----|------|
| `kanban-theme` | `'light'` 또는 `'dark'` (테마만) |

> 카드 데이터는 Supabase DB에만 저장. localStorage 카드 저장 없음.

### Card 객체 구조 (JS)

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

## 개발(코드) 완료 현황

| 파일 | 상태 | 내용 |
|------|------|------|
| `index.html` | ✓ 완료 | Supabase CDN, 유저 영역, 필터 칩, 컬러 헤더 |
| `style.css` | ✓ 완료 | 그라디언트 컬럼, 플레이풀 keyframes, user-area 스타일 |
| `app.js` | ✓ 완료 | 인증 + DB CRUD + UI 필터/DnD/컨페티 통합 |
| `auth.html` | ✓ 완료 | Google/GitHub/Email 인증 UI |
| `auth.js` | ✓ 완료 | OAuth + 이메일 인증 로직 |
| `supabase-config.js` | ✓ 완료 | 실제 URL/Key 기입됨 |
| 설계 문서 5종 | ✓ 완료 | PRD, TRD, UserFlow, TASKS, DatabaseDesign |

---

## 사용자(User)가 직접 해야 할 TODO

> 외부 서비스 콘솔에서 수동으로 진행. 순서대로 수행.

### [U-01] Google OAuth App 생성
**위치:** https://console.cloud.google.com/

1. 프로젝트 생성 (또는 기존 사용)
2. API 및 서비스 → OAuth 동의 화면 → 외부 → 저장
3. 사용자 인증 정보 → OAuth 클라이언트 ID 만들기
   - 유형: 웹 애플리케이션
   - 승인된 리디렉션 URI: `https://bpxmuwherqrgyxxxgdqk.supabase.co/auth/v1/callback`
4. **클라이언트 ID** + **클라이언트 보안 비밀** 복사

### [U-02] GitHub OAuth App 생성
**위치:** https://github.com/settings/developers → OAuth Apps → New OAuth App

- Homepage URL: `https://ksw19627.github.io/vibeCoding_kanban/`
- Callback URL: `https://bpxmuwherqrgyxxxgdqk.supabase.co/auth/v1/callback`
- **Client ID** + **Client Secret** 복사

### [U-03] Supabase 콘솔 설정
**위치:** https://supabase.com/dashboard → 프로젝트 `bpxmuwherqrgyxxxgdqk`

- **Authentication → Providers → Google** → Enable + U-01 값 입력
- **Authentication → Providers → GitHub** → Enable + U-02 값 입력
- **Authentication → URL Configuration**:
  - Site URL: `https://ksw19627.github.io/vibeCoding_kanban/`
  - Redirect URLs: `https://ksw19627.github.io/vibeCoding_kanban/index.html`, `http://127.0.0.1:5500/index.html`
- **Table Editor** → `public.cards` 테이블 존재 확인 (없으면 `DatabaseDesign.md` 3.3 DDL 실행)

### [U-04] GitHub 저장소 + Pages 설정

1. https://github.com/new → `vibeCoding_kanban` (Public) 생성
2. 터미널에서:
   ```bash
   git push origin main
   ```
3. 저장소 → Settings → Pages → Source: main / root → Save
4. 2~3분 후 `https://ksw19627.github.io/vibeCoding_kanban/` 접속 확인

---

## 전체 작업 흐름

```
✓ [Dev] 코드 작업 완료 (index.html / style.css / app.js / 설계문서)
     ↓
[ ] [User] U-01 Google OAuth App 생성
[ ] [User] U-02 GitHub OAuth App 생성
     ↓
[ ] [User] U-03 Supabase 콘솔 설정 (OAuth 공급자 + Redirect URL)
     ↓
[ ] [User] U-04 GitHub 저장소 push + Pages 활성화
     ↓
[ ] [검증] https://ksw19627.github.io/vibeCoding_kanban/ 접속 테스트
```

---

## 검증 체크리스트

### 로컬 (VS Code Live Server, 포트 5500)
- [ ] `auth.html` → Google 로그인 → `index.html` 진입 확인
- [ ] `auth.html` → GitHub 로그인 → `index.html` 진입 확인
- [ ] 이메일 회원가입 → 확인 이메일 수신 확인
- [ ] 로그아웃 → `auth.html` 리디렉트 확인

### 칸반 기능
- [ ] 카드 추가 → 팝인 애니메이션 → Supabase Table Editor에서 확인
- [ ] 카드 편집 → DB 반영 확인
- [ ] 카드 삭제 → 슬라이드아웃 애니메이션 → DB 삭제 확인
- [ ] 드래그 → 3° 회전 + 그림자 → 컬럼 이동 → sort_order 변경 확인
- [ ] Done 드롭 → 컨페티 2초 폭죽
- [ ] 검색어 입력 → 실시간 필터
- [ ] 우선순위 칩 → 해당 카드만 표시
- [ ] 마감일 초과 → 빨간 강조 / 오늘 마감 → 주황 강조
- [ ] 다크모드 → 새로고침 후 유지
- [ ] 모바일 375px → 세로 스택 레이아웃

### GitHub Pages
- [ ] 배포 URL 접속 → 인증 후 칸반 보드 정상 동작
- [ ] 다른 기기에서 동일 계정 로그인 → 동일 카드 표시 (RLS 검증)
