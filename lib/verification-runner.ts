/**
 * VerificationRunner v1.1 — LLM → OutputTemplate → Parser → Validator → Analysis
 *
 * 三层隔离：
 *   LLM（噪声源）→ OutputTemplate（结构化 token 约束层）
 *   → Parser（提取层：extract + validate + classify）
 *   → SchemaValidator（校验层：可配置严格度）
 *   → Analysis（消费层：只读 ParsedItem）
 */

import "../lib/questionRules";
import { generateQuestionsPrompt } from "./prompts";
import { findRule, ruleRegistry, RuleSchema } from "./ruleSchema";
import { ROUTING_TREE, detectStage, Stage, Subject, GRADES_BY_STAGE } from "./routingTree";

// ============================================================
// 1. 核心接口
// ============================================================

export type VerificationDepth = "light" | "medium" | "deep";
export type Difficulty = "容易" | "中等" | "困难";
export type Strictness = "light" | "standard" | "strict";

/** 解析状态 */
export type ParseStatus = "OK" | "FORMAT_ERR" | "STRUCT_ERR";

/** 单个解析项 */
export interface ParsedItem {
  /** 全局唯一 ID：materialId-subItemId */
  id: string;
  /** 材料 ID（single/composite 为 null，multiLayer 为组标识） */
  materialId: string | null;
  /** 子题在材料内的序号（从 1 开始） */
  subItemId: number;
  /** 题干文本（截取前 80 字） */
  original: string;
  /** 类型标签 */
  typeLabel: string;
  /** 答案（single=正确答案, composite=修改后句子, multiLayer=子题答案） */
  answer: string;
  /** 解析文本 */
  analysis: string;
  /** 考点标签 */
  examPoint: string;
  /** 解析状态 */
  status: ParseStatus;
  /** 原始答案块（debug 用） */
  rawBlock: string;
}

/** 错误详情 */
export interface ErrorDetail {
  layer: "FORMAT" | "STRUCT";
  code: string;
  itemId: string;
  expected: string;
  /** AI 输出快照（截取导致失败的原生片段，≤200 字符） */
  aiOutputSnapshot: string;
}

/** 解析结果 */
export interface ParsedResult {
  status: ParseStatus;
  items: ParsedItem[];
  errors: ErrorDetail[];
}

/** 层校验规则 */
export interface LayerRule {
  name: string;
  check: (v: ValidationResult) => boolean;
}

export interface ValidationCheck {
  totalQuestions: number;
  parsedCount: number;
  uniqueTypes: string[];
  typeDiversityScore: number;
  avgItemLength: number;
  itemLengths: number[];
  avgAnalysisLength: number;
  allHaveAnswer: boolean;
  allHaveAnalysis: boolean;
  adjacentTypeRepeat: boolean;
  layer0Pass: boolean;
  layer0Issues: string[];
  layer1Pass: boolean;
  layer1Issues: string[];
}

export interface ValidationResult {
  label: string;
  parsed: ParsedItem[];
  checks: ValidationCheck;
  issues: string[];
  errors: ErrorDetail[];
}

export interface VerificationJob {
  name: string;
  description: string;
  stage: Stage;
  subject: Subject;
  type: string;
  depth?: VerificationDepth;
  grades: string[];
  difficulties: Difficulty[];
  count: number;
  autoDepth: boolean;
}

export interface VerificationReport {
  job: VerificationJob;
  rule: RuleSchema;
  depth: VerificationDepth;
  timestamp: string;
  results: { label: string; output: string; error?: string }[];
  validations: ValidationResult[];
  summary: {
    gradeDiffOK: boolean; diffGradientOK: boolean; driftOK: boolean;
    layer0OK: boolean; layer1OK: boolean;
    totalFailures: number; totalWarnings: number;
  };
}

// ============================================================
// 2. TOKEN 强制协议 —— Parser 不猜格式，Token 不存在 = FORMAT_ERR
// ============================================================
// 结构 token：
//   [[META:typeName|answerStructure|stage|subject]]
//   [[ITEM_START:N]]
//   ... field tokens ...
//   [[ITEM_END:N]]
//
// 字段 token：
//   [[KP:typeTag|knowledgePoint]]
//   [[TYPE:主类型|子类型]]        (composite)
//   [[ANS]]content[[/ANS]]
//   [[EXP]]content[[/EXP]]

const TOK_ITEM_S = "[[ITEM_START:";
const TOK_ITEM_E = "[[ITEM_END:";
const TOK_META   = "[[META:";
const TOK_KP     = "[[KP:";
const TOK_TYPE   = "[[TYPE:";
const TOK_ANS_S  = "[[ANS]]";
const TOK_ANS_E  = "[[/ANS]]";
const TOK_EXP_S  = "[[EXP]]";
const TOK_EXP_E  = "[[/EXP]]";

// ============================================================
// 3. Job 自动生成
// ============================================================

