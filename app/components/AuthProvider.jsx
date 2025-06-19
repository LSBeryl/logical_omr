"use client";

import { createContext, useContext, useEffect, useState } from "react";
import supabase from "../supbase";

const AuthContext = createContext({});

export const useAuth = () => {
  return useContext(AuthContext);
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
        console.log("AuthProvider: 초기 세션 확인 시작");
        setLoading(true);
        setError(null);

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("AuthProvider: 세션 확인 오류:", error);
          setError(error.message);
        } else if (session?.user) {
          console.log("AuthProvider: 기존 세션 발견:", session.user);
          setUser(session.user);
          // 사용자 데이터와 세션을 동시에 설정
          setUserData({ id: session.user.id, email: session.user.email });
          // 백그라운드에서 상세 데이터 가져오기
          fetchUserDataBackground(session.user.id);
        } else {
          console.log("AuthProvider: 기존 세션 없음");
        }
      } catch (err) {
        console.error("AuthProvider: 초기 세션 확인 중 오류:", err);
        setError(err.message);
      } finally {
        setLoading(false);
        console.log("AuthProvider: 초기 세션 확인 완료");
      }
    };

    getInitialSession();

    // 인증 상태 변경 감지 - 단순화
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthProvider: 인증 상태 변경:", event, session?.user);

      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        setUserData({ id: session.user.id, email: session.user.email });
        fetchUserDataBackground(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setUserData(null);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        setUser(session.user);
        setUserData({ id: session.user.id, email: session.user.email });
        fetchUserDataBackground(session.user.id);
      }

      setLoading(false);
    });

    return () => {
      console.log("AuthProvider: 구독 해제");
      subscription.unsubscribe();
    };
  }, []);

  // 백그라운드에서 사용자 데이터 가져오기 (타임아웃 없이)
  const fetchUserDataBackground = async (userId) => {
    try {
      console.log(
        "AuthProvider: 백그라운드 사용자 데이터 가져오기 시작, userId:",
        userId
      );

      const { data, error } = await supabase
        .from("User")
        .select("user_name, role, email")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("AuthProvider: 사용자 데이터 가져오기 오류:", error);
        // 에러가 있어도 기존 기본 데이터는 유지
      } else {
        console.log("AuthProvider: 사용자 데이터 가져오기 성공:", data);
        setUserData(data);
      }
    } catch (err) {
      console.error("AuthProvider: 사용자 데이터 조회 중 오류:", err);
      // 에러가 있어도 기존 기본 데이터는 유지
    }
  };

  const signOut = async () => {
    try {
      console.log("AuthProvider: 로그아웃 시작");
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("AuthProvider: 로그아웃 오류:", error);
        throw error;
      } else {
        console.log("AuthProvider: 로그아웃 성공");
      }
    } catch (err) {
      console.error("AuthProvider: 로그아웃 중 오류:", err);
      throw err;
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
