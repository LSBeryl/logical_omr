"use client";

import styled from "@emotion/styled";
import theme from "../style/theme";
import { useEffect, useState } from "react";

export default function TeacherNewExamModal({
  type,
  setShowModal,
  hasSelective,
  examNum,
  selectiveRange,
  setAnswerTypesArray,
  setSelectiveAnswerTypesArray,
  answerTypesArray,
  selectiveAnswerTypesArray,
  selectiveSubjects,
  setSelectiveSubjects,
  answers,
  setAnswers,
  answerScores,
  setAnswerScores,
  selectiveScores,
  setSelectiveScores,
}) {
  const [modalType, setModalType] = useState(""); // A 타입 : 주관식/객관식 | B 타입 : 숫자 입력
  const [selectiveNum, setSelectiveNum] = useState([0, 0, 0]); // 선택 문제 개수[0], 시작 문제 번호[1], 끝 문제 번호[2]
  const [currentSelectiveIndex, setCurrentSelectiveIndex] = useState(0); // 현재 선택 과목 인덱스

  useEffect(() => {
    type.includes("문제 유형") ? setModalType("A") : setModalType("B");

    // 선택 과목 통합 모달인지 확인 (문제 유형, 배점)
    const isSelectiveUnifiedModal =
      type.includes("선택 과목") &&
      (type.includes("문제 유형") || type.includes("배점")) &&
      !type.includes("답");

    // 선택 과목인지 확인하고 해당 인덱스 찾기
    if (type.includes("선택 과목")) {
      if (isSelectiveUnifiedModal) {
        // 선택 과목 통합 모달인 경우 - selectiveIndex 설정하지 않음
        if (selectiveRange) {
          const startNum = Number(selectiveRange.split("-")[0]);
          const endNum = Number(selectiveRange.split("-")[1]);
          setSelectiveNum([endNum - startNum + 1, startNum, endNum]);
        }
      } else {
        // 특정 선택 과목 모달인 경우
        const selectiveIndex = selectiveSubjects.findIndex((subject) =>
          type.includes(subject.name)
        );
        if (selectiveIndex !== -1) {
          setCurrentSelectiveIndex(selectiveIndex);
          // 선택 과목은 공통 과목 이후의 문제들을 의미
          if (selectiveRange) {
            const startNum = Number(selectiveRange.split("-")[0]);
            const endNum = Number(selectiveRange.split("-")[1]);
            setSelectiveNum([endNum - startNum + 1, startNum, endNum]);
          }
        }
      }
    } else {
      // 공통 과목인 경우
      setSelectiveNum(() => {
        if (hasSelective) {
          const startNum = Number(selectiveRange.split("-")[0]);
          const endNum = Number(selectiveRange.split("-")[1]);

          return [endNum - startNum + 1, startNum, endNum];
        } else return [0, null, null];
      });
    }

    // 공통 과목 문제 유형 배열 초기화
    if (answerTypesArray.length === 0) {
      setAnswerTypesArray(
        Array.from({
          length: hasSelective
            ? examNum -
              (Number(selectiveRange.split("-")[1]) -
                Number(selectiveRange.split("-")[0]) +
                1)
            : examNum,
        }).map(() => "객")
      );
    }

    // 선택 과목 문제 유형 배열 초기화 - 배열이 비어있을 때만 초기화
    if (type.includes("선택 과목")) {
      if (selectiveRange) {
        const selectiveLength =
          Number(selectiveRange.split("-")[1]) -
          Number(selectiveRange.split("-")[0]) +
          1;

        // 선택 과목 통합 모달인 경우에만 초기화
        if (isSelectiveUnifiedModal && selectiveAnswerTypesArray.length === 0) {
          setSelectiveAnswerTypesArray(
            Array.from({
              length: selectiveLength,
            }).map(() => "객")
          );
        }
      }
    }
  }, []);

  return (
    <Wrapper
      id="background"
      onClick={(e) => {
        if (e.target.id === "background") {
          setShowModal(false);
        }
      }}
    >
      <Modal>
        <Title>{type}</Title>
        {modalType === "A" && (
          <ModalContent>
            {type.includes("선택")
              ? Array.from({ length: selectiveNum[0] }).map((_, i) => (
                  <ModalRow key={i}>
                    <div>{i + selectiveNum[1]}번</div>
                    <QuestionTypeContainer>
                      <div>
                        <input
                          type="radio"
                          name={`selective_type_${i + selectiveNum[1]}`}
                          id={`selective_gaek_${i + selectiveNum[1]}`}
                          checked={
                            type.includes("문제 유형") && !type.includes("답")
                              ? selectiveAnswerTypesArray[i] === "객"
                              : selectiveSubjects[currentSelectiveIndex]
                                  ?.answerTypesArray[i] === "객"
                          }
                          onChange={() => {
                            if (
                              type.includes("문제 유형") &&
                              !type.includes("답")
                            ) {
                              // 선택 과목 통합 문제 유형
                              setSelectiveAnswerTypesArray((prev) => {
                                const tempPrev = [...prev];
                                tempPrev[i] = "객";
                                return tempPrev;
                              });
                            } else {
                              // 특정 선택 과목 문제 유형
                              const newSubjects = [...selectiveSubjects];
                              newSubjects[
                                currentSelectiveIndex
                              ].answerTypesArray[i] = "객";
                              setSelectiveSubjects(newSubjects);
                            }
                          }}
                        />
                        <label
                          htmlFor={`selective_gaek_${i + selectiveNum[1]}`}
                        >
                          객관식
                        </label>
                      </div>
                      <div>
                        <input
                          type="radio"
                          name={`selective_type_${i + selectiveNum[1]}`}
                          id={`selective_ju_${i + selectiveNum[1]}`}
                          checked={
                            type.includes("문제 유형") && !type.includes("답")
                              ? selectiveAnswerTypesArray[i] === "주"
                              : selectiveSubjects[currentSelectiveIndex]
                                  ?.answerTypesArray[i] === "주"
                          }
                          onChange={() => {
                            if (
                              type.includes("문제 유형") &&
                              !type.includes("답")
                            ) {
                              // 선택 과목 통합 문제 유형
                              setSelectiveAnswerTypesArray((prev) => {
                                const tempPrev = [...prev];
                                tempPrev[i] = "주";
                                return tempPrev;
                              });
                            } else {
                              // 특정 선택 과목 문제 유형
                              const newSubjects = [...selectiveSubjects];
                              newSubjects[
                                currentSelectiveIndex
                              ].answerTypesArray[i] = "주";
                              setSelectiveSubjects(newSubjects);
                            }
                          }}
                        />
                        <label htmlFor={`selective_ju_${i + selectiveNum[1]}`}>
                          주관식
                        </label>
                      </div>
                    </QuestionTypeContainer>
                  </ModalRow>
                ))
              : Array.from({ length: examNum - selectiveNum[0] }).map(
                  (_, i) => (
                    <ModalRow key={i}>
                      <div>{i + 1}번</div>
                      <QuestionTypeContainer>
                        <div>
                          <input
                            type="radio"
                            name={`gongtong_type_${i + 1}`}
                            id={`gongtong_gaek_${i + 1}`}
                            checked={answerTypesArray[i] === "객"}
                            onChange={() =>
                              setAnswerTypesArray((prev) => {
                                const tempPrev = [...prev];
                                tempPrev[i] = "객";
                                return tempPrev;
                              })
                            }
                          />
                          <label htmlFor={`gongtong_gaek_${i + 1}`}>
                            객관식
                          </label>
                        </div>
                        <div>
                          <input
                            type="radio"
                            name={`gongtong_type_${i + 1}`}
                            id={`gongtong_ju_${i + 1}`}
                            checked={answerTypesArray[i] === "주"}
                            onChange={() =>
                              setAnswerTypesArray((prev) => {
                                const tempPrev = [...prev];
                                tempPrev[i] = "주";
                                return tempPrev;
                              })
                            }
                          />
                          <label htmlFor={`gongtong_ju_${i + 1}`}>주관식</label>
                        </div>
                      </QuestionTypeContainer>
                    </ModalRow>
                  )
                )}
          </ModalContent>
        )}
        {modalType === "B" && (
          <ModalContent>
            {type.includes("선택")
              ? Array.from({ length: selectiveNum[0] }).map((_, i) => (
                  <ModalRow key={i}>
                    <div>{i + selectiveNum[1]}번</div>
                    <div>
                      <input
                        type="number"
                        value={
                          type.includes("답")
                            ? selectiveSubjects[
                                currentSelectiveIndex
                              ]?.answers?.split(",")[i] || ""
                            : type.includes("선택 과목") &&
                              type.includes("배점") &&
                              !type.includes("답")
                            ? selectiveScores?.split(",")[i] || ""
                            : ""
                        }
                        onChange={(e) => {
                          if (
                            type.includes("선택 과목") &&
                            type.includes("배점") &&
                            !type.includes("답")
                          ) {
                            // 선택 과목 통합 배점
                            const currentScores =
                              selectiveScores?.split(",") ||
                              Array(selectiveNum[0]).fill("");
                            currentScores[i] = e.target.value;
                            setSelectiveScores(currentScores.join(","));
                          } else if (type.includes("답")) {
                            // 특정 선택 과목 답
                            const newSubjects = [...selectiveSubjects];
                            const currentAnswers =
                              newSubjects[currentSelectiveIndex].answers?.split(
                                ","
                              ) || Array(selectiveNum[0]).fill("");
                            currentAnswers[i] = e.target.value;
                            newSubjects[currentSelectiveIndex].answers =
                              currentAnswers.join(",");
                            setSelectiveSubjects(newSubjects);
                          }
                        }}
                      />
                    </div>
                  </ModalRow>
                ))
              : Array.from({ length: examNum - selectiveNum[0] }).map(
                  (_, i) => (
                    <ModalRow key={i}>
                      <div>{i + 1}번</div>
                      <div>
                        <input
                          type="number"
                          value={
                            type.includes("답")
                              ? answers?.split(",")[i] || ""
                              : answerScores?.split(",")[i] || ""
                          }
                          onChange={(e) => {
                            if (type.includes("답")) {
                              const currentAnswers =
                                answers?.split(",") ||
                                Array(examNum - selectiveNum[0]).fill("");
                              currentAnswers[i] = e.target.value;
                              setAnswers(currentAnswers.join(","));
                            } else if (type.includes("배점")) {
                              const currentScores =
                                answerScores?.split(",") ||
                                Array(examNum - selectiveNum[0]).fill("");
                              currentScores[i] = e.target.value;
                              setAnswerScores(currentScores.join(","));
                            }
                          }}
                        />
                      </div>
                    </ModalRow>
                  )
                )}
          </ModalContent>
        )}
      </Modal>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: ${() => theme.hazy};
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Modal = styled.div`
  max-height: 80vh;
  overflow-y: scroll;
  border-radius: 0.5rem;
  width: 500px;
  background: ${() => theme.white};
  padding: 2rem;
  @media (max-width: 1024px) {
    width: 700px;
  }
  @media (max-width: 768px) {
    width: 300px;
  }
`;

const Title = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
`;

const ModalContent = styled.div`
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ModalRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid ${() => theme.gray};
  padding-bottom: 1rem;
  &:nth-of-type(1) {
    border-top: 1px solid ${theme.gray};
    padding-top: 1rem;
  }

  & > div {
    &:nth-of-type(1) {
      font-weight: 600;
      min-width: 2.5rem;
    }
  }

  & input[type="number"] {
    width: 40%;
    border: 1px solid ${() => theme.gray};
    outline: none;
    padding: 0.2rem 0.8rem;
    border-radius: 0.25rem;
    font-size: 0.9rem;
    font-weight: 500;
  }

  & input[type="radio"],
  & label {
    cursor: pointer;
  }
`;

const QuestionTypeContainer = styled.div`
  display: flex;
  gap: 1rem;
  & > div {
    display: flex;
    gap: 0.3rem;
  }
`;