export function generateJobsFromRegistry(stage: Stage, subject: Subject): VerificationJob[] {
  const treeNode = ROUTING_TREE.find(n => n.stage === stage);
  if (!treeNode) return [];
  const typeNodes = treeNode.subjects[subject] || [];
  const jobs: VerificationJob[] = [];
  for (const tn of typeNodes) {
    const rule = findRule(stage, subject, tn.name);
    if (!rule) continue;
    const depth = calculateDepth(rule);
    jobs.push({
      name: `${tn.name}·${stage}`, description: `${stage}${subject} ${tn.name} 验证`,
      stage, subject, type: tn.name, depth,
      grades: depth === "light" ? [GRADES_BY_STAGE[stage][1]] : GRADES_BY_STAGE[stage],
      difficulties: depth === "light" ? ["中等"] : ["容易", "中等", "困难"],
      count: depth === "deep" ? 5 : depth === "medium" ? 3 : 3,
      autoDepth: true,
    });
  }
  return jobs;
}

export function calculateDepth(rule: RuleSchema): VerificationDepth {
  const score = rule.answerOpenness + rule.structureComplexity + rule.riskLevel;
  if (score <= 1) return "light";
  if (score <= 3) return "medium";
  return "deep";
}

// ============================================================
// 4. TOKEN 强制协议 —— Parser 不猜格式，Token 不存在 = FORMAT_ERR
// ============================================================
//
// 结构 token：[[META:...]] [[ITEM_START:N]] ...fields... [[ITEM_END:N]]
// 字段 token：[[KP:a|b]] [[TYPE:a|b]] [[ANS]]v[[/ANS]] [[EXP]]v[[/EXP]]
// Parser 行为：find token → validate → reject malformed（无 fallback）

// ── Token 匹配（返回 null = 不存在 = 后续报 FORMAT_ERR）──

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

function tokenErr(code: string, itemId: string, expected: string, snapshot: string): ErrorDetail {
  return { layer: "FORMAT", code, itemId, expected,
    aiOutputSnapshot: snapshot.length > 200 ? snapshot.substring(0, 200) + "..." : snapshot };
}

function snip(text: string, len = 120): string { return text.length > len ? text.substring(0, len) + "..." : text; }
function gid(mid: string | null, sub: number): string { return mid ? `${mid}-Q${sub}` : `Q${sub}`; }

// ── 提取单个 item block 内的所有 token 字段 ──

function extractFields(block: string) {
  return {
    kp:       matchToken(block, TOK_KP),
    typeTag:  matchToken(block, TOK_TYPE),
    answer:   matchWrapped(block, TOK_ANS_S, TOK_ANS_E),
    analysis: matchWrapped(block, TOK_EXP_S, TOK_EXP_E),
  };
}

// ── 解析 [[ITEM_START:N]]...[[ITEM_END:N]] 块 ──

function parseItemBlock(block: string, mid: string | null, idx: number, original: string): { item: ParsedItem; errors: ErrorDetail[] } {
  const id = gid(mid, idx);
  const errors: ErrorDetail[] = [];
  const f = extractFields(block);

  // 结构校验：[[ITEM_END:N]] 存在且 N 匹配
  const endToken = matchToken(block, TOK_ITEM_E);
  if (endToken === null) {
    return {
      item: { id, materialId: mid, subItemId: idx, original, typeLabel: "STRUCT_ERR:缺[[ITEM_END]]", answer: "", analysis: "", examPoint: "", status: "STRUCT_ERR", rawBlock: block },
      errors: [tokenErr("MISSING_ITEM_END", id, `[[ITEM_END:${idx}]]`, snip(block))],
    };
  }
  if (endToken !== String(idx)) {
    errors.push(tokenErr("ITEM_END_MISMATCH", id, `[[ITEM_END:${idx}]]`, `got [[ITEM_END:${endToken}]]`));
  }

  // 必选字段
  if (f.kp === null) {
    errors.push(tokenErr("MISSING_KP", id, `[[KP:typeTag|knowledgePoint]]`, snip(block)));
  } else if (!f.kp.includes("|")) {
    errors.push(tokenErr("KP_NO_PIPE", id, `[[KP:typeTag|knowledgePoint]] (必须含|分隔符)`, snip(`got: [[KP:${f.kp}]]`)));
  }
  if (f.answer === null) errors.push(tokenErr("MISSING_ANS", id, "[[ANS]]...[[/ANS]]", snip(block)));

  const status: ParseStatus = errors.length > 0 ? "FORMAT_ERR" : "OK";

  // 构建 typeLabel + examPoint
  let typeLabel = ""; let examPoint = "";
  if (f.typeTag) { const p = f.typeTag.split("|").map(s => s.trim()); typeLabel = p[0]; examPoint = `病句辨析·${p[0]}` + (p[1] ? `（${p[1]}）` : ""); }
  if (f.kp) { const p = f.kp.split("|").map(s => s.trim()); if (!typeLabel) typeLabel = p[0]; examPoint = examPoint || `${p[1] || p[0]}·${p[0]}`; }
  if (!typeLabel) typeLabel = "FORMAT_ERR:缺类型";

  return {
    item: { id, materialId: mid, subItemId: idx, original: original.length > 80 ? original.substring(0, 80) + "..." : original, typeLabel, answer: f.answer || "", analysis: f.analysis || "", examPoint, status, rawBlock: block },
    errors,
  };
}

