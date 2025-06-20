/** @jsxImportSource @emotion/react */
"use client";

import styled from "@emotion/styled";
import theme from "../style/theme";
import Link from "next/link";
import useMediaQuery from "../utils/useMediaQuery";
import { CopyPlus, Clock, SquarePen, Users } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TeacherHeader() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 845px)");
  const router = useRouter();

  return (
    <Wrapper>
      <Title
        onClick={() => {
          router.push("/");
        }}
      >
        <img src="/icon-white.png" alt="로지컬로고" height="40rem" />
        {isTablet ? "" : "로지컬 모의고사 OMR 선생님 페이지"}
      </Title>
      <Links>
        <Link href="/teacher/newexam">
          {isTablet ? <CopyPlus /> : "신규 시험 등록"}
        </Link>
        <Link href="/teacher/editexam">
          {isTablet ? <SquarePen /> : "시험 관리"}
        </Link>
        <Link href="/teacher/examhistory">
          {isTablet ? <Clock /> : "시험 기록"}
        </Link>
        <Link href="/teacher/studenthistory">
          {isTablet ? <Users /> : "학생별 제출 현황"}
        </Link>
      </Links>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  padding: 1rem 3rem;
  background: ${() => theme.primary[500]};
  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 845px) {
    padding: 1rem 2rem;
  }

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  color: ${() => theme.white};
  font-weight: 500;
  cursor: pointer;

  @media (max-width: 845px) {
    gap: 0.5rem;
  }
`;

const Links = styled.div`
  display: flex;
  gap: 1rem;

  & > * {
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;
    color: ${() => theme.white};
    display: flex;
    align-items: center;
    justify-content: center;

    &:not(:nth-of-type(1)) {
      padding: 0 0 0 1rem;
      border-left: 1px solid ${() => theme.gray};
    }

    @media (max-width: 845px) {
      padding: 0.5rem;
      min-width: 40px;
      height: 40px;
      border-radius: 0.25rem;
      transition: background-color 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      &:not(:nth-of-type(1)) {
        padding: 0.5rem;
        border-left: none;
        margin-left: 0.5rem;
      }
    }

    @media (max-width: 768px) {
      padding: 0.4rem;
      min-width: 36px;
      height: 36px;
    }
  }
`;
