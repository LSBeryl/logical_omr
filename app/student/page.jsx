"use client";

import styled from "@emotion/styled";
import theme from "../style/theme";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import supabase from "../supbase";

function StudentContent() {
  const [userData, setUserData] = useState(null);
  const [examData, setExamData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showAutoFillModal, setShowAutoFillModal] = useState(false);
  const [graded, setGraded] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [gradedAnswers, setGradedAnswers] = useState({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams.get("examId");
  const selectiveSubject = searchParams.get("selectiveSubject");

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
        if (examId) {
          const { data: examInfo } = await supabase
            .from("Exam")
            .select("*")
            .eq("id", examId)
            .single();

          setExamData(examInfo);
        }
      } catch (error) {
        console.error("데이터 조회 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [examId]);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  const handleInputChange = (e) => {
    const value = e.target.value;
    // 3자리(0~999)를 초과하는 경우 입력 무시
    if (value.length > 3) {
      e.target.value = value.slice(0, 3);
      return;
    }
    // 숫자가 아닌 경우 입력 무시
    if (!/^\d*$/.test(value)) {
      e.target.value = value.replace(/[^\d]/g, "");
      return;
    }
    // 999를 초과하는 경우 입력 무시
    if (parseInt(value) > 999) {
      e.target.value = value.slice(0, 2); // 2자리까지만 유지
      return;
    }
  };

  const handleAnswerChange = (questionNumber, answer) => {
    setAnswers((prev) => ({
      ...prev,
      [questionNumber]: answer,
    }));
  };

  const handleSubmit = async () => {
    // 모든 문제에 대한 답을 배열로 만들기 (없는 값은 null)
    const allAnswers = Array.from({ length: examData.question_num }, (_, i) => {
      const questionNumber = i + 1;
      return answers[questionNumber] || null;
    });

    // 시험 정답 구성
    let correctAnswers = [];

    if (examData.has_selective && examData.selective_range) {
      // 선택 과목이 있는 경우
      const [start, end] = examData.selective_range.split("-").map(Number);
      const selectiveLength = end - start + 1;

      // 공통 과목 정답 (선택 과목 범위 제외)
      const commonAnswers = examData.answers?.split(",") || [];
      const selectiveAnswers = examData.selective_answers?.split(";") || [];

      // 선택된 선택 과목의 답 가져오기
      let selectedSelectiveAnswers = [];
      if (selectiveSubject) {
        const selectiveIndex =
          parseInt(selectiveSubject.replace("selective_", "")) - 1;
        selectedSelectiveAnswers =
          selectiveAnswers[selectiveIndex]?.split(",") || [];
      }

      // 전체 정답 배열 구성
      for (let i = 0; i < examData.question_num; i++) {
        const questionNumber = i + 1;
        if (questionNumber >= start && questionNumber <= end) {
          // 선택 과목 범위
          const selectiveIndex = questionNumber - start;
          correctAnswers.push(selectedSelectiveAnswers[selectiveIndex] || "");
        } else {
          // 공통 과목 범위 - 공통 과목에서의 인덱스 계산
          const commonIndex = questionNumber - 1; // 1번부터 시작하므로 -1
          correctAnswers.push(commonAnswers[commonIndex] || "");
        }
      }
    } else {
      // 선택 과목이 없는 경우
      correctAnswers = examData.answers?.split(",") || [];
    }

    console.log("시험 정답:", correctAnswers);
    console.log("입력된 정답:", allAnswers);
    console.log("원본 answers 객체:", answers);

    try {
      // 선택한 선택과목 번호 계산
      let selectedSelectiveNum = null;
      if (selectiveSubject) {
        selectedSelectiveNum = parseInt(
          selectiveSubject.replace("selective_", "")
        );
      }

      // 채점 수행
      const gradingResult = gradeAnswers(allAnswers, correctAnswers);

      // 틀린 문제 번호들 찾기
      const wrongQuestions = [];
      allAnswers.forEach((answer, index) => {
        const questionNumber = index + 1;
        if (String(answer) !== String(correctAnswers[index])) {
          wrongQuestions.push(questionNumber);
        }
      });

      // Submit 테이블에 답안 저장
      const { data, error } = await supabase.from("Submit").insert({
        exam_id: examId,
        submitted_answer: allAnswers.join(","), // 콤마로 구분하여 저장
        selected_selective_num: selectedSelectiveNum,
        score: gradingResult.score.earnedScore,
        correct_count: gradingResult.score.correct,
        wrong_questions: wrongQuestions.join(","),
      });

      if (error) {
        console.error("답안 제출 오류:", error);
        alert("답안 제출 중 오류가 발생했습니다.");
        return;
      }

      setGradedAnswers(gradingResult.gradedAnswers);
      setScore(gradingResult.score);
      setGraded(true);
      setShowSubmitModal(false);

      console.log("제출된 답안:", data);
    } catch (error) {
      console.error("답안 제출 오류:", error);
      alert("답안 제출 중 오류가 발생했습니다.");
    }
  };

  const gradeAnswers = (studentAnswers, correctAnswers) => {
    let correctCount = 0;
    let totalScore = 0;
    let earnedScore = 0;
    const gradedAnswers = {};

    studentAnswers.forEach((answer, index) => {
      const questionNumber = index + 1;
      const isCorrect = String(answer) === String(correctAnswers[index]);

      gradedAnswers[questionNumber] = {
        answer: answer,
        isCorrect: isCorrect,
      };

      if (isCorrect) {
        correctCount++;
        earnedScore += 1; // 기본 점수 1점
      }
      totalScore += 1; // 기본 점수 1점
    });

    return {
      score: {
        correct: correctCount,
        total: totalScore,
        earnedScore: earnedScore,
      },
      gradedAnswers: gradedAnswers,
    };
  };

  const handleSubmitClick = () => {
    setShowSubmitModal(true);
  };

  const handleAutoFillClick = () => {
    // 모든 답이 이미 채워져 있는지 확인
    const allFilled = Array.from(
      { length: examData.question_num },
      (_, i) => answers[i + 1]
    ).every((answer) => answer !== undefined && answer !== "");

    if (allFilled) {
      alert("모든 답이 이미 입력되어 있습니다.");
      return;
    }

    setShowAutoFillModal(true);
  };

  const executeAutoFill = () => {
    // 랜덤 답 생성 (1-5 또는 0-999)
    const newAnswers = {};
    for (let i = 1; i <= examData.question_num; i++) {
      if (!answers[i]) {
        // 답안 유형에 따라 다른 랜덤 값 생성
        const answerType = getAnswerType(i);
        if (answerType === "객") {
          newAnswers[i] = Math.floor(Math.random() * 5) + 1; // 1-5
        } else {
          newAnswers[i] = Math.floor(Math.random() * 1000); // 0-999
        }
      }
    }
    setAnswers((prev) => ({ ...prev, ...newAnswers }));
    setShowAutoFillModal(false);
  };

  const getAnswerType = (questionNumber) => {
    if (examData.has_selective && examData.selective_range) {
      const [start, end] = examData.selective_range.split("-").map(Number);
      if (questionNumber >= start && questionNumber <= end) {
        // 선택 과목 범위
        const selectiveIndex = questionNumber - start;
        const selectiveTypes = examData.selective_types?.split(",") || [];
        return selectiveTypes[selectiveIndex] || "객";
      } else {
        // 공통 과목 범위
        const commonIndex = questionNumber - 1;
        const commonTypes = examData.answer_types?.split(",") || [];
        return commonTypes[commonIndex] || "객";
      }
    } else {
      // 선택 과목이 없는 경우
      const types = examData.answer_types?.split(",") || [];
      return types[questionNumber - 1] || "객";
    }
  };

  const renderQuestion = (questionNumber) => {
    const answerType = getAnswerType(questionNumber);
    const currentAnswer = answers[questionNumber];
    const isGraded = graded && gradedAnswers[questionNumber];

    if (answerType === "객") {
      return (
        <QuestionRow key={questionNumber}>
          <QuestionNumber>
            {questionNumber}번
            {isGraded && (
              <GradingMark $isCorrect={isGraded.isCorrect}>
                {isGraded.isCorrect ? "○" : "✗"}
              </GradingMark>
            )}
          </QuestionNumber>
          <OptionsContainer>
            {[1, 2, 3, 4, 5].map((option) => (
              <Option
                key={option}
                $isSelected={currentAnswer === option}
                onClick={() => handleAnswerChange(questionNumber, option)}
              >
                {option}
              </Option>
            ))}
          </OptionsContainer>
        </QuestionRow>
      );
    } else {
      return (
        <QuestionRow key={questionNumber}>
          <QuestionNumber>
            {questionNumber}번
            {isGraded && (
              <GradingMark $isCorrect={isGraded.isCorrect}>
                {isGraded.isCorrect ? "○" : "✗"}
              </GradingMark>
            )}
          </QuestionNumber>
          <Input
            type="text"
            placeholder="답을 입력하세요"
            value={currentAnswer || ""}
            onChange={(e) => {
              handleInputChange(e);
              handleAnswerChange(questionNumber, e.target.value);
            }}
            maxLength={3}
          />
        </QuestionRow>
      );
    }
  };

  if (!examData) {
    return <div>시험 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <Wrapper>
      <Header>
        <Title>시험 응시</Title>
        <UserInfo>
          {userData?.name} ({userData?.user_name})
          {selectiveSubject && (
            <span>
              {" "}
              - {selectiveSubject.replace("selective_", "선택 과목 ")}
            </span>
          )}
        </UserInfo>
        <ExamInfo>
          {examData.name} - {examData.question_num}문제
        </ExamInfo>
        {graded && (
          <ScoreInfo>
            점수: {score.earnedScore}점 / {score.total}점 (맞힌 개수:{" "}
            {score.correct}개)
          </ScoreInfo>
        )}
      </Header>

      <ButtonContainer>
        <HomeButton onClick={() => router.push("/")}>홈으로</HomeButton>
        <AutoFillButton onClick={handleAutoFillClick}>자동 답안</AutoFillButton>
      </ButtonContainer>

      <QuestionsContainer>
        {Array.from({ length: examData.question_num }, (_, i) =>
          renderQuestion(i + 1)
        )}
      </QuestionsContainer>

      <SubmitButton onClick={handleSubmitClick}>제출하기</SubmitButton>

      {/* 제출 확인 모달 */}
      {showSubmitModal && (
        <ModalOverlay>
          <Modal>
            <ModalTitle>답안 제출</ModalTitle>
            <ModalContent>
              <p>정말로 답안을 제출하시겠습니까?</p>
              <p>제출 후에는 수정할 수 없습니다.</p>
            </ModalContent>
            <ModalButtons>
              <CancelButton onClick={() => setShowSubmitModal(false)}>
                취소
              </CancelButton>
              <ConfirmButton onClick={handleSubmit}>제출</ConfirmButton>
            </ModalButtons>
          </Modal>
        </ModalOverlay>
      )}

      {/* 자동 답안 확인 모달 */}
      {showAutoFillModal && (
        <ModalOverlay>
          <Modal>
            <ModalTitle>자동 답안 생성</ModalTitle>
            <ModalContent>
              <p>빈 답안에 랜덤한 답을 자동으로 생성합니다.</p>
              <p>이미 입력된 답안은 변경되지 않습니다.</p>
            </ModalContent>
            <ModalButtons>
              <CancelButton onClick={() => setShowAutoFillModal(false)}>
                취소
              </CancelButton>
              <ConfirmButton onClick={executeAutoFill}>생성</ConfirmButton>
            </ModalButtons>
          </Modal>
        </ModalOverlay>
      )}
    </Wrapper>
  );
}

export default function Student() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <StudentContent />
    </Suspense>
  );
}

