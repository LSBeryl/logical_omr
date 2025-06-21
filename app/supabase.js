import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase 환경 변수가 설정되지 않았습니다.");
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL:",
    supabaseUrl ? "설정됨" : "설정되지 않음"
  );
  console.error(
    "NEXT_PUBLIC_SUPABASE_KEY:",
    supabaseKey ? "설정됨" : "설정되지 않음"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: "public",
  },
  global: {
    headers: {
      "X-Client-Info": "logical-omr",
    },
  },
});

// 연결 상태 확인
supabase.auth.onAuthStateChange((event, session) => {
  console.log("Supabase Auth State Change:", event, session?.user?.id);
});

export default supabase;