// ── 扫描 answer section，按 [[ITEM_START:N]] 切分，逐块解析 ──

function scanItems(answerSection: string, mid: string | null, originals: string[]): ParsedResult {
  const errors: ErrorDetail[] = [];
  const items: ParsedItem[] = [];

  const startRe = /\[\[ITEM_START:(\d+)\]\]/g;
  let sm: RegExpExecArray | null;
  const starts: { idx: number; pos: number }[] = [];
  while ((sm = startRe.exec(answerSection)) !== null) {
    starts.push({ idx: parseInt(sm[1]), pos: sm.index + sm[0].length });
  }

  if (starts.length === 0) {
    return { status: "STRUCT_ERR", items, errors: [tokenErr("NO_ITEM_START", mid || "unknown", "[[ITEM_START:N]]", snip(answerSection, 160))] };
  }

  for (let i = 0; i < starts.length; i++) {
    const { idx, pos } = starts[i];
    const endMarker = `[[ITEM_END:${idx}]]`;
    const nextStart = i + 1 < starts.length ? starts[i + 1].pos - `[[ITEM_START:${starts[i + 1].idx}]]`.length : answerSection.length;
    const endPos = answerSection.indexOf(endMarker, pos);
    const blockEnd = endPos >= 0 ? endPos + endMarker.length : nextStart;
    const block = answerSection.substring(pos, blockEnd);
    const original = originals[idx - 1] || `[题干${idx}]`;

    const { item, errors: itemErrs } = parseItemBlock(block, mid, idx, original);
    items.push(item);
    errors.push(...itemErrs);
  }

  return { status: errors.length > 0 ? "FORMAT_ERR" : "OK", items, errors };
}

// ── 提取题干文本 ──

function extractOriginals(output: string, structure: string): string[] {
  const qs = output.split(/参考答案与解析|【参考答案/i)[0];
  if (structure === "multiLayer") {
    const fm = qs.match(/\n(\d+)\.\s/);
    if (!fm || !fm.index) return [];
    return qs.substring(fm.index).trim().split(/\n(?=\d+\.\s)/).map(b => b.replace(/^\d+\.\s*/, "").trim()).filter(s => s.length > 0);
  }
  const re = /^(\d+)\.\s*(.+)$/gm; let m: RegExpExecArray | null; const out: string[] = [];
  while ((m = re.exec(qs)) !== null) out[parseInt(m[1]) - 1] = m[2].trim();
  return out.filter(Boolean);
}

// ── 三个 Parser（token-only，无 fallback）──

function singleParse(output: string, mid: string | null): ParsedResult {
  return scanItems(output.split(/参考答案与解析|【参考答案/i)[1] || "", mid, extractOriginals(output, "single"));
}
function compositeParse(output: string, mid: string | null): ParsedResult {
  return scanItems(output.split(/参考答案与解析|【参考答案/i)[1] || "", mid, extractOriginals(output, "composite"));
}
function multiLayerParse(output: string, mid: string): ParsedResult {
  const qs = output.split(/参考答案与解析|【参考答案/i)[0];
  const originals = extractOriginals(output, "multiLayer");
  const fm = qs.match(/\n(\d+)\.\s/);
  const result = scanItems(output.split(/参考答案与解析|【参考答案/i)[1] || "", mid, originals);
  if (result.items.length > 0 && fm && fm.index) {
    result.items[0].typeLabel = `${result.items[0].typeLabel} [材料${qs.substring(0, fm.index).replace(/\s/g, "").length}字]`;
  }
  if (originals.length === 0) { result.status = "STRUCT_ERR"; result.errors.push(tokenErr("MULTILAYER_NO_SUBQ", mid, "\\n1. [子题]", snip(qs, 150))); }
  return result;
}

export function parseOutput(output: string, rule?: RuleSchema, materialId?: string): ParsedResult {
  const mid = materialId || `mat_${Date.now()}`;
  switch (rule?.answerStructure) {
    case "single": case undefined: return singleParse(output, null);
    case "composite": return compositeParse(output, null);
    case "multiLayer": return multiLayerParse(output, mid);
  }
}

// ============================================================
// 6. SchemaValidator — 独立校验层（可配置严格度）
// ============================================================

// ============================================================
// Layer 2: AI 复核（仅 strict 模式触发）
// ============================================================

interface ReviewDetail { label: string; subItemId: number; verdict: "CORRECT" | "INCORRECT" | "UNCERTAIN"; note: string; }
interface ReviewResult { reviewed: number; correct: number; incorrect: number; uncertain: number; details: ReviewDetail[]; }