const Wrapper = styled.div`
  @font-face {
    font-family: "ChosunGu";
    src: url("https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_20-04@1.0/ChosunGu.woff")
      format("woff");
    font-weight: normal;
    font-style: normal;
  }
  &,
  & * {
    font-family: "ChosunGu";
  }
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 0;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid ${() => theme.gray};
`;

const Title = styled.h1`
  margin-bottom: 0.5rem;
`;

const UserInfo = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid ${() => theme.gray};
`;

const ExamInfo = styled.div`
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid ${() => theme.gray};
`;

const ScoreInfo = styled.div`
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid ${() => theme.gray};
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid ${() => theme.gray};
`;

const HomeButton = styled.button`
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  background-color: ${() => theme.primary[500]};
  color: ${() => theme.white};
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: ${() => theme.primary[600]};
  }
`;

const AutoFillButton = styled.button`
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  background-color: ${() => theme.primary[500]};
  color: ${() => theme.white};
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: ${() => theme.primary[600]};
  }
`;

const SubmitButton = styled.button`
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  background-color: ${() => theme.primary[500]};
  color: ${() => theme.white};
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: ${() => theme.primary[600]};
  }
`;

const QuestionsContainer = styled.div`
  border: 2px solid ${() => theme.primary[500]};
  border-radius: 0.5rem;
  width: 200px;
