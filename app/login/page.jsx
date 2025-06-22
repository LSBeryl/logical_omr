/** @jsxImportSource @emotion/react */
"use client";

import styled from "@emotion/styled";
import theme from "../style/theme";
import { useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "../supabase";
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
        .select("email, user_name, id")
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password,
      });

      if (error) {
        setError("비밀번호가 올바르지 않습니다.");
        console.log("로그인 실패:", error);
      } else {
        console.log("로그인 성공:", data);

        try {
          await refreshUserData();
        } catch (refreshError) {
          console.warn("사용자 데이터 새로고침 실패:", refreshError);
        }

        // 홈으로 이동
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
