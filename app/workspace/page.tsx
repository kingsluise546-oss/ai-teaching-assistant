"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, ChevronRight, Lightbulb } from "lucide-react";
import { getSavedItems, type SavedItem } from "@/lib/storage";

export default function HomePage() {
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    setItems(getSavedItems());
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}天前`;
    return `${Math.floor(days / 30)}月前`;
  };

  return (
    <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">
      {/* 场景化引导 */}
      <section>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {greeting}，张老师 👋
            </h1>
            <p className="mt-1.5 text-gray-500 text-base">
              需要帮忙备课、出题、写评语，还是生成通知？
            </p>
          </div>
          {/* 今日概况 */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 bg-white rounded-xl border border-gray-100 px-4 py-2.5 flex-shrink-0">
            <span className="text-gray-500 font-medium">共</span>
            <span className="text-indigo-500 font-semibold">{items.length}</span>
            <span className="text-gray-400">条记录</span>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-700 text-sm px-3.5 py-1.5 rounded-full">
            <span className="text-amber-500">📅</span>
            距期末还有 3 周，可以开始准备复习题了
          </div>
        </div>
      </section>

      {/* 最近工作 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">最近工作</h2>
          <span className="text-xs text-gray-300">共 {items.length} 项</span>
        </div>
        {items.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-sm text-gray-300">还没有保存的内容，去「核心技能」生成你的第一份教案吧</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {items.slice(0, 6).map((item) => (
              <div key={item.id} className="card p-5 group flex flex-col cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/result?id=${item.id}`)}>
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${item.typeColor}`}
                  >
                    {item.type}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {timeAgo(item.updatedAt)}
                  </div>
                </div>
                <h3 className="font-medium text-gray-900 text-sm leading-snug mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 flex-1">
                  {item.content.replace(/[#*【】\n]/g, "").slice(0, 60)}...
                </p>
                <div className="mt-4 pt-3 border-t border-gray-50">
                  <span className="text-xs font-medium text-indigo-500 hover:text-indigo-600 flex items-center gap-1 transition-colors cursor-pointer">
                    查看详情 <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 教学小贴士 */}
      <section className="flex items-center gap-2.5 text-sm text-gray-400 pb-6">
        <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <span>本周适合整理复习资料，期末前三周开始备考效果最佳</span>
      </section>
    </div>
  );
}
