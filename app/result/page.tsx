"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Download,
  RefreshCw,
  Wand2,
  Maximize2,
  CheckCircle2,
} from "lucide-react";
import { resultBlocks, type ContentItem } from "@/lib/mockData";

function ContentRenderer({ items }: { items: ContentItem[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => {
        if (item.kind === "bullet") {
          return (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              {item.text}
            </li>
          );
        }
        if (item.kind === "step") {
          return (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
              <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-semibold mt-0.5">
                {item.number}
              </div>
              <div className="flex-1 leading-relaxed">
                <span className="font-medium text-gray-900">{item.label}</span>
                <span className="ml-1.5 text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                  {item.duration}
                </span>
                <p className="mt-1 text-gray-500">{item.text}</p>
              </div>
            </li>
          );
        }
        if (item.kind === "question") {
          return (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span
                className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${item.levelColor}`}
              >
                {item.level}
              </span>
              <span className="text-gray-700 leading-relaxed">{item.text}</span>
            </li>
          );
        }
        if (item.kind === "homework") {
          return (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
              <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-400 mt-2" />
              <div className="flex-1 leading-relaxed">
                {item.note && (
                  <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded mr-2">
                    {item.note}
                  </span>
                )}
                {item.text}
              </div>
            </li>
          );
        }
        return null;
      })}
    </ul>
  );
}

function ContentBlock({
  block,
}: {
  block: (typeof resultBlocks)[0];
}) {
  const [expanded, setExpanded] = useState(true);
  const [optimized, setOptimized] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = () => {
    setRegenerating(true);
    setTimeout(() => setRegenerating(false), 1200);
  };

  return (
    <div className="card overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <h3 className="font-semibold text-gray-900 text-sm">{block.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRegenerate}
            className={`btn-ghost flex items-center gap-1.5 text-xs ${regenerating ? "text-indigo-500" : ""}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
            重新生成
          </button>
          <button
            onClick={() => setOptimized(!optimized)}
            className={`btn-ghost flex items-center gap-1.5 text-xs ${optimized ? "text-indigo-500" : ""}`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            优化
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="btn-ghost flex items-center gap-1.5 text-xs"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            {expanded ? "收起" : "展开"}
          </button>
        </div>
      </div>

      {/* Card Content */}
      {expanded && (
        <div className="px-5 py-4">
          {regenerating ? (
            <div className="flex items-center gap-2.5 py-4 text-sm text-indigo-500">
              <div className="dot-pulse flex gap-1.5">
                <span />
                <span />
                <span />
              </div>
              正在重新生成{block.title}...
            </div>
          ) : (
            <ContentRenderer items={block.content} />
          )}
          {optimized && !regenerating && (
            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-1.5 text-xs text-indigo-500">
              <Wand2 className="w-3.5 h-3.5" />
              已根据教学目标进行优化
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResultPage() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>

        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-900">
            六年级语文教案·《草原》
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">教案 · 刚刚生成</p>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn-outline text-sm flex items-center gap-1.5 py-2 px-4">
            <Download className="w-4 h-4" />
            导出
          </button>
          <button
            onClick={handleSave}
            className={`btn-primary text-sm flex items-center gap-1.5 py-2 px-4 ${saved ? "bg-green-500 hover:bg-green-600" : ""}`}
          >
            <Save className="w-4 h-4" />
            {saved ? "已保存" : "保存"}
          </button>
        </div>
      </div>

      {/* Content Blocks */}
      <div className="space-y-4 mb-8">
        {resultBlocks.map((block) => (
          <ContentBlock key={block.id} block={block} />
        ))}
      </div>

      {/* Footer Actions */}
      <div className="card p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">完成编辑了吗？</p>
          <p className="text-xs text-gray-400 mt-0.5">
            保存后可在「我的教学资产」中随时找到
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-outline text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4" />
            导出 Word
          </button>
          <button
            onClick={handleSave}
            className={`btn-primary text-sm flex items-center gap-1.5 ${saved ? "bg-green-500 hover:bg-green-600" : ""}`}
          >
            <Save className="w-4 h-4" />
            {saved ? "已保存 ✓" : "保存到我的教学资产"}
          </button>
        </div>
      </div>
    </div>
  );
}
