"use client";

import { createContext, useContext, useEffect, useState } from "react";
import supabase from "../supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 사용자 데이터 캐시
  const userDataCache = new Map();

  // 사용자 데이터 가져오기 (최적화)
  const fetchUserData = async (userId) => {
    try {
      // 캐시 확인
      if (userDataCache.has(userId)) {
        console.log("캐시된 사용자 데이터 사용:", userId);
        return userDataCache.get(userId);
      }

      // 타임아웃 설정 (1초로 단축)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("사용자 데이터 조회 타임아웃")),
          1000
        );
      });

      // 필요한 필드만 선택하여 쿼리 최적화
      const dataPromise = supabase
        .from("User")
        .select("id, user_name, name, role, email, school, grade")
        .eq("id", userId)
        .single();

      const { data, error } = await Promise.race([dataPromise, timeoutPromise]);

      if (error) {
        console.error("사용자 데이터 가져오기 실패:", error);
        return null;
      }

      // 캐시에 저장
      userDataCache.set(userId, data);
      console.log("사용자 데이터 캐시에 저장:", userId);

      return data;
    } catch (error) {
      console.error("사용자 데이터 가져오기 중 오류:", error);
      return null;
    }
  };

  // 캐시 정리 함수
  const clearUserDataCache = (userId) => {
    if (userId) {
      userDataCache.delete(userId);
    } else {
      userDataCache.clear();
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
        // 캐시 정리
        clearUserDataCache();

        // 로컬스토리지 정리
        try {
          const supabaseKey =
            "sb-" +
            process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(
              "."
            )[0] +
            "-auth-token";
          localStorage.removeItem(supabaseKey);
          localStorage.removeItem("user_preferences");
          localStorage.removeItem("app_settings");
          localStorage.removeItem("last_visited");
          console.log("onAuthStateChange: 로컬스토리지 정리 완료");
        } catch (storageError) {
          console.log(
            "onAuthStateChange: 로컬스토리지 정리 중 오류:",
            storageError
          );
        }
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
          // 사용자 정보 업데이트 시 캐시 무효화
          clearUserDataCache(session.user.id);
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

      // 로컬 상태 초기화
      setUser(null);
      setUserData(null);
      setError(null);

      // 캐시 정리
      clearUserDataCache();

      // 로컬스토리지 초기화
      try {
        // Supabase 관련 데이터 정리
        const supabaseKey =
          "sb-" +
          process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0] +
          "-auth-token";
        localStorage.removeItem(supabaseKey);

        // 기타 앱 관련 데이터 정리
        localStorage.removeItem("user_preferences");
        localStorage.removeItem("app_settings");
        localStorage.removeItem("last_visited");

        console.log("로컬스토리지 초기화 완료");
      } catch (storageError) {
        console.log("로컬스토리지 정리 중 오류:", storageError);
      }

      // Supabase 로그아웃
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Supabase 로그아웃 실패:", error);
        setError(error.message);
      } else {
        console.log("로그아웃 완료");
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

    // 캐시 무효화 후 새로 가져오기
    clearUserDataCache(user.id);
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
