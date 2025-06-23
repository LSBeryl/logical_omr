/** @jsxImportSource @emotion/react */
"use client";

import styled from "@emotion/styled";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import supabase from "../supabase";
import axios from "axios";

export default function Debug() {
  const [users, setUsers] = useState([]);
  const [exams, setExams] = useState([]);
  const [submits, setSubmits] = useState([]);
  const [authUsers, setAuthUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("users");
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
          .select("user_name, role")
          .eq("id", user.id)
          .single();

        if (userError || !userData) {
          router.push("/");
          return;
        }

        // LSBeryl 또는 선생님 역할만 접근 허용
        if (
          userData.user_name === "LSBeryl" ||
          userData.role === "teacher" ||
          userData.email === "dltjgus8098@naver.com"
        ) {
          setCurrentUser(userData);

          // 모든 테이블 데이터 가져오기
          await Promise.all([
            fetchUsers(),
            fetchExams(),
            fetchSubmits(),
            fetchAuthUsers(userData),
          ]);
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

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from("User").select("*");
      if (!error) {
        setUsers(data || []);
      }
    } catch (err) {
      console.error("Users fetch error:", err);
    }
  };

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase.from("Exam").select("*");
      if (!error) {
        setExams(data || []);
      }
    } catch (err) {
      console.error("Exams fetch error:", err);
    }
  };

  const fetchSubmits = async () => {
    try {
      const { data, error } = await supabase.from("Submit").select(`
          *,
          User:submitter_id(user_name, name, role),
          Exam:exam_id(name, question_num)
        `);
      if (!error) {
        setSubmits(data || []);
      }
    } catch (err) {
      console.error("Submits fetch error:", err);
    }
  };

  const fetchAuthUsers = async (userData) => {
    try {
      // 관리자만 요청 (LSBeryl 또는 해당 이메일)
      if (userData.user_name !== "LSBeryl") {
        setAuthUsers([]);
        return;
      }
      const res = await axios.get("/api/admin/list-auth-users", {
        headers: { "x-admin-token": "LSBeryl" },
      });
      const json = await res.data;
      if (json.users) {
        setAuthUsers(json.users);
      } else {
        setAuthUsers([]);
      }
    } catch (err) {
      setAuthUsers([]);
      console.error("Auth users fetch error:", err);
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm("정말로 이 사용자를 삭제하시겠습니까?")) return;

    try {
      // User 테이블에서 삭제
      const { error: userError } = await supabase
        .from("User")
        .delete()
        .eq("id", userId);

      if (userError) {
        alert("User 테이블 삭제 중 오류: " + userError.message);
        return;
      }

      // Auth에서 삭제 (API 호출)
      try {
        const res = await axios.delete("/api/admin/delete-auth-user", {
          headers: { "x-admin-token": "LSBeryl" },
          data: { userId },
        });

        if (res.data.success) {
          alert("사용자가 성공적으로 삭제되었습니다.");
        } else {
          alert(
            "User 테이블은 삭제되었지만, Auth에서 삭제 실패: " + res.data.error
          );
        }
      } catch (authErr) {
        alert(
          "User 테이블은 삭제되었지만, Auth에서 삭제 중 오류가 발생했습니다."
        );
        console.error("Auth 삭제 오류:", authErr);
      }

      await fetchUsers();
      await fetchAuthUsers(currentUser);
    } catch (err) {
      alert("삭제 중 오류가 발생했습니다: " + err.message);
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

  const deleteSubmit = async (submitId) => {
    if (!confirm("정말로 이 제출을 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from("Submit")
        .delete()
        .eq("id", submitId);

      if (error) {
        alert("삭제 중 오류: " + error.message);
        return;
      }

      alert("제출이 성공적으로 삭제되었습니다.");
      await fetchSubmits();
    } catch (err) {
      alert("삭제 중 오류가 발생했습니다: " + err.message);
    }
  };

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div>에러: {error}</div>;
  if (!currentUser) return <div>접근 권한이 없습니다.</div>;

  return (
    <Wrapper>
      <Header>
        <Title>관리자 디버그 페이지</Title>
        <HeaderRight>
          <HomeButton onClick={() => router.push("/")}>홈으로</HomeButton>
        </HeaderRight>
      </Header>

      <TabContainer>
        <Tab
          $isActive={activeTab === "users"}
          onClick={() => setActiveTab("users")}
        >
          User 테이블 ({users.length})
        </Tab>
        <Tab
          $isActive={activeTab === "auth"}
          onClick={() => setActiveTab("auth")}
        >
          Auth 사용자 ({authUsers.length})
        </Tab>
        <Tab
          $isActive={activeTab === "exams"}
          onClick={() => setActiveTab("exams")}
        >
          Exam 테이블 ({exams.length})
        </Tab>
        <Tab
          $isActive={activeTab === "submits"}
          onClick={() => setActiveTab("submits")}
        >
          Submit 테이블 ({submits.length})
        </Tab>
      </TabContainer>

      {activeTab === "users" && (
        <DataSection>
          <SectionTitle>User 테이블 - 총 {users.length}명</SectionTitle>
          <DataList>
            {users.map((user, index) => (
              <DataItem key={index}>
                <DataContent>
                  <div>
                    <strong>ID</strong>
                    <ColonSpan>:</ColonSpan> {user.id}
                  </div>
                  <div>
                    <strong>사용자명</strong>
                    <ColonSpan>:</ColonSpan> "{user.user_name}"
                  </div>
                  <div>
                    <strong>이름</strong>
                    <ColonSpan>:</ColonSpan> {user.name}
                  </div>
                  <div>
                    <strong>이메일</strong>
                    <ColonSpan>:</ColonSpan> {user.email}
                  </div>
                  <div>
                    <strong>역할</strong>
                    <ColonSpan>:</ColonSpan> {user.role}
                  </div>
                  <div>
                    <strong>학교</strong>
                    <ColonSpan>:</ColonSpan> {user.school || "없음"}
                  </div>
                  <div>
                    <strong>학년</strong>
                    <ColonSpan>:</ColonSpan> {user.grade || "없음"}
                  </div>
                </DataContent>
                <DeleteButton onClick={() => deleteUser(user.id)}>
                  삭제
                </DeleteButton>
              </DataItem>
            ))}
          </DataList>
        </DataSection>
      )}

      {activeTab === "auth" && (
        <DataSection>
          <SectionTitle>Auth 사용자 - 총 {authUsers.length}명</SectionTitle>
          <DataList>
            {authUsers.map((authUser, index) => (
              <DataItem key={index}>
                <DataContent>
                  <div>
                    <strong>ID</strong>
                    <ColonSpan>:</ColonSpan> {authUser.id}
                  </div>
                  <div>
                    <strong>이메일</strong>
                    <ColonSpan>:</ColonSpan> {authUser.email}
                  </div>
                  <div>
                    <strong>이메일 확인</strong>
                    <ColonSpan>:</ColonSpan>{" "}
                    {authUser.email_confirmed_at ? "확인됨" : "미확인"}
                  </div>
                  <div>
                    <strong>가입일</strong>
                    <ColonSpan>:</ColonSpan>{" "}
                    {new Date(authUser.created_at).toLocaleString()}
                  </div>
                  <div>
                    <strong>마지막 로그인</strong>
                    <ColonSpan>:</ColonSpan>{" "}
                    {authUser.last_sign_in_at
                      ? new Date(authUser.last_sign_in_at).toLocaleString()
                      : "없음"}
                  </div>
                </DataContent>
                <DeleteButton onClick={() => deleteUser(authUser.id)}>
                  삭제
                </DeleteButton>
              </DataItem>
            ))}
          </DataList>
        </DataSection>
      )}

      {activeTab === "exams" && (
        <DataSection>
          <SectionTitle>Exam 테이블 - 총 {exams.length}개</SectionTitle>
          <DataList>
            {exams.map((exam, index) => (
              <DataItem key={index}>
                <DataContent>
                  <div>
                    <strong>ID</strong>
                    <ColonSpan>:</ColonSpan> {exam.id}
                  </div>
                  <div>
                    <strong>시험명</strong>
                    <ColonSpan>:</ColonSpan> {exam.name}
                  </div>
                  <div>
                    <strong>문제 수</strong>
                    <ColonSpan>:</ColonSpan> {exam.question_num}
                  </div>
                  <div>
                    <strong>선택과목 여부</strong>
                    <ColonSpan>:</ColonSpan>{" "}
                    {exam.has_selective ? "있음" : "없음"}
                  </div>
                  <div>
                    <strong>선택과목 수</strong>
                    <ColonSpan>:</ColonSpan> {exam.selective_count || 0}
                  </div>
                  <div>
                    <strong>정답</strong>
                    <ColonSpan>:</ColonSpan> {exam.answers || "없음"}
                  </div>
                  <div>
                    <strong>배점</strong>
                    <ColonSpan>:</ColonSpan> {exam.answer_scores || "없음"}
                  </div>
                  <div>
                    <strong>답안 유형</strong>
                    <ColonSpan>:</ColonSpan> {exam.answer_types || "없음"}
                  </div>
                  <div>
                    <strong>선택과목 범위</strong>
                    <ColonSpan>:</ColonSpan> {exam.selective_range || "없음"}
                  </div>
                  <div>
                    <strong>선택과목 정답</strong>
                    <ColonSpan>:</ColonSpan> {exam.selective_answers || "없음"}
                  </div>
                  <div>
                    <strong>선택과목 배점</strong>
                    <ColonSpan>:</ColonSpan> {exam.selective_scores || "없음"}
                  </div>
                  <div>
                    <strong>선택과목 유형</strong>
                    <ColonSpan>:</ColonSpan> {exam.selective_types || "없음"}
                  </div>
                  <div>
                    <strong>선택과목 이름</strong>
                    <ColonSpan>:</ColonSpan> {exam.selective_name || "없음"}
                  </div>
                  <div>
                    <strong>생성일</strong>
                    <ColonSpan>:</ColonSpan>{" "}
                    {new Date(exam.created_at).toLocaleString()}
                  </div>
                </DataContent>
                <DeleteButton onClick={() => deleteExam(exam.id)}>
                  삭제
                </DeleteButton>
              </DataItem>
            ))}
          </DataList>
        </DataSection>
      )}

      {activeTab === "submits" && (
        <DataSection>
          <SectionTitle>Submit 테이블 - 총 {submits.length}개</SectionTitle>
          <DataList>
            {submits.map((submit, index) => (
              <DataItem key={index}>
                <DataContent>
                  <div>
                    <strong>ID</strong>
                    <ColonSpan>:</ColonSpan> {submit.id}
                  </div>
                  <div>
                    <strong>제출자</strong>
                    <ColonSpan>:</ColonSpan> {submit.User?.name || "알 수 없음"}{" "}
                    ({submit.User?.user_name || "알 수 없음"})
                  </div>
                  <div>
                    <strong>제출자 역할</strong>
                    <ColonSpan>:</ColonSpan> {submit.User?.role || "알 수 없음"}
                  </div>
                  <div>
                    <strong>시험명</strong>
                    <ColonSpan>:</ColonSpan> {submit.Exam?.name || "알 수 없음"}
                  </div>
                  <div>
                    <strong>문제 수</strong>
                    <ColonSpan>:</ColonSpan>{" "}
                    {submit.Exam?.question_num || "알 수 없음"}문제
                  </div>
                  <div>
                    <strong>제출된 답안</strong>
                    <ColonSpan>:</ColonSpan> {submit.submitted_answer || "없음"}
                  </div>
                  <div>
                    <strong>선택한 선택과목</strong>
                    <ColonSpan>:</ColonSpan>{" "}
                    {submit.selected_selective_num
                      ? (() => {
                          const selectiveName = submit.Exam?.selective_name
                            ? submit.Exam.selective_name.split(",")[
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
                  <div>
                    <strong>점수</strong>
                    <ColonSpan>:</ColonSpan>{" "}
                    {submit.score !== null ? `${submit.score}점` : "채점 안됨"}
                  </div>
                  <div>
                    <strong>맞힌 개수</strong>
                    <ColonSpan>:</ColonSpan>{" "}
                    {submit.correct_count !== null
                      ? `${submit.correct_count}개`
                      : "채점 안됨"}
                  </div>
                  {submit.wrong_questions && (
                    <div>
                      <strong>틀린 문제</strong>
                      <ColonSpan>:</ColonSpan>{" "}
                      {submit.wrong_questions || "없음"}
                    </div>
                  )}
                  <div>
                    <strong>제출 시각</strong>
                    <ColonSpan>:</ColonSpan>{" "}
                    {new Date(submit.submitted_at).toLocaleString()}
                  </div>
                  <div>
                    <strong>제출자 ID</strong>
                    <ColonSpan>:</ColonSpan> {submit.submitter_id}
                  </div>
                  <div>
                    <strong>시험 ID</strong>
                    <ColonSpan>:</ColonSpan> {submit.exam_id}
                  </div>
                </DataContent>
                <DeleteButton onClick={() => deleteSubmit(submit.id)}>
                  삭제
                </DeleteButton>
              </DataItem>
            ))}
          </DataList>
        </DataSection>
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
  border-bottom: 2px solid #082870;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #082870;
`;

const UserInfo = styled.div`
  font-size: 1rem;
  color: #666;
  font-weight: 500;
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
  color: #082870;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #f0f0f0;
  }
`;

const TabContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
`;

const Tab = styled.button`
  padding: 0.75rem 1.5rem;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  background: ${(props) => (props.$isActive ? "#082870" : "white")};
  color: ${(props) => (props.$isActive ? "white" : "#082870")};
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: ${(props) => (props.$isActive ? "#082870" : "#f0f0f0")};
  }
`;

const DataSection = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #082870;
`;

const DataList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const DataItem = styled.div`
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  padding: 1rem;
  background: #f9f9f9;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;

  & > div {
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    word-break: break-all;
  }
`;

const DataContent = styled.div`
  flex: 1;
`;

const ColonSpan = styled.span`
  margin: 0 4px;
`;

const DeleteButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  background: #f0f0f0;
  color: #082870;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #e0e0e0;
  }
`;
