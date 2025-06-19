"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Teacher() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/teacher/newexam");
  }, []);
}
