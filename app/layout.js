import GlobalComponent from "./style/global";
import { AuthProvider } from "./components/AuthProvider";

export const metadata = {
  title: "로지컬 모의고사 OMR",
  description: "로지컬 모의고사 OMR",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <GlobalComponent />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
