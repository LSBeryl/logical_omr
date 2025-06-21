"use client";

import { createContext, useContext, useEffect, useState } from "react";
import supabase from "../supabase";

const AuthContext = createContext();

// 랜덤 세션 ID 생성 함수
const generateSessionId = () => {
  return (
    "session_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now()
  );
};

// 로컬 스토리지에서 세션 ID 가져오기
const getLocalSessionId = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("localSessionId");
};

// 로컬 스토리지에 세션 ID 저장
const setLocalSessionId = (sessionId) => {
  if (typeof window === "undefined") return;
  if (sessionId) {
    localStorage.setItem("localSessionId", sessionId);
  } else {
    localStorage.removeItem("localSessionId");
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 사용자 데이터 가져오기
  const fetchUserData = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("User")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("사용자 데이터 가져오기 실패:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("사용자 데이터 가져오기 중 오류:", error);
      return null;
    }
  };

  // 세션 유효성 검사 (로컬 세션 ID vs DB 세션 ID)
  const checkSessionValidity = async () => {
    if (!user || !userData) {
      console.log("사용자 정보 없음 - 세션 검사 건너뛰기");
      return true;
    }

    try {
      console.log("세션 유효성 검사 시작");

      // 로컬 스토리지의 세션 ID 가져오기
      const localSessionId = getLocalSessionId();
      console.log("로컬 세션 ID:", localSessionId);

      if (!localSessionId) {
        console.log("로컬 세션 ID 없음 - 로그아웃 처리");
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        await signOut();
        return false;
      }

      // DB에서 현재 세션 ID 가져오기
      const { data: currentUserData, error } = await supabase
        .from("User")
        .select("current_session_id")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("DB 세션 ID 가져오기 실패:", error);
        return true; // 오류 시 통과
      }

      console.log("DB 세션 ID:", currentUserData.current_session_id);

      // 세션 ID 비교
      if (currentUserData.current_session_id !== localSessionId) {
        console.log("세션 ID 불일치 - 로그아웃 처리");

        if (!currentUserData.current_session_id) {
          alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        } else {
          alert("다른 곳에서 로그인되어 현재 세션이 종료됩니다.");
        }

        await signOut();
        return false;
      }

      console.log("세션 유효함");
      return true;
    } catch (error) {
      console.error("세션 유효성 검사 중 오류:", error);
      return true; // 오류 시 통과
    }
  };

  // 새 세션 ID 발급 및 저장
  const issueNewSession = async (userId) => {
    try {
      const newSessionId = generateSessionId();
      console.log("새 세션 ID 발급:", newSessionId);

      // DB에 새 세션 ID 저장
      const { error } = await supabase
        .from("User")
        .update({
          current_session_id: newSessionId,
          last_login_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        console.error("DB 세션 ID 저장 실패:", error);
        return false;
      }

      // 로컬 스토리지에 세션 ID 저장
      setLocalSessionId(newSessionId);
      console.log("세션 ID 저장 완료");

      return true;
    } catch (error) {
      console.error("새 세션 발급 중 오류:", error);
      return false;
    }
  };

  // 초기 인증 상태 확인
  useEffect(() => {
    const getInitialSession = async () => {
      try {
        setLoading(true);

        // 현재 Supabase 세션 가져오기
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("세션 가져오기 실패:", error);
          setError(error.message);
        } else if (session) {
          console.log("Supabase 세션 발견:", session.user.id);
          setUser(session.user);

          // 사용자 데이터 가져오기
          const userData = await fetchUserData(session.user.id);
          setUserData(userData);

          // 로컬 스토리지의 세션 ID 가져오기
          const localSessionId = getLocalSessionId();
          console.log("로컬 세션 ID:", localSessionId);

          if (!localSessionId) {
            // 로컬 세션 ID가 없으면 새로 발급
            console.log("로컬 세션 ID 없음 - 새로 발급");
            await issueNewSession(session.user.id);
          } else {
            // 로컬 세션 ID가 있으면 DB와 비교
            console.log("로컬 세션 ID 존재 - DB와 비교 시작");

            const { data: currentUserData, error: dbError } = await supabase
              .from("User")
              .select("current_session_id")
              .eq("id", session.user.id)
              .single();

            if (dbError) {
              console.error("DB 세션 ID 가져오기 실패:", dbError);
              // DB 오류 시 새 세션 발급
              await issueNewSession(session.user.id);
            } else {
              console.log("DB 세션 ID:", currentUserData.current_session_id);

              // 세션 ID 비교
              if (currentUserData.current_session_id !== localSessionId) {
                console.log("세션 ID 불일치 - 로그아웃 처리");
                alert("다른 곳에서 로그인되어 현재 세션이 종료됩니다.");
                await signOut();
                return;
              } else {
                console.log("세션 ID 일치 - 정상 세션");
              }
            }
          }
        } else {
          console.log("Supabase 세션 없음 - 로그인 필요");
        }
      } catch (error) {
        console.error("초기 세션 확인 중 오류:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("인증 상태 변경:", event, session);

      if (event === "SIGNED_IN" && session) {
        setUser(session.user);

        // 사용자 데이터 가져오기
        const userData = await fetchUserData(session.user.id);
        setUserData(userData);

        // 로그인 시 항상 새 세션 ID 발급
        console.log("로그인 감지 - 새 세션 ID 발급");
        await issueNewSession(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setUserData(null);

        // 로컬 세션 ID 제거
        setLocalSessionId(null);
        console.log("로그아웃 감지 - 로컬 세션 ID 제거");
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 로그아웃
  const signOut = async () => {
    try {
      console.log("로그아웃 시작");

      // User 테이블에서 세션 정보 제거
      if (user) {
        try {
          await supabase
            .from("User")
            .update({
              current_session_id: null,
              last_logout_at: new Date().toISOString(),
            })
            .eq("id", user.id);
          console.log("User 테이블 세션 정보 제거 완료");
        } catch (dbError) {
          console.error("User 테이블 세션 정보 제거 실패:", dbError);
        }
      }

      // 로컬 스토리지에서 세션 ID 제거
      setLocalSessionId(null);
      console.log("로컬 세션 ID 제거 완료");

      // Supabase 로그아웃
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.log("Supabase 로그아웃 실패:", error.message);
        } else {
          console.log("Supabase 로그아웃 완료");
        }
      } catch (authError) {
        console.log("Supabase 로그아웃 중 오류:", authError);
      }

      // 상태 초기화
      setUser(null);
      setUserData(null);
      setError(null);

      console.log("로그아웃 완료");
    } catch (error) {
      console.error("로그아웃 중 오류:", error);
      setError(error.message);
    }
  };

  // 사용자 데이터 새로고침
  const refreshUserData = async () => {
    if (!user) return;

    const userData = await fetchUserData(user.id);
    setUserData(userData);
  };

  const value = {
    user,
    userData,
    loading,
    error,
    signOut,
    refreshUserData,
    checkSessionValidity,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
