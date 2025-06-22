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
      // 타임아웃 설정 (5초)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("사용자 데이터 조회 타임아웃")),
          5000
        );
      });

      const dataPromise = supabase
        .from("User")
        .select("*")
        .eq("id", userId)
        .single();

      const { data, error } = await Promise.race([dataPromise, timeoutPromise]);

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

      // 타임아웃 설정 (5초)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("세션 발급 타임아웃")), 5000);
      });

      // DB에 새 세션 ID 저장
      const dbPromise = supabase
        .from("User")
        .update({
          current_session_id: newSessionId,
        })
        .eq("id", userId);

      const { error } = await Promise.race([dbPromise, timeoutPromise]);

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
        console.log("초기 세션 확인 시작");

        // 현재 Supabase 세션 가져오기
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("세션 가져오기 실패:", error);
          setError(error.message);
          setLoading(false);
          return;
        }

        if (!session) {
          console.log("Supabase 세션 없음 - 로그인 필요");
          setLoading(false);
          return;
        }

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
          const success = await issueNewSession(session.user.id);
          if (!success) {
            console.log("새 세션 발급 실패 - 로그아웃 처리");
            await signOut();
          }
          setLoading(false);
          return;
        }

        // 로컬 세션 ID가 있으면 DB와 비교
        console.log("로컬 세션 ID 존재 - DB와 비교 시작");

        try {
          // 타임아웃 설정 (5초)
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("DB 세션 조회 타임아웃")), 5000);
          });

          const dbPromise = supabase
            .from("User")
            .select("current_session_id")
            .eq("id", session.user.id)
            .single();

          const { data: currentUserData, error: dbError } = await Promise.race([
            dbPromise,
            timeoutPromise,
          ]);

          if (dbError) {
            console.error("DB 세션 ID 가져오기 실패:", dbError);
            // DB 오류 시 새 세션 발급 시도
            const success = await issueNewSession(session.user.id);
            if (!success) {
              console.log("새 세션 발급 실패 - 로그아웃 처리");
              await signOut();
            }
            setLoading(false);
            return;
          }

          console.log("DB 세션 ID:", currentUserData.current_session_id);

          // 세션 ID 비교
          if (currentUserData.current_session_id !== localSessionId) {
            console.log("세션 ID 불일치 - 로그아웃 처리");
            // 알림 없이 조용히 로그아웃 (초기 로딩 시에는 알림 제거)
            await signOut();
            setLoading(false);
            return;
          } else {
            console.log("세션 ID 일치 - 정상 세션");
          }
        } catch (dbError) {
          console.error("DB 조회 중 예외 발생:", dbError);
          // DB 오류 시 새 세션 발급 시도
          const success = await issueNewSession(session.user.id);
          if (!success) {
            console.log("새 세션 발급 실패 - 로그아웃 처리");
            await signOut();
          }
          setLoading(false);
          return;
        }

        console.log("초기 세션 확인 완료");
        setLoading(false);
      } catch (error) {
        console.error("초기 세션 확인 중 오류:", error);
        setError(error.message);
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

      // 1. 로그아웃 시에도 현재 세션이 유효한지 검증
      const localSessionId = getLocalSessionId();
      console.log("로그아웃 시 로컬 세션 ID:", localSessionId);

      if (user && localSessionId) {
        try {
          // 타임아웃 설정 (5초)
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(
              () => reject(new Error("로그아웃 시 DB 세션 조회 타임아웃")),
              5000
            );
          });

          const dbPromise = supabase
            .from("User")
            .select("current_session_id")
            .eq("id", user.id)
            .single();

          const { data: currentUserData, error: dbError } = await Promise.race([
            dbPromise,
            timeoutPromise,
          ]);

          if (!dbError && currentUserData) {
            console.log(
              "로그아웃 시 DB 세션 ID:",
              currentUserData.current_session_id
            );

            // 2. 세션 ID가 일치하는 경우에만 Supabase 로그아웃 실행
            // (중복 로그인으로 인한 세션 불일치 시에는 Supabase 로그아웃 하지 않음)
            if (currentUserData.current_session_id === localSessionId) {
              console.log("세션 일치 - Supabase 로그아웃 실행");

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
            } else {
              console.log(
                "세션 불일치 - Supabase 로그아웃 건너뛰기 (중복 로그인 상황)"
              );
            }
          } else {
            console.log("DB 조회 실패 - Supabase 로그아웃 실행");
            // DB 조회 실패 시에는 Supabase 로그아웃 실행
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
          }
        } catch (dbError) {
          console.error("로그아웃 시 DB 조회 중 예외 발생:", dbError);
          // DB 오류 시에도 Supabase 로그아웃 실행
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
        }
      } else {
        console.log(
          "사용자 정보 또는 로컬 세션 ID 없음 - Supabase 로그아웃 실행"
        );
        // 사용자 정보가 없거나 로컬 세션 ID가 없는 경우 Supabase 로그아웃 실행
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
      }

      // 3. User 테이블 세션 데이터 NULL로 설정
      if (user) {
        try {
          await supabase
            .from("User")
            .update({
              current_session_id: null,
            })
            .eq("id", user.id);
          console.log("User 테이블 세션 정보 제거 완료");
        } catch (dbError) {
          console.error("User 테이블 세션 정보 제거 실패:", dbError);
          // DB 오류가 있어도 계속 진행
        }
      }

      // 로컬 스토리지에서 세션 ID 제거
      setLocalSessionId(null);
      console.log("로컬 세션 ID 제거 완료");

      // 상태 초기화 (오류가 있어도 반드시 실행)
      setUser(null);
      setUserData(null);
      setError(null);
      setLoading(false);

      console.log("로그아웃 완료");
    } catch (error) {
      console.error("로그아웃 중 오류:", error);
      setError(error.message);

      // 오류가 발생해도 상태는 초기화
      setUser(null);
      setUserData(null);
      setLoading(false);
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
