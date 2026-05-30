/**
 * 浏览器端解析器 —— 薄封装，核心逻辑在 tokenParser.ts
 */

import {
  parseOutputLite as parseFull,
  type ParsedItemLite,
  type ParseErrorLite,
  type ParseResultLite,
} from "./tokenParser";

// 直接导出完整类型
export type { ParsedItemLite, ParseErrorLite, ParseResultLite };

/**
 * 解析 AI 输出，返回完整 ParsedItemLite（含 examPoint, typeLabel, status）
 */
export function parseOutputLite(raw: string): ParsedItemLite[] {
  const result = parseFull(raw);
  return result.items;
}

/** 完整解析（含错误信息） */
export { parseFull as parseOutputDetailed };
