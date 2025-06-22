"use client";

import { createContext, useContext, useEffect, useState } from "react";
import supabase from "../supabase";

const AuthContext = createContext();

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
      console.log("인증 상태 변경:", event, session?.user?.id);

      if (event === "SIGNED_IN" && session) {
        console.log("로그인 감지:", session.user.id);
        setUser(session.user);

        // 사용자 데이터 가져오기
        const userData = await fetchUserData(session.user.id);
        setUserData(userData);
      } else if (event === "SIGNED_OUT") {
        console.log("로그아웃 감지");
        setUser(null);
        setUserData(null);
        setError(null);
      } else if (event === "TOKEN_REFRESHED") {
        console.log("토큰 갱신 감지");
        // 토큰이 갱신되면 사용자 데이터도 새로고침
        if (session?.user) {
          const userData = await fetchUserData(session.user.id);
          setUserData(userData);
        }
      } else if (event === "USER_UPDATED") {
        console.log("사용자 정보 업데이트 감지");
        if (session?.user) {
          setUser(session.user);
          const userData = await fetchUserData(session.user.id);
          setUserData(userData);
        }
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
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("로그아웃 실패:", error);
        setError(error.message);
      } else {
        console.log("로그아웃 완료");
        setUser(null);
        setUserData(null);
        setError(null);
      }
    } catch (error) {
      console.error("로그아웃 중 오류:", error);
      setError(error.message);
    } finally {
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
