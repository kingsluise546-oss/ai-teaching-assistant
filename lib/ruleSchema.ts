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

  /** 答案格式：答案怎么写、解析怎么写、考点标签怎么写 */
  answerFormat: string;

  /** 难度控制点：每个难度级别具体怎么体现 */
  difficultyControl: Record<Difficulty, string>;

  /** 约束条件：不能做什么、禁止出现什么 */
  constraints: string[];

  /** 输出模板：最终的 markdown 格式模板 */
  outputTemplate: string;

  /** 校验规则：生成后必须检查的项目 */
  validationRules: string[];
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
