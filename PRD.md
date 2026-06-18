# PRD — Product Requirements Document
## 칸반 보드 (Kanban Board)

---

## 1. 개요

### 1.1 제품 목적
개인 또는 소규모 팀이 작업을 시각적으로 관리할 수 있는 웹 기반 칸반 보드. Google / GitHub / 이메일로 로그인 후 사용자별 카드 데이터를 클라우드(Supabase)에 저장하며, GitHub Pages로 배포되어 URL 하나로 접근 가능하다.

### 1.2 서비스 URL
`https://ksw19627.github.io/vibeCoding_kanban`

### 1.3 대상 사용자
- 개인 작업 관리가 필요한 사람
- 간단한 팀 프로젝트 진행을 시각화하려는 사람

### 1.4 기술 스택
- 순수 HTML5 / CSS3 / Vanilla JS (외부 UI 라이브러리 없음)
- 인증 / DB: Supabase (JS SDK v2 CDN)
- 배포: GitHub Pages (main 브랜치 루트)

---

## 2. 기능 요구사항

### 2.1 인증 기능 (신규)

#### F-12. 소셜 로그인
- Google 계정으로 OAuth 로그인
- GitHub 계정으로 OAuth 로그인
- 로그인 성공 시 칸반 보드(`index.html`)로 자동 이동

#### F-13. 이메일/패스워드 인증
- 이메일 + 패스워드로 회원가입
- 회원가입 시 Supabase가 확인 이메일 발송
- 이메일 확인 후 로그인 가능
- 로그인 성공 시 칸반 보드로 이동

#### F-14. 로그아웃
- 헤더 우측 [로그아웃] 버튼으로 세션 종료
- 로그아웃 후 `auth.html`로 리디렉트

#### F-15. 미인증 접근 차단
- `index.html` 진입 시 Supabase 세션 확인
- 세션 없으면 `auth.html`로 자동 리디렉트

---

### 2.2 칸반 핵심 기능 (기존 유지)

#### F-01. 칸반 컬럼 3개 고정
| 컬럼 ID | 컬럼 이름 | 의미 |
|---------|-----------|------|
| `todo` | TO-DO | 예정된 작업 |
| `inprogress` | In Progress | 진행 중인 작업 |
| `done` | Done ✓ | 완료된 작업 |

#### F-02. 카드 생성
- 필수: 제목 (최대 60자)
- 선택: 설명, 마감일, 우선순위
- 저장 위치: Supabase `cards` 테이블 (user_id 포함)

#### F-03. 카드 편집
- 기존 카드 편집 모달 → 저장 시 Supabase DB 업데이트

#### F-04. 카드 삭제
- 확인 다이얼로그 → Supabase DB에서 삭제

#### F-05. 드래그 앤 드롭 이동
- HTML5 DnD API로 컬럼 간 / 컬럼 내 이동
- 이동 완료 시 Supabase DB `col`, `sort_order` 업데이트

#### F-06. 데이터 영속성
- 모든 카드는 Supabase DB에 저장 (이전 localStorage 대체)
- 로그인한 사용자 본인의 카드만 표시 (RLS)

---

### 2.3 확장 기능 (기존 유지)

#### F-07. 컬럼별 카드 수 뱃지 (실시간)
#### F-08. 카드 검색 / 필터 (제목 + 설명)
#### F-09. 다크 / 라이트 모드 토글 (localStorage 저장)

---

### 2.4 UX 요구사항 (기존 유지)

#### F-10. 애니메이션 이펙트
| 이벤트 | 이펙트 |
|--------|--------|
| 카드 추가 | 팝인 애니메이션 |
| 드래그 시작 | 카드 3° 회전 + 그림자 |
| 드래그 오버 | 컬럼 점선 테두리 + 펄스 |
| Done 드롭 | 컨페티 이펙트 (2초) |
| 모달 열기 | 페이드인 + 슬라이드업 |

#### F-11. 반응형 레이아웃
- 데스크탑(≥769px): 3열 가로 배치
- 모바일(≤768px): 세로 스택

---

### 2.5 배포 요구사항 (신규)

#### F-16. GitHub Pages 배포
- Repository: `https://github.com/ksw19627/vibeCoding_kanban`
- 배포 URL: `https://ksw19627.github.io/vibeCoding_kanban`
- 배포 방법: main 브랜치 루트 → Settings → Pages 활성화
- 빌드 도구 없음 (정적 파일 직접 서빙)

---

## 3. 비기능 요구사항

| 항목 | 요구사항 |
|------|----------|
| 인증 보안 | Supabase RLS — 본인 카드만 접근 가능 |
| 세션 관리 | Supabase 자동 토큰 갱신 |
| 성능 | 카드 50개 기준 렌더링 100ms 이내 |
| 브라우저 지원 | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ |
| 외부 의존성 | Supabase JS SDK v2 (CDN) |

---

## 4. 제외 범위 (Out of Scope)

- 서버 사이드 렌더링
- 실시간 협업 (WebSocket)
- 첨부파일 업로드
- 컬럼 추가/삭제 커스터마이징
- 소셜 로그인 외 2FA
