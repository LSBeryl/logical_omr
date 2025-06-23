/** @jsxImportSource @emotion/react */
"use client";

import styled from "@emotion/styled";
import theme from "../../style/theme";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import supabase from "../../supabase";

function DetailedExamContent() {
  const [userData, setUserData] = useState(null);
  const [examData, setExamData] = useState(null);
  const [submitData, setSubmitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentAnswers, setStudentAnswers] = useState({});
  const [correctAnswers, setCorrectAnswers] = useState({});
  const [gradedAnswers, setGradedAnswers] = useState({});
  const [score, setScore] = useState({
    correct: 0,
    total: 0,
    earnedScore: 0,
    totalScore: 0,
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams.get("examId");
  const submitId = searchParams.get("submitId");

  // gradeAnswers 함수를 컴포넌트 최상단으로 이동
  const gradeAnswers = (studentAnswers, correctAnswers, examData) => {
    let correctCount = 0;
    let totalScore = 0;
    let earnedScore = 0;
    const gradedAnswers = {};

    // 선택과목 정보 파싱
    let selectiveStart = null;
    let selectiveEnd = null;
    let selectiveScoresArr = [];
    let selectiveTypesArr = [];

    if (examData.has_selective && examData.selective_range) {
      [selectiveStart, selectiveEnd] = examData.selective_range
        .split("-")
        .map(Number);
      selectiveScoresArr = examData.selective_scores?.split(",") || [];
      selectiveTypesArr = examData.selective_types?.split(",") || [];
    }

    const commonScoresArr = examData.answer_scores?.split(",") || [];
    const commonTypesArr = examData.answer_types?.split(",") || [];

    // 각 문제별 채점
    for (let i = 0; i < examData.question_num; i++) {
      const questionNumber = i + 1;
      const studentAnswer = studentAnswers[questionNumber];
      const correctAnswer = correctAnswers[questionNumber];

      let questionScore = 0;
      let answerType = "객";

      // 문제 유형과 배점 결정
      if (examData.has_selective && selectiveStart && selectiveEnd) {
        if (
          questionNumber >= selectiveStart &&
          questionNumber <= selectiveEnd
        ) {
          // 선택 과목 범위의 문제
          const selectiveIndex = questionNumber - selectiveStart;
          questionScore = parseInt(selectiveScoresArr[selectiveIndex]) || 0;
          answerType = selectiveTypesArr[selectiveIndex] || "객";
        } else {
          // 공통 과목 범위의 문제
          const commonIndex = questionNumber - 1;
          questionScore = parseInt(commonScoresArr[commonIndex]) || 0;
          answerType = commonTypesArr[commonIndex] || "객";
        }
      } else {
        // 선택 과목이 없는 경우
        questionScore = parseInt(commonScoresArr[i]) || 0;
        answerType = commonTypesArr[i] || "객";
      }

      totalScore += questionScore;

      // 정답 여부 확인 - 문자열로 변환하여 비교
      console.log(
        `문제 ${questionNumber}: 학생답=${studentAnswer}, 정답=${correctAnswer}, 타입=${typeof studentAnswer}/${typeof correctAnswer}`
      );

      if (String(studentAnswer) === String(correctAnswer)) {
        correctCount++;
        earnedScore += questionScore;
        gradedAnswers[questionNumber] = "correct";
        console.log(`문제 ${questionNumber}: 정답!`);
      } else {
        gradedAnswers[questionNumber] = "incorrect";
        console.log(`문제 ${questionNumber}: 오답!`);
      }
    }

    return {
      gradedAnswers,
      score: {
        correct: correctCount,
        total: examData.question_num,
        earnedScore,
        totalScore,
      },
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 사용자 정보 가져오기
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: userInfo } = await supabase
            .from("User")
            .select("user_name, name, role, school, grade")
            .eq("id", user.id)
            .single();

          setUserData(userInfo);
        }

        // 시험 정보 가져오기
        let examInfo = null;
        if (examId) {
          const { data: examData } = await supabase
            .from("Exam")
            .select("*")
            .eq("id", examId)
            .single();

          examInfo = examData;
          setExamData(examData);
        }

        // 제출 정보 가져오기
        if (submitId) {
          const { data: submitInfo } = await supabase
            .from("Submit")
            .select("*")
            .eq("id", submitId)
            .single();

          setSubmitData(submitInfo);

          // 학생 답안 파싱
          let studentAnswersObj = {};
          if (submitInfo.submitted_answer) {
            const answers = submitInfo.submitted_answer.split(",");
            answers.forEach((answer, index) => {
              if (answer && answer !== "null") {
                studentAnswersObj[index + 1] = parseInt(answer);
              }
            });
            setStudentAnswers(studentAnswersObj);
          }

          // 정답 구성
          if (examInfo) {
            const correctAnswersObj = {};

            if (examInfo.has_selective && examInfo.selective_range) {
              // 선택 과목이 있는 경우
              const [start, end] = examInfo.selective_range
                .split("-")
                .map(Number);
              const selectiveLength = end - start + 1;

              // 공통 과목 정답 (선택 과목 범위 제외)
              const commonAnswers = examInfo.answers?.split(",") || [];
              const selectiveAnswers =
                examInfo.selective_answers?.split(";") || [];

              // 선택된 선택 과목의 답 가져오기
              let selectedSelectiveAnswers = [];
              if (submitInfo.selected_selective_num) {
                const selectiveIndex = submitInfo.selected_selective_num - 1;
                selectedSelectiveAnswers =
                  selectiveAnswers[selectiveIndex]?.split(",") || [];
              }

              // 전체 정답 배열 구성
              for (let i = 0; i < examInfo.question_num; i++) {
                const questionNumber = i + 1;
                if (questionNumber >= start && questionNumber <= end) {
                  // 선택 과목 범위
                  const selectiveIndex = questionNumber - start;
                  correctAnswersObj[questionNumber] =
                    selectedSelectiveAnswers[selectiveIndex] || "";
                } else {
                  // 공통 과목 범위
                  const commonIndex = questionNumber - 1;
                  correctAnswersObj[questionNumber] =
                    commonAnswers[commonIndex] || "";
                }
              }
            } else {
              // 선택 과목이 없는 경우
              const answers = examInfo.answers?.split(",") || [];
              answers.forEach((answer, index) => {
                if (answer) {
                  correctAnswersObj[index + 1] = answer;
                }
              });
            }

            setCorrectAnswers(correctAnswersObj);

            // 채점 결과 계산 - 모든 데이터가 준비된 후 실행
            console.log("채점 시작:", {
              studentAnswers: studentAnswersObj,
              correctAnswers: correctAnswersObj,
              examInfo: examInfo,
            });

            console.log("정답 구성 상세:", {
              hasSelective: examInfo.has_selective,
              selectiveRange: examInfo.selective_range,
              commonAnswers: examInfo.answers?.split(","),
              selectiveAnswers: examInfo.selective_answers?.split(";"),
              selectedSelectiveNum: submitInfo.selected_selective_num,
            });

            const gradingResult = gradeAnswers(
              studentAnswersObj,
              correctAnswersObj,
              examInfo
            );

            console.log("채점 결과:", gradingResult);

            setGradedAnswers(gradingResult.gradedAnswers);
            setScore(gradingResult.score);
          }
        }
      } catch (error) {
        console.error("데이터 조회 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [examId, submitId]);

  if (loading) {
    return (
      <Wrapper>
        <LoadingMessage>로딩 중...</LoadingMessage>
      </Wrapper>
    );
  }

  const getAnswerType = (questionNumber) => {
    if (examData.has_selective && examData.selective_range) {
      const [start, end] = examData.selective_range.split("-").map(Number);
      if (questionNumber >= start && questionNumber <= end) {
        // 선택 과목 범위의 문제
        const selectiveIndex = questionNumber - start;
        return examData.selective_types?.split(",")[selectiveIndex] || "객";
      } else {
        // 공통 과목 범위의 문제
        const commonIndex = questionNumber - 1;
        return examData.answer_types?.split(",")[commonIndex] || "객";
      }
    } else {
      // 선택 과목이 없는 경우
      const commonIndex = questionNumber - 1;
      return examData.answer_types?.split(",")[commonIndex] || "객";
    }
  };

  return (
    <Wrapper>
      <Header>
        <HeaderContent>
          <HeaderLeft>
            <ExamTitle>{examData?.name}</ExamTitle>
            <ExamDate>
              제출일:{" "}
              {submitData &&
                new Date(submitData.submitted_at).toLocaleDateString()}
            </ExamDate>
            {submitData?.selected_selective_num && (
              <SelectiveSubject>
                선택 과목:{" "}
                {examData?.selective_name
                  ? examData.selective_name.split(",")[
                      submitData.selected_selective_num - 1
                    ] || `선택 과목 ${submitData.selected_selective_num}`
                  : `선택 과목 ${submitData.selected_selective_num}`}
              </SelectiveSubject>
            )}
          </HeaderLeft>
          <HeaderRight>
            <ScoreDisplay>
              {score.earnedScore} / {score.totalScore}점
            </ScoreDisplay>
            <AccuracyDisplay>
              정답률:{" "}
              {score.total > 0
                ? Math.round((score.correct / score.total) * 100)
                : 0}
              %
            </AccuracyDisplay>
          </HeaderRight>
        </HeaderContent>
      </Header>

      <OMR>
        <OMRHead>
          <div>
            <div>문번</div>
          </div>
          <div>
            <div>
              <span>답</span>
              <span>란</span>
            </div>
          </div>
        </OMRHead>
        {Array.from({ length: examData?.question_num || 0 }, (_, i) => {
          const questionNumber = i + 1;
          const answerType = getAnswerType(questionNumber);
          const studentAnswer = studentAnswers[questionNumber];
          const correctAnswer = correctAnswers[questionNumber];
          const isCorrect = gradedAnswers[questionNumber] === "correct";

          return (
            <OMRRow key={i}>
              <div>
                <div>
                  {questionNumber}
                  <GradeMark>
                    {isCorrect ? (
                      <CorrectCircle></CorrectCircle>
                    ) : (
                      <IncorrectMark>✗</IncorrectMark>
                    )}
                  </GradeMark>
                </div>
              </div>
              <div>
                {answerType === "객" ? (
                  // 객관식
                  <div>
                    {[1, 2, 3, 4, 5].map((option) => (
                      <OMROption
                        key={option}
                        $isSelected={studentAnswer === option}
                      >
                        {option}
                      </OMROption>
                    ))}
                  </div>
                ) : (
                  // 주관식
                  <div>
                    <OMRInput
                      type="number"
                      value={studentAnswer || ""}
                      readOnly
                      $isCorrect={isCorrect}
                    />
                  </div>
                )}
              </div>
            </OMRRow>
          );
        })}
      </OMR>

      <ButtonContainer>
        <HomeButton onClick={() => router.push("/")}>
          홈으로 돌아가기
        </HomeButton>
      </ButtonContainer>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  padding: 1rem;
  min-height: 100vh;
  background-color: ${() => theme.white};
  display: flex;
  flex-direction: column;
  align-items: center;

  /* width: 200px; */

  @media (max-width: 768px) {
    padding: 0.5rem;
  }
`;

const Header = styled.div`
  margin-bottom: 2rem;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid ${() => theme.gray};
  background-color: ${() => theme.primary[50]};
  width: 500px;

  @media (max-width: 1024px) {
    width: 700px;
  }
  @media (max-width: 768px) {
    width: 300px;
    margin-bottom: 1rem;
    padding: 0.8rem;
  }
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HeaderLeft = styled.div`
  flex: 1;
`;

const HeaderRight = styled.div`
  text-align: right;
`;

const ExamTitle = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
`;

const ExamDate = styled.div`
  color: #666;
  font-size: 0.9rem;
  margin-top: 0.3rem;
`;

const SelectiveSubject = styled.div`
  color: #666;
  font-size: 0.9rem;
  margin-top: 0.3rem;
`;

const ScoreDisplay = styled.div`
  font-size: 1.2rem;
  font-weight: 600;
  color: #28a745;
`;

const AccuracyDisplay = styled.div`
  font-size: 0.9rem;
  color: #666;
`;

const OMR = styled.div`
  border: 2px solid ${() => theme.primary[300]};
  border-radius: 0.5rem;
  overflow: hidden;
  margin-bottom: 1rem;
  width: 100%;
  max-width: 800px;

  @media (max-width: 768px) {
    border-width: 1px;
    font-size: 0.8rem;
  }
`;

const OMRHead = styled.div`
  display: flex;
  background-color: ${() => theme.primary[200]};
  font-weight: bold;
  color: ${() => theme.primary[700]};

  & > div {
    text-align: center;
    padding: 0.5rem;

    &:nth-of-type(1) {
      width: 55px;
      border-right: 1px solid ${() => theme.primary[300]};
    }

    &:nth-of-type(2) {
      flex-grow: 1;
      display: flex;
      align-items: center;
      justify-content: center;

      & > div {
        display: flex;
        gap: 0.5rem;

        @media (max-width: 768px) {
          gap: 0.2rem;
          font-size: 0.7rem;
        }
      }
    }
  }

  @media (max-width: 768px) {
    font-size: 0.8rem;

    & > div {
      padding: 0.3rem;
    }
  }
`;

const OMRRow = styled.div`
  display: flex;

  &:nth-of-type(1) {
    border-bottom: 1px solid ${() => theme.primary[300]};
  }

  &:nth-of-type(5n + 1) {
    border-bottom: 1px solid ${() => theme.primary[300]};
  }

  & > div {
    text-align: center;

    &:nth-of-type(1) {
      // 문제 번호
      width: 55px;
      border-right: 1px solid ${() => theme.primary[300]};
      background-color: ${() => theme.primary[100]};
    }

    &:nth-of-type(2) {
      // 선지 컨테이너
      flex-grow: 1;
      display: flex;
      align-items: center;
      justify-content: center;

      & > div {
        display: flex;
        gap: 0.5rem;

        @media (max-width: 768px) {
          gap: 0.2rem;
          font-size: 0.7rem;
        }
      }
    }
  }

  @media (max-width: 768px) {
    font-size: 0.8rem;

    & > div {
      padding: 0.3rem;
    }
  }
`;

const GradeMark = styled.span`
  margin-left: 0.5rem;
`;

const CorrectCircle = styled.span`
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid red;
  border-radius: 50%;
  background-color: transparent;
  vertical-align: middle;
  margin-left: 2px;
`;

const IncorrectMark = styled.span`
  color: red;
  font-size: 1.2rem;
`;

const OMROption = styled.div`
  background-color: ${(props) =>
    props.$isSelected ? theme.black : "transparent"};
  border: ${(props) =>
    props.$isSelected
      ? `1px solid ${theme.black}`
      : `1px solid ${theme.primary[300]}`};
  color: ${(props) => (props.$isSelected ? theme.black : "black")};
  padding: 0.15rem;
  border-radius: 0.5rem;
  cursor: default;
  min-width: 10px;
  text-align: center;
`;

const OMRInput = styled.input`
  width: 100%;
  height: 100%;
  background-color: ${(props) => (props.$isCorrect ? "#e8f5e8" : "#ffeaea")};
  border: none;
  outline: none;
  text-align: center;
  font-size: 0.9rem;
  padding: 0.5rem;
  border-radius: 0.25rem;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 2rem;
`;

const HomeButton = styled.button`
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

  @media (max-width: 768px) {
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
  }
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 2rem;
  font-size: 1.1rem;
  color: #666;
`;

export default function DetailedExam() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <DetailedExamContent />
    </Suspense>
  );
}
