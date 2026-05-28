import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "AI教学助手",
  description: "智能教学内容生成工具",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body suppressHydrationWarning>
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 ml-48 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