async function runLayer2Review(
  validations: ValidationResult[], rule: RuleSchema, apiKey: string
): Promise<ReviewResult> {
  const details: ReviewDetail[] = [];
  let correct = 0, incorrect = 0, uncertain = 0;

  // 每个 group 抽 1 题（第一题）做复核，控制成本
  for (const v of validations) {
    const item = v.parsed[0];
    if (!item || item.status !== "OK" || !item.answer) continue;

    try {
      const verdict = await reviewSingleItem(item, rule, apiKey);
      details.push({ label: v.label, subItemId: item.subItemId, verdict: verdict.v, note: verdict.note });
      if (verdict.v === "CORRECT") correct++;
      else if (verdict.v === "INCORRECT") incorrect++;
      else uncertain++;
    } catch {
      details.push({ label: v.label, subItemId: item.subItemId, verdict: "UNCERTAIN", note: "API 调用失败" });
      uncertain++;
    }
  }

  return { reviewed: details.length, correct, incorrect, uncertain, details };
}

async function reviewSingleItem(
  item: ParsedItem, rule: RuleSchema, apiKey: string
): Promise<{ v: "CORRECT" | "INCORRECT" | "UNCERTAIN"; note: string }> {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "deepseek-chat", temperature: 0.3, max_tokens: 200,
      messages: [
        { role: "system", content: `你是K12审题专家。判断题目答案是否正确。只回复一行：CORRECT/INCORRECT/UNCERTAIN + 空格 + 简短理由（≤30字）。` },
        { role: "user", content: `题型：${rule.typeName}\n题干：${item.original}\n答案：${item.answer}\n解析：${item.analysis}\n\n请判断答案是否正确。` },
      ],
    }),
  });
  const data = await res.json() as any;
  const text: string = data.choices[0].message.content || "UNCERTAIN no response";
  const v = text.startsWith("CORRECT") ? "CORRECT" : text.startsWith("INCORRECT") ? "INCORRECT" : "UNCERTAIN";
  return { v: v as "CORRECT" | "INCORRECT" | "UNCERTAIN", note: text.replace(/^(CORRECT|INCORRECT|UNCERTAIN)\s*/, "").substring(0, 60) };
}

export function deriveLayer0(rule: RuleSchema, strictness: Strictness = "standard"): LayerRule[] {
  if (rule.answerStructure === "multiLayer") {
    const rules: LayerRule[] = [
      { name: "子题解析数≥3", check: v => v.parsed.length >= 3 },
      { name: "每题有答案", check: v => v.checks.allHaveAnswer },
    ];
    if (strictness !== "light") {
      rules.push({ name: "每题有考点标签", check: v => v.parsed.every(p => p.examPoint.length > 0 || p.status === "STRUCT_ERR") });
    }
    return rules;
  }

  const rules: LayerRule[] = [
    { name: "题目数完整", check: v => v.checks.parsedCount >= v.checks.totalQuestions },
    { name: "每题有答案", check: v => v.checks.allHaveAnswer },
  ];
  if (strictness !== "light") {
    rules.push({ name: "每题有考点标签", check: v => v.parsed.every(p => p.examPoint.length > 0) });
  }
  if (strictness === "strict" && rule.answerStructure === "composite") {
    rules.push({
      name: "考点标签格式正确",
      check: v => v.parsed.filter(p => p.examPoint).every(p => p.examPoint.includes("·") || p.examPoint.includes("⋅")),
    });
  }
  return rules;
}

export function deriveLayer1(rule: RuleSchema, strictness: Strictness = "standard", label?: string): LayerRule[] {
  if (rule.answerStructure === "multiLayer") {
    const rules: LayerRule[] = [];
    if (strictness !== "light") {
      const matMatch = rule.materialSpec.match(/(\d+)[-–—](\d+)\s*字/);
      if (matMatch) {
        const [min, max] = [parseInt(matMatch[1]), parseInt(matMatch[2])];
        rules.push({
          name: `材料长度在 ${min}-${max} 字范围内`,
          check: v => {
            const m = v.parsed[0]?.typeLabel.match(/\[材料(\d+)字\]/);
            return m ? parseInt(m[1]) >= min - 50 && parseInt(m[1]) <= max + 100 : false;
          },
        });
      }
      const qm = rule.questionStructure.match(/(\d+)[-–—](\d+)\s*道/);
      if (qm) {
        const [minQ, maxQ] = [parseInt(qm[1]), parseInt(qm[2])];
        rules.push({ name: `子题数 ${minQ}-${maxQ}`, check: v => v.parsed.length >= minQ && v.parsed.length <= maxQ });
      }
    }
    if (strictness === "strict") {
      rules.push({ name: "子题类型≥3种", check: v => v.checks.uniqueTypes.filter(t => !t.startsWith("FORMAT_ERR") && !t.startsWith("STRUCT_ERR")).length >= 3 });
    }
    return rules;
  }

  const rules: LayerRule[] = [];
  if (strictness !== "light") {
    // 优先从 difficultyControl 按难度取范围，fallback 到 materialSpec
    const diffKey = label.includes("容易") ? "容易" : label.includes("中等") ? "中等" : label.includes("困难") ? "困难" : null;
    const diffText = diffKey ? rule.difficultyControl[diffKey as Difficulty] : "";
    const diffLen = diffText.match(/(\d+)[-–—](\d+)\s*字/);
    const matLen = rule.materialSpec.match(/(\d+)[-–—](\d+)\s*字/);
    const lenSrc = diffLen || matLen;
    if (lenSrc) {
      const [min, max] = [parseInt(lenSrc[1]), parseInt(lenSrc[2])];
      rules.push({
        name: `${diffKey ? diffKey + " " : ""}句长 ${min}-${max} 字`,
        check: v => v.checks.itemLengths.filter(l => l < min - 3 || l > max + 5).length === 0,
      });
    }
  }
  if (rule.constraints.some(c => c.includes("相邻"))) {
    rules.push({ name: "相邻题类型不重复", check: v => !v.checks.adjacentTypeRepeat });
  }
  if (strictness === "strict" && rule.answerStructure === "single") {
    rules.push({ name: "答案唯一确定", check: v => v.parsed.every(p => p.answer.length > 0 && p.answer.length < 100) });
  }
  return rules;
}

