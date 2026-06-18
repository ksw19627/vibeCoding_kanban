const SUPABASE_URL  = 'https://bpxmuwherqrgyxxxgdqk.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJweG11d2hlcnFyZ3l4eHhnZHFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTkxMTEsImV4cCI6MjA5NzI5NTExMX0.xJiYzu-xlftNKDkDW_T4FnI_sFpKoAbiqOW_I9xNWII';

if (!window.supabase || typeof window.supabase.createClient !== 'function') {
  throw new Error('Supabase CDN 로드 실패 — window.supabase 없음');
}
/* window._sb 에 클라이언트 저장 (window.supabase는 라이브러리 네임스페이스이므로 이름 충돌 방지) */
window._sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
