/**
 * 出题系统类型定义 —— 统一从路由树导出
 * 新增题型只需修改 routingTree.ts，此处自动同步
 */

export {
  type Stage,
  type Subject,
  type Difficulty,
  type TypeNode,
  type DifficultyDef,
  detectStage,
  getTypeTree,
  findTypeNode,
  getDifficultyDef,
  ROUTING_TREE,
  GRADES_BY_STAGE,
  DEFAULT_DIFFICULTY,
} from "./routingTree";

import { Stage, Subject, getTypeTree as _getTypeTree } from "./routingTree";

/** 快捷：获取某学段+学科的所有题型名称 */
export function getAvailableTypes(stage: Stage, subject: Subject): string[] {
  return _getTypeTree(stage, subject).map((t: any) => t.name);
}
