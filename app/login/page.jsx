/** @jsxImportSource @emotion/react */
"use client";

import styled from "@emotion/styled";
import theme from "../style/theme";
import { useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "../supbase";
import { useAuth } from "../components/AuthProvider";

export default function Login() {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { refreshUserData } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 사용자명 정리 (앞뒤 공백 제거)
    const trimmedUserName = userName.trim();
    console.log("입력된 사용자명:", `"${trimmedUserName}"`);

    try {
      // 1. 사용자명으로 User 테이블에서 사용자 정보 찾기
      const { data: userData, error: userError } = await supabase
        .from("User")
        .select("email, user_name, id, current_session_id")
        .eq("user_name", trimmedUserName)
        .single();

      console.log("쿼리 결과:", { userData, userError });

      if (userError) {
        if (userError.code === "PGRST116") {
          setError("사용자명을 찾을 수 없습니다.");
        } else {
          setError("로그인 중 오류가 발생했습니다.");
        }
        setLoading(false);
        console.log(userError);
        return;
      }

      console.log("찾은 사용자:", userData);

      // 2. 기존 세션이 있다면 완전히 무효화
      if (userData.current_session_id) {
        console.log("기존 세션 발견, 완전 무효화 시도");

        // 먼저 User 테이블에서 세션 정보 제거
        try {
          const { error: clearError } = await supabase
            .from("User")
            .update({
              current_session_id: null,
              last_logout_at: new Date().toISOString(),
            })
            .eq("id", userData.id);

          if (clearError) {
            console.log("기존 세션 정보 제거 실패:", clearError);
          } else {
            console.log("기존 세션 정보 제거 완료");
          }
        } catch (clearErr) {
          console.log("기존 세션 정보 제거 중 오류:", clearErr);
        }

        // 서버 API를 통해 기존 세션 삭제 시도
        try {
          const response = await fetch("/api/auth/invalidate-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionId: userData.current_session_id,
            }),
          });

          if (response.ok) {
            console.log("기존 세션 삭제 완료");
          } else {
            console.log("기존 세션 삭제 실패 (무시 가능)");
          }
        } catch (sessionErr) {
          console.log("기존 세션 삭제 중 오류 (무시 가능):", sessionErr);
        }
      }

      // 3. 현재 브라우저의 세션도 로그아웃 (혹시 있을 경우)
      try {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          console.log("현재 세션 로그아웃 실패 (무시 가능):", signOutError);
        } else {
          console.log("현재 세션 로그아웃 완료");
        }
      } catch (currentSessionErr) {
        console.log(
          "현재 세션 로그아웃 중 오류 (무시 가능):",
          currentSessionErr
        );
      }

      // 4. 새로운 로그인 시도
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password,
      });

      if (error) {
        setError("비밀번호가 올바르지 않습니다.");
        console.log("로그인 실패:", error);
      } else {
        console.log("로그인 성공:", data);

        // 5. 로그인 성공 시 현재 세션 정보 업데이트
        const currentSession = data.session;
        if (currentSession) {
          console.log("세션 정보 업데이트 시작");
          const { error: updateError } = await supabase
            .from("User")
            .update({
              current_session_id: currentSession.access_token,
              last_login_at: new Date().toISOString(),
            })
            .eq("id", userData.id);

          if (updateError) {
            console.error("세션 정보 업데이트 실패:", updateError);
          } else {
            console.log("세션 정보 업데이트 완료");
          }
        } else {
          console.log("세션 정보가 없음");
        }

        // 로그인 성공 후 사용자 데이터 새로고침
        await refreshUserData();
        router.push("/");
      }
    } catch (error) {
      setError("로그인 중 오류가 발생했습니다.");
      console.log("로그인 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wrapper>
      <LoginContainer>
        <Logo>
          <img src="/icon.png" alt="로고" />
        </Logo>
        <Title>로그인</Title>
        <Form onSubmit={handleLogin}>
          <Input
            type="text"
            placeholder="사용자명"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <LoginButton type="submit" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </LoginButton>
        </Form>
        <BackButton onClick={() => router.push("/")}>
          메인으로 돌아가기
        </BackButton>
      </LoginContainer>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
`;

const LoginContainer = styled.div`
  background: white;
  padding: 3rem;
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
`;

const Logo = styled.div`
  margin-bottom: 1rem;
  img {
    height: 4rem;
  }
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 2rem;
  color: ${() => theme.primary[500]};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${() => theme.gray};
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  outline: none;

  &:focus {
    border-color: ${() => theme.primary[500]};
  }
`;

const LoginButton = styled.button`
  background: ${() => theme.primary[500]};
  color: white;
  padding: 0.75rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 1rem;

  &:hover:not(:disabled) {
    background: ${() => theme.primary[600]};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #e74c3c;
  font-size: 0.9rem;
  text-align: center;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: ${() => theme.primary[500]};
  cursor: pointer;
  font-size: 0.9rem;
  text-decoration: underline;

  &:hover {
    color: ${() => theme.primary[600]};
  }
`;
