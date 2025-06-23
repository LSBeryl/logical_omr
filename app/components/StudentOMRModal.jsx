/** @jsxImportSource @emotion/react */
import styled from "@emotion/styled";
import theme from "../style/theme";

export default function StudentOMRModal({ open, onClose, submit, student }) {
  if (!open || !submit || !student) return null;

  const examData = submit.Exam;
  const submittedAnswers = submit.submitted_answer
    ? submit.submitted_answer.split(",").map((v) => parseInt(v.trim()) || 0)
    : [];

  // 문제 유형 확인 함수
  const getAnswerType = (questionNumber) => {
    if (examData?.has_selective && examData?.selective_range) {
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
      return examData?.answer_types?.split(",")[questionNumber - 1] || "객";
    }
  };

  // 정답 확인 함수
  const getCorrectAnswer = (questionNumber) => {
    if (examData?.has_selective && examData?.selective_range) {
      const [start, end] = examData.selective_range.split("-").map(Number);
      if (questionNumber >= start && questionNumber <= end) {
        // 선택 과목 범위의 문제
        const selectiveIndex = questionNumber - start;
        const selectiveAnswers = examData.selective_answers?.split(";") || [];
        const selectedSelectiveIndex = submit.selected_selective_num - 1;
        if (selectiveAnswers[selectedSelectiveIndex]) {
          const answers = selectiveAnswers[selectedSelectiveIndex].split(",");
          return parseInt(answers[selectiveIndex]) || 0;
        }
        return 0;
      } else {
        // 공통 과목 범위의 문제
        const commonAnswers = examData.answers?.split(",") || [];
        return parseInt(commonAnswers[questionNumber - 1]) || 0;
      }
    } else {
      // 선택 과목이 없는 경우
      const answers = examData?.answers?.split(",") || [];
      return parseInt(answers[questionNumber - 1]) || 0;
    }
  };

  // 채점 결과 확인 함수
  const isCorrect = (questionNumber) => {
    const studentAnswer = submittedAnswers[questionNumber - 1];
    const correctAnswer = getCorrectAnswer(questionNumber);
    return studentAnswer === correctAnswer;
  };

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>OMR 답안</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <StudentInfo>
          <div>
            <strong>학생:</strong> {student.name} ({student.user_name})
          </div>
          <div>
            <strong>시험:</strong> {examData?.name}
          </div>
          <div>
            <strong>제출 시각:</strong>{" "}
            {new Date(submit.submitted_at).toLocaleString()}
          </div>
          {submit.selected_selective_num && (
            <div>
              <strong>선택 과목:</strong>{" "}
              {examData?.selective_name
                ? examData.selective_name.split(",")[
                    submit.selected_selective_num - 1
                  ]
                : `선택 과목 ${submit.selected_selective_num}`}
            </div>
          )}
          <div>
            <strong>점수:</strong>{" "}
            {submit.score !== null ? `${submit.score}점` : "채점 안됨"}
          </div>
        </StudentInfo>

        <OMRContainer>
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
              const studentAnswer = submittedAnswers[questionNumber - 1];
              const correctAnswer = getCorrectAnswer(questionNumber);
              const isCorrectAnswer = isCorrect(questionNumber);

              return (
                <OMRRow key={i}>
                  <div>
                    <div>
                      {questionNumber}
                      {submit.score !== null && (
                        <GradeMark>
                          {isCorrectAnswer ? (
                            <CorrectCircle></CorrectCircle>
                          ) : (
                            <IncorrectMark>✗</IncorrectMark>
                          )}
                        </GradeMark>
                      )}
                    </div>
                  </div>
                  <div>
                    {answerType === "객" ? (
                      // 객관식
                      <div>
                        {[1, 2, 3, 4, 5].map((option) => (
                          <div
                            key={option}
                            style={{
                              backgroundColor:
                                studentAnswer === option
                                  ? theme.black
                                  : "transparent",
                              border:
                                studentAnswer === option
                                  ? `1px solid ${theme.black}`
                                  : `1px solid ${theme.primary[300]}`,
                              color:
                                studentAnswer === option
                                  ? theme.black
                                  : "black",
                            }}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    ) : (
                      // 주관식
                      <div>
                        <input
                          type="number"
                          value={studentAnswer || ""}
                          readOnly
                          style={{
                            width: "100%",
                            height: "100%",
                            backgroundColor:
                              submit.score !== null
                                ? isCorrectAnswer
                                  ? "#e8f5e8"
                                  : "#ffeaea"
                                : "#f5f5f5",
                            border: "none",
                            outline: "none",
                            textAlign: "center",
                            fontSize: "0.9rem",
                            padding: "0.5rem",
                            borderRadius: "0.25rem",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </OMRRow>
              );
            })}
          </OMR>
        </OMRContainer>

        <ModalFooter>
          <CloseModalButton onClick={onClose}>닫기</CloseModalButton>
        </ModalFooter>
      </Modal>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const Modal = styled.div`
  background: white;
  border-radius: 0.5rem;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    max-width: 95vw;
    max-height: 95vh;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;

  @media (max-width: 768px) {
    padding: 0.8rem;
  }
`;

const ModalTitle = styled.h2`
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;

  &:hover {
    color: #333;
  }

  @media (max-width: 768px) {
    font-size: 1.3rem;
  }
`;

const StudentInfo = styled.div`
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.9rem;

  @media (max-width: 768px) {
    padding: 0.8rem;
    font-size: 0.8rem;
    gap: 0.3rem;
  }
`;

const OMRContainer = styled.div`
  padding: 1rem;
  display: flex;
  justify-content: center;

  @media (max-width: 768px) {
    padding: 0.8rem;
  }
`;

const OMR = styled.div`
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
  border: 2px solid ${() => theme.primary[500]};
  border-radius: 0.5rem;
  width: 200px;

  @media (max-width: 768px) {
    width: 180px;
    border-width: 1px;
  }
`;

const OMRHead = styled.div`
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

      & > div {
        border-radius: 0.5rem 0 0 0;
      }
    }

    &:nth-of-type(2) {
      flex-grow: 1;

      & > div {
        border-radius: 0 0.5rem 0 0;
        display: flex;
        justify-content: space-evenly;
      }
    }

    & > div {
      padding: 0.5rem;
      background-color: ${() => theme.primary[100]};
    }
  }

  @media (max-width: 768px) {
    & > div {
      & > div {
        padding: 0.3rem;
        font-size: 0.8rem;
      }
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

  &:last-of-type {
    border-bottom: 0;

    & > div {
      border-bottom-left-radius: 0.5rem;
    }
  }

  & > div {
    text-align: center;

    &:nth-of-type(1) {
      // 문제 번호
      width: 55px;
      border-right: 1px solid ${() => theme.primary[300]};
      background-color: ${() => theme.primary[100]};
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      padding: 0.5rem;
      flex-shrink: 0;
    }

    &:nth-of-type(2) {
      // 선지 컨테이너
      flex-grow: 1;
      display: flex;
      align-items: center;
      padding: 0.5rem;

      & > div {
        // 선지 컨테이너
        flex-grow: 1;
        display: flex;
        justify-content: space-around;
        align-items: center;

        & > div {
          // 선지
          font-size: 0.7rem;
          border: 1px solid ${() => theme.primary[300]};
          padding: 0.15rem;
          border-radius: 0.5rem;
          cursor: default;
          min-width: 10px;
          text-align: center;
        }
      }

      & > input {
        width: 100%;
        height: 100%;
        border: none;
        outline: none;
        text-align: center;
        font-size: 0.9rem;
        padding: 0.5rem;
        border-radius: 0.25rem;
      }
    }
  }

  @media (max-width: 768px) {
    & > div {
      &:nth-of-type(1) {
        width: 45px;
        padding: 0.3rem;
        font-size: 0.8rem;
      }

      &:nth-of-type(2) {
        padding: 0.3rem;

        & > div {
          & > div {
            font-size: 0.6rem;
            padding: 0.1rem;
            min-width: 8px;
          }
        }

        & > input {
          font-size: 0.8rem;
          padding: 0.3rem;
        }
      }
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

const ModalFooter = styled.div`
  padding: 1rem;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;

  @media (max-width: 768px) {
    padding: 0.8rem;
  }
`;

const CloseModalButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid #ccc;
  border-radius: 0.25rem;
  background: white;
  color: #333;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    background: #f5f5f5;
  }

  @media (max-width: 768px) {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  }
`;
