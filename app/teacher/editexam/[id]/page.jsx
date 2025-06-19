/** @jsxImportSource @emotion/react */
"use client";

import styled from "@emotion/styled";
import theme from "../../../style/theme";
import { css } from "@emotion/react";
import { useEffect, useState, Fragment } from "react";
import { useRouter, useParams } from "next/navigation";
import supabase from "../../../supbase";
import TeacherNewExamModal from "../../../components/TeacherNewExamModal";

export default function EditExam() {
  const params = useParams();
  const examId = params.id;
  const router = useRouter();

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
  ); // 선택 과목 답안 유형 배열
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
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

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
          await fetchExamData();
        } else {
          router.push("/");
        }
      } catch (err) {
        router.push("/");
      }
    };

    checkAuth();
  }, [router, examId]);

  const fetchExamData = async () => {
    try {
      const { data: exam, error } = await supabase
        .from("Exam")
        .select("*")
        .eq("id", examId)
        .single();

      if (error) {
        alert("시험 정보를 불러오는데 실패했습니다.");
        router.push("/teacher/editexam");
        return;
      }

      // 폼 데이터 설정
      setExamName(exam.name);
      setExamNum(exam.question_num);
      setHasSelective(exam.has_selective);
      setSelectiveCount(exam.selective_num || 1);
      setAnswers(exam.answers || "");
      setAnswerScores(exam.answer_scores || "");
      setAnswerTypes(exam.answer_types || "");
      setSelectiveRange(exam.selective_range || "");
      setSelectiveAnswers(exam.selective_answers || "");
      setSelectiveScores(exam.selective_scores || "");
      setSelectiveTypes(exam.selective_types || "");

      // 선택 과목 범위 설정
      if (exam.selective_range) {
        const [start, end] = exam.selective_range.split("-").map(Number);
        setSelectiveRangeStart(start.toString());
        setSelectiveRangeEnd(end.toString());
      }

      // 답안 유형 배열 설정
      if (exam.answer_types) {
        setAnswerTypesArray(exam.answer_types.split(","));
      } else {
        // 기존 데이터가 없으면 초기화
        let commonQuestionCount;
        if (exam.has_selective && exam.selective_range) {
          const [start, end] = exam.selective_range.split("-").map(Number);
          commonQuestionCount = exam.question_num - (end - start + 1);
        } else {
          commonQuestionCount = exam.question_num;
        }
        setAnswerTypesArray(Array(commonQuestionCount).fill("객"));
      }

      if (exam.selective_types) {
        setSelectiveAnswerTypesArray(exam.selective_types.split(","));
      } else if (exam.has_selective && exam.selective_range) {
        // 기존 데이터가 없으면 초기화
        const [start, end] = exam.selective_range.split("-").map(Number);
        const selectiveLength = end - start + 1;
        setSelectiveAnswerTypesArray(Array(selectiveLength).fill("객"));
      } else {
        setSelectiveAnswerTypesArray([]);
      }

      // 선택 과목 설정
      if (exam.has_selective && exam.selective_num) {
        const newSelectiveSubjects = [];
        const selectiveAnswersArray = exam.selective_answers
          ? exam.selective_answers.split(";")
          : [];

        for (let i = 0; i < exam.selective_num; i++) {
          newSelectiveSubjects.push({
            name: `선택 과목 ${i + 1}`,
            answers: selectiveAnswersArray[i] || "",
          });
        }
        setSelectiveSubjects(newSelectiveSubjects);
      } else if (exam.has_selective) {
        // selective_num이 없지만 has_selective가 true인 경우
        setSelectiveSubjects([
          {
            name: "선택 과목 1",
            answers: exam.selective_answers || "",
          },
        ]);
      } else {
        // 선택 과목이 없는 경우
        setSelectiveSubjects([
          {
            name: "선택 과목 1",
            answers: "",
          },
        ]);
      }

      setLoading(false);
    } catch (err) {
      console.error("시험 데이터 조회 오류:", err);
      alert("시험 정보를 불러오는데 실패했습니다.");
      router.push("/teacher/editexam");
    }
  };

  async function UpdateExam() {
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
      const { error } = await supabase
        .from("Exam")
        .update(examData)
        .eq("id", examId);

      if (error) {
        console.error("Error updating exam:", error);
        alert("시험 수정 중 오류가 발생했습니다.");
        return;
      }

      alert("시험이 성공적으로 수정되었습니다!");
      router.push("/teacher/editexam");
    } catch (error) {
      console.error("Error:", error);
      alert("시험 수정 중 오류가 발생했습니다.");
    }
  }

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

  if (loading) return <div>로딩 중...</div>;
  if (!currentUser) return <div>접근 권한이 없습니다.</div>;

  return (
    <Wrapper>
      <Title>시험 수정</Title>
      <BoxContainer>
        <Box>
          <BoxRow>
            <div>시험명</div>
            <input
              type="text"
              placeholder="시험명을 입력하세요"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
            />
          </BoxRow>
          <BoxRow>
            <div>문제 수</div>
            <input
              type="number"
              placeholder="문제 수를 입력하세요"
              value={examNum}
              onChange={(e) => setExamNum(parseInt(e.target.value) || 0)}
            />
          </BoxRow>
          <BoxRow>
            <div>선택 과목 여부</div>
            <SelectiveExistingCon>
              <div>
                <input
                  type="radio"
                  id="hasSelective"
                  name="hasSelective"
                  checked={hasSelective}
                  onChange={() => setHasSelective(true)}
                />
                <label htmlFor="hasSelective">있음</label>
              </div>
              <div>
                <input
                  type="radio"
                  id="noSelective"
                  name="hasSelective"
                  checked={!hasSelective}
                  onChange={() => setHasSelective(false)}
                />
                <label htmlFor="noSelective">없음</label>
              </div>
            </SelectiveExistingCon>
          </BoxRow>
          {hasSelective && (
            <BoxRow>
              <div>선택 과목 개수</div>
              <input
                type="number"
                placeholder="선택 과목 개수를 입력하세요"
                value={selectiveCount}
                onChange={(e) =>
                  setSelectiveCount(parseInt(e.target.value) || 0)
                }
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
        <span onClick={UpdateExam}>수정하기</span>
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

const Submit = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 2rem;
  & > span {
    border-radius: 0.5rem;
    background: ${() => theme.primary[500]};
    color: ${() => theme.white};
    padding: 1rem 2rem;
    font-size: 1rem;
    cursor: pointer;
    font-weight: 600;
  }
`;