// ============================================================
// 7. validateGroup — 使用 SchemaValidator
// ============================================================

export function validateGroup(
  label: string, output: string, count: number,
  rule: RuleSchema, strictness: Strictness = "standard"
): ValidationResult {
  const materialId = `${label.replace(/[·\s]/g, "_")}_${Date.now()}`;
  const parsedResult = parseOutput(output, rule, materialId);
  const parsed = parsedResult.items;
  const issues: string[] = [];

  const expectedCount = rule.answerStructure === "multiLayer" ? parsed.length : count;

  const types = parsed.map(p => p.typeLabel).filter(Boolean);
  const uniqueTypes = [...new Set(types)];
  const typeDiversityScore = uniqueTypes.length / Math.max(parsed.length, 1);
  const adjacentTypeRepeat = types.some((t, i) => i > 0 && t === types[i - 1]);
  const lengths = parsed.map(p => p.original.length);
  const avgLength = lengths.length > 0 ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 0;
  const analysisLengths = parsed.map(p => p.analysis.length);
  const avgAnalysisLength = analysisLengths.length > 0 ? Math.round(analysisLengths.reduce((a, b) => a + b, 0) / analysisLengths.length) : 0;
  const allHaveAnswer = parsed.every(p => p.answer.length > 0);
  const allHaveAnalysis = parsed.every(p => p.analysis.length > 0);

  if (parsed.length < expectedCount) issues.push(`题目数不足：期望${expectedCount}，实际${parsed.length}`);
  if (parsed.length === 0) issues.push("⚠️ 无法解析任何题目");

  const vResult: ValidationResult = {
    label, parsed,
    checks: {
      totalQuestions: expectedCount, parsedCount: parsed.length,
      uniqueTypes, typeDiversityScore: Math.round(typeDiversityScore * 100) / 100,
      avgItemLength: avgLength, itemLengths: lengths, avgAnalysisLength,
      allHaveAnswer, allHaveAnalysis, adjacentTypeRepeat,
      layer0Pass: false, layer0Issues: [], layer1Pass: false, layer1Issues: [],
    },
    issues,
    errors: parsedResult.errors,
  };

  const l0 = deriveLayer0(rule, strictness);
  vResult.checks.layer0Issues = l0.filter(r => !r.check(vResult)).map(r => `[L0] ${r.name}`);
  vResult.checks.layer0Pass = vResult.checks.layer0Issues.length === 0;

  const l1 = deriveLayer1(rule, strictness, label);
  vResult.checks.layer1Issues = l1.filter(r => !r.check(vResult)).map(r => `[L1] ${r.name}`);
  vResult.checks.layer1Pass = vResult.checks.layer1Issues.length === 0;

  vResult.issues.push(...vResult.checks.layer0Issues, ...vResult.checks.layer1Issues);

  return vResult;
}

// ============================================================
// 8. Report — 只读 ParsedItem 和 ErrorDetail
// ============================================================

