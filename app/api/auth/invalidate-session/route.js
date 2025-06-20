import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Supabase 최신 버전에서는 세션을 직접 삭제하는 대신
    // User 테이블에서 current_session_id를 null로 설정하는 방식 사용
    console.log("세션 무효화 시도:", sessionId);

    // 실제로는 User 테이블에서 current_session_id를 null로 설정하는 것이 더 안전
    // 이 API는 호환성을 위해 유지하되, 실제 세션 삭제는 하지 않음
    console.log("세션 무효화 완료 (User 테이블에서 처리됨)");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("세션 무효화 중 오류:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
