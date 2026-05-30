/**
 * 共享 TOKEN 协议解析核心 —— 浏览器端和验证脚本共用
 * 零 Node.js 依赖，纯正则逻辑
 */

// ====== Token 常量 ======
export const TOK_ITEM_S = "[[ITEM_START:";
export const TOK_ITEM_E = "[[ITEM_END:";
export const TOK_META   = "[[META:";
export const TOK_KP     = "[[KP:";
export const TOK_TYPE   = "[[TYPE:";
export const TOK_ANS_S  = "[[ANS]]";
export const TOK_ANS_E  = "[[/ANS]]";
export const TOK_EXP_S  = "[[EXP]]";
export const TOK_EXP_E  = "[[/EXP]]";

// ====== 解析状态 ======
export type ParseStatus = "OK" | "FORMAT_ERR" | "STRUCT_ERR";

// ====== 解析结果 ======
export interface ParsedItemLite {
  /** 题号（1-based） */
  index: number;
  /** 答案内容 */
  answer: string;
  /** 解析内容 */
  analysis: string;
  /** 考点标签（如 "多音字|字音字形"） */
  examPoint: string;
  /** 类型标签（composite 题型） */
  typeLabel: string;
  /** 解析状态 */
  status: ParseStatus;
}

export interface ParseErrorLite {
  code: string;
  itemIndex: number;
  message: string;
  /** AI 输出片段（≤ 120 字符） */
  snapshot: string;
}

export interface ParseResultLite {
  items: ParsedItemLite[];
  errors: ParseErrorLite[];
}

// ====== Token 匹配工具 ======

/** 匹配 [[TOKEN:content]] 格式 */
export function matchToken(text: string, token: string): string | null {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped + "([\\s\\S]+?)\\]\\]");
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

/** 匹配 [[OPEN]]content[[/CLOSE]] 格式 */
export function matchWrapped(text: string, open: string, close: string): string | null {
  const escOpen = open.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escClose = close.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escOpen + "([\\s\\S]*?)" + escClose);
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

/** 截取片段（最多 120 字符，用于错误展示） */
export function snip(text: string, maxLen = 120): string {
  return text.length > maxLen ? text.substring(0, maxLen) + "..." : text;
}

// ====== 解析器 ======

/**
 * 解析 AI 输出中的 TOKEN 格式答案区
 * 与 verification-runner.ts 逻辑一致，但更轻量
 */
export function parseOutputLite(raw: string): ParseResultLite {
  const items: ParsedItemLite[] = [];
  const errors: ParseErrorLite[] = [];

  const answerSection = raw.split(/参考答案与解析|【参考答案/i)[1] || "";

  const startRe = /\[\[ITEM_START:(\d+)\]\]/g;
  let sm: RegExpExecArray | null;
  const starts: { idx: number; pos: number }[] = [];
  while ((sm = startRe.exec(answerSection)) !== null) {
    starts.push({ idx: parseInt(sm[1]), pos: sm.index + sm[0].length });
  }

  if (starts.length === 0) {
    // 无 TOKEN → 尝试从旧格式 **答案：** 提取（兼容过渡期）
    const legacyRe = /\*\*答案[：:]\s*\*\*\s*([\s\S]+?)(?=\n\*\*|\n\n|$)/g;
    let lm: RegExpExecArray | null;
    let idx = 0;
    while ((lm = legacyRe.exec(answerSection)) !== null) {
      idx++;
      items.push({
        index: idx,
        answer: lm[1].trim(),
        analysis: "",
        examPoint: "",
        typeLabel: "旧格式（未使用 TOKEN）",
        status: "FORMAT_ERR",
      });
    }
    if (items.length === 0) {
      errors.push({
        code: "NO_ITEM_START",
        itemIndex: 0,
        message: "未找到 [[ITEM_START:N]] 标记，且无旧格式答案",
        snapshot: snip(answerSection),
      });
    }
    return { items, errors };
  }

  for (let i = 0; i < starts.length; i++) {
    const { idx, pos } = starts[i];
    const endMarker = `[[ITEM_END:${idx}]]`;
    const nextStart = i + 1 < starts.length
      ? starts[i + 1].pos - `[[ITEM_START:${starts[i + 1].idx}]]`.length
      : answerSection.length;
    const endPos = answerSection.indexOf(endMarker, pos);
    const blockEnd = endPos >= 0 ? endPos + endMarker.length : nextStart;
    const block = answerSection.substring(pos, blockEnd);

    const answer = matchWrapped(block, TOK_ANS_S, TOK_ANS_E) || "";
    const analysis = matchWrapped(block, TOK_EXP_S, TOK_EXP_E) || "";
    let examPoint = "";
    let typeLabel = "";

    // 解析 KP token
    const kp = matchToken(block, TOK_KP);
    if (kp) {
      if (kp.includes("|")) {
        const parts = kp.split("|").map((s) => s.trim());
        typeLabel = parts[0];
        examPoint = `${parts[1] || parts[0]}·${parts[0]}`;
      } else {
        examPoint = kp;
        errors.push({
          code: "KP_NO_PIPE",
          itemIndex: idx,
          message: `[[KP:${kp}]] 缺少 | 分隔符，应为 [[KP:类型标签|知识域]]`,
          snapshot: snip(block),
        });
      }
    } else {
      errors.push({
        code: "MISSING_KP",
        itemIndex: idx,
        message: `第 ${idx} 题缺少 [[KP:typeTag|knowledgePoint]]`,
        snapshot: snip(block),
      });
    }

    // 解析 TYPE token（composite 题型）
    const typeTag = matchToken(block, TOK_TYPE);
    if (typeTag && typeTag.includes("|")) {
      const parts = typeTag.split("|").map((s) => s.trim());
      if (!typeLabel) typeLabel = parts[0];
    }

    // 必选字段校验
    let status: ParseStatus = "OK";
    if (!answer) {
      status = "FORMAT_ERR";
      errors.push({
        code: "MISSING_ANS",
        itemIndex: idx,
        message: `第 ${idx} 题缺少 [[ANS]]...[[/ANS]]`,
        snapshot: snip(block),
      });
    }

    // 校验 [[ITEM_END:N]] N 是否匹配
    const endN = matchToken(block, TOK_ITEM_E);
    if (endN === null) {
      status = status === "OK" ? "STRUCT_ERR" : status;
      errors.push({
        code: "MISSING_ITEM_END",
        itemIndex: idx,
        message: `第 ${idx} 题缺少 [[ITEM_END:${idx}]]`,
        snapshot: snip(block),
      });
    } else if (endN !== String(idx)) {
      errors.push({
        code: "ITEM_END_MISMATCH",
        itemIndex: idx,
        message: `[[ITEM_END:${endN}]] 与 [[ITEM_START:${idx}]] 不匹配`,
        snapshot: `got [[ITEM_END:${endN}]]`,
      });
    }

    items.push({
      index: idx,
      answer,
      analysis,
      examPoint: examPoint || typeLabel || "未知",
      typeLabel: typeLabel || "FORMAT_ERR:缺类型",
      status,
    });
  }

  return { items, errors };
}
