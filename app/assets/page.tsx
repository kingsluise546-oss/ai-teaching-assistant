"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, ChevronRight, Heart } from "lucide-react";
import { getFavoriteItems, toggleFavorite, type SavedItem } from "@/lib/storage";

const emptyTips: Record<string, string> = {
  "教案": "去备课助手生成一份教案并收藏",
  "试卷": "去出题助手生成练习题并收藏",
  "评语": "去评语助手生成评语并收藏",
  "通知": "去通知模板生成通知并收藏",
};

export default function AssetsPage() {
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[]>([]);

  const load = () => setItems(getFavoriteItems());

  useEffect(() => {
    load();
  }, []);

  const handleUnfavorite = (id: string) => {
    toggleFavorite(id);
    load();
  };

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
    <div className="max-w-4xl mx-auto px-8 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">我的资产库</h1>
        <p className="mt-1.5 text-gray-500 text-base">
          你收藏的所有教学内容
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <Heart className="w-5 h-5 text-gray-300" />
          </div>
          <p className="text-sm text-gray-400 mb-1">还没有收藏的内容</p>
          <p className="text-xs text-gray-300">在技能页生成内容后点击「收藏」即可保存到这里</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => router.push(`/result?id=${item.id}`)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.typeColor}`}>
                    {item.type}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {timeAgo(item.updatedAt)}
                  </div>
                </div>
                <h3 className="font-medium text-gray-900 text-sm">{item.title}</h3>
                <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                  {item.content.replace(/[#*【】\n]/g, "").slice(0, 80)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnfavorite(item.id);
                  }}
                  className="btn-ghost text-xs flex items-center gap-1 text-red-400 hover:text-red-500"
                >
                  <Heart className="w-3.5 h-3.5 fill-current" />
                  已收藏
                </button>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
