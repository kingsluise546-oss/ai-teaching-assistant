/**
 * 病句辨析 3×3 深度验证脚本
 *
 * 聚焦初中：七年级/八年级/九年级 × 容易/中等/困难 = 9组，每组5题
 * 四维校验：年级差异、难度拉开、难度漂移、validationRules拦截
 *
 * 用法：npx tsx scripts/verify-bingju.ts
 */

import * as fs from "fs";
import * as path from "path";

// ---- 加载 .env.local ----
const envPath = path.resolve(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx > 0) env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
}
const API_KEY = env["DEEPSEEK_API_KEY"];
if (!API_KEY) { console.error("❌ DEEPSEEK_API_KEY not found"); process.exit(1); }

// ---- 导入项目模块 ----
import "../lib/questionRules";
import { generateQuestionsPrompt } from "../lib/prompts";
import { findRule } from "../lib/ruleSchema";

console.log("规则注册状态：");
["初中:语文:病句辨析"].forEach(k => {
  const [s, su, t] = k.split(":");
  console.log(`  ${k} → ${findRule(s as any, su as any, t) ? "✅" : "❌"}`);
});

// ============================================================
// 3×3 矩阵
// ============================================================
const GRADES = ["七年级", "八年级", "九年级"];
const DIFFICULTIES: ("容易" | "中等" | "困难")[] = ["容易", "中等", "困难"];
const COUNT = 5; // 每组5题

interface TestCase {
  label: string;
  grade: string;
  difficulty: "容易" | "中等" | "困难";
}

const MATRIX: TestCase[] = [];
for (const grade of GRADES) {
  for (const diff of DIFFICULTIES) {
    MATRIX.push({ label: `${grade}·${diff}`, grade, difficulty: diff });
  }
}

// ============================================================
// API 调用
// ============================================================
async function callDeepSeek(system: string, userMessage: string): Promise<string> {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.7,
      max_tokens: 4096,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    }),
  });
  if (!res.ok) { const err = await res.text(); throw new Error(`API ${res.status}: ${err}`); }
  return ((await res.json()) as any).choices[0].message.content;
}

// ============================================================
// 自动解析器：从 AI 输出中提取结构化数据
// ============================================================
interface ParsedQuestion {
  index: number;
  originalSentence: string;
  rawAnswerBlock: string;
  errorType: string;
  errorSubType: string;
  modifiedSentence: string;
  analysis: string;
  examPoint: string;
}

