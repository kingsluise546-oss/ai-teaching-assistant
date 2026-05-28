"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Zap, FolderOpen, GraduationCap, MessageCircle } from "lucide-react";

const navItems = [
  { label: "首页", href: "/workspace", icon: Home },
  { label: "核心技能", href: "/assistant", icon: Zap },
  { label: "我的资产库", href: "/assets", icon: FolderOpen },
];

const bottomItems = [
  { label: "意见反馈", href: "#", icon: MessageCircle },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-48 h-screen bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0 z-20">
      {/* Logo */}
      <Link
        href="/workspace"
        className="flex items-center gap-2.5 px-5 py-5 hover:opacity-80 transition-opacity"
      >
        <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-900">教学助手</span>
      </Link>

      <div className="h-px bg-gray-100 mx-4" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive =
            pathname === href || (href === "/assistant" && pathname === "/") || (href === "/assets" && pathname.startsWith("/assets"));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-indigo-500" : "text-gray-400"}`}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-indigo-600">张</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">张老师</p>
            <p className="text-xs text-gray-400 truncate">六年级语文</p>
          </div>
        </div>
      </div>

      {/* Bottom links */}
      <div className="px-3 pb-4">
        {bottomItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
