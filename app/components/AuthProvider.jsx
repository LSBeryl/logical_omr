"use client";

import { createContext, useContext, useEffect, useState } from "react";
import supabase from "../supbase";

const AuthContext = createContext({});

export const useAuth = () => {
  return useContext(AuthContext);
};

// 개발 환경에서만 콘솔 로그 출력
const devLog = (...args) => {
  if (process.env.NODE_ENV === "development") {
    console.log(...args);
  }
};

const devError = (...args) => {
  if (process.env.NODE_ENV === "development") {
    console.error(...args);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 초기 세션 확인 - 단순화
    const getInitialSession = async () => {
      try {
        devLog("AuthProvider: 초기 세션 확인 시작");
        setLoading(true);
        setError(null);

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          devError("AuthProvider: 세션 확인 오류:", error);
          setError(error.message);
        } else if (session?.user) {
          devLog("AuthProvider: 기존 세션 발견:", session.user);

          // 세션 유효성 검증
          const isValidSession = await validateSession(
            session,
            session.user.id
          );

          if (isValidSession) {
            setUser(session.user);
            // 사용자 데이터와 세션을 동시에 설정
            setUserData({ id: session.user.id, email: session.user.email });
            // 백그라운드에서 상세 데이터 가져오기
            fetchUserDataBackground(session.user.id);
          } else {
            devLog("AuthProvider: 유효하지 않은 세션, 완전 초기화");

            // User 테이블에서 세션 정보 제거
            try {
              await supabase
                .from("User")
                .update({
                  current_session_id: null,
                  last_logout_at: new Date().toISOString(),
                })
                .eq("id", session.user.id);
            } catch (updateErr) {
              devError("AuthProvider: 세션 정보 제거 중 오류:", updateErr);
            }

            // 브라우저 스토리지 정리
            try {
              localStorage.removeItem("sb-diznmqugxbbchmdeoprj-auth-token");
              sessionStorage.removeItem("sb-diznmqugxbbchmdeoprj-auth-token");
            } catch (storageErr) {
              devError("AuthProvider: 스토리지 정리 중 오류:", storageErr);
            }

            // Supabase Auth에서 로그아웃
            try {
              await supabase.auth.signOut();
            } catch (signOutErr) {
              devError("AuthProvider: 로그아웃 중 오류:", signOutErr);
            }

            setUser(null);
            setUserData(null);

            // 페이지 새로고침으로 완전 초기화
            devLog(
              "AuthProvider: 유효하지 않은 세션 - 페이지 새로고침으로 완전 초기화"
            );
            window.location.reload();
          }
        } else {
          devLog("AuthProvider: 기존 세션 없음");
        }
      } catch (err) {
        devError("AuthProvider: 초기 세션 확인 중 오류:", err);
        setError(err.message);
      } finally {
        setLoading(false);
        devLog("AuthProvider: 초기 세션 확인 완료");
      }
    };

    getInitialSession();

    // 인증 상태 변경 감지 - 단순화
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      devLog("AuthProvider: 인증 상태 변경:", event, session?.user);

      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        setUserData({ id: session.user.id, email: session.user.email });
        fetchUserDataBackground(session.user.id);
      } else if (event === "SIGNED_OUT") {
        // signOut 함수에서 상태 초기화를 처리하므로 여기서는 아무것도 하지 않음
        devLog("AuthProvider: SIGNED_OUT 이벤트 감지");
        // 혹시 모르니 상태도 초기화
        setUser(null);
        setUserData(null);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        // 토큰 갱신 시에도 세션 유효성 검증
        const isValidSession = await validateSession(session, session.user.id);

        if (isValidSession) {
          setUser(session.user);
          setUserData({ id: session.user.id, email: session.user.email });
          fetchUserDataBackground(session.user.id);
        } else {
          devLog(
            "AuthProvider: 토큰 갱신 후 유효하지 않은 세션, 로그아웃 처리"
          );
          await supabase.auth.signOut();
          setUser(null);
          setUserData(null);
        }
      }

      setLoading(false);
    });

    return () => {
      devLog("AuthProvider: 구독 해제");
      subscription.unsubscribe();
    };
  }, []);

  // 주기적 세션 점검 (1초마다)
  useEffect(() => {
    if (!user) return; // 로그인된 사용자가 없으면 점검하지 않음

    const sessionCheckInterval = setInterval(async () => {
      try {
        devLog("AuthProvider: 주기적 세션 점검 시작");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          devLog("AuthProvider: 세션이 없음, 로그아웃 처리");
          clearInterval(sessionCheckInterval);
          setUser(null);
          setUserData(null);
          return;
        }

        // User 테이블에서 현재 세션 정보 확인
        const { data: userData, error: userError } = await supabase
          .from("User")
          .select("current_session_id")
          .eq("id", session.user.id)
          .single();

        if (userError) {
          devError("AuthProvider: 사용자 데이터 조회 중 오류:", userError);
          return;
        }

        // current_session_id가 null이면 유효하지 않은 세션
        if (!userData.current_session_id) {
          devLog("AuthProvider: current_session_id가 null, 세션 무효");
          clearInterval(sessionCheckInterval);
          // 이미 로그아웃된 상태이므로 signOut 호출하지 않음
          setUser(null);
          setUserData(null);
          return;
        }

        // current_session_id가 현재 세션의 access_token과 일치하는지 확인
        const isValidSession =
          userData.current_session_id === session.access_token;

        if (!isValidSession) {
          devLog("AuthProvider: 다른 곳에서 로그인됨, 자동 로그아웃");

          // 기존 세션 삭제
          try {
            const response = await fetch("/api/auth/invalidate-session", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                sessionId: userData.current_session_id,
              }),
            });

            if (response.ok) {
              devLog("AuthProvider: 기존 세션 삭제 완료");
            }
          } catch (sessionErr) {
            devLog("AuthProvider: 기존 세션 삭제 중 오류:", sessionErr);
          }

          // 브라우저 스토리지 정리
          try {
            devLog("AuthProvider: 강제 로그아웃 - 브라우저 스토리지 정리 시작");

            // Supabase 관련 스토리지 정리
            localStorage.removeItem("sb-diznmqugxbbchmdeoprj-auth-token");
            sessionStorage.removeItem("sb-diznmqugxbbchmdeoprj-auth-token");

            devLog("AuthProvider: 브라우저 스토리지 정리 완료");
          } catch (storageErr) {
            devError("AuthProvider: 스토리지 정리 중 오류:", storageErr);
          }

          // 자동 로그아웃
          await supabase.auth.signOut();
          setUser(null);
          setUserData(null);

          // 사용자에게 알림
          alert("다른 곳에서 로그인되어 현재 세션이 종료되었습니다.");

          clearInterval(sessionCheckInterval);

          // 페이지 새로고침으로 완전 초기화
          devLog(
            "AuthProvider: 강제 로그아웃 - 페이지 새로고침으로 완전 초기화"
          );
          window.location.reload();
        }
      } catch (err) {
        devError("AuthProvider: 주기적 세션 점검 중 오류:", err);
      }
    }, 1000); // 1초마다 점검

    return () => {
      clearInterval(sessionCheckInterval);
    };
  }, [user]);

  // 세션 유효성 검증 함수
  const validateSession = async (session, userId) => {
    try {
      // User 테이블에서 현재 세션 정보 확인
      const { data: userData, error } = await supabase
        .from("User")
        .select("current_session_id")
        .eq("id", userId)
        .single();

      if (error) {
        devError("AuthProvider: 세션 유효성 검증 중 오류:", error);
        return false;
      }

      // current_session_id가 null이면 유효하지 않은 세션
      if (!userData.current_session_id) {
        devLog("AuthProvider: current_session_id가 null, 세션 무효");
        return false;
      }

      // current_session_id가 현재 세션의 access_token과 일치하는지 확인
      const isValid = userData.current_session_id === session.access_token;

      devLog("AuthProvider: 세션 유효성 검증 결과:", {
        currentSessionId: userData.current_session_id,
        sessionAccessToken: session.access_token,
        isValid,
      });

      // 세션이 유효하지 않으면 자동으로 로그아웃 처리
      if (!isValid && userData.current_session_id) {
        devLog("AuthProvider: 다른 곳에서 로그인됨, 현재 세션 무효화");
        try {
          // 서버 API를 통해 기존 세션 삭제
          const response = await fetch("/api/auth/invalidate-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionId: userData.current_session_id,
            }),
          });

          if (response.ok) {
            devLog("AuthProvider: 기존 세션 삭제 완료");
          }
        } catch (sessionErr) {
          devLog("AuthProvider: 기존 세션 삭제 중 오류:", sessionErr);
        }
      }

      return isValid;
    } catch (err) {
      devError("AuthProvider: 세션 유효성 검증 중 오류:", err);
      return false;
    }
  };

  // 백그라운드에서 사용자 데이터 가져오기 (타임아웃 없이)
  const fetchUserDataBackground = async (userId) => {
    try {
      devLog(
        "AuthProvider: 백그라운드 사용자 데이터 가져오기 시작, userId:",
        userId
      );

      const { data: userData, error: userError } = await supabase
        .from("User")
        .select("user_name, name, role, email")
        .eq("id", userId)
        .single();

      if (userError) {
        devError("AuthProvider: 사용자 데이터 가져오기 오류:", userError);
        // 에러가 있어도 기존 기본 데이터는 유지
      } else {
        devLog("AuthProvider: 사용자 데이터 가져오기 성공:", userData);
        setUserData(userData);
      }
    } catch (err) {
      devError("AuthProvider: 사용자 데이터 조회 중 오류:", err);
      // 에러가 있어도 기존 기본 데이터는 유지
    }
  };

  const signOut = async () => {
    try {
      devLog("AuthProvider: 로그아웃 시작");

      // 현재 세션에서 사용자 ID 가져오기 (user 상태에 의존하지 않음)
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      devLog("AuthProvider: 현재 사용자 ID:", currentUserId);

      // 1. 먼저 User 테이블에서 세션 정보 업데이트 (아직 인증된 상태에서)
      if (currentUserId) {
        try {
          devLog("AuthProvider: User 테이블 업데이트 시작");
          const { error: updateError } = await supabase
            .from("User")
            .update({
              current_session_id: null,
              last_logout_at: new Date().toISOString(),
            })
            .eq("id", currentUserId);

          if (updateError) {
            devError("AuthProvider: 세션 정보 업데이트 실패:", updateError);
          } else {
            devLog("AuthProvider: 세션 정보 업데이트 완료");
          }
        } catch (updateErr) {
          devError("AuthProvider: 세션 정보 업데이트 중 오류:", updateErr);
        }
      } else {
        devLog(
          "AuthProvider: 현재 사용자 ID가 없어서 User 테이블 업데이트 건너뜀"
        );
      }

      // 2. 브라우저 스토리지 완전 정리
      try {
        devLog("AuthProvider: 브라우저 스토리지 정리 시작");

        // Supabase 관련 스토리지 정리
        localStorage.removeItem("sb-diznmqugxbbchmdeoprj-auth-token");
        sessionStorage.removeItem("sb-diznmqugxbbchmdeoprj-auth-token");

        // 모든 localStorage 정리 (선택사항)
        // localStorage.clear();

        // 모든 sessionStorage 정리 (선택사항)
        // sessionStorage.clear();

        devLog("AuthProvider: 브라우저 스토리지 정리 완료");
      } catch (storageErr) {
        devError("AuthProvider: 스토리지 정리 중 오류:", storageErr);
      }

      // 3. 상태 초기화
      setUser(null);
      setUserData(null);

      // 4. 페이지 새로고침 (완전한 초기화)
      devLog("AuthProvider: 페이지 새로고침으로 완전 초기화");
      window.location.reload();
    } catch (err) {
      devError("AuthProvider: 로그아웃 중 오류:", err);
      // 오류가 발생해도 상태는 초기화
      setUser(null);
      setUserData(null);
    }
  };

  const value = {
    user,
    userData,
    loading,
    error,
    signOut,
    refreshUserData: () => user && fetchUserDataBackground(user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
