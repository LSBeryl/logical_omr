/** @jsxImportSource @emotion/react */
"use client";

// Global CSS 컴포넌트

import { css, Global } from "@emotion/react";

export default function GlobalComponent() {
  return (
    <Global
      styles={css`
        @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css");
        * {
          font-family: "Pretendard Variable";
          box-sizing: border-box;
        }
        body {
          margin: 0;
        }
      `}
    />
  );
}
