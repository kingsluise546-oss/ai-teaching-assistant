/**
 * 统一验证入口 v1.1
 *
 * 用法：
 *   npx tsx scripts/verify.ts                          # 全部题型 standard
 *   npx tsx scripts/verify.ts 初中 语文 病句辨析       # 单题型
 *   npx tsx scripts/verify.ts --strictness strict       # 严格模式
 *   npx tsx scripts/verify.ts --strictness light        # 快速冒烟
 *   npx tsx scripts/verify.ts --regression              # 回归测试（各结构抽10题）
 */

import * as fs from "fs";
import * as path from "path";
import {
  runVerification, generateReport, calculateDepth, generateJobsFromRegistry,
  Strictness
} from "../lib/verification-runner";
import { Stage, Subject } from "../lib/routingTree";

const envPath = path.resolve(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const t = line.trim(); if (!t || t.startsWith("#")) continue;
  const ei = t.indexOf("="); if (ei > 0) env[t.slice(0, ei).trim()] = t.slice(ei + 1).trim();
}
const API_KEY = env["DEEPSEEK_API_KEY"];
if (!API_KEY) { console.error("❌ DEEPSEEK_API_KEY"); process.exit(1); }

// 回归测试 fixture
const REGRESSION_SUITE = [
  { stage: "小学" as Stage, subject: "语文" as Subject, type: "看拼音写词",  count: 3 },
  { stage: "小学" as Stage, subject: "语文" as Subject, type: "组词造句",    count: 3 },
  { stage: "小学" as Stage, subject: "语文" as Subject, type: "近反义词",    count: 3 },
  { stage: "小学" as Stage, subject: "语文" as Subject, type: "修改病句",    count: 3 },
  { stage: "小学" as Stage, subject: "语文" as Subject, type: "仿写句子",    count: 3 },
  { stage: "小学" as Stage, subject: "语文" as Subject, type: "古诗默写",    count: 3 },
  { stage: "小学" as Stage, subject: "语文" as Subject, type: "口语交际",    count: 3 },
  { stage: "小学" as Stage, subject: "语文" as Subject, type: "阅读理解",    count: 3 },
  { stage: "初中" as Stage, subject: "语文" as Subject, type: "字音字形",    count: 3 },
  { stage: "初中" as Stage, subject: "语文" as Subject, type: "成语运用",    count: 3 },
  { stage: "初中" as Stage, subject: "语文" as Subject, type: "病句辨析",    count: 3 },
  { stage: "初中" as Stage, subject: "语文" as Subject, type: "名著阅读",    count: 3 },
  { stage: "初中" as Stage, subject: "语文" as Subject, type: "综合性学习",  count: 3 },
  { stage: "初中" as Stage, subject: "语文" as Subject, type: "现代文阅读",  count: 3 },
  { stage: "高中" as Stage, subject: "语文" as Subject, type: "名句默写",    count: 3 },
  { stage: "高中" as Stage, subject: "语文" as Subject, type: "语言文字运用",count: 3 },
  { stage: "高中" as Stage, subject: "语文" as Subject, type: "古代诗歌鉴赏",count: 3 },
  { stage: "高中" as Stage, subject: "语文" as Subject, type: "文学类阅读",  count: 3 },
];

async function main() {
  const args = process.argv.slice(2);
  const regression = args.includes("--regression");

  let strictness: Strictness = "standard";
  const sIdx = args.indexOf("--strictness");
  if (sIdx >= 0 && args[sIdx + 1]) {
    const v = args[sIdx + 1];
    if (v === "light" || v === "standard" || v === "strict") strictness = v;
  }

  // 过滤掉 flag 参数
  const posArgs = args.filter(a => !a.startsWith("--") && !["light", "standard", "strict"].includes(a));

  if (regression) {
    console.log(`🔄 回归测试 [${strictness}] — ${REGRESSION_SUITE.length} 题型，各 ${REGRESSION_SUITE[0].count} 组\n`);
    let totalOK = 0, totalFail = 0;

    for (const fixture of REGRESSION_SUITE) {
      const jobs = generateJobsFromRegistry(fixture.stage, fixture.subject);
      const job = jobs.find(j => j.type === fixture.type);
      if (!job) { console.log(`  ⚠️ ${fixture.type} 未注册，跳过`); continue; }

      // 回归模式：只用 1 个年级 × 1 难度，快速验证
      job.grades = [job.grades[0]];
      job.difficulties = [job.difficulties[0]];
      job.count = fixture.count;

      console.log(`  ${job.name}...`);
      const report = await runVerification(job, API_KEY, strictness);
      const ok = report.summary.layer0OK && report.summary.layer1OK;
      console.log(`    L0=${report.summary.layer0OK ? "✅" : "❌"} L1=${report.summary.layer1OK ? "✅" : "❌"} → ${ok ? "PASS" : "FAIL"}`);
      if (ok) totalOK++; else totalFail++;
    }

    console.log(`\n📊 回归结果：${totalOK} PASS / ${totalFail} FAIL / ${REGRESSION_SUITE.length} TOTAL`);
    process.exit(totalFail > 0 ? 1 : 0);
  }

  // 标准模式：全量验证
  const stage = (posArgs[0] || "初中") as Stage;
  const subject = (posArgs[1] || "语文") as Subject;
  const filterType = posArgs[2];

  const allJobs = generateJobsFromRegistry(stage, subject);
  const jobs = filterType ? allJobs.filter(j => j.type === filterType) : allJobs;

  if (jobs.length === 0) {
    console.error(`❌ 无匹配：${stage}/${subject}${filterType ? "/" + filterType : ""}`);
    process.exit(1);
  }

  console.log(`📋 ${jobs.length} 题型 [${strictness}]：${jobs.map(j => j.name).join(", ")}\n`);

  for (const job of jobs) {
    const { findRule } = await import("../lib/ruleSchema");
    const rule = findRule(job.stage, job.subject, job.type)!;
    const depth = calculateDepth(rule);
    console.log(`🚀 ${job.name}  [${depth}]`);
    console.log(`   ${job.grades.length}年级×${job.difficulties.length}难度 | ${job.count}题/组\n`);

    const report = await runVerification(job, API_KEY, strictness);
    const markdown = await generateReport(job, report.rule, report.depth, report.results, report.validations, API_KEY, strictness);

    const outPath = path.resolve(__dirname, "..", `verify-${job.type}-output.md`);
    fs.writeFileSync(outPath, markdown, "utf-8");

    const s = report.summary;
    console.log(`\n📄 ${outPath}`);
    console.log(`   L0=${s.layer0OK ? "✅" : "❌"} L1=${s.layer1OK ? "✅" : "❌"} | 年级=${s.gradeDiffOK ? "✅" : "⚠️"} 梯度=${s.diffGradientOK ? "✅" : "⚠️"} 漂移=${s.driftOK ? "✅" : "❌"}`);
    console.log("");
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
