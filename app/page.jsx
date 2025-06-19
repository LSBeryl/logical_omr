/** @jsxImportSource @emotion/react */
"use client";

import styled from "@emotion/styled";
import { css } from "@emotion/react";
import theme from "./style/theme";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "./supbase";
import { useAuth } from "./components/AuthProvider";

export default function Main() {
  const [code, setCode] = useState("");
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [showSelectiveModal, setShowSelectiveModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const router = useRouter();

  const { user, userData, loading, error, signOut } = useAuth();

  useEffect(() => {
    // 시험 목록 가져오기 - 최적화
    const fetchExams = async () => {
      try {
        setExamsLoading(true);
        console.log("시험 목록 가져오기 시작");

        const { data: examList, error: examError } = await supabase
          .from("Exam")
          .select("*")
          .order("created_at", { ascending: false });

        if (examError) {
          console.error("시험 목록 가져오기 실패:", examError);
          setExams([]);
        } else {
          console.log("시험 목록 가져오기 성공:", examList?.length || 0, "개");
          setExams(examList || []);
        }
      } catch (error) {
        console.error("시험 목록 조회 중 오류:", error);
        setExams([]);
      } finally {
        setExamsLoading(false);
      }
    };

    // 인증 상태와 관계없이 시험 목록은 바로 가져오기
    fetchExams();
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

  const handleLogout = async () => {
    await signOut();
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
    return (
      <Wrapper>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            gap: "1rem",
          }}
        >
          <div
            style={{
              fontSize: "1.2rem",
              fontWeight: "600",
              color: theme.primary[500],
            }}
          >
            로딩 중...
          </div>
          <div style={{ fontSize: "0.9rem", color: "#666" }}>
            인증 상태를 확인하고 있습니다
          </div>
          <div style={{ fontSize: "0.8rem", color: "#999" }}>
            잠시만 기다려주세요
          </div>
        </div>
      </Wrapper>
    );
  }

  if (error) {
    return (
      <Wrapper>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            gap: "1rem",
          }}
        >
          <div
            style={{ fontSize: "1.2rem", fontWeight: "600", color: "#e74c3c" }}
          >
            연결 오류
          </div>
          <div
            style={{
              fontSize: "0.9rem",
              color: "#666",
              textAlign: "center",
              maxWidth: "400px",
            }}
          >
            {error.includes("타임아웃")
              ? "서버 연결이 지연되고 있습니다. 잠시 후 다시 시도해주세요."
              : error.includes("환경 변수")
              ? "서버 설정에 문제가 있습니다. 관리자에게 문의해주세요."
              : error}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#999" }}>
            오류 코드: {error}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: theme.primary[500],
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            다시 시도
          </button>
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <TopBar>
        {user && userData && (
          <UserInfo>
            현재 로그인 계정 : {userData.name}
            {userData.user_name && (
              <span style={{ color: "#888", marginLeft: 4 }}>
                ({userData.user_name})
              </span>
            )}
          </UserInfo>
        )}
      </TopBar>
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
            {examsLoading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100px",
                  color: "#666",
                  fontSize: "0.9rem",
                }}
              >
                시험 목록을 불러오는 중...
              </div>
            ) : exams.length > 0 ? (
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
        {/* 디버그 정보 표시 (개발 환경에서만) */}
        {process.env.NODE_ENV === "development" && (
          <div
            style={{
              position: "fixed",
              bottom: "10px",
              right: "10px",
              background: "rgba(0,0,0,0.8)",
              color: "white",
              padding: "10px",
              borderRadius: "5px",
              fontSize: "12px",
              maxWidth: "300px",
            }}
          >
            <div>User: {user ? "로그인됨" : "로그아웃됨"}</div>
            <div>UserData: {userData ? userData.user_name : "없음"}</div>
            <div>Loading: {loading ? "예" : "아니오"}</div>
            {error && <div>Error: {error}</div>}
          </div>
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

const TopBar = styled.div`
  width: 100vw;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0.5rem 2rem 0 0;
  min-height: 2rem;
`;

const UserInfo = styled.div`
  font-size: 0.95rem;
  color: #444;
  opacity: 0.8;
  font-weight: 400;
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
  margin-bottom: 1rem;
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
