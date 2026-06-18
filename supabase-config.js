const SUPABASE_URL  = 'https://bpxmuwherqrgyxxxgdqk.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJweG11d2hlcnFyZ3l4eHhnZHFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MTkxMTEsImV4cCI6MjA5NzI5NTExMX0.xJiYzu-xlftNKDkDW_T4FnI_sFpKoAbiqOW_I9xNWII';

if (!window.supabase || typeof window.supabase.createClient !== 'function') {
  throw new Error('Supabase CDN 로드 실패 — window.supabase 없음');
}
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