function parseOutput(output: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];

  // 提取题干（编号行后的句子）
  const questionSection = output.split(/参考答案与解析|【参考答案/i)[0];
  const answerSection = output.split(/参考答案与解析|【参考答案/i)[1] || "";

  // 提取题干句子：匹配 "1. xxx" "2. xxx" 等
  const qRegex = /^(\d+)\.\s*(.+)$/gm;
  let qMatch: RegExpExecArray | null;
  const qList: { index: number; text: string }[] = [];
  while ((qMatch = qRegex.exec(questionSection)) !== null) {
    qList.push({ index: parseInt(qMatch[1]), text: qMatch[2].trim() });
  }

  // 从答案区提取每题信息
  for (const q of qList) {
    const parsed: ParsedQuestion = {
      index: q.index,
      originalSentence: q.text,
      rawAnswerBlock: "",
      errorType: "",
      errorSubType: "",
      modifiedSentence: "",
      analysis: "",
      examPoint: "",
    };

    // 在答案区找对应题号（兼容 1. / **1.** 两种格式）
    // 策略：不用 m flag，避免 $ 匹配每行结尾导致 lazy 过早停止
    const aRegex = new RegExp(
      `(?:^|\\n)(?:\\*\\*)?${q.index}(?:\\*\\*)?\\.[\\s\\S]*?(?=\\n(?:\\*\\*)?\\d+(?:\\*\\*)?\\.\\s|\\n---+|\\Z)`
    );
    const aMatch = answerSection.match(aRegex);
    if (aMatch) {
      parsed.rawAnswerBlock = aMatch[0].trim();

      // 语病类型：兼容 **语病类型：** xxx 和 语病类型：xxx 等
      const typeM = aMatch[0].match(/\*{0,2}语病类型[：:]\*{0,2}\s*\*{0,2}\s*(.+)/);
      if (typeM) {
        const raw = typeM[1].trim().replace(/\*+$/, "").trim();
        parsed.errorType = raw
          .replace(/.*[·⋅•]\s*/, "")
          .replace(/[（(][^)）]*[)）]/g, "")
          .trim();
        const subM = raw.match(/[（(](.+?)[）)]/);
        parsed.errorSubType = subM ? subM[1] : "";
      }

      // 修改
      const modM = aMatch[0].match(/\*{0,2}修改[：:]\*{0,2}\s*\*{0,2}\s*(.+)/);
      if (modM) parsed.modifiedSentence = modM[1].trim().replace(/\*+$/, "").trim();

      // 解析
      const anaM = aMatch[0].match(/\*{0,2}解析[：:]\*{0,2}\s*\*{0,2}\s*([\s\S]+?)(?=\n[-•]?\s*\*?\*?\s*(?:考点|修改|语病)|\Z)/);
      if (anaM) parsed.analysis = anaM[1].trim().replace(/\n/g, " ").replace(/\*+$/, "").trim();

      // 考点
      const epM = aMatch[0].match(/\*{0,2}考点[：:]\*{0,2}\s*\*{0,2}\s*(.+)/);
      if (epM) parsed.examPoint = epM[1].trim().replace(/\*+$/, "").trim();
    }

    questions.push(parsed);
  }

  return questions;
}

// ============================================================
// 自动校验器
// ============================================================
interface ValidationResult {
  label: string;
  parsed: ParsedQuestion[];
  checks: {
    totalQuestions: number;
    parsedCount: number;
    uniqueTypes: string[];
    typeDiversityScore: number; // 0-1, higher = more diverse
    chengfenCanqueCount: number;
    adjacentTypeRepeat: boolean;
    avgSentenceLength: number;
    sentenceLengths: number[];
    avgAnalysisLength: number;
    allHaveAnswer: boolean;
    allHaveAnalysis: boolean;
  };
  issues: string[];
}

function validate(label: string, output: string): ValidationResult {
  const parsed = parseOutput(output);
  const issues: string[] = [];

  // 类型统计
  const types = parsed.map(p => p.errorType).filter(Boolean);
  const uniqueTypes = [...new Set(types)];
  const typeDiversityScore = uniqueTypes.length / Math.max(parsed.length, 1);
  const chengfenCanqueCount = types.filter(t => t.includes("残缺")).length;
  const adjacentTypeRepeat = types.some((t, i) => i > 0 && t === types[i - 1]);

  // 句子长度
  const sentenceLengths = parsed.map(p => p.originalSentence.length);
  const avgSentenceLength = sentenceLengths.length > 0
    ? Math.round(sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length)
    : 0;

  // 解析长度
  const analysisLengths = parsed.map(p => p.analysis.length);
  const avgAnalysisLength = analysisLengths.length > 0
    ? Math.round(analysisLengths.reduce((a, b) => a + b, 0) / analysisLengths.length)
    : 0;

  // 完整性
  const allHaveAnswer = parsed.every(p => p.modifiedSentence.length > 0);
  const allHaveAnalysis = parsed.every(p => p.analysis.length > 0);

  // ---- 规则校验 ----
  if (parsed.length < COUNT) issues.push(`题目数不足：期望${COUNT}，实际解析到${parsed.length}`);
  if (parsed.length === 0) issues.push("⚠️ 无法解析任何题目——输出格式可能不符合模板");

  // validationRule: 每题只有一种语病类型
  if (types.length < parsed.length) issues.push("部分题目缺少语病类型标签");

  // validationRule: 相邻两题语病类型不得相同
  if (adjacentTypeRepeat) issues.push("❌ 相邻题语病类型重复");

  // validationRule: 3题中成分残缺不得超过1题（宽松到5题中≤2题）
  if (chengfenCanqueCount > 2) issues.push(`❌ 成分残缺过多：${chengfenCanqueCount}题（上限2）`);

  // validationRule: 修改后句子通顺
  if (!allHaveAnswer) issues.push("❌ 部分题目缺少修改后的句子");

  // validationRule: 解析包含必要要素
  if (!allHaveAnalysis) issues.push("❌ 部分题目缺少解析");

  // 句子长度合理性（初中 15-40字）
  const outOfRange = sentenceLengths.filter(l => l < 10 || l > 50);
  if (outOfRange.length > 0) issues.push(`⚠️ ${outOfRange.length}题句子长度异常（${outOfRange.join(",")}字，期望15-40）`);

  return {
    label,
    parsed,
    checks: {
      totalQuestions: COUNT,
      parsedCount: parsed.length,
      uniqueTypes,
      typeDiversityScore: Math.round(typeDiversityScore * 100) / 100,
      chengfenCanqueCount,
      adjacentTypeRepeat,
      avgSentenceLength,
      sentenceLengths,
      avgAnalysisLength,
      allHaveAnswer,
      allHaveAnalysis,
    },
    issues,
  };
}

