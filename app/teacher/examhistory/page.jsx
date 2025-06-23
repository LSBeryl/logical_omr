/** @jsxImportSource @emotion/react */
"use client";

import styled from "@emotion/styled";
import theme from "../../style/theme";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "../../supabase";

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

  // 점수 기준 순위 계산 함수
  const calculateRankings = (submits) => {
    // 점수가 있는 제출만 필터링하고 점수 기준으로 정렬
    const validSubmits = submits
      .filter((submit) => submit.score !== null)
      .sort((a, b) => b.score - a.score);

    const rankings = [];
    let currentRank = 1;
    let currentScore = null;
    let sameScoreCount = 0;

    validSubmits.forEach((submit, index) => {
      if (submit.score !== currentScore) {
        // 새로운 점수인 경우
        currentRank = index + 1;
        currentScore = submit.score;
        sameScoreCount = 1;
      } else {
        // 같은 점수인 경우
        sameScoreCount++;
      }

      rankings.push({
        ...submit,
        rank: sameScoreCount > 1 ? `${currentRank} (공동)` : currentRank,
        displayRank: currentRank,
        isTied: sameScoreCount > 1,
      });
    });

    return rankings;
  };

  const rankings = calculateRankings(submits);

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
            <>
              {/* 순위 테이블 */}
              {rankings.length > 0 && (
                <RankingTable>
                  <RankingHeader>
                    <RankingTitle>순위표</RankingTitle>
                  </RankingHeader>
                  <RankingContent>
                    <RankingRow $isHeader>
                      <RankingCell $isRank>순위</RankingCell>
                      <RankingCell $isName>학생명</RankingCell>
                      <RankingCell $isScore>점수</RankingCell>
                      <RankingCell $isCorrect>정답</RankingCell>
                    </RankingRow>
                    {rankings.map((ranking, index) => (
                      <RankingRow key={index} $isTied={ranking.isTied}>
                        <RankingCell $isRank>
                          {String(ranking.rank).includes("공동")
                            ? String(ranking.rank).replace(
                                "(공동)",
                                "위 (공동)"
                              )
                            : `${ranking.rank}위`}
                        </RankingCell>
                        <RankingCell $isName>
                          {ranking.User?.name || "알 수 없음"}
                          {ranking.User?.user_name && (
                            <span style={{ color: "#888", marginLeft: 4 }}>
                              ({ranking.User.user_name})
                            </span>
                          )}
                        </RankingCell>
                        <RankingCell $isScore>{ranking.score}점</RankingCell>
                        <RankingCell $isCorrect>
                          {ranking.correct_count}개
                        </RankingCell>
                      </RankingRow>
                    ))}
                  </RankingContent>
                </RankingTable>
              )}

              {/* 학생별 상세 정보 */}
              <SubmitList>
                {rankings.map((submit, index) => (
                  <SubmitItem key={index}>
                    <BoxHeader>
                      <RankBadge
                        $rank={submit.displayRank}
                        $isTied={submit.isTied}
                      >
                        {String(submit.rank).includes("공동")
                          ? String(submit.rank).replace("(공동)", "위 (공동)")
                          : `${submit.rank}위`}
                      </RankBadge>
                      {submit.User?.name ? (
                        <span>
                          <strong>{submit.User.name}</strong>
                          {submit.User.user_name && (
                            <span style={{ color: "#888", marginLeft: 4 }}>
                              ({submit.User.user_name})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span>알 수 없음</span>
                      )}
                    </BoxHeader>
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
                              ? (() => {
                                  const selectiveName =
                                    selectedExam.selective_name
                                      ? selectedExam.selective_name.split(",")[
                                          submit.selected_selective_num - 1
                                        ]
                                      : null;
                                  return (
                                    selectiveName ||
                                    `선택 과목 ${submit.selected_selective_num}`
                                  );
                                })()
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
                          {submit.score !== null &&
                          submit.correct_count !== null
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
            </>
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

  @media (max-width: 1024px) {
    padding: 1.5rem;
    max-width: 100%;
  }

  @media (max-width: 928px) {
    padding: 1rem;
  }

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid ${() => theme.primary[500]};

  @media (max-width: 1024px) {
    margin-bottom: 1.5rem;
  }

  @media (max-width: 928px) {
    flex-direction: column;
    gap: 0.8rem;
    align-items: stretch;
    margin-bottom: 1.2rem;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
    margin-bottom: 1rem;
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${() => theme.primary[500]};

  @media (max-width: 1024px) {
    font-size: 1.8rem;
  }

  @media (max-width: 928px) {
    font-size: 1.6rem;
    text-align: center;
  }

  @media (max-width: 768px) {
    font-size: 1.5rem;
    text-align: center;
  }
`;

const HeaderRight = styled.div`
  display: flex;
  gap: 1rem;

  @media (max-width: 928px) {
    justify-content: center;
  }

  @media (max-width: 768px) {
    justify-content: center;
  }
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

  @media (max-width: 1024px) {
    padding: 0.7rem 1.3rem;
    font-size: 0.95rem;
  }

  @media (max-width: 928px) {
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
  }

  @media (max-width: 768px) {
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
  }
`;

const NoDataMessage = styled.div`
  text-align: center;
  padding: 3rem;
  font-size: 1.2rem;
  color: #666;

  @media (max-width: 1024px) {
    padding: 2.5rem;
    font-size: 1.1rem;
  }

  @media (max-width: 928px) {
    padding: 2rem;
    font-size: 1rem;
  }

  @media (max-width: 768px) {
    padding: 2rem 1rem;
    font-size: 1rem;
  }
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

  @media (max-width: 1024px) {
    padding: 1.3rem;
    gap: 0.8rem;
  }

  @media (max-width: 928px) {
    flex-direction: column;
    align-items: stretch;
    padding: 1.2rem;
    gap: 0.8rem;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    padding: 1rem;
    gap: 0.8rem;
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
  margin: 0 0 0.5rem 0;

  @media (max-width: 1024px) {
    font-size: 1.2rem;
  }

  @media (max-width: 928px) {
    font-size: 1.1rem;
    text-align: center;
  }

  @media (max-width: 768px) {
    font-size: 1.1rem;
    text-align: center;
  }
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

  @media (max-width: 1024px) {
    gap: 1.5rem;
    font-size: 0.85rem;
  }

  @media (max-width: 928px) {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
    font-size: 0.8rem;

    & > div {
      justify-content: center;
    }
  }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;

    & > div {
      justify-content: center;
    }
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

  @media (max-width: 1024px) {
    padding: 0.7rem 1.3rem;
    font-size: 0.95rem;
  }

  @media (max-width: 928px) {
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
    width: 100%;
  }

  @media (max-width: 768px) {
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
    width: 100%;
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

  @media (max-width: 1024px) {
    font-size: 0.95rem;
  }

  @media (max-width: 928px) {
    font-size: 0.9rem;
  }

  @media (max-width: 768px) {
    font-size: 0.9rem;
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

    @media (max-width: 1024px) {
      font-size: 1.4rem;
    }

    @media (max-width: 928px) {
      font-size: 1.3rem;
      text-align: center;
    }

    @media (max-width: 768px) {
      font-size: 1.3rem;
      text-align: center;
    }
  }

  p {
    color: #666;
    font-size: 1rem;

    @media (max-width: 1024px) {
      font-size: 0.95rem;
    }

    @media (max-width: 928px) {
      font-size: 0.9rem;
      text-align: center;
    }

    @media (max-width: 768px) {
      font-size: 0.9rem;
      text-align: center;
    }
  }

  @media (max-width: 1024px) {
    margin-bottom: 1.5rem;
  }

  @media (max-width: 928px) {
    margin-bottom: 1.2rem;
  }

  @media (max-width: 768px) {
    margin-bottom: 1rem;
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

  @media (max-width: 1024px) {
    padding: 1.3rem;
  }

  @media (max-width: 928px) {
    padding: 1.2rem;
  }

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const BoxHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: #666;

  @media (max-width: 1024px) {
    font-size: 0.85rem;
  }

  @media (max-width: 928px) {
    font-size: 0.8rem;
  }

  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
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

  @media (max-width: 1024px) {
    gap: 1.5rem;
    font-size: 0.85rem;
  }

  @media (max-width: 928px) {
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.8rem;

    & > div {
      justify-content: flex-start;
    }
  }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.8rem;

    & > div {
      justify-content: flex-start;
    }
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

  @media (max-width: 1024px) {
    font-size: 0.85rem;
  }

  @media (max-width: 928px) {
    font-size: 0.8rem;

    & > div {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.2rem;
    }
  }

  @media (max-width: 768px) {
    font-size: 0.8rem;

    & > div {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.2rem;
    }
  }
`;

const RankingTable = styled.div`
  margin-bottom: 2rem;
  padding: 1.5rem;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  background: #f8f9fa;

  @media (max-width: 1024px) {
    padding: 1.2rem;
    margin-bottom: 1.5rem;
  }

  @media (max-width: 768px) {
    padding: 1rem;
    margin-bottom: 1rem;
  }
`;

const RankingHeader = styled.div`
  margin-bottom: 1rem;
`;

const RankingTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: ${() => theme.primary[500]};
  text-align: center;

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const RankingContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  @media (max-width: 768px) {
    gap: 0.3rem;
  }
`;

const RankingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: ${({ $isHeader }) => ($isHeader ? theme.primary[100] : "white")};
  border-radius: 0.25rem;
  border: ${({ $isTied, $isHeader }) =>
    $isHeader
      ? "1px solid #ccc"
      : $isTied
      ? "1px dashed #ccc"
      : "1px solid #eee"};
  font-weight: ${({ $isHeader }) => ($isHeader ? "600" : "normal")};

  @media (max-width: 1024px) {
    padding: 0.6rem;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
    padding: 0.5rem;
  }
`;

const RankingCell = styled.div`
  flex: ${({ $isRank, $isName }) =>
    $isRank ? "0 0 60px" : $isName ? "1" : "0 0 80px"};
  font-weight: ${({ $isRank }) => ($isRank ? "600" : "normal")};
  color: ${({ $isRank }) => ($isRank ? theme.primary[500] : "#666")};
  text-align: ${({ $isRank, $isScore, $isCorrect }) =>
    $isRank || $isScore || $isCorrect ? "center" : "left"};

  @media (max-width: 1024px) {
    flex: ${({ $isRank, $isName }) =>
      $isRank ? "0 0 50px" : $isName ? "1" : "0 0 70px"};
    font-size: 0.9rem;
  }

  @media (max-width: 768px) {
    flex: none;
    width: 100%;
    text-align: center;
    font-size: 0.85rem;
  }
`;

const RankBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 1.5rem;
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${({ $rank, $isTied }) =>
    $isTied
      ? "#ffd700"
      : $rank === 1
      ? "#ffd700"
      : $rank === 2
      ? "#c0c0c0"
      : $rank === 3
      ? "#cd7f32"
      : "#e9ecef"};
  color: ${({ $rank, $isTied }) => ($isTied || $rank <= 3 ? "#000" : "#666")};
  border: ${({ $isTied }) => ($isTied ? "1px solid #ffc107" : "none")};
`;
