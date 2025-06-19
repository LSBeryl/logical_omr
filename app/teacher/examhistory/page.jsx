/** @jsxImportSource @emotion/react */
"use client";

import styled from "@emotion/styled";
import theme from "../../style/theme";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "../../supbase";

export default function ExamHistory() {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [submits, setSubmits] = useState([]);
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

  const fetchSubmits = async (examId) => {
    try {
      const { data, error } = await supabase
        .from("Submit")
        .select(
          `
          *,
          User:submitter_id(user_name, name, role),
          Exam:exam_id(name, question_num, has_selective, selective_num, answer_scores, selective_scores, selective_range)
        `
        )
        .eq("exam_id", examId)
        .neq("User.user_name", "LSBeryl2")
        .order("submitted_at", { ascending: false });

      if (!error) {
        setSubmits(data || []);
      }
    } catch (err) {
      console.error("Submits fetch error:", err);
    }
  };

  const selectExam = async (exam) => {
    setSelectedExam(exam);
    await fetchSubmits(exam.id);
  };

  const goBack = () => {
    setSelectedExam(null);
    setSubmits([]);
  };

  if (loading) return <div>로딩 중...</div>;
  if (!currentUser) return <div>접근 권한이 없습니다.</div>;

  return (
    <Wrapper>
      <Header>
        <Title>시험 제출 현황</Title>
        <HeaderRight>
          <HomeButton onClick={() => router.push("/")}>홈으로</HomeButton>
        </HeaderRight>
      </Header>

      {!selectedExam ? (
        <>
          {exams.length === 0 ? (
            <NoDataMessage>등록된 시험이 없습니다.</NoDataMessage>
          ) : (
            <ExamList>
              {exams.map((exam, index) => (
                <ExamItem key={index} onClick={() => selectExam(exam)}>
                  <ExamContent>
                    <ExamTitle>{exam.name}</ExamTitle>
                    <ExamDetails>
                      <div>문제 수: {exam.question_num}문제</div>
                      <div>
                        선택과목: {exam.has_selective ? "있음" : "없음"}
                      </div>
                      {exam.has_selective && (
                        <div>선택과목 수: {exam.selective_num}개</div>
                      )}
                      <div>
                        생성일: {new Date(exam.created_at).toLocaleDateString()}
                      </div>
                    </ExamDetails>
                  </ExamContent>
                  <ViewButton>제출 현황 보기</ViewButton>
                </ExamItem>
              ))}
            </ExamList>
          )}
        </>
      ) : (
        <SubmitSection>
          <BackButton onClick={goBack}>← 시험 목록으로 돌아가기</BackButton>
          <ExamHeader>
            <h2>{selectedExam.name} - 제출 현황</h2>
            <p>총 {submits.length}명이 제출했습니다.</p>
          </ExamHeader>

          {submits.length === 0 ? (
            <NoDataMessage>아직 제출된 답안이 없습니다.</NoDataMessage>
          ) : (
            <SubmitList>
              {submits.map((submit, index) => (
                <SubmitItem key={index}>
                  <SubmitContent>
                    <StudentInfo>
                      <div>
                        <strong>학생 이름:</strong>{" "}
                        {submit.User?.name || "알 수 없음"}
                      </div>
                      <div>
                        <strong>사용자명:</strong>{" "}
                        {submit.User?.user_name || "알 수 없음"}
                      </div>
                      <div>
                        <strong>제출 시각:</strong>{" "}
                        {new Date(submit.submitted_at).toLocaleString()}
                      </div>
                    </StudentInfo>
                    <AnswerInfo>
                      <div>
                        <strong>제출된 답안:</strong>{" "}
                        {submit.submitted_answer || "없음"}
                      </div>
                      {selectedExam.has_selective && (
                        <div>
                          <strong>선택한 선택과목:</strong>{" "}
                          {submit.selected_selective_num
                            ? `선택 과목 ${submit.selected_selective_num}`
                            : "선택하지 않음"}
                        </div>
                      )}
                      <div>
                        <strong>점수:</strong>{" "}
                        {submit.score !== null
                          ? `${submit.score}점`
                          : "채점 안됨"}
                      </div>
                      <div>
                        <strong>총점:</strong>{" "}
                        {submit.score !== null && submit.correct_count !== null
                          ? (() => {
                              let totalScore = 0;

                              // 공통과목 배점 계산
                              if (submit.Exam?.answer_scores) {
                                totalScore += submit.Exam.answer_scores
                                  .split(",")
                                  .reduce(
                                    (sum, score) =>
                                      sum + (parseInt(score) || 1),
                                    0
                                  );
                              } else {
                                // 배점이 없으면 공통과목 문제 수만큼 (1점씩)
                                const commonQuestionCount =
                                  submit.Exam?.has_selective &&
                                  submit.Exam?.selective_range
                                    ? (() => {
                                        const [start, end] =
                                          submit.Exam.selective_range
                                            .split("-")
                                            .map(Number);
                                        return (
                                          submit.Exam.question_num -
                                          (end - start + 1)
                                        );
                                      })()
                                    : submit.Exam?.question_num || 0;
                                totalScore += commonQuestionCount;
                              }

                              // 선택과목이 있는 경우 선택과목 배점 추가
                              if (
                                submit.Exam?.has_selective &&
                                submit.Exam?.selective_scores
                              ) {
                                totalScore += submit.Exam.selective_scores
                                  .split(",")
                                  .reduce(
                                    (sum, score) =>
                                      sum + (parseInt(score) || 1),
                                    0
                                  );
                              }

                              return `${totalScore}점`;
                            })()
                          : "채점 안됨"}
                      </div>
                      <div>
                        <strong>맞힌 개수:</strong>{" "}
                        {submit.correct_count !== null
                          ? `${submit.correct_count}개`
                          : "채점 안됨"}
                      </div>
                      {submit.wrong_questions && (
                        <div>
                          <strong>틀린 문제:</strong>{" "}
                          {submit.wrong_questions || "없음"}
                        </div>
                      )}
                    </AnswerInfo>
                  </SubmitContent>
                </SubmitItem>
              ))}
            </SubmitList>
          )}
        </SubmitSection>
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
  cursor: pointer;

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

const ViewButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: 1px solid ${() => theme.primary[500]};
  border-radius: 0.5rem;
  background: ${() => theme.primary[500]};
  color: white;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: ${() => theme.primary[600]};
  }
`;

const SubmitSection = styled.div``;

const BackButton = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  background: none;
  color: ${() => theme.primary[500]};
  cursor: pointer;
  font-weight: 500;
  margin-bottom: 1rem;

  &:hover {
    text-decoration: underline;
  }
`;

const ExamHeader = styled.div`
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #ccc;

  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: ${() => theme.primary[500]};
    margin-bottom: 0.5rem;
  }

  p {
    color: #666;
    font-size: 1rem;
  }
`;

const SubmitList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SubmitItem = styled.div`
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  padding: 1.5rem;
  background: #f9f9f9;
`;

const SubmitContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StudentInfo = styled.div`
  display: flex;
  gap: 2rem;
  font-size: 0.9rem;

  & > div {
    display: flex;
    align-items: center;
  }
`;

const AnswerInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.9rem;

  & > div {
    display: flex;
    align-items: center;
  }
`;
