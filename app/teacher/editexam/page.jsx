/** @jsxImportSource @emotion/react */
"use client";

import styled from "@emotion/styled";
import theme from "../../style/theme";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "../../supbase";

export default function EditExam() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 현재 로그인한 사용자 확인
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        // User 테이블에서 사용자 정보 가져오기
        const { data: userData, error: userError } = await supabase
          .from("User")
          .select("user_name, role, email")
          .eq("id", user.id)
          .single();

        if (userError || !userData) {
          router.push("/");
          return;
        }

        // LSBeryl, 선생님 역할, 또는 특정 이메일만 접근 허용
        if (
          userData.user_name === "LSBeryl" ||
          userData.role === "teacher" ||
          userData.email === "dltjgus8098@naver.com"
        ) {
          setCurrentUser(userData);
          await fetchExams();
        } else {
          router.push("/");
        }
      } catch (err) {
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from("Exam")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error) {
        setExams(data || []);
      }
    } catch (err) {
      console.error("Exams fetch error:", err);
    }
  };

  const deleteExam = async (examId) => {
    if (!confirm("정말로 이 시험을 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase.from("Exam").delete().eq("id", examId);

      if (error) {
        alert("삭제 중 오류: " + error.message);
        return;
      }

      alert("시험이 성공적으로 삭제되었습니다.");
      await fetchExams();
    } catch (err) {
      alert("삭제 중 오류가 발생했습니다: " + err.message);
    }
  };

  const editExam = (examId) => {
    // 시험 수정 페이지로 이동
    router.push(`/teacher/editexam/${examId}`);
  };

  if (loading) return <div>로딩 중...</div>;
  if (!currentUser) return <div>접근 권한이 없습니다.</div>;

  return (
    <Wrapper>
      <Header>
        <Title>시험 관리</Title>
        <HeaderRight>
          <HomeButton onClick={() => router.push("/")}>홈으로</HomeButton>
        </HeaderRight>
      </Header>

      {exams.length === 0 ? (
        <NoDataMessage>등록된 시험이 없습니다.</NoDataMessage>
      ) : (
        <ExamList>
          {exams.map((exam, index) => (
            <ExamItem key={index}>
              <ExamContent>
                <ExamTitle>{exam.name}</ExamTitle>
                <ExamDetails>
                  <div>문제 수: {exam.question_num}문제</div>
                  <div>선택과목: {exam.has_selective ? "있음" : "없음"}</div>
                  {exam.has_selective && (
                    <div>선택과목 수: {exam.selective_num}개</div>
                  )}
                  <div>
                    생성일: {new Date(exam.created_at).toLocaleDateString()}
                  </div>
                </ExamDetails>
              </ExamContent>
              <ButtonContainer>
                <EditButton onClick={() => editExam(exam.id)}>수정</EditButton>
                <DeleteButton onClick={() => deleteExam(exam.id)}>
                  삭제
                </DeleteButton>
              </ButtonContainer>
            </ExamItem>
          ))}
        </ExamList>
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid ${() => theme.primary[500]};
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${() => theme.primary[500]};
`;

const HeaderRight = styled.div`
  display: flex;
  gap: 1rem;
`;

const HomeButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  background: white;
  color: ${() => theme.primary[500]};
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #f0f0f0;
  }
`;

const NoDataMessage = styled.div`
  text-align: center;
  padding: 3rem;
  font-size: 1.2rem;
  color: #666;
`;

const ExamList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ExamItem = styled.div`
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  padding: 1.5rem;
  background: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const ExamContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const ExamTitle = styled.h3`
  font-size: 1.3rem;
  font-weight: 700;
  color: ${() => theme.primary[500]};
  line-height: 1.2;
`;

const ExamDetails = styled.div`
  display: flex;
  gap: 2rem;
  font-size: 0.9rem;
  color: #666;
  line-height: 1.2;

  & > div {
    display: flex;
    align-items: center;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const EditButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid ${() => theme.primary[500]};
  border-radius: 0.5rem;
  background: white;
  color: ${() => theme.primary[500]};
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: ${() => theme.primary[500]};
    color: white;
  }
`;

const DeleteButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid #dc3545;
  border-radius: 0.5rem;
  background: white;
  color: #dc3545;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #dc3545;
    color: white;
  }
`;
