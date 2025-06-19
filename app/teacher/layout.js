import TeacherHeader from "../components/TeacherHeader";
import AuthGuard from "../components/AuthGuard";

export const metadata = {
  title: "로지컬 모의고사 OMR :: 관리 페이지",
  description: "로지컬 모의고사 OMR 선생님 전용 관리 페이지",
};

export default function RootLayout({ children }) {
  return (
    <AuthGuard>
      <TeacherHeader />
      {children}
    </AuthGuard>
  );
}
