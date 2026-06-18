# User Flow — 칸반 보드

---

## 1. 전체 플로우 개요

```
[URL 진입 / 새로고침]
         │
         ▼
   index.html 로드
         │
         ▼
   Supabase 세션 확인
         │
    ┌────┴────┐
    │         │
[세션 없음]  [세션 있음]
    │         │
    ▼         ▼
auth.html   카드 DB 로드
  (로그인)    → 보드 렌더링
    │
    ▼
[인증 성공]
    │
    ▼
index.html (칸반 보드)
```

---

## 2. 인증 플로우 (신규)

### 2.1 소셜 로그인 (Google / GitHub)

```
사용자가 auth.html에서 [Google로 로그인] 또는 [GitHub로 로그인] 클릭
    │
    ▼
supabase.auth.signInWithOAuth({ provider, redirectTo: 'index.html' })
    │
    ▼
브라우저 → OAuth 제공자(Google/GitHub) 로그인 페이지
    │
    ▼
인증 성공 → Supabase 콜백 처리
    │
    ▼
index.html 리디렉트 (세션 쿠키/토큰 자동 저장)
    │
    ▼
칸반 보드 표시 (헤더에 이메일 표시)
```

### 2.2 이메일 회원가입

```
사용자가 auth.html에서 [Sign Up] 탭 선택
    │
    ▼
이메일 + 패스워드 입력 후 [회원가입] 클릭
    │
    ▼
supabase.auth.signUp({ email, password })
    │
    ├──[실패: 이미 가입된 이메일] → 에러 메시지 표시
    │
    └──[성공]
          │
          ▼
        "이메일을 확인해주세요" 안내 메시지 표시
          │
          ▼
        사용자가 이메일 수신함에서 확인 링크 클릭
          │
          ▼
        이메일 인증 완료 → auth.html에서 로그인 가능
```

### 2.3 이메일 로그인

```
사용자가 auth.html에서 [Sign In] 탭 선택 (기본)
    │
    ▼
이메일 + 패스워드 입력 후 [로그인] 클릭
    │
    ▼
supabase.auth.signInWithPassword({ email, password })
    │
    ├──[실패: 잘못된 이메일/패스워드] → 에러 메시지 표시
    ├──[실패: 이메일 미인증] → "이메일을 먼저 확인해주세요" 표시
    │
    └──[성공]
          │
          ▼
        index.html 리디렉트
          │
          ▼
        칸반 보드 표시
```

### 2.4 로그아웃

```
사용자가 헤더 우측 [로그아웃] 버튼 클릭
    │
    ▼
supabase.auth.signOut()
    │
    ▼
세션 삭제
    │
    ▼
auth.html 리디렉트
```

---

## 3. 카드 추가 플로우 (변경)

```
사용자가 [+ 카드 추가] 버튼 클릭
    │
    ▼
모달 열림 (빈 폼)
    │
    ├──[저장] 클릭
    │     │
    │     ├──[제목 비어있음] → 에러 표시, 모달 유지
    │     │
    │     └──[제목 있음]
    │           │
    │           ▼
    │         supabase.from('cards').insert({
    │           user_id: currentUser.id,
    │           title, description, due_date,
    │           priority, col, sort_order
    │         })
    │           │
    │           ▼
    │         보드 재렌더링 + 팝인 애니메이션
    │           │
    │           ▼
    │         모달 닫힘
    │
    └──[취소] / [Esc] / [오버레이]
          → 모달 닫힘
```

---

## 4. 카드 편집 플로우 (변경)

```
사용자가 [편집] 버튼 클릭
    │
    ▼
모달 열림 (기존 데이터 채워진 폼)
    │
    ├──[저장]
    │     │
    │     └──[유효성 통과]
    │           │
    │           ▼
    │         supabase.from('cards').update({...patch})
    │           .eq('id', cardId)
    │           │
    │           ▼
    │         보드 재렌더링 → 모달 닫힘
    │
    └──[취소] → 모달 닫힘 (변경 없음)
```

---

## 5. 카드 삭제 플로우 (변경)

```
사용자가 [삭제] 버튼 클릭
    │
    ▼
카드에 .removing 클래스 추가 → slideOut 애니메이션 실행 (~280ms)
    │
    ▼
animationend 이벤트 (또는 350ms 타임아웃) 발생
    │
    ▼
cards 배열에서 제거 → reorderLocal(col) → renderAll()
    │
    ▼
supabase.from('cards').delete().eq('id', id)  ← 비동기
```

---

## 6. 드래그 앤 드롭 플로우 (변경)

```
카드 드래그 시작 → 드래그 중 → 대상 컬럼에 드롭
    │
    ▼
supabase.from('cards').update({
  col: targetColumn,
  sort_order: targetOrder
}).eq('id', dragId)
    │
    ▼
같은 컬럼 내 다른 카드 sort_order 재정렬 (bulk upsert)
    │
    ▼
보드 재렌더링
    │
    └──[대상 컬럼 = done] → 컨페티 이펙트
```

---

## 7. 앱 초기 로드 플로우 (변경)

```
브라우저가 index.html 파싱
    │
    ▼
CDN 로드: Supabase JS → supabase-config.js → style.css → app.js
    │
    ▼
DOMContentLoaded → initApp()
    │
    ├── checkAuth()
    │       → getSession()
    │       → 세션 없으면 auth.html 리디렉트 (종료)
    │       → 세션 있으면 currentUser 저장
    │       → 헤더에 사용자 이메일 표시
    │
    ├── setupTheme()    (localStorage에서 테마 복원)
    │
    ├── loadCardsFromDB()
    │       → Supabase DB 조회 → cards 배열 구성
    │
    ├── renderAll()
    │
    ├── setupBoardEvents()
    ├── setupDragAndDrop()
    ├── setupSearch()
    ├── setupPriorityFilter()
    ├── setupModal()
    └── setupLogout()
```

---

## 8. auth.html 로드 플로우 (신규)

```
브라우저가 auth.html 파싱
    │
    ▼
CDN 로드: Supabase JS → supabase-config.js → style.css → auth.js
    │
    ▼
DOMContentLoaded → initAuthPage()
    │
    ├── getSession() 확인
    │       → 이미 로그인 → index.html 리디렉트 (종료)
    │
    └── 버튼/폼 이벤트 등록
          → Google 버튼: handleOAuth('google')
          → GitHub 버튼: handleOAuth('github')
          → Sign In 폼: handleEmailSignIn()
          → Sign Up 폼: handleEmailSignUp()
          → 탭 전환: toggleAuthTab()
```