export async function generateReport(
  job: VerificationJob, rule: RuleSchema, depth: VerificationDepth,
  results: { label: string; output: string; error?: string }[],
  validations: ValidationResult[],
  apiKey?: string, strictness?: Strictness
): Promise<string> {
  const l: string[] = [];
  l.push(`# ${job.name} 验证报告`);

  // Layer 2 复核（仅 strict 模式）
  if (strictness === "strict") {
    const reviewResults = await runLayer2Review(validations, rule, apiKey);
    if (reviewResults.reviewed > 0) {
      l.push("");
      l.push("## Layer 2 AI 复核");
      l.push("");
      l.push(`| 组 | 子题 | 判定 | 说明 |`);
      l.push("|------|------|------|------|");
      for (const rv of reviewResults.details) {
        l.push(`| ${rv.label} | ${rv.subItemId} | ${rv.verdict === "CORRECT" ? "✅" : rv.verdict === "INCORRECT" ? "❌" : "⚠️"} | ${rv.note} |`);
      }
      l.push("");
      l.push(`> 复核 ${reviewResults.reviewed} 题：✅${reviewResults.correct} ⚠️${reviewResults.uncertain} ❌${reviewResults.incorrect}`);
      l.push("");
    }
  }
  l.push("");
  l.push(`> ${new Date().toISOString()} | ${depth} | ${rule.answerStructure} | ${job.grades.length}年级×${job.difficulties.length}难度`);
  l.push("");

  // 校验汇总
  l.push("## 一、分层校验");
  l.push("");
  l.push("| 测试组 | 解析 | 均长 | L0 | L1 | 类型数 | 错误 |");
  l.push("|--------|------|------|----|----|--------|------|");
  for (const v of validations) {
    const c = v.checks;
    const errCount = v.errors.length;
    l.push(`| ${v.label} | ${c.parsedCount}/${c.totalQuestions} | ${c.avgItemLength}字 | ${c.layer0Pass ? "✅" : "❌"} | ${c.layer1Pass ? "✅" : "❌"} | ${c.uniqueTypes.length} | ${errCount > 0 ? "⚠️" + errCount : "✅"} |`);
  }
  l.push("");

  // Error detail（含 aiOutputSnapshot）
  const allErrors = validations.flatMap(v => v.errors);
  if (allErrors.length > 0) {
    l.push("### 解析错误详情");
    l.push("");
    for (const v of validations) {
      if (v.errors.length === 0) continue;
      l.push(`**${v.label}** (${v.errors.length} 项)：`);
      l.push("");
      for (const e of v.errors) {
        l.push(`- \`${e.code}\` @ ${e.itemId}`);
        l.push(`  - 预期：${e.expected}`);
        l.push(`  - 快照：\`${e.aiOutputSnapshot.replace(/\n/g, "\\n").substring(0, 120)}\``);
      }
      l.push("");
    }
  }

  // L0/L1 问题
  const allLayer = validations.flatMap(v => [...v.checks.layer0Issues, ...v.checks.layer1Issues]);
  if (allLayer.length > 0) {
    l.push("### L0/L1 问题");
    l.push("");
    for (const v of validations) {
      const all = [...v.checks.layer0Issues, ...v.checks.layer1Issues];
      if (all.length > 0) { l.push(`**${v.label}**：`); for (const i of all) l.push(`- ${i}`); l.push(""); }
    }
  }

  // 年级差异（只读 ParsedItem 的 original/typeLabel）
  l.push("## 二、年级差异");
  l.push("");
  const byGrade: Record<string, ValidationResult[]> = {};
  for (const v of validations) { const g = v.label.split("·")[0]; if (!byGrade[g]) byGrade[g] = []; byGrade[g].push(v); }

  l.push("| 年级 | " + job.difficulties.join(" | ") + " | 均值 |");
  l.push("|------|" + job.difficulties.map(() => "------").join("|") + "|------|");
  for (const gr of job.grades) {
    const vals = byGrade[gr] || [];
    const cells = job.difficulties.map(d => { const v = vals.find(v => v.label.includes(d)); return v ? `${v.checks.avgItemLength}字` : "-"; });
    const allLens = vals.flatMap(v => v.checks.itemLengths);
    const avg = allLens.length > 0 ? Math.round(allLens.reduce((a, b) => a + b, 0) / allLens.length) : 0;
    l.push(`| ${gr} | ${cells.join(" | ")} | **${avg}字** |`);
  }
  const gf = job.grades[0], glast = job.grades[job.grades.length - 1];
  const fl = (byGrade[gf] || []).flatMap(v => v.checks.itemLengths);
  const ll = (byGrade[glast] || []).flatMap(v => v.checks.itemLengths);
  const fm = fl.length > 0 ? fl.reduce((a, b) => a + b, 0) / fl.length : 0;
  const lm = ll.length > 0 ? ll.reduce((a, b) => a + b, 0) / ll.length : 0;
  l.push(lm > fm + 2 ? `> ✅ 年级差异：${glast}比${gf}长${Math.round(lm - fm)}字` : `> ⚠️ 偏弱：差${Math.round(lm - fm)}字`);
  l.push("");

  // ── multiLayer 子题级分析 ──
  if (rule.answerStructure === "multiLayer" && validations.length > 0) {
    l.push("### 子题维度对比（按 subItemId 跨组统计）");
    l.push("");
    // 找出最大 subItemId
    const maxSub = Math.max(...validations.flatMap(v => v.parsed.map(p => p.subItemId)));
    for (let si = 1; si <= maxSub; si++) {
      const subItems = validations.flatMap(v => v.parsed.filter(p => p.subItemId === si));
      if (subItems.length === 0) continue;
      const typeLabels = [...new Set(subItems.map(p => p.typeLabel).filter(t => t && !t.includes("ERR") && !t.includes("材料")))];
      const avgLen = Math.round(subItems.reduce((s, p) => s + p.answer.length, 0) / subItems.length);
      const avgExp = Math.round(subItems.reduce((s, p) => s + p.analysis.length, 0) / subItems.length);
      const okCount = subItems.filter(p => p.status === "OK").length;
      l.push(`**子题 ${si}**：${typeLabels.slice(0, 2).join(", ")} | 均答案${avgLen}字 | 均解析${avgExp}字 | ${okCount}/${subItems.length} OK`);
      l.push("");

      // 按年级×难度汇总该子题
      l.push("| 年级 | " + job.difficulties.join(" | ") + " |");
      l.push("|------|" + job.difficulties.map(() => "------").join("|") + "|");
      for (const gr of job.grades) {
        const cells = job.difficulties.map(d => {
          const v = validations.find(v => v.label === `${gr}·${d}`);
          const p = v?.parsed.find(p => p.subItemId === si);
          return p ? `${p.answer.length}字` : "-";
        });
        l.push(`| ${gr} | ${cells.join(" | ")} |`);
      }
      l.push("");
    }
  }

  // 类型分布
  if (rule.answerStructure !== "single") {
    l.push("### 类型分布");
    l.push("");
    const allTypes = new Set<string>(); for (const v of validations) v.checks.uniqueTypes.forEach(t => allTypes.add(t));
    const tList = [...allTypes];
    if (tList.length > 0) {
      l.push("| 类型 | " + job.grades.join(" | ") + " | 合计 |");
      l.push("|------|" + job.grades.map(() => "------").join("|") + "|------|");
      for (const t of tList) {
        const cnt = job.grades.map(g => (byGrade[g] || []).flatMap(v => v.parsed).filter(p => p.typeLabel === t).length);
        l.push(`| ${t} | ${cnt.join(" | ")} | ${cnt.reduce((a, b) => a + b, 0)} |`);
      }
      l.push("");
    }
  }

  // 难度梯度
  l.push("## 三、难度梯度");
  l.push("");
  const easyA = validations.filter(v => v.label.includes("容易")).flatMap(v => v.checks.itemLengths);
  const hardA = validations.filter(v => v.label.includes("困难")).flatMap(v => v.checks.itemLengths);
  const eA = easyA.length > 0 ? easyA.reduce((a, b) => a + b, 0) / easyA.length : 0;
  const hA = hardA.length > 0 ? hardA.reduce((a, b) => a + b, 0) / hardA.length : 0;
  const dOK = job.difficulties.length < 2 || hA > eA + 5;
  if (job.difficulties.length >= 2) { l.push("| 难度 | " + job.grades.join(" | ") + " | 均值 |"); l.push("|------|" + job.grades.map(() => "------").join("|") + "|------|"); for (const diff of job.difficulties) { const vs = validations.filter(v => v.label.includes(diff)); const cells = job.grades.map(g => { const v = vs.find(v => v.label.includes(g)); return v ? `${v.checks.avgItemLength}字` : "-"; }); const avg = vs.length > 0 ? Math.round(vs.reduce((s, v) => s + v.checks.avgItemLength, 0) / vs.length) : 0; l.push(`| ${diff} | ${cells.join(" | ")} | **${avg}字** |`); } l.push(""); }
  l.push(dOK ? `> ✅ 梯度成立：困难比容易长${Math.round(hA - eA)}字` : "> ⚠️ 仅单难度");
  l.push("");

  // 漂移
  l.push("## 四、漂移");
  l.push("");
  const fh = validations.find(v => v.label === `${gf}·困难`);
  const le = validations.find(v => v.label === `${glast}·容易`);
  const drOK = !fh || !le || fh.checks.avgItemLength >= le.checks.avgItemLength;
  if (fh && le) { l.push(`| ${gf}·困难 | ${glast}·容易 | 判定 |`); l.push("|------------|------------|------|"); l.push(`| ${fh.checks.avgItemLength}字 | ${le.checks.avgItemLength}字 | ${drOK ? "✅" : "❌"} |`); }
  l.push(drOK ? "> ✅ 无漂移" : "> ❌ 漂移警告");
  l.push("");

  // 原始输出
  l.push("## 五、原始输出");
  l.push("");
  for (const r of results) {
    l.push(`### ${r.label}`);
    l.push("");
    if (r.error) { l.push(`**❌ ${r.error}**`); }
    else {
      const v = validations.find(v => v.label === r.label);
      if (v && v.parsed.length > 0) {
        const itemSummary = v.parsed.map(p => `${p.typeLabel || "?"}(${p.id})`).join(" / ");
        l.push(`> 📏 ${v.checks.itemLengths.join("/")}字 | 🏷️ ${itemSummary}`);
        l.push("");
      }
      l.push(r.output);
    }
    l.push("");
    l.push("---");
    l.push("");
  }

  // 最终判定
  l.push("## 六、最终判定");
  l.push("");
  const tf = validations.flatMap(v => [...v.checks.layer0Issues, ...v.checks.layer1Issues]).length;
  const l0OK = validations.every(v => v.checks.layer0Pass);
  const l1OK = validations.every(v => v.checks.layer1Pass);
  l.push("| 维度 | 判定 |");
  l.push("|------|------|");
  l.push(`| L0 格式 | ${l0OK ? "✅" : "❌"} |`);
  l.push(`| L1 结构 | ${l1OK ? "✅" : "❌"} |`);
  l.push(`| 年级差异 | ${lm > fm + 2 ? "✅" : "⚠️"} |`);
  l.push(`| 难度梯度 | ${dOK ? "✅" : "⚠️"} |`);
  l.push(`| 漂移 | ${drOK ? "✅" : "❌"} |`);
  const allPass = l0OK && l1OK && lm > fm + 2 && dOK && drOK;
  l.push("");
  l.push(`### ${allPass ? "✅ 全部通过" : `⚠️ ${tf} 项问题`}`);
  l.push("");

  return l.join("\n");
}

