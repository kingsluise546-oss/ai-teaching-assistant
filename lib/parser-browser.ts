/**
 * 浏览器可用解析器——纯正则逻辑，零 Node.js 依赖
 * 与 verification-runner.ts 的 parseOutput 逻辑一致
 */

export interface ParsedItemLite {
  index: number;
  answer: string;
  analysis: string;
}

function matchToken(text: string, token: string): string | null {
  const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(.+?)\\]\\]', 's');
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function matchWrapped(text: string, open: string, close: string): string | null {
  const re = new RegExp(
    open.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([\\s\\S]*?)' + close.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 's');
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

export function parseOutputLite(raw: string): ParsedItemLite[] {
  const items: ParsedItemLite[] = [];
  const answerSection = raw.split(/参考答案与解析|【参考答案/i)[1] || "";

  const startRe = /\[\[ITEM_START:(\d+)\]\]/g;
  let sm: RegExpExecArray | null;
  const starts: { idx: number; pos: number }[] = [];
  while ((sm = startRe.exec(answerSection)) !== null) {
    starts.push({ idx: parseInt(sm[1]), pos: sm.index + sm[0].length });
  }

  if (starts.length === 0) {
    // fallback: no tokens → return empty
    return items;
  }

  for (let i = 0; i < starts.length; i++) {
    const { idx, pos } = starts[i];
    const endMarker = `[[ITEM_END:${idx}]]`;
    const nextStart = i + 1 < starts.length ? starts[i + 1].pos - `[[ITEM_START:${starts[i + 1].idx}]]`.length : answerSection.length;
    const endPos = answerSection.indexOf(endMarker, pos);
    const blockEnd = endPos >= 0 ? endPos + endMarker.length : nextStart;
    const block = answerSection.substring(pos, blockEnd);

    items.push({
      index: idx,
      answer: matchWrapped(block, "[[ANS]]", "[[/ANS]]") || "",
      analysis: matchWrapped(block, "[[EXP]]", "[[/EXP]]") || "",
    });
  }

  return items;
}
