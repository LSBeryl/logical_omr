/** @jsxImportSource @emotion/react */
"use client";

import styled from "@emotion/styled";
import { css } from "@emotion/react";
import theme from "./style/theme";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "./supbase";

export default function Main() {
  const [code, setCode] = useState("");
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSelectiveModal, setShowSelectiveModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const router = useRouter();

  useEffect(() => {
    // 현재 로그인 상태 확인
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      // 로그인한 사용자의 상세 정보 가져오기
      if (user) {
        const { data: userInfo } = await supabase
          .from("User")
          .select("user_name, role, email")
          .eq("id", user.id)
          .single();
        setUserData(userInfo);
      }

      // 시험 목록 가져오기
      const { data: examList } = await supabase
        .from("Exam")
        .select("*")
        .order("created_at", { ascending: false });
      setExams(examList || []);

      setLoading(false);
    };

    checkUser();

    // 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data: userInfo } = await supabase
          .from("User")
          .select("user_name, role, email")
          .eq("id", session.user.id)
          .single();
        setUserData(userInfo);
      } else {
        setUserData(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (code.includes("FHWLZJFTNGKR")) {
      router.push("/teacher");
      setCode("");
    }
  }, [code]);

  const handleLogin = () => {
    router.push("/login");
  };

  const handleSignup = () => {
    router.push("/signup");
  };

  const handleLogout = () => {
    supabase.auth.signOut();
    router.push("/");
  };

  const handleDebug = () => {
    router.push("/debug");
  };

  const handleEnterExam = (examId) => {
    const exam = exams.find((e) => e.id === examId);
    if (exam && exam.has_selective) {
      setSelectedExam(exam);
      setShowSelectiveModal(true);
    } else {
      router.push(`/student?examId=${examId}`);
    }
  };

  const handleSelectiveSubmit = () => {
    if (selectedSubject) {
      router.push(
        `/student?examId=${selectedExam.id}&selectiveSubject=${selectedSubject}`
      );
      setShowSelectiveModal(false);
      setSelectedExam(null);
      setSelectedSubject("");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Wrapper>
      <Title>
        <div>
          <img src="/icon.png" alt="" />
        </div>
        <div>
          로지컬 모의고사{" "}
          <span
            tabIndex={-1}
            onKeyDown={(e) => {
              setCode((prev) => prev + e.key.toUpperCase());
            }}
          >
            OMR
          </span>
        </div>
      </Title>
      <MainContainer>
        <ExamBoxTitle $isLoggedIn={!!user}>
          <div>시험 목록</div>
        </ExamBoxTitle>
        <ExamBoxContainer>
          <ExamBox $isLoggedIn={!!user}>
            {exams.length > 0 ? (
              exams.map((exam) => (
                <ExamBoxRow key={exam.id}>
                  <div>{exam.name}</div>
                  <div onClick={() => handleEnterExam(exam.id)}>입장</div>
                </ExamBoxRow>
              ))
            ) : (
              <ExamBoxRow>
                <div>등록된 시험이 없습니다</div>
                <div style={{ visibility: "hidden" }}>입장</div>
              </ExamBoxRow>
            )}
          </ExamBox>
          {!user && (
            <AuthOverlay>
              <AuthContent>
                <AuthMessage>로그인 후 이용이 가능합니다.</AuthMessage>
                <AuthButtons>
                  <LoginButton onClick={handleLogin}>로그인</LoginButton>
                  <SignupButton onClick={handleSignup}>회원가입</SignupButton>
                </AuthButtons>
              </AuthContent>
            </AuthOverlay>
          )}
        </ExamBoxContainer>
        {user && <LogoutButton onClick={handleLogout}>로그아웃</LogoutButton>}
        {userData?.user_name === "LSBeryl" ||
        userData?.email === "dltjgus8098@naver.com" ? (
          <DebugButton onClick={handleDebug}>디버그 페이지</DebugButton>
        ) : null}
        {(userData?.role === "teacher" ||
          userData?.user_name === "LSBeryl" ||
          userData?.email === "dltjgus8098@naver.com") && (
          <TeacherButton onClick={() => router.push("/teacher")}>
            선생님 페이지
          </TeacherButton>
        )}
      </MainContainer>

      {/* 선택 과목 모달 */}
      {showSelectiveModal && selectedExam && (
        <ModalOverlay>
          <Modal>
            <ModalTitle>선택 과목 선택</ModalTitle>
            <ModalContent>
              <div>
                시험: <span>{selectedExam.name}</span>
              </div>
              <SelectContainer>
                {Array.from({ length: selectedExam.selective_num }, (_, i) => (
                  <SelectButton
                    key={i}
                    $isSelected={selectedSubject === `selective_${i + 1}`}
                    onClick={() => setSelectedSubject(`selective_${i + 1}`)}
                  >
                    선택 과목 {i + 1}
                  </SelectButton>
                ))}
              </SelectContainer>
              <ModalButtons>
                <CancelButton
                  onClick={() => {
                    setShowSelectiveModal(false);
                    setSelectedExam(null);
                    setSelectedSubject("");
                  }}
                >
                  취소
                </CancelButton>
                <SubmitButton
                  onClick={handleSelectiveSubmit}
                  disabled={!selectedSubject}
                >
                  입장
                </SubmitButton>
              </ModalButtons>
            </ModalContent>
          </Modal>
        </ModalOverlay>
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 0;
`;

const Title = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: ${() => theme.primary[500]};
  display: flex;
  flex-direction: column;
  align-items: center;
  & img {
    height: 8rem;
  }
  & span {
    border-radius: 0.5rem;
    font-weight: 600;
    padding: 0.3rem 0.5rem;
    color: ${() => theme.white};
    background: ${() => theme.primary[500]};
  }
`;

const MainContainer = styled.div`
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  position: relative;
`;

const ExamBoxContainer = styled.div`
  position: relative;
`;

const ExamBox = styled.div`
  border-radius: 0.5rem;
  border: 1px solid ${() => theme.gray};
  padding: 1rem;
  display: flex;
  height: 300px;
  flex-direction: column;
  overflow-y: scroll;
  width: 500px;
  filter: ${(props) => (props.$isLoggedIn ? "none" : "blur(2px)")};
  @media (max-width: 1024px) {
    width: 700px;
  }
  @media (max-width: 768px) {
    width: 300px;
  }
`;

const ExamBoxTitle = styled.div`
  position: relative;
  top: 0.7rem;
  z-index: ${(props) => (props.$isLoggedIn ? "1" : "0")};
  filter: ${(props) => (props.$isLoggedIn ? "none" : "blur(2px)")};
  & > div {
    padding: 0 1rem;
    font-weight: 500;
    background: #fff;
  }
`;

const ExamBoxRow = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid ${() => theme.gray};
  &:nth-of-type(1) {
    border-top: 1px solid ${() => theme.gray};
  }
  justify-content: space-between;
  & > div {
    font-size: 0.9rem;
    font-weight: 600;
    &:nth-of-type(2) {
      border-radius: 0.5rem;
      font-size: 0.8rem;
      font-weight: 400;
      padding: 0.3rem 0.5rem;
      color: #fff;
      background: #082870;
      cursor: pointer;
      &:hover {
        background: #3650a6;
      }
    }
  }
`;

const AuthOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
`;

const AuthContent = styled.div`
  background: #fff;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
`;

const AuthMessage = styled.div`
  font-size: 1.2rem;
  font-weight: 600;
  color: ${() => theme.primary[500]};
  margin-bottom: 1rem;
`;

const AuthButtons = styled.div`
  display: flex;
  justify-content: center;
`;

const LoginButton = styled.button`
  background: ${() => theme.primary[500]};
  color: ${() => theme.white};
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  margin-right: 1rem;
  font-weight: 600;
  &:hover {
    background: ${() => theme.primary[600]};
  }
`;

const SignupButton = styled.button`
  background: ${() => theme.white};
  color: black;
  padding: 0.5rem 1rem;
  border: 1px solid ${() => theme.gray};
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  &:hover {
    background: #f5f5f5;
  }
`;

const LogoutButton = styled.button`
  background: ${() => theme.white};
  text-decoration: underline;
  color: ${() => theme.gray};
  padding: 0.3rem 0.8rem;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  font-weight: 500;
`;

const DebugButton = styled.button`
  background: ${() => theme.primary[500]};
  color: ${() => theme.white};
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  font-weight: 500;
  &:hover {
    background: ${() => theme.primary[600]};
  }
`;

const TeacherButton = styled.button`
  background: ${() => theme.primary[500]};
  color: ${() => theme.white};
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  font-weight: 500;
  &:hover {
    background: ${() => theme.primary[600]};
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: #fff;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  width: 500px;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 800;
  color: ${() => theme.primary[500]};
  margin-bottom: 1rem;
`;

const ModalContent = styled.div`
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  & > div {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    & > span {
      font-weight: 600;
    }
  }
`;

const SelectContainer = styled.div`
  margin-bottom: 1rem;
`;

const SelectButton = styled.button`
  background: ${() => theme.white};
  color: ${() => theme.primary[500]};
  padding: 0.5rem 1rem;
  border: 1px solid ${() => theme.primary[500]};
  border-radius: 0.5rem;
  cursor: pointer;
  margin-right: 0.5rem;
  &:hover {
    background: ${() => theme.primary[100]};
  }
  background: ${(props) =>
    props.$isSelected ? theme.primary[100] : theme.white};
`;

const ModalButtons = styled.div`
  display: flex;
  justify-content: space-between;
`;

const CancelButton = styled.button`
  background: ${() => theme.white};
  color: ${() => theme.gray};
  padding: 0.5rem 1rem;
  border: 1px solid ${() => theme.gray};
  border-radius: 0.5rem;
  cursor: pointer;
  &:hover {
    background: ${() => theme.primary[100]};
  }
`;

const SubmitButton = styled.button`
  background: ${() => theme.primary[500]};
  color: ${() => theme.white};
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  &:hover {
    background: ${() => theme.primary[600]};
  }
  background: ${(props) => (props.disabled ? theme.gray : theme.primary[500])};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
`;
