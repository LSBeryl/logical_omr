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
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setUserData(null);
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

      // Supabase 로그아웃
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.log("Supabase 로그아웃 실패:", error.message);
        setError(error.message);
      } else {
        console.log("Supabase 로그아웃 완료");
      }

      // 상태 초기화
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
