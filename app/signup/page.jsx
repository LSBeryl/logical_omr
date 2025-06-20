/** @jsxImportSource @emotion/react */
"use client";

import styled from "@emotion/styled";
import theme from "../style/theme";
import { useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "../supbase";

export default function Signup() {
  const [role, setRole] = useState("student"); // "student" or "teacher"
  const [userName, setUserName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teacherPassword, setTeacherPassword] = useState(""); // 선생님 비밀번호
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userNameChecked, setUserNameChecked] = useState(false);
  const [checkingUserName, setCheckingUserName] = useState(false);
  const router = useRouter();

  const checkUserName = async () => {
    if (!userName.trim()) {
      setError("사용자명을 입력해주세요.");
      return;
    }

    setCheckingUserName(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("User")
        .select("user_name")
        .eq("user_name", userName)
        .single();

      if (error && error.code !== "PGRST116") {
        setError("중복 확인 중 오류가 발생했습니다.");
        return;
      }

      if (data) {
        setError("이미 사용 중인 사용자명입니다.");
        setUserNameChecked(false);
      } else {
        setError("");
        setUserNameChecked(true);
        alert("사용 가능한 사용자명입니다.");
      }
    } catch (error) {
      setError("중복 확인 중 오류가 발생했습니다.");
    } finally {
      setCheckingUserName(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!userNameChecked) {
      setError("사용자명 중복 확인을 해주세요.");
      return;
    }

    // 선생님 역할일 때 비밀번호 검증
    if (role === "teacher") {
      const correctTeacherPassword = process.env.NEXT_PUBLIC_TEACHER_PASSWORD;
      if (teacherPassword !== correctTeacherPassword) {
        setError("선생님 비밀번호가 올바르지 않습니다.");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      // 1. Supabase Auth로 사용자 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // 2. User 테이블에 추가 정보 저장
      const { error: userError } = await supabase.from("User").insert({
        id: authData.user.id,
        user_name: userName,
        name: name,
        role: role,
        email: email,
        school: role === "student" ? school : null,
        grade: role === "student" ? (grade ? parseInt(grade) : null) : null,
      });

      if (userError) {
        setError(userError.message);
        return;
      }

      alert("회원가입이 완료되었습니다.");
      router.push("/login");
    } catch (error) {
      setError("회원가입 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wrapper>
      <SignupContainer>
        <Logo>
          <img src="/icon.png" alt="로고" />
        </Logo>
        <Title>회원가입</Title>
        <Form onSubmit={handleSignup}>
          <RoleSelector>
            <RoleButton
              type="button"
              $isActive={role === "student"}
              onClick={() => {
                setRole("student");
                setTeacherPassword(""); // 선생님 비밀번호 초기화
              }}
            >
              학생
            </RoleButton>
            <RoleButton
              type="button"
              $isActive={role === "teacher"}
              onClick={() => {
                setRole("teacher");
                setTeacherPassword(""); // 선생님 비밀번호 초기화
              }}
            >
              선생님
            </RoleButton>
          </RoleSelector>

          <InputGroup>
            <Input
              type="text"
              placeholder="사용자명 (중복 불가)"
              value={userName}
              onChange={(e) => {
                setUserName(e.target.value);
                setUserNameChecked(false);
              }}
              required
              $inGroup={true}
            />
            <CheckButton
              type="button"
              onClick={checkUserName}
              disabled={checkingUserName || !userName.trim()}
            >
              {checkingUserName ? "확인 중..." : "중복 확인"}
            </CheckButton>
          </InputGroup>
          <Input
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {role === "student" && (
            <>
              <Input
                type="text"
                placeholder="학교"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                required
              />
              <Input
                type="number"
                placeholder="학년"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                min="1"
                max="6"
                required
              />
            </>
          )}

          {role === "teacher" && (
            <Input
              type="password"
              placeholder="선생님 비밀번호"
              value={teacherPassword}
              onChange={(e) => setTeacherPassword(e.target.value)}
              required
            />
          )}

          {error && <ErrorMessage>{error}</ErrorMessage>}
          <SignupButton type="submit" disabled={loading}>
            {loading ? "가입 중..." : "회원가입"}
          </SignupButton>
        </Form>
        <BackButton onClick={() => router.push("/")}>
          메인으로 돌아가기
        </BackButton>
      </SignupContainer>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
`;

const SignupContainer = styled.div`
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

const RoleSelector = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const RoleButton = styled.button`
  flex: 1;
  padding: 0.75rem;
  border: 1px solid
    ${(props) => (props.$isActive ? theme.primary[500] : theme.gray)};
  border-radius: 0.5rem;
  background: ${(props) => (props.$isActive ? theme.primary[500] : "white")};
  color: ${(props) => (props.$isActive ? "white" : theme.primary[500])};
  cursor: pointer;
  font-weight: 500;

  &:hover {
    background: ${(props) =>
      props.$isActive ? theme.primary[600] : theme.primary[100]};
  }
`;

const InputGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${() => theme.gray};
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  outline: none;
  flex: ${(props) => (props.$inGroup ? "1" : "none")};

  &:focus {
    border-color: ${() => theme.primary[500]};
  }
`;

const CheckButton = styled.button`
  padding: 0.75rem;
  border: 1px solid ${() => theme.gray};
  border-radius: 0.5rem;
  background: none;
  color: ${() => theme.primary[500]};
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;

  &:hover {
    background: ${() => theme.primary[100]};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SignupButton = styled.button`
  background: ${() => theme.primary[500]};
  color: white;
  padding: 0.75rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
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