// ============================================================
// 9. 主入口
// ============================================================

export async function runVerification(
  job: VerificationJob, apiKey: string, strictness: Strictness = "standard"
): Promise<VerificationReport> {
  const stage = detectStage(job.grades[0]);
  const rule = findRule(stage, job.subject, job.type);
  const depth = job.depth || calculateDepth(rule!);
  if (!rule) throw new Error(`未注册：${stage}:${job.subject}:${job.type}`);

  const matrix: { label: string; grade: string; difficulty: Difficulty }[] = [];
  for (const gr of job.grades) for (const d of job.difficulties) matrix.push({ label: `${gr}·${d}`, grade: gr, difficulty: d as Difficulty });

  const results: { label: string; output: string; error?: string }[] = [];
  for (let i = 0; i < matrix.length; i++) {
    const tc = matrix[i];
    console.log(`[${i + 1}/${matrix.length}] ${tc.label}...`);
    try {
      const prompt = generateQuestionsPrompt({ subject: job.subject, grade: tc.grade, topic: "", type: job.type, difficulty: tc.difficulty, count: job.count });
      const output = await callDeepSeek(prompt.system, prompt.messages[0].content, apiKey);
      results.push({ label: tc.label, output });
      console.log(`  ✅ ${output.length}字符`);
    } catch (e: any) { console.log(`  ❌ ${e.message}`); results.push({ label: tc.label, output: "", error: e.message }); }
    if (i < matrix.length - 1) await new Promise(r => setTimeout(r, 500));
  }

  const validations = results.map(r => validateGroup(r.label, r.output, job.count, rule, strictness));
  const gf = job.grades[0], glast = job.grades[job.grades.length - 1];
  const byGrade: Record<string, ValidationResult[]> = {};
  for (const v of validations) { const g = v.label.split("·")[0]; if (!byGrade[g]) byGrade[g] = []; byGrade[g].push(v); }
  const fl = (byGrade[gf] || []).flatMap(v => v.checks.itemLengths);
  const ll = (byGrade[glast] || []).flatMap(v => v.checks.itemLengths);
  const fm = fl.length > 0 ? fl.reduce((a, b) => a + b, 0) / fl.length : 0;
  const lm = ll.length > 0 ? ll.reduce((a, b) => a + b, 0) / ll.length : 0;
  const eA = validations.filter(v => v.label.includes("容易")).flatMap(v => v.checks.itemLengths);
  const hA = validations.filter(v => v.label.includes("困难")).flatMap(v => v.checks.itemLengths);
  const ea = eA.length > 0 ? eA.reduce((a, b) => a + b, 0) / eA.length : 0;
  const ha = hA.length > 0 ? hA.reduce((a, b) => a + b, 0) / hA.length : 0;
  const fh = validations.find(v => v.label === `${gf}·困难`);
  const le = validations.find(v => v.label === `${glast}·容易`);
  const drOK = !fh || !le || fh.checks.avgItemLength >= le.checks.avgItemLength;
  const tf = validations.flatMap(v => [...v.checks.layer0Issues, ...v.checks.layer1Issues]).length;
  const tw = validations.flatMap(v => v.issues.filter(i => i.startsWith("⚠️"))).length;
  return {
    job, rule, depth, timestamp: new Date().toISOString(), results, validations,
    summary: {
      gradeDiffOK: lm > fm + 2, diffGradientOK: job.difficulties.length < 2 || ha > ea + 5,
      driftOK: drOK, layer0OK: validations.every(v => v.checks.layer0Pass),
      layer1OK: validations.every(v => v.checks.layer1Pass),
      totalFailures: tf, totalWarnings: tw,
    },
  };
}

async function callDeepSeek(system: string, userMessage: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "deepseek-chat", temperature: 0.7, max_tokens: 4096, messages: [{ role: "system", content: system }, { role: "user", content: userMessage }] }),
  });
  if (!res.ok) { const err = await res.text(); throw new Error(`API ${res.status}: ${err}`); }
  return ((await res.json()) as any).choices[0].message.content;
}
