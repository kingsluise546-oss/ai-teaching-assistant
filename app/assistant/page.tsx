"use client";

import Link from "next/link";
import {
  BookOpen,
  ClipboardList,
  MessageSquare,
  BarChart3,
  ChevronRight,
} from "lucide-react";

interface SkillItem {
  label: string;
  desc: string;
  href: string;
  icon: typeof BookOpen;
  color: string;
  bg: string;
  disabled?: boolean;
}

const skillGroups: { title: string; items: SkillItem[] }[] = [
  {
    title: "教学准备",
    items: [
      {
        label: "备课助手",
        desc: "输入课题，生成教案 + 课堂提问链",
        href: "/assistant/prepare-lesson",
        icon: BookOpen,
        color: "text-blue-500",
        bg: "bg-blue-50",
      },
      {
        label: "出题助手",
        desc: "选择知识点，生成分层练习题",
        href: "/assistant/generate-questions",
        icon: ClipboardList,
        color: "text-purple-500",
        bg: "bg-purple-50",
      },
    ],
  },
  {
    title: "学生评价",
    items: [
      {
        label: "评语助手",
        desc: "导入名单，生成个性化评语",
        href: "/assistant/write-comment",
        icon: MessageSquare,
        color: "text-green-500",
        bg: "bg-green-50",
      },
    ],
  },
  {
    title: "教学沟通",
    items: [
      {
        label: "通知模板生成",
        desc: "选择场景，生成可复制的通知文字",
        href: "/assistant/generate-notice",
        icon: MessageSquare,
        color: "text-orange-500",
        bg: "bg-orange-50",
      },
    ],
  },
  {
    title: "教学分析",
    items: [
      {
        label: "成绩分析",
        desc: "上传成绩表，获取文字分析报告",
        href: "#",
        icon: BarChart3,
        color: "text-gray-300",
        bg: "bg-gray-50",
        disabled: true,
      },
      {
        label: "学情分析",
        desc: "综合分析学生学习情况",
        href: "#",
        icon: BarChart3,
        color: "text-gray-300",
        bg: "bg-gray-50",
        disabled: true,
      },
    ],
  },
];

export default function AssistantPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">
      <section>
        <h1 className="text-2xl font-semibold text-gray-900">核心技能</h1>
        <p className="mt-1.5 text-gray-500 text-base">
          选择一项任务，AI 帮你快速完成
        </p>
      </section>

      {skillGroups.map((group) => (
        <section key={group.title}>
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {group.title}
          </h2>
          <div
            className={`grid gap-4 ${group.items.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
          >
            {group.items.map(
              ({ label, desc, href, icon: Icon, color, bg, disabled }) =>
                disabled ? (
                  <div
                    key={label}
                    className="card p-5 opacity-50 cursor-not-allowed"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}
                    >
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <p className="font-semibold text-gray-400 text-sm">
                      {label}
                    </p>
                    <p className="text-gray-300 text-xs mt-1">{desc}</p>
                    <div className="mt-3">
                      <span className="text-xs text-gray-300">即将上线</span>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={label}
                    href={href}
                    className="card p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}
                    >
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {label}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">{desc}</p>
                    <div className="mt-3 flex items-center gap-1 text-indigo-500 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      开始使用 <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </Link>
                )
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
