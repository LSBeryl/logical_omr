"use client";

import styled from "@emotion/styled";
import theme from "../style/theme";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import supabase from "../supabase";

function StudentContent() {
  const [userData, setUserData] = useState(null);
  const [examData, setExamData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [graded, setGraded] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [gradedAnswers, setGradedAnswers] = useState({});
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submittedAnswers, setSubmittedAnswers] = useState({});
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

          // 이미 제출한 시험이 있는지 확인 (시험 정보 로드 후)
          if (user) {
            try {
              const { data: existingSubmit, error: submitError } =
                await supabase
                  .from("Submit")
                  .select("*")
                  .eq("exam_id", examId)
                  .eq("submitter_id", user.id)
                  .maybeSingle();

              if (submitError) {
                console.error("제출 정보 조회 오류:", submitError);
              } else if (existingSubmit) {
                console.log("이미 제출한 시험 발견:", existingSubmit);
                setAlreadySubmitted(true);

                // 제출된 답안 파싱
                const submittedAnswersObj = {};
                if (existingSubmit.submitted_answer) {
                  const answers = existingSubmit.submitted_answer.split(",");
                  answers.forEach((answer, index) => {
                    if (answer && answer !== "null") {
                      submittedAnswersObj[index + 1] = parseInt(answer);
                    }
                  });
                  setSubmittedAnswers(submittedAnswersObj);
                }

                // 채점 결과 설정
                if (existingSubmit.score !== null) {
                  setScore({
                    correct: existingSubmit.correct_count || 0,
                    total: examInfo?.question_num || 0,
                    earnedScore: existingSubmit.score,
                    totalScore: existingSubmit.score, // 실제 총점은 나중에 계산
                  });
                  setGraded(true);

                  // 정답 구성
                  let correctAnswers = [];
                  if (examInfo.has_selective && examInfo.selective_range) {
                    // 선택 과목이 있는 경우
                    const [start, end] = examInfo.selective_range
                      .split("-")
                      .map(Number);
                    const commonAnswers = examInfo.answers?.split(",") || [];
                    const selectiveAnswers =
                      examInfo.selective_answers?.split(";") || [];

                    // 선택된 선택 과목의 답 가져오기
                    let selectedSelectiveAnswers = [];
                    if (existingSubmit.selected_selective_num) {
                      const selectiveIndex =
                        existingSubmit.selected_selective_num - 1;
                      selectedSelectiveAnswers =
                        selectiveAnswers[selectiveIndex]?.split(",") || [];
                    }

                    // 전체 정답 배열 구성
                    for (let i = 0; i < examInfo.question_num; i++) {
                      const questionNumber = i + 1;
                      if (questionNumber >= start && questionNumber <= end) {
                        // 선택 과목 범위
                        const selectiveIndex = questionNumber - start;
                        correctAnswers.push(
                          selectedSelectiveAnswers[selectiveIndex] || ""
                        );
                      } else {
                        // 공통 과목 범위
                        const commonIndex = questionNumber - 1;
                        correctAnswers.push(commonAnswers[commonIndex] || "");
                      }
                    }
                  } else {
                    // 선택 과목이 없는 경우
                    correctAnswers = examInfo.answers?.split(",") || [];
                  }

                  // 채점 결과도 계산하여 표시
                  const gradingResult = gradeAnswers(
                    submittedAnswersObj,
                    correctAnswers
                  );
                  setGradedAnswers(gradingResult.gradedAnswers);
                }
              }
            } catch (submitError) {
              console.error("제출 정보 조회 중 오류:", submitError);
            }
          }
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

  // 이미 제출한 경우 경고 메시지 표시
  if (alreadySubmitted) {
    return (
      <Wrapper>
        <Title>
          <div>현재 응시 시험명 : </div>
          <div>{examData?.name || "로딩 중..."}</div>
        </Title>

        <TopButtons>
          <HomeButton onClick={() => router.push("/")}>홈으로</HomeButton>
        </TopButtons>

        {/* 점수 표시를 위로 이동 */}
        {graded && (
          <ScoreDisplay>
            <div>
              <strong>
                맞은 문제 : ({score.correct} / {score.total})
              </strong>
            </div>
            <div>
              <strong>
                점수 : ({score.earnedScore} / {score.totalScore})
              </strong>
            </div>
          </ScoreDisplay>
        )}

        {/* <AlreadySubmittedMessage>
          <h2>이미 제출한 시험입니다</h2>
          <p>한 아이디는 한 시험에 하나의 제출만 가능합니다.</p>
          <p>제출된 답안을 확인하거나 수정할 수 없습니다.</p>
        </AlreadySubmittedMessage> */}

        <UserInfo>
          <div>
            응시자(닉네임) : {userData?.name || "알 수 없음"}(
            {userData?.user_name || "알 수 없음"})
          </div>
          {userData?.school && (
            <>
              <div>학교 : {userData.school}</div>
              {userData?.grade && (
                <>
                  <div>학년 : {userData.grade}학년</div>
                </>
              )}
            </>
          )}
          {selectiveSubject && (
            <div>
              선택 과목 :{" "}
              {examData?.selective_name
                ? examData.selective_name.split(",")[
                    parseInt(selectiveSubject.replace("selective_", "")) - 1
                  ] || selectiveSubject.replace("selective_", "선택 과목 ")
                : selectiveSubject.replace("selective_", "선택 과목 ")}
            </div>
          )}
        </UserInfo>

        {/* 제출된 답안 표시 (읽기 전용) */}
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
          {examData &&
            Array.from({ length: examData.question_num }).map((_, i) => {
              const questionNumber = i + 1;
              const submittedAnswer = submittedAnswers[questionNumber];

              // 문제 유형 확인
              let answerType = "객"; // 기본값
              if (examData.has_selective && examData.selective_range) {
                const [start, end] = examData.selective_range
                  .split("-")
                  .map(Number);
                if (questionNumber >= start && questionNumber <= end) {
                  // 선택 과목 범위의 문제
                  const selectiveIndex = questionNumber - start;
                  answerType =
                    examData.selective_types?.split(",")[selectiveIndex] ||
                    "객";
                } else {
                  // 공통 과목 범위의 문제
                  answerType = examData.answer_types?.split(",")[i] || "객";
                }
              } else {
                // 선택 과목이 없는 경우
                answerType = examData.answer_types?.split(",")[i] || "객";
              }

              return (
                <OMRRow key={i}>
                  <div>
                    <div>
                      {questionNumber}
                      {graded && (
                        <GradeMark>
                          {gradedAnswers[questionNumber] === "correct" ? (
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
                        <div
                          style={{
                            backgroundColor:
                              submittedAnswer === 1
                                ? theme.black
                                : "transparent",
                            border:
                              submittedAnswer === 1
                                ? `1px solid ${theme.black}`
                                : `1px solid ${theme.primary[300]}`,
                            color: theme.black,
                          }}
                        >
                          1
                        </div>
                        <div
                          style={{
                            backgroundColor:
                              submittedAnswer === 2
                                ? theme.black
                                : "transparent",
                            border:
                              submittedAnswer === 2
                                ? `1px solid ${theme.black}`
                                : `1px solid ${theme.primary[300]}`,
                            color: theme.black,
                          }}
                        >
                          2
                        </div>
                        <div
                          style={{
                            backgroundColor:
                              submittedAnswer === 3
                                ? theme.black
                                : "transparent",
                            border:
                              submittedAnswer === 3
                                ? `1px solid ${theme.black}`
                                : `1px solid ${theme.primary[300]}`,
                            color: theme.black,
                          }}
                        >
                          3
                        </div>
                        <div
                          style={{
                            backgroundColor:
                              submittedAnswer === 4
                                ? theme.black
                                : "transparent",
                            border:
                              submittedAnswer === 4
                                ? `1px solid ${theme.black}`
                                : `1px solid ${theme.primary[300]}`,
                            color: theme.black,
                          }}
                        >
                          4
                        </div>
                        <div
                          style={{
                            backgroundColor:
                              submittedAnswer === 5
                                ? theme.black
                                : "transparent",
                            border:
                              submittedAnswer === 5
                                ? `1px solid ${theme.black}`
                                : `1px solid ${theme.primary[300]}`,
                            color: theme.black,
                          }}
                        >
                          5
                        </div>
                      </div>
                    ) : (
                      // 주관식
                      <div>
                        <input
                          type="number"
                          value={submittedAnswers[questionNumber] || ""}
                          placeholder="주관식 답 입력"
                          onChange={(e) => {
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
                            // 답안 업데이트
                            handleAnswerChange(
                              questionNumber,
                              value ? parseInt(value) : null
                            );
                          }}
                          style={{
                            width: "100%",
                            height: "100%",
                            backgroundColor: graded
                              ? gradedAnswers[questionNumber] === "correct"
                                ? "#e8f5e8"
                                : "#ffeaea"
                              : "white",
                            border: "none",
                            outline: "none",
                            textAlign: "center",
                            fontSize: "0.9rem",
                            padding: "0.15rem",
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
      </Wrapper>
    );
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
      // 현재 사용자 ID 가져오기
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("로그인이 필요합니다.");
        return;
      }

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
        submitter_id: user.id, // 제출자 ID 추가
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
      setAlreadySubmitted(true); // 제출 완료 상태로 설정
      setSubmittedAnswers(answers); // 제출된 답안 저장
      setShowSubmitModal(false);
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

    // 선택과목 정보 파싱
    let selectiveStart = null;
    let selectiveEnd = null;
    let selectiveScoresArr = [];
    let answerScoresArr = [];
    if (examData.has_selective && examData.selective_range) {
      [selectiveStart, selectiveEnd] = examData.selective_range
        .split("-")
        .map(Number);
      selectiveScoresArr = (examData.selective_scores || "")
        .split(",")
        .map((s) => parseInt(s) || 1);
      answerScoresArr = (examData.answer_scores || "")
        .split(",")
        .map((s) => parseInt(s) || 1);
    } else {
      answerScoresArr = (examData.answer_scores || "")
        .split(",")
        .map((s) => parseInt(s) || 1);
    }

    studentAnswers.forEach((answer, index) => {
      const questionNumber = index + 1;
      const isCorrect = String(answer) === String(correctAnswers[index]);

      // 문제별 배점 계산
      let questionScore = 1; // 기본 배점
      if (
        examData.has_selective &&
        examData.selective_range &&
        selectiveStart !== null &&
        selectiveEnd !== null
      ) {
        if (
          questionNumber >= selectiveStart &&
          questionNumber <= selectiveEnd
        ) {
          // 선택과목 범위
          const selectiveIdx = questionNumber - selectiveStart;
          questionScore = selectiveScoresArr[selectiveIdx] || 1;
        } else {
          // 공통과목 범위
          // 공통과목 인덱스: 선택과목 범위 앞뒤로 이어붙인 순서
          let commonIdx = questionNumber - 1;
          if (questionNumber > selectiveEnd) {
            commonIdx -= selectiveEnd - selectiveStart + 1;
          }
          questionScore = answerScoresArr[commonIdx] || 1;
        }
      } else {
        // 선택과목 없는 경우
        questionScore = answerScoresArr[index] || 1;
      }

      if (isCorrect) {
        correctCount++;
        earnedScore += questionScore;
        gradedAnswers[questionNumber] = "correct";
      } else {
        gradedAnswers[questionNumber] = "incorrect";
      }
      totalScore += questionScore;
    });

    return {
      gradedAnswers,
      score: {
        correct: correctCount,
        total: correctAnswers.length,
        earnedScore: earnedScore,
        totalScore: totalScore,
      },
    };
  };

  const handleSubmitClick = () => {
    if (graded) {
      alert("이미 제출된 시험입니다.");
      return;
    }
    setShowSubmitModal(true);
  };

  return (
    <Wrapper>
      <Title>
        <div>현재 응시 시험명 : </div>
        <div>{examData?.name || "로딩 중..."}</div>
      </Title>

      {/* 상단 버튼들 */}
      <TopButtons>
        <HomeButton onClick={() => router.push("/")}>홈으로</HomeButton>
      </TopButtons>

      {/* 점수 표시 */}
      {graded && (
        <ScoreDisplay>
          <div>
            <strong>
              맞은 문제: ({score.correct} / {score.total})
            </strong>
          </div>
          <div>
            <strong>
              점수: ({score.earnedScore} / {score.totalScore})
            </strong>
          </div>
        </ScoreDisplay>
      )}

      <UserInfo>
        <div>
          응시자(닉네임) : {userData?.name || "알 수 없음"}(
          {userData?.user_name || "알 수 없음"})
        </div>
        {userData?.school && (
          <>
            <div>학교 : {userData.school}</div>
            {userData?.grade && (
              <>
                <div>학년 : {userData.grade}학년</div>
              </>
            )}
          </>
        )}
        {selectiveSubject && (
          <div>
            선택 과목 :{" "}
            {examData?.selective_name
              ? examData.selective_name.split(",")[
                  parseInt(selectiveSubject.replace("selective_", "")) - 1
                ] || selectiveSubject.replace("selective_", "선택 과목 ")
              : selectiveSubject.replace("selective_", "선택 과목 ")}
          </div>
        )}
      </UserInfo>
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
        {examData &&
          Array.from({ length: examData.question_num }).map((_, i) => {
            const questionNumber = i + 1;

            // 선택 과목이 있고, 현재 문제가 선택 과목 범위에 있는지 확인
            let answerType = "객"; // 기본값

            if (examData.has_selective && examData.selective_range) {
              const [start, end] = examData.selective_range
                .split("-")
                .map(Number);
              if (questionNumber >= start && questionNumber <= end) {
                // 선택 과목 범위의 문제
                const selectiveIndex = questionNumber - start;
                answerType =
                  examData.selective_types?.split(",")[selectiveIndex] || "객";
              } else {
                // 공통 과목 범위의 문제
                answerType = examData.answer_types?.split(",")[i] || "객";
              }
            } else {
              // 선택 과목이 없는 경우
              answerType = examData.answer_types?.split(",")[i] || "객";
            }

            return (
              <OMRRow key={i}>
                <div>
                  <div>
                    {questionNumber}
                    {graded && (
                      <GradeMark>
                        {gradedAnswers[questionNumber] === "correct" ? (
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
                      <div
                        onClick={
                          graded
                            ? null
                            : () => handleAnswerChange(questionNumber, 1)
                        }
                        style={{
                          backgroundColor:
                            answers[questionNumber] === 1
                              ? theme.black
                              : "transparent",
                          border:
                            answers[questionNumber] === 1
                              ? `1px solid ${theme.black}`
                              : `1px solid ${theme.primary[300]}`,
                          color: theme.black,
                          cursor: graded ? "not-allowed" : "pointer",
                          opacity: graded ? 0.7 : 1,
                        }}
                      >
                        1
                      </div>
                      <div
                        onClick={
                          graded
                            ? null
                            : () => handleAnswerChange(questionNumber, 2)
                        }
                        style={{
                          backgroundColor:
                            answers[questionNumber] === 2
                              ? theme.black
                              : "transparent",
                          border:
                            answers[questionNumber] === 2
                              ? `1px solid ${theme.black}`
                              : `1px solid ${theme.primary[300]}`,
                          color: theme.black,
                          cursor: graded ? "not-allowed" : "pointer",
                          opacity: graded ? 0.7 : 1,
                        }}
                      >
                        2
                      </div>
                      <div
                        onClick={
                          graded
                            ? null
                            : () => handleAnswerChange(questionNumber, 3)
                        }
                        style={{
                          backgroundColor:
                            answers[questionNumber] === 3
                              ? theme.black
                              : "transparent",
                          border:
                            answers[questionNumber] === 3
                              ? `1px solid ${theme.black}`
                              : `1px solid ${theme.primary[300]}`,
                          color: theme.black,
                          cursor: graded ? "not-allowed" : "pointer",
                          opacity: graded ? 0.7 : 1,
                        }}
                      >
                        3
                      </div>
                      <div
                        onClick={
                          graded
                            ? null
                            : () => handleAnswerChange(questionNumber, 4)
                        }
                        style={{
                          backgroundColor:
                            answers[questionNumber] === 4
                              ? theme.black
                              : "transparent",
                          border:
                            answers[questionNumber] === 4
                              ? `1px solid ${theme.black}`
                              : `1px solid ${theme.primary[300]}`,
                          color: theme.black,
                          cursor: graded ? "not-allowed" : "pointer",
                          opacity: graded ? 0.7 : 1,
                        }}
                      >
                        4
                      </div>
                      <div
                        onClick={
                          graded
                            ? null
                            : () => handleAnswerChange(questionNumber, 5)
                        }
                        style={{
                          backgroundColor:
                            answers[questionNumber] === 5
                              ? theme.black
                              : "transparent",
                          border:
                            answers[questionNumber] === 5
                              ? `1px solid ${theme.black}`
                              : `1px solid ${theme.primary[300]}`,
                          color: theme.black,
                          cursor: graded ? "not-allowed" : "pointer",
                          opacity: graded ? 0.7 : 1,
                        }}
                      >
                        5
                      </div>
                    </div>
                  ) : (
                    // 주관식
                    <div>
                      <input
                        type="number"
                        value={answers[questionNumber] || ""}
                        placeholder="주관식 답 입력"
                        onChange={(e) => {
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
                          // 답안 업데이트
                          handleAnswerChange(
                            questionNumber,
                            value ? parseInt(value) : null
                          );
                        }}
                        style={{
                          width: "100%",
                          height: "100%",
                          backgroundColor: graded
                            ? gradedAnswers[questionNumber] === "correct"
                              ? "#e8f5e8"
                              : "#ffeaea"
                            : "white",
                          border: "none",
                          outline: "none",
                          textAlign: "center",
                          fontSize: "0.9rem",
                          padding: "0.15rem",
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
      <SubmitButton
        onClick={graded ? null : handleSubmitClick}
        disabled={graded}
        style={{
          backgroundColor: graded ? theme.gray : theme.primary[500],
          cursor: graded ? "not-allowed" : "pointer",
          opacity: graded ? 0.7 : 1,
        }}
      >
        {graded ? "이미 제출됨" : "제출"}
      </SubmitButton>

      {/* 제출 확인 모달 */}
      {showSubmitModal && (
        <ModalWrapper
          onClick={(e) => {
            if (e.target.id === "modal-background") {
              setShowSubmitModal(false);
            }
          }}
          id="modal-background"
        >
          <ModalContent>
            <ModalTitle>제출 확인</ModalTitle>
            <ModalText>답안을 제출하시겠습니까?</ModalText>
            <ModalButtons>
              <ModalButton onClick={() => setShowSubmitModal(false)}>
                취소
              </ModalButton>
              <ModalButton
                onClick={handleSubmit}
                style={{
                  backgroundColor: theme.primary[500],
                  color: theme.white,
                }}
              >
                확인
              </ModalButton>
            </ModalButtons>
          </ModalContent>
        </ModalWrapper>
      )}
    </Wrapper>
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

const Title = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid ${() => theme.gray};
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid ${() => theme.gray};
`;

const OMR = styled.div`
  border: 2px solid ${() => theme.primary[500]};
  border-radius: 0.5rem;
  width: 200px;
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
      padding: 0.5rem;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    &:nth-of-type(2) {
      // 선지 컨테이너 컨테이너
      flex-grow: 1;
      display: flex;
      align-items: center;
      padding: 0.5rem;
      & > div {
        // 선지 컨테이너
        flex-grow: 1;
        display: flex;
        justify-content: space-evenly;
        & > div {
          // 선지
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
        padding: 0.15rem;
        border-radius: 0.25rem;
      }
    }
  }
  &:last-of-type {
    border-bottom: 0;
    & > div {
      border-bottom-left-radius: 0.5rem;
    }
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

const ScoreDisplay = styled.div`
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid ${() => theme.gray};
  background-color: ${() => theme.primary[100]};
  text-align: center;

  & > div {
    margin: 0.25rem 0;
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

const ModalWrapper = styled.div`
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

const ModalContent = styled.div`
  background-color: ${() => theme.white};
  padding: 2rem;
  border-radius: 0.5rem;
  width: 300px;
  text-align: center;
`;

const ModalTitle = styled.h2`
  margin-bottom: 1rem;
`;

const ModalText = styled.p`
  margin-bottom: 2rem;
`;

const ModalSubText = styled.p`
  margin-bottom: 2rem;
  color: gray;
  font-size: 0.9rem;
`;

const ModalButtons = styled.div`
  display: flex;
  justify-content: space-around;
`;

const ModalButton = styled.button`
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

const TopButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid ${() => theme.gray};
`;

const AlreadySubmittedMessage = styled.div`
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid ${() => theme.primary[500]};
  background-color: ${() => theme.primary[100]};
  text-align: center;
  margin-bottom: 1rem;
`;

export default function Student() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <StudentContent />
    </Suspense>
  );
}
