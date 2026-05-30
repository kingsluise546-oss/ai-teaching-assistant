/**
 * 通用难度框架 + 年级语言控制
 * 全学科复用，不是每题重写
 */

import { Stage, Difficulty, extractGradeNumber } from "./routingTree";

// ====== 通用难度框架 ======
// 所有学科、所有题型的难度分级都遵循这个基础框架

export interface DifficultyFramework {
  /** 知识点复杂度 */
  knowledgeDepth: string;
  /** 错误/干扰隐蔽度 */
  concealment: string;
  /** 材料复杂度（句子长度、文章深度等） */
  materialComplexity: string;
  /** 思维层级（识记→理解→应用→分析→评价→创造） */
  cognitiveLevel: string;
}

export const UNIVERSAL_DIFFICULTY: Record<Difficulty, DifficultyFramework> = {
  容易: {
    knowledgeDepth: "单一知识点，直接考查",
    concealment: "错误明显/干扰弱，一眼可辨",
    materialComplexity: "简短直白，无冗余信息",
    cognitiveLevel: "识记 → 理解（认出、说出、写出）",
  },
  中等: {
    knowledgeDepth: "1-2个知识点综合，需要整合信息",
    concealment: "错误需读两遍发现，有轻度干扰项",
    materialComplexity: "中等长度，有少量冗余或变化",
    cognitiveLevel: "理解 → 应用 → 分析（判断、推理、解释）",
  },
  困难: {
    knowledgeDepth: "多知识点融合，需要深度理解",
    concealment: "错误隐蔽，需语法/逻辑分析，有强干扰项",
    materialComplexity: "较长或复杂，含隐性信息或多层结构",
    cognitiveLevel: "分析 → 评价 → 创造（辨析、比较、独立见解）",
  },
};

// ====== 年级语言控制 ======
// 同是"中等难度"，七年级用短句口语，九年级用长句书面语

export interface GradeLanguageProfile {
  /** 句子长度范围 */
  sentenceLength: string;
  /** 词汇水平 */
  vocabulary: string;
  /** 语境风格 */
  contextStyle: string;
  /** 句法复杂度 */
  syntaxLevel: string;
}

export const GRADE_LANGUAGE: Record<number, GradeLanguageProfile> = {
  // 小学
  1: { sentenceLength: "5-15字", vocabulary: "一年级常用字，生活化词语", contextStyle: "童话、游戏、校园日常", syntaxLevel: "单句，仅使用陈述句、疑问句" },
  2: { sentenceLength: "8-18字", vocabulary: "二年级常用字，简单修饰词", contextStyle: "故事、生活趣事、自然现象", syntaxLevel: "单句为主，偶有并列句" },
  3: { sentenceLength: "10-20字", vocabulary: "三年级常用字，基础成语", contextStyle: "校园、家庭、简单科普", syntaxLevel: "单句和简单复句" },
  4: { sentenceLength: "12-25字", vocabulary: "常用成语、简单关联词", contextStyle: "叙事、写景、说明", syntaxLevel: "复句，使用'因为所以''虽然但是'" },
  5: { sentenceLength: "15-30字", vocabulary: "成语、简单修辞（比喻、拟人）", contextStyle: "记叙、描写、简单议论", syntaxLevel: "多种复句，偶有长修饰" },
  6: { sentenceLength: "15-35字", vocabulary: "过渡性词汇，近初中水平", contextStyle: "叙事、写景、简单说理", syntaxLevel: "复句为主，衔接初中难度" },
  // 初中
  7: { sentenceLength: "15-30字", vocabulary: "初中基础词汇，生活化语境", contextStyle: "校园生活、成长故事、自然社会", syntaxLevel: "口语化复句，偶有介词结构" },
  8: { sentenceLength: "20-35字", vocabulary: "学科术语出现，书面语增多", contextStyle: "思辨短文、社会现象、科普", syntaxLevel: "书面语复句，使用关联词链" },
  9: { sentenceLength: "25-40字", vocabulary: "中考词汇，抽象概念出现", contextStyle: "议论文段、哲理短文、文化评论", syntaxLevel: "长复句、多层修饰、逻辑连接" },
  // 高中
  10: { sentenceLength: "25-45字", vocabulary: "高中基础，学术语体起步", contextStyle: "论述文段、社科文本、短评", syntaxLevel: "复杂复句，含插入语和独立成分" },
  11: { sentenceLength: "30-50字", vocabulary: "高考核心词汇，抽象逻辑词", contextStyle: "学术论述、文学评论、社会分析", syntaxLevel: "多层嵌套复句，严密逻辑链" },
  12: { sentenceLength: "30-60字", vocabulary: "高考全范围，专业术语", contextStyle: "高考真题风格，学术论文体", syntaxLevel: "高度复杂的多层复句，含引用和论证" },
};

/** 根据年级获取语言配置 */
export function getGradeLanguage(grade: string): GradeLanguageProfile {
  const num = extractGradeNumber(grade);
  return GRADE_LANGUAGE[num] || GRADE_LANGUAGE[7]; // 默认七年级
}

/** 将通用难度 + 年级语言 + 题型特化 → 组装为最终 difficultyControl 文本 */
export function buildDifficultyText(
  difficulty: Difficulty,
  grade: string,
  typeName: string
): string {
  const df = UNIVERSAL_DIFFICULTY[difficulty];
  const gl = getGradeLanguage(grade);

  return [
    `【${difficulty}难度 · ${grade} · ${typeName}】`,
    `知识点：${df.knowledgeDepth}`,
    `隐蔽度：${df.concealment}`,
    `材料：句子长度${gl.sentenceLength}，词汇${gl.vocabulary}`,
    `句法：${gl.syntaxLevel}`,
    `语境：${gl.contextStyle}`,
    `思维：${df.cognitiveLevel}`,
  ].join("\n");
}