`;

const QuestionRow = styled.div`
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
      width: 55px;
      border-right: 1px solid ${() => theme.primary[300]};
      background-color: ${() => theme.primary[100]};
    }
    &:nth-of-type(2) {
      flex-grow: 1;
      display: flex;
      align-items: center;
      & > div {
        flex-grow: 1;
        display: flex;
        justify-content: space-around;
        & > div {
          font-size: 0.7rem;
          border: 1px solid ${() => theme.primary[300]};
          padding: 0.15rem;
          border-radius: 0.5rem;
          cursor: pointer;
        }
      }
      & > input {
        width: 100%;
        height: 100%;
        border: none;
        outline: none;
        text-align: center;
        font-size: 0.9rem;
      }
    }
    & > div {
      padding: 0.5rem;
    }
  }
  &:last-of-type {
    border-bottom: 0;
    & > div {
      border-bottom-left-radius: 0.5rem;
    }
  }
`;

const QuestionNumber = styled.div`
  width: 55px;
  border-right: 1px solid ${() => theme.primary[300]};
  background-color: ${() => theme.primary[100]};
`;

const OptionsContainer = styled.div`
  flex-grow: 1;
  display: flex;
  justify-content: space-around;
`;

const Option = styled.div`
  padding: 0.15rem;
  border: 1px solid ${() => theme.primary[300]};
  border-radius: 0.5rem;
  cursor: pointer;
  background-color: ${({ $isSelected }) =>
    $isSelected ? theme.primary[300] : "transparent"};
`;

const Input = styled.input`
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  text-align: center;
  font-size: 0.9rem;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Modal = styled.div`
  background-color: ${() => theme.white};
  padding: 2rem;
  border-radius: 0.5rem;
  width: 300px;
  text-align: center;
`;

const ModalTitle = styled.h2`
  margin-bottom: 1rem;
`;

const ModalContent = styled.p`
  margin-bottom: 2rem;
`;

const ModalButtons = styled.div`
  display: flex;
  justify-content: space-around;
`;

const CancelButton = styled.button`
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  background-color: ${() => theme.primary[500]};
  color: ${() => theme.white};
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: ${() => theme.primary[600]};
  }
`;

const ConfirmButton = styled.button`
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  background-color: ${() => theme.primary[500]};
  color: ${() => theme.white};
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: ${() => theme.primary[600]};
  }
`;

const GradingMark = styled.span`
  margin-left: 0.5rem;
  color: ${({ $isCorrect }) => ($isCorrect ? theme.primary[500] : "red")};
`;
