/**
 * 统一规则 Schema —— 所有题型规则必须按此结构填空
 * 这是系统的"法律"，不是建议
 */

import { Stage, Subject, Difficulty } from "./routingTree";

export interface RuleSchema {
  /** 题型名称（必须与 routingTree 中一致） */
  typeName: string;
  /** 学段 */
  stage: Stage;
  /** 学科 */
  subject: Subject;
  /** 适用年级（null = 该学段所有年级） */
  applicableGrades: string[] | null;

  /** 题型目标：这道题考查学生什么能力 */
  objective: string;

  /** 材料规格：选文/题干材料的长度、类型、来源要求 */
  materialSpec: string;

  /** 题目结构：共几道题，每道题考查什么维度，排列逻辑 */
  questionStructure: string;

  /** 答案结构类型：
   *  single   — 1题1答案，平铺（字音、成语、默写）
   *  composite— 1题多字段答案（病句：类型+修改+解析）
   *  multiLayer— 1段材料+N道子题（阅读：选文→4-5题→逐题答案） */
  answerStructure: "single" | "composite" | "multiLayer";

  /** 答案格式：答案怎么写、解析怎么写、考点标签怎么写 */
  answerFormat: string;

  /** 难度控制点：每个难度级别具体怎么体现 */
  difficultyControl: Record<Difficulty, string>;

  /** 约束条件：不能做什么、禁止出现什么 */
  constraints: string[];

  /** 输出模板：最终的 markdown 格式模板 */
  outputTemplate: string;

  /** 校验规则：生成后 AI 自查项（Layer 2） */
  validationRules: string[];

  // ── 深度判定因子（0-2），用于自动计算验证深度 ──
  /** 答案开放度：0=唯一答案, 1=半开放, 2=全开放 */
  answerOpenness: number;
  /** 结构复杂度：0=单题型, 1=有子题型, 2=嵌套结构 */
  structureComplexity: number;
  /** 风险等级：0=无争议, 1=偶有灰色, 2=常有争议 */
  riskLevel: number;
}

/** 所有已注册规则的注册表 */
export const ruleRegistry: Map<string, RuleSchema> = new Map();

/** 注册一条规则 */
export function registerRule(rule: RuleSchema): void {
  const key = `${rule.stage}:${rule.subject}:${rule.typeName}`;
  ruleRegistry.set(key, rule);
}

/** 查询规则 */
export function findRule(stage: Stage, subject: Subject, typeName: string): RuleSchema | undefined {
  const key = `${stage}:${subject}:${typeName}`;
  return ruleRegistry.get(key);
}

/** 获取某学段+学科已注册的题型 */
export function getRegisteredTypes(stage: Stage, subject: Subject): string[] {
  const prefix = `${stage}:${subject}:`;
  const types: string[] = [];
  ruleRegistry.forEach((_, key) => {
    if (key.startsWith(prefix)) {
      types.push(key.slice(prefix.length));
    }
  });
  return types;
}

/** 规则是否已注册 */
export function isRuleRegistered(stage: Stage, subject: Subject, typeName: string): boolean {
  return ruleRegistry.has(`${stage}:${subject}:${typeName}`);
}
