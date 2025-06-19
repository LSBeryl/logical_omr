/** @jsxImportSource @emotion/react */
"use client";

import styled from "@emotion/styled";
import theme from "../../style/theme";
import { css } from "@emotion/react";
import { useEffect, useState, Fragment } from "react";
import supabase from "../../supbase";
import TeacherNewExamModal from "../../components/TeacherNewExamModal";

export default function NewExam() {
  // 폼 내용 시작 //
  const [examName, setExamName] = useState(""); // 시험 이름(name)
  const [examNum, setExamNum] = useState(30); // 시험 문제 개수(question_num)
  const [hasSelective, setHasSelective] = useState(true); // 선택 과목 여부(has_selective)
  const [selectiveCount, setSelectiveCount] = useState(1); // 선택 과목 개수
  const [answers, setAnswers] = useState(""); // 정답 겸 공통 과목 부분 정답 (answers)
  const [answerScores, setAnswerScores] = useState(""); // 배점 겸 공통 과목 배점 (answer_scores)
  const [answerTypes, setAnswerTypes] = useState(""); // 답안 유형 겸 공통 과목 답안 유형 (answer_types)
  const [answerTypesArray, setAnswerTypesArray] = useState([]); // 답안 유형 겸 공통 과목 답안 유형 배열
  const [selectiveRange, setSelectiveRange] = useState(""); // 선택 과목 범위 (selective_range)
  const [selectiveRangeStart, setSelectiveRangeStart] = useState(""); // 선택 과목 시작 번호
  const [selectiveRangeEnd, setSelectiveRangeEnd] = useState(""); // 선택 과목 끝 번호
  const [selectiveAnswers, setSelectiveAnswers] = useState(""); // 선택 과목 정답 (selective_answers)
  const [selectiveScores, setSelectiveScores] = useState(""); // 선택 과목 배점 (selective_scores)
  const [selectiveTypes, setSelectiveTypes] = useState(""); // 선택 과목 답안 유형 (selective_types)
  const [selectiveAnswerTypesArray, setSelectiveAnswerTypesArray] = useState(
    []
  ); // 답안 유형 겸 공통 과목 답안 유형 배열
  const [selectiveNum, setSelectiveNum] = useState(0); // 선택 과목 문제 개수 (selective_num)

  // 선택 과목별 상태 관리
  const [selectiveSubjects, setSelectiveSubjects] = useState([
    {
      name: "선택 과목 1",
      answers: "",
    },
  ]);
  // 폼 내용 끝 //

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");

  async function AddNewExam() {
    // 폼 검증
    if (!examName.trim()) {
      alert("시험명을 입력해주세요.");
      return;
    }

    if (!examNum || examNum <= 0) {
      alert("문제 수를 입력해주세요.");
      return;
    }

    if (hasSelective) {
      if (!selectiveRangeStart || !selectiveRangeEnd) {
        alert("선택 과목 문제 범위를 지정해주세요.");
        return;
      }

      if (Number(selectiveRangeStart) >= Number(selectiveRangeEnd)) {
        alert("선택 과목 시작 번호는 끝 번호보다 작아야 합니다.");
        return;
      }

      if (Number(selectiveRangeEnd) > examNum) {
        alert("선택 과목 끝 번호는 전체 문제 수보다 클 수 없습니다.");
        return;
      }

      if (selectiveCount <= 0) {
        alert("선택 과목 개수를 입력해주세요.");
        return;
      }
    }

    // 데이터 준비
    const examData = {
      name: examName,
      question_num: examNum,
      has_selective: hasSelective,
      selective_num: hasSelective ? selectiveCount : null,
      selective_range: hasSelective ? selectiveRange : null,
    };

    // 공통 과목 데이터 (선택 과목이 있든 없든)
    if (hasSelective) {
      // 선택 과목이 있는 경우: 공통 과목만
      const commonQuestionCount =
        examNum - (Number(selectiveRangeEnd) - Number(selectiveRangeStart) + 1);
      examData.answers =
        answers || Array(commonQuestionCount).fill("").join(",");
      examData.answer_types = answerTypesArray
        .slice(0, commonQuestionCount)
        .join(",");
      examData.answer_scores = answerScores || "";
    } else {
      // 선택 과목이 없는 경우: 전체
      examData.answers = answers || Array(examNum).fill("").join(",");
      examData.answer_types = answerTypesArray.join(",");
      examData.answer_scores = answerScores || "";
    }

    // 선택 과목 데이터
    if (hasSelective) {
      const selectiveAnswers = [];

      selectiveSubjects.forEach((subject) => {
        // 선택 과목 통합 모달에서 설정된 답안 유형이 있을 때만 처리
        if (selectiveAnswerTypesArray.length > 0) {
          selectiveAnswers.push(
            subject.answers ||
              Array(selectiveAnswerTypesArray.length).fill("").join(",")
          );
        }
      });

      examData.selective_answers = selectiveAnswers.join(";");
      examData.selective_types = selectiveAnswerTypesArray.join(","); // 통합된 답안 유형
      examData.selective_scores = selectiveScores || ""; // 통합된 배점
    }

    try {
      const { data, error } = await supabase.from("Exam").insert(examData);

      if (error) {
        console.error("Error inserting exam:", error);
        alert("시험 등록 중 오류가 발생했습니다.");
        return;
      }

      alert("시험이 성공적으로 등록되었습니다!");
      // 폼 초기화
      setExamName("");
      setExamNum(30);
      setHasSelective(true);
      setSelectiveCount(1);
      setSelectiveRangeStart("");
      setSelectiveRangeEnd("");
      setAnswers("");
      setAnswerScores("");
      setAnswerTypes("");
      setAnswerTypesArray([]);
      setSelectiveAnswers("");
      setSelectiveScores("");
      setSelectiveTypes("");
      setSelectiveAnswerTypesArray([]);
      setSelectiveNum(0);
      setSelectiveSubjects([
        {
          name: "선택 과목 1",
          answers: "",
        },
      ]);
    } catch (error) {
      console.error("Error:", error);
      alert("시험 등록 중 오류가 발생했습니다.");
    }
  }

  // 프리셋 데이터 설정 함수
  const applyMockExamPreset = () => {
    // 기본 설정
    setExamName("실전 모의고사");
    setExamNum(30);
    setHasSelective(true);
    setSelectiveCount(2);
    setSelectiveRangeStart("23");
    setSelectiveRangeEnd("30");

    // 공통 과목 배점 (1-22번)
    setAnswerScores("2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,3,3,3,3,4,4,4");

    // 공통 과목 문제 유형 (1-22번)
    const commonTypes = [
      ...Array(15).fill("객"), // 1-15번 객관식
      ...Array(7).fill("주"), // 16-22번 주관식
    ];
    setAnswerTypesArray(commonTypes);
    setAnswerTypes(commonTypes.join(","));

    // 선택 과목 배점 (23-30번)
    setSelectiveScores("2,3,3,3,3,4,4,4");

    // 선택 과목 문제 유형 (23-30번)
    const selectiveTypes = [
      ...Array(6).fill("객"), // 23-28번 객관식
      ...Array(2).fill("주"), // 29-30번 주관식
    ];
    setSelectiveAnswerTypesArray(selectiveTypes);
    setSelectiveTypes(selectiveTypes.join(","));

    // 선택 과목 문제 개수 설정
    setSelectiveNum(8);

    alert("모의고사 프리셋이 적용되었습니다!");
  };

  useEffect(() => {
    setSelectiveRange(`${selectiveRangeStart}-${selectiveRangeEnd}`);
  }, [selectiveRangeStart, selectiveRangeEnd]);

  // 선택 과목 개수가 변경될 때 선택 과목 배열 업데이트
  useEffect(() => {
    if (hasSelective) {
      const newSelectiveSubjects = Array.from(
        { length: selectiveCount },
        (_, index) => {
          // 기존 데이터가 있으면 보존, 없으면 새로 생성
          const existingSubject = selectiveSubjects[index];
          if (existingSubject) {
            return {
              name: `선택 과목 ${index + 1}`,
              answers: existingSubject.answers || "",
            };
          } else {
            return {
              name: `선택 과목 ${index + 1}`,
              answers: "",
            };
          }
        }
      );
      setSelectiveSubjects(newSelectiveSubjects);
    }
  }, [selectiveCount, hasSelective]);

  return (
    <Wrapper>
      <Title>신규 시험 등록</Title>
      <BoxContainer>
        <Box>
          <BoxRow>
            <div>시험명</div>
            <input
              type="text"
              placeholder="ex. 20xx년 xx월 xx일 실전 모의고사"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
            />
          </BoxRow>
          <BoxRow>
            <div>프리셋</div>
            <PresetButton>
              <span onClick={applyMockExamPreset}>모의고사 프리셋 적용</span>
            </PresetButton>
          </BoxRow>
          <BoxRow length="short">
            <div>문제 수 {hasSelective ? " (선택 과목 포함)" : ""}</div>
            <input
              type="number"
              placeholder="ex. 30"
              value={examNum}
              onChange={(e) => setExamNum(e.target.value)}
            />
          </BoxRow>
          <BoxRow>
            <div>선택 과목 여부</div>
            <SelectiveExistingCon>
              <div>
                <input
                  type="radio"
                  name="selective"
                  id="yes"
                  checked={hasSelective}
                  onChange={() => setHasSelective(true)}
                />
                <label htmlFor="yes">있음</label>
              </div>
              <div>
                <input
                  type="radio"
                  name="selective"
                  id="no"
                  checked={!hasSelective}
                  onChange={() => setHasSelective(false)}
                />
                <label htmlFor="no">없음</label>
              </div>
            </SelectiveExistingCon>
          </BoxRow>
          {hasSelective && (
            <BoxRow length="short">
              <div>선택 과목 개수</div>
              <input
                type="number"
                placeholder="ex. 2"
                min="1"
                max="10"
                value={selectiveCount}
                onChange={(e) => setSelectiveCount(Number(e.target.value))}
              />
            </BoxRow>
          )}
          {hasSelective ? (
            <BoxRow>
              <div>선택 과목 범위</div>
              <SelectiveRange>
                <input
                  type="text"
                  placeholder="시작 번호 (ex. 23)"
                  value={selectiveRangeStart}
                  onChange={(e) => setSelectiveRangeStart(e.target.value)}
                />{" "}
                -{" "}
                <input
                  type="text"
                  placeholder="끝 번호 (ex. 30)"
                  value={selectiveRangeEnd}
                  onChange={(e) => setSelectiveRangeEnd(e.target.value)}
                />
              </SelectiveRange>
            </BoxRow>
          ) : null}
          <BoxRow>
            <div>{hasSelective ? "공통 과목 " : ""}답</div>
            <Button>
              <span
                onClick={() => {
                  if (hasSelective) {
                    if (
                      selectiveRangeStart &&
                      selectiveRangeEnd &&
                      examNum > 0
                    ) {
                      setShowModal(true);
                      setModalType("공통 과목 답 등록 및 수정");
                    } else {
                      if (!selectiveRangeStart || !selectiveRangeEnd) {
                        alert("선택 과목 문제 범위를 지정해주세요.");
                      } else {
                        alert("시험 문제 수를 입력해주세요.");
                      }
                    }
                  } else {
                    if (examNum > 0) {
                      setShowModal(true);
                      setModalType("답 등록 및 수정");
                    } else {
                      alert("시험 문제 수를 입력해주세요.");
                    }
                  }
                }}
              >
                답 등록 및 수정
              </span>
            </Button>
          </BoxRow>
          <BoxRow>
            <div>{hasSelective ? "공통 과목 " : ""}배점</div>
            <Button>
              <span
                onClick={() => {
                  if (hasSelective) {
                    if (
                      selectiveRangeStart &&
                      selectiveRangeEnd &&
                      examNum > 0
                    ) {
                      setShowModal(true);
                      setModalType("공통 과목 배점 등록 및 수정");
                    } else {
                      if (!selectiveRangeStart || !selectiveRangeEnd) {
                        alert("선택 과목 문제 범위를 지정해주세요.");
                      } else {
                        alert("시험 문제 수를 입력해주세요.");
                      }
                    }
                  } else {
                    if (examNum > 0) {
                      setShowModal(true);
                      setModalType("배점 등록 및 수정");
                    } else {
                      alert("시험 문제 수를 입력해주세요.");
                    }
                  }
                }}
              >
                배점 등록 및 수정
              </span>
            </Button>
          </BoxRow>
          <BoxRow>
            <div>{hasSelective ? "공통 과목 " : ""}문제 유형</div>
            <Button>
              <span
                onClick={() => {
                  if (hasSelective) {
                    if (
                      selectiveRangeStart &&
                      selectiveRangeEnd &&
                      examNum > 0
                    ) {
                      setShowModal(true);
                      setModalType("공통 과목 문제 유형 등록 및 수정");
                    } else {
                      if (!selectiveRangeStart || !selectiveRangeEnd) {
                        alert("선택 과목 문제 범위를 지정해주세요.");
                      } else {
                        alert("시험 문제 수를 입력해주세요.");
                      }
                    }
                  } else {
                    if (examNum > 0) {
                      setShowModal(true);
                      setModalType("문제 유형 등록 및 수정");
                    } else {
                      alert("시험 문제 수를 입력해주세요.");
                    }
                  }
                }}
              >
                문제 유형 등록 및 수정
              </span>
            </Button>
          </BoxRow>

          {/* 동적으로 생성되는 선택 과목 섹션들 */}
          {hasSelective &&
            selectiveSubjects.map((subject, index) => (
              <Fragment key={index}>
                <BoxRow>
                  <div>{subject.name} 답</div>
                  <Button>
                    <span
                      onClick={() => {
                        if (
                          selectiveRangeStart &&
                          selectiveRangeEnd &&
                          examNum > 0
                        ) {
                          setShowModal(true);
                          setModalType(`${subject.name} 답 등록 및 수정`);
                        } else {
                          if (!selectiveRangeStart || !selectiveRangeEnd) {
                            alert("선택 과목 문제 범위를 지정해주세요.");
                          } else {
                            alert("시험 문제 수를 입력해주세요.");
                          }
                        }
                      }}
                    >
                      답 등록 및 수정
                    </span>
                  </Button>
                </BoxRow>
              </Fragment>
            ))}

          {/* 선택 과목 통합 답안 유형 (첫 번째 선택 과목이 있을 때만 표시) */}
          {hasSelective && selectiveSubjects.length > 0 && (
            <BoxRow>
              <div>선택 과목 문제 유형(객관식, 주관식)</div>
              <Button>
                <span
                  onClick={() => {
                    if (
                      selectiveRangeStart &&
                      selectiveRangeEnd &&
                      examNum > 0
                    ) {
                      setShowModal(true);
                      setModalType("선택 과목 문제 유형 등록 및 수정");
                    } else {
                      if (!selectiveRangeStart || !selectiveRangeEnd) {
                        alert("선택 과목 문제 범위를 지정해주세요.");
                      } else {
                        alert("시험 문제 수를 입력해주세요.");
                      }
                    }
                  }}
                >
                  문제 유형 등록 및 수정
                </span>
              </Button>
            </BoxRow>
          )}

          {/* 선택 과목 통합 배점 (첫 번째 선택 과목이 있을 때만 표시) */}
          {hasSelective && selectiveSubjects.length > 0 && (
            <BoxRow>
              <div>선택 과목 배점</div>
              <Button>
                <span
                  onClick={() => {
                    if (
                      selectiveRangeStart &&
                      selectiveRangeEnd &&
                      examNum > 0
                    ) {
                      setShowModal(true);
                      setModalType("선택 과목 배점 등록 및 수정");
                    } else {
                      if (!selectiveRangeStart || !selectiveRangeEnd) {
                        alert("선택 과목 문제 범위를 지정해주세요.");
                      } else {
                        alert("시험 문제 수를 입력해주세요.");
                      }
                    }
                  }}
                >
                  배점 등록 및 수정
                </span>
              </Button>
            </BoxRow>
          )}
        </Box>
      </BoxContainer>
      <Submit>
        <span onClick={AddNewExam}>만들기</span>
      </Submit>
      {showModal ? (
        <TeacherNewExamModal
          type={modalType}
          setShowModal={setShowModal}
          hasSelective={hasSelective}
          examNum={examNum}
          selectiveRange={selectiveRange}
          answerTypesArray={answerTypesArray}
          selectiveAnswerTypesArray={selectiveAnswerTypesArray}
          setAnswerTypesArray={setAnswerTypesArray}
          setSelectiveAnswerTypesArray={setSelectiveAnswerTypesArray}
          selectiveSubjects={selectiveSubjects}
          setSelectiveSubjects={setSelectiveSubjects}
          answers={answers}
          setAnswers={setAnswers}
          answerScores={answerScores}
          setAnswerScores={setAnswerScores}
          selectiveScores={selectiveScores}
          setSelectiveScores={setSelectiveScores}
        />
      ) : null}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
`;

const Title = styled.div`
  font-size: 2rem;
  font-weight: 700;
`;

const BoxContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-grow: 1;
  margin-top: 5rem;
`;

const Box = styled.div`
  border-radius: 0.5rem;
  border: 1px solid ${() => theme.gray};
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 500px;
  @media (max-width: 1024px) {
    width: 700px;
  }
  @media (max-width: 768px) {
    width: 300px;
  }
  & > div {
    &:not(:nth-of-type(1)) {
      border-top: 1px solid ${() => theme.gray};
      padding-top: 1rem;
    }
  }
`;

const BoxRow = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;

  & > div {
    font-weight: 500;
    &:nth-of-type(1) {
      font-weight: 600;
    }
  }

  & > input {
    ${({ length }) =>
      length === "short"
        ? css`
            width: 30%;
          `
        : null}
    border: 1px solid ${() => theme.gray};
    outline: none;
    padding: 0.6rem 0.8rem;
    border-radius: 0.25rem;
    font-size: 0.9rem;
    font-weight: 500;
  }
`;

const SelectiveExistingCon = styled.div`
  display: flex;
  gap: 1rem;
  & > div {
    display: flex;
    gap: 0.2rem;
    align-items: center;
    font-size: 0.9rem;
  }
  & input,
  & label {
    cursor: pointer;
  }
`;

const Button = styled.div`
  & > span {
    border-radius: 0.5rem;
    background: ${() => theme.primary[500]};
    color: ${() => theme.white};
    padding: 0.5rem;
    font-size: 0.8rem;
    cursor: pointer;
  }
`;

const SelectiveRange = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  & > input {
    font-size: 1rem;
    width: 30%;
    border: 1px solid ${() => theme.gray};
    outline: none;
    padding: 0.6rem 0.8rem;
    border-radius: 0.25rem;
    font-size: 0.9rem;
    font-weight: 500;
  }
`;

const Submit = styled(Button)`
  display: flex;
  justify-content: center;
  margin-top: 1rem;
  & > span {
    font-size: 1rem;
    font-weight: 500;
    padding: 0.7rem;
  }
`;

const PresetButton = styled(Button)`
  & > span {
    border-radius: 0.5rem;
    background: #28a745;
    color: ${() => theme.white};
    padding: 0.7rem 1rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background: #218838;
    }
  }
`;