// ============================================================
// 难度漂移分析
// ============================================================
function analyzeDrift(results: ValidationResult[]): string[] {
  const lines: string[] = [];
  lines.push("## 四、难度漂移分析");
  lines.push("");

  // 按难度分组
  const byDifficulty: Record<string, ValidationResult[]> = {};
  for (const r of results) {
    const diff = r.label.split("·")[1];
    if (!byDifficulty[diff]) byDifficulty[diff] = [];
    byDifficulty[diff].push(r);
  }

  // 同难度跨年级对比
  lines.push("### 4.1 同难度跨年级句子长度对比");
  lines.push("");
  lines.push("| 难度 | 七年级 | 八年级 | 九年级 | 趋势 |");
  lines.push("|------|--------|--------|--------|------|");
  for (const diff of DIFFICULTIES) {
    const vals = byDifficulty[diff] || [];
    const lens = vals.map(v => v.checks.avgSentenceLength);
    const trend = lens[0] < lens[1] && lens[1] < lens[2] ? "✅ 递增"
      : lens[0] > lens[2] ? "❌ 递减" : "⚠️ 不单调";
    lines.push(`| ${diff} | ${lens[0] || "-"}字 | ${lens[1] || "-"}字 | ${lens[2] || "-"}字 | ${trend} |`);
  }
  lines.push("");

  // 关键漂移检测：七年级困难 vs 九年级容易
  lines.push("### 4.2 漂移检测：七年级困难 vs 九年级容易");
  lines.push("");
  const g7hard = results.find(r => r.label === "七年级·困难");
  const g9easy = results.find(r => r.label === "九年级·容易");

  if (g7hard && g9easy) {
    lines.push("| 指标 | 七年级·困难 | 九年级·容易 | 判定 |");
    lines.push("|------|------------|------------|------|");
    const lenDiff = g7hard.checks.avgSentenceLength - g9easy.checks.avgSentenceLength;
    lines.push(`| 平均句子长度 | ${g7hard.checks.avgSentenceLength}字 | ${g9easy.checks.avgSentenceLength}字 | ${lenDiff > 0 ? "⚠️ 七年级困难更长（OK）" : lenDiff < -5 ? "❌ 严重漂移" : "✅ 未漂移"} |`);
    lines.push(`| 类型多样性 | ${g7hard.checks.typeDiversityScore} | ${g9easy.checks.typeDiversityScore} | ${g7hard.checks.typeDiversityScore >= g9easy.checks.typeDiversityScore ? "✅ 困难≥容易" : "⚠️"} |`);
    lines.push(`| 解析平均长度 | ${g7hard.checks.avgAnalysisLength}字 | ${g9easy.checks.avgAnalysisLength}字 | ${g7hard.checks.avgAnalysisLength > g9easy.checks.avgAnalysisLength ? "✅ 困难解析更长" : "⚠️"} |`);
    lines.push("");

    if (lenDiff <= -5) {
      lines.push("> ❌ **漂移警告**：七年级困难题句子比九年级容易题更短，说明难度控制失效。");
    } else if (lenDiff >= 0) {
      lines.push("> ✅ **无漂移**：七年级困难题句子长度≥九年级容易题，年级+难度二维控制有效。");
    } else {
      lines.push("> ⚠️ **轻微漂移**：七年级困难题略短于九年级容易题，但在容差范围内。");
    }
  }
  lines.push("");

  // 同年级难度递进
  lines.push("### 4.3 同年级难度递进");
  lines.push("");
  lines.push("| 年级 | 容易→中等 长度增幅 | 中等→困难 长度增幅 | 递进判定 |");
  lines.push("|------|-------------------|-------------------|----------|");
  for (const grade of GRADES) {
    const easy = results.find(r => r.label === `${grade}·容易`);
    const mid = results.find(r => r.label === `${grade}·中等`);
    const hard = results.find(r => r.label === `${grade}·困难`);
    const e2m = easy && mid ? mid.checks.avgSentenceLength - easy.checks.avgSentenceLength : NaN;
    const m2h = mid && hard ? hard.checks.avgSentenceLength - mid.checks.avgSentenceLength : NaN;
    const verdict = (!isNaN(e2m) && !isNaN(m2h))
      ? (e2m > 0 && m2h > 0 ? "✅ 持续递增" : e2m > 0 || m2h > 0 ? "⚠️ 部分递增" : "❌ 未递增")
      : "—";
    lines.push(`| ${grade} | ${isNaN(e2m) ? "—" : "+" + e2m + "字"} | ${isNaN(m2h) ? "—" : "+" + m2h + "字"} | ${verdict} |`);
  }
  lines.push("");

  return lines;
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  const results: { label: string; output: string; error?: string }[] = [];

  for (let i = 0; i < MATRIX.length; i++) {
    const tc = MATRIX[i];
    const progress = `[${i + 1}/${MATRIX.length}]`;
    console.log(`${progress} 生成中... ${tc.label}`);

    try {
      const prompt = generateQuestionsPrompt({
        subject: "语文",
        grade: tc.grade,
        topic: "",
        type: "病句辨析",
        difficulty: tc.difficulty,
        count: COUNT,
      });
      const output = await callDeepSeek(prompt.system, prompt.messages[0].content);
      results.push({ label: tc.label, output });
      console.log(`  ✅ ${output.length}字符`);
    } catch (e: any) {
      console.log(`  ❌ ${e.message}`);
      results.push({ label: tc.label, output: "", error: e.message });
    }
    if (i < MATRIX.length - 1) await new Promise(r => setTimeout(r, 500));
  }

  // ---- 自动校验 ----
  const validations = results.map(r => validate(r.label, r.output));

  // ---- 生成报告 ----
  const lines: string[] = [];
  lines.push("# 病句辨析 3×3 深度验证报告");
  lines.push("");
  lines.push(`> 生成时间：${new Date().toISOString()}`);
  lines.push("> 验证矩阵：七年级/八年级/九年级 × 容易/中等/困难 = 9组，每组5题");
  lines.push("");

  // ====== 一、自动校验结果 ======
  lines.push("## 一、自动校验汇总");
  lines.push("");
  lines.push("| 测试组 | 题目数 | 平均句长 | 类型数 | 成分残缺 | 相邻重复 | 完整性 | 问题 |");
  lines.push("|--------|--------|----------|--------|----------|----------|--------|------|");
  for (const v of validations) {
    const c = v.checks;
    const issueSummary = v.issues.length === 0 ? "✅ 通过"
      : v.issues.filter(i => i.startsWith("❌")).length > 0 ? "❌ " + v.issues.filter(i => i.startsWith("❌")).length + "项"
      : "⚠️ " + v.issues.length + "项";
    lines.push(`| ${v.label} | ${c.parsedCount}/${c.totalQuestions} | ${c.avgSentenceLength}字 | ${c.uniqueTypes.length} | ${c.chengfenCanqueCount} | ${c.adjacentTypeRepeat ? "❌" : "✅"} | ${c.allHaveAnswer && c.allHaveAnalysis ? "✅" : "❌"} | ${issueSummary} |`);
  }
  lines.push("");

  // 问题详情
  const hasIssues = validations.some(v => v.issues.length > 0);
  if (hasIssues) {
    lines.push("### 问题详情");
    lines.push("");
    for (const v of validations) {
      if (v.issues.length > 0) {
        lines.push(`**${v.label}**：`);
        for (const issue of v.issues) {
          lines.push(`- ${issue}`);
        }
        lines.push("");
      }
    }
  }

  // ====== 二、年级差异分析 ======
  lines.push("## 二、年级差异分析");
  lines.push("");
  lines.push("### 2.1 各年级平均句子长度");
  lines.push("");

  const byGrade: Record<string, ValidationResult[]> = {};
  for (const v of validations) {
    const grade = v.label.split("·")[0];
    if (!byGrade[grade]) byGrade[grade] = [];
    byGrade[grade].push(v);
  }

  lines.push("| 年级 | 容易 | 中等 | 困难 | 年级均值 |");
  lines.push("|------|------|------|------|----------|");
  for (const grade of GRADES) {
    const vals = byGrade[grade] || [];
    const easy = vals.find(v => v.label.includes("容易"));
    const mid = vals.find(v => v.label.includes("中等"));
    const hard = vals.find(v => v.label.includes("困难"));
    const allLens = vals.flatMap(v => v.checks.sentenceLengths);
    const gradeAvg = allLens.length > 0 ? Math.round(allLens.reduce((a, b) => a + b, 0) / allLens.length) : 0;
    lines.push(`| ${grade} | ${easy?.checks.avgSentenceLength || "-"}字 | ${mid?.checks.avgSentenceLength || "-"}字 | ${hard?.checks.avgSentenceLength || "-"}字 | **${gradeAvg}字** |`);
  }
  lines.push("");

  // 年级差异判定
  const g7avg = byGrade["七年级"]?.flatMap(v => v.checks.sentenceLengths) || [];
  const g9avg = byGrade["九年级"]?.flatMap(v => v.checks.sentenceLengths) || [];
  const g7mean = g7avg.length > 0 ? g7avg.reduce((a, b) => a + b, 0) / g7avg.length : 0;
  const g9mean = g9avg.length > 0 ? g9avg.reduce((a, b) => a + b, 0) / g9avg.length : 0;

  if (g9mean > g7mean + 3) {
    lines.push("> ✅ **年级差异成立**：九年级平均句子比七年级长" + Math.round(g9mean - g7mean) + "字。");
  } else if (g9mean > g7mean) {
    lines.push("> ⚠️ **年级差异偏弱**：九年级略长于七年级（+" + Math.round(g9mean - g7mean) + "字），区分度不够。");
  } else {
    lines.push("> ❌ **年级差异不成立**：九年级句子不长于七年级。");
  }
  lines.push("");

  // 类型分布
  lines.push("### 2.2 各年级语病类型分布");
  lines.push("");
  const allTypes = new Set<string>();
  for (const v of validations) v.checks.uniqueTypes.forEach(t => allTypes.add(t));
  const typeList = [...allTypes];

  lines.push("| 语病类型 | 七年级 | 八年级 | 九年级 | 合计 |");
  lines.push("|----------|--------|--------|--------|------|");
  for (const t of typeList) {
    const counts = GRADES.map(g => {
      const gradeVs = byGrade[g] || [];
      return gradeVs.flatMap(v => v.parsed).filter(p => p.errorType === t).length;
    });
    lines.push(`| ${t} | ${counts[0]} | ${counts[1]} | ${counts[2]} | ${counts.reduce((a, b) => a + b, 0)} |`);
  }
  lines.push("");

  // ====== 三、难度差异分析 ======
  lines.push("## 三、难度差异分析");
  lines.push("");

  lines.push("### 3.1 难度 → 句子长度");
  lines.push("");
  lines.push("| 难度 | 七年级 | 八年级 | 九年级 | 均值 |");
  lines.push("|------|--------|--------|--------|------|");
  for (const diff of DIFFICULTIES) {
    const vals = validations.filter(v => v.label.includes(diff));
    const lens = vals.map(v => v.checks.avgSentenceLength);
    const avg = lens.length > 0 ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : 0;
    lines.push(`| ${diff} | ${lens[0] || "-"}字 | ${lens[1] || "-"}字 | ${lens[2] || "-"}字 | **${avg}字** |`);
  }
  lines.push("");

  // 难度梯度
  const easyLens = validations.filter(v => v.label.includes("容易")).flatMap(v => v.checks.sentenceLengths);
  const hardLens = validations.filter(v => v.label.includes("困难")).flatMap(v => v.checks.sentenceLengths);
  const easyAvg = easyLens.length > 0 ? easyLens.reduce((a, b) => a + b, 0) / easyLens.length : 0;
  const hardAvg = hardLens.length > 0 ? hardLens.reduce((a, b) => a + b, 0) / hardLens.length : 0;
  if (hardAvg > easyAvg + 5) {
    lines.push(`> ✅ **难度梯度成立**：困难题平均比容易题长${Math.round(hardAvg - easyAvg)}字。`);
  } else {
    lines.push(`> ⚠️ **难度梯度偏弱**：困难题仅比容易题长${Math.round(hardAvg - easyAvg)}字。`);
  }
  lines.push("");

  // ====== 四、漂移分析 ======
  lines.push(...analyzeDrift(validations));

  // ====== 五、vRule有效性 ======
  lines.push("## 五、validationRules 拦截有效性");
  lines.push("");
  lines.push("### 5.1 各规则命中率");
  lines.push("");

  const ruleChecks: Record<string, { pass: number; fail: number }> = {
    "每题一种语病类型": { pass: 0, fail: 0 },
    "相邻题类型不重复": { pass: 0, fail: 0 },
    "成分残缺≤2题(5题中)": { pass: 0, fail: 0 },
    "修改后句子完整": { pass: 0, fail: 0 },
    "解析完整": { pass: 0, fail: 0 },
    "句子长度合理(10-50字)": { pass: 0, fail: 0 },
  };

  for (const v of validations) {
    const c = v.checks;
    ruleChecks["每题一种语病类型"].pass += (c.parsedCount === c.totalQuestions && c.uniqueTypes.length > 0) ? 1 : 0;
    ruleChecks["每题一种语病类型"].fail += (c.parsedCount < c.totalQuestions || c.uniqueTypes.length === 0) ? 1 : 0;
    ruleChecks["相邻题类型不重复"].pass += c.adjacentTypeRepeat ? 0 : 1;
    ruleChecks["相邻题类型不重复"].fail += c.adjacentTypeRepeat ? 1 : 0;
    ruleChecks["成分残缺≤2题(5题中)"].pass += c.chengfenCanqueCount <= 2 ? 1 : 0;
    ruleChecks["成分残缺≤2题(5题中)"].fail += c.chengfenCanqueCount > 2 ? 1 : 0;
    ruleChecks["修改后句子完整"].pass += c.allHaveAnswer ? 1 : 0;
    ruleChecks["修改后句子完整"].fail += c.allHaveAnswer ? 0 : 1;
    ruleChecks["解析完整"].pass += c.allHaveAnalysis ? 1 : 0;
    ruleChecks["解析完整"].fail += c.allHaveAnalysis ? 0 : 1;
    const ooR = v.checks.sentenceLengths.filter(l => l < 10 || l > 50).length;
    ruleChecks["句子长度合理(10-50字)"].pass += ooR === 0 ? 1 : 0;
    ruleChecks["句子长度合理(10-50字)"].fail += ooR > 0 ? 1 : 0;
  }

  lines.push("| 规则 | 通过(9组) | 失败 | 通过率 |");
  lines.push("|------|----------|------|--------|");
  for (const [rule, counts] of Object.entries(ruleChecks)) {
    const rate = Math.round(counts.pass / 9 * 100);
    const icon = rate === 100 ? "✅" : rate >= 78 ? "⚠️" : "❌";
    lines.push(`| ${rule} | ${counts.pass} | ${counts.fail} | ${icon} ${rate}% |`);
  }
  lines.push("");

  // ====== 六、原始输出 ======
  lines.push("## 六、原始输出（供人工复核）");
  lines.push("");
  for (const r of results) {
    lines.push(`### ${r.label}`);
    lines.push("");
    if (r.error) {
      lines.push(`**❌ 失败：** ${r.error}`);
    } else {
      // 附加自动解析摘要
      const v = validations.find(v => v.label === r.label);
      if (v && v.parsed.length > 0) {
        lines.push("> 📏 句长：" + v.checks.sentenceLengths.join("/") + "字 | 🏷️ 类型：" + v.parsed.map(p => p.errorType || "?").join(" / "));
        lines.push("");
      }
      lines.push(r.output);
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  // ====== 七、最终判定 ======
  lines.push("## 七、最终判定");
  lines.push("");
  const totalIssues = validations.flatMap(v => v.issues.filter(i => i.startsWith("❌"))).length;
  const warnings = validations.flatMap(v => v.issues.filter(i => i.startsWith("⚠️"))).length;
  const driftSection = lines.join("").includes("❌ **漂移警告**");
  const gradeOK = g9mean > g7mean + 3;
  const diffOK = hardAvg > easyAvg + 5;
  const rulesOK = totalIssues === 0;

  lines.push("| 维度 | 判定 | 说明 |");
  lines.push("|------|------|------|");
  lines.push(`| 年级差异 | ${gradeOK ? "✅ 成立" : "❌ 不成立"} | 九年级vs七年级句长差${Math.round(g9mean - g7mean)}字 |`);
  lines.push(`| 难度梯度 | ${diffOK ? "✅ 成立" : "⚠️ 偏弱"} | 困难vs容易句长差${Math.round(hardAvg - easyAvg)}字 |`);
  lines.push(`| 难度漂移 | ${driftSection ? "❌ 存在" : "✅ 未检出"} | 七年级困难 vs 九年级容易 |`);
  lines.push(`| vRule拦截 | ${rulesOK ? "✅ 全部通过" : `❌ ${totalIssues}项失败`} | ${warnings > 0 ? `+${warnings}项警告` : ""} |`);

  const allPass = gradeOK && diffOK && !driftSection && rulesOK;
  lines.push("");
  lines.push(`### ${allPass ? "✅ 系统稳定，可进入下一阶段" : "⚠️ 存在问题，需修复后重验"}`);
  lines.push("");

  const outPath = path.resolve(__dirname, "..", "verify-bingju-output.md");
  fs.writeFileSync(outPath, lines.join("\n"), "utf-8");
  console.log(`\n📄 报告：${outPath}`);
  console.log(`  年级差异=${gradeOK ? "✅" : "❌"} | 难度梯度=${diffOK ? "✅" : "⚠️"} | 漂移=${driftSection ? "❌" : "✅"} | vRule=${rulesOK ? "✅" : "❌"}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
