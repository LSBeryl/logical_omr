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
  const router = useRouter();

  return (
    <Wrapper>
      <Title
        onClick={() => {
          router.push("/");
        }}
      >
        <img src="/icon-white.png" alt="로지컬로고" height="40rem" />
        {isMobile ? "" : "로지컬 모의고사 OMR 선생님 페이지"}
      </Title>
      <Links>
        <Link href="/teacher/newexam">
          {isMobile ? <CopyPlus /> : "신규 시험 등록"}
        </Link>
        <Link href="/teacher/editexam">
          {isMobile ? <SquarePen /> : "시험 관리"}
        </Link>
        <Link href="/teacher/examhistory">
          {isMobile ? <Clock /> : "시험 기록"}
        </Link>
        <Link href="/teacher/studenthistory">
          {isMobile ? <Users /> : "학생별 제출 현황"}
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
`;

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  color: ${() => theme.white};
  font-weight: 500;
  cursor: pointer;
`;

const Links = styled.div`
  display: flex;
  gap: 1rem;
  & > * {
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;
    color: ${() => theme.white};
    &:not(:nth-of-type(1)) {
      padding: 0 0 0 1rem;
      border-left: 1px solid ${() => theme.gray};
    }
  }
`;
