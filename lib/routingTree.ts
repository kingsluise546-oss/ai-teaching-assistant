/**
 * 教育规则引擎 —— 七层路由树
 *
 * 层级：学段 → 年级 → 学科 → 题型 → 子题型 → 难度 → 规则生成
 * 每层独立，物理隔离。新增题型只需在此文件中添加节点即可。
 */

// ====== 第一层：学段 ======
export type Stage = "小学" | "初中" | "高中";

// ====== 第二层：年级（按学段分组） ======
export const GRADES_BY_STAGE: Record<Stage, string[]> = {
  小学: ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"],
  初中: ["七年级", "八年级", "九年级"],
  高中: ["高一", "高二", "高三"],
};

// ====== 第三层：学科 ======
export type Subject = "语文" | "数学" | "英语";

// ====== 第四层+第五层：题型 → 子题型 树 ======
export interface TypeNode {
  name: string;
  subTypes?: string[];          // 子题型（第五层）
  difficulties?: DifficultyDef; // 该题型专属难度定义
}

export interface DifficultyDef {
  容易: string;
  中等: string;
  困难: string;
}

// ====== 第六层：难度 ======
export type Difficulty = "容易" | "中等" | "困难";

// 各学段通用难度定义（题型未定义专属难度时使用）
export const DEFAULT_DIFFICULTY: Record<Stage, DifficultyDef> = {
  小学: {
    容易: "基础知识直接考查，一步到位，无干扰项",
    中等: "需要简单推理或两步思考，有轻微变化",
    困难: "综合运用多个知识点，需要创造性思维",
  },
  初中: {
    容易: "单一知识点直接考查，答案可从文中直接提取",
    中等: "跨知识点综合，需要分析推理，有中等干扰项",
    困难: "多知识点融合，接近中考难度，需深度理解和综合运用",
  },
  高中: {
    容易: "基础知识运用，接近学考/会考难度",
    中等: "综合分析推理，接近高考中档题",
    困难: "高度综合，批判性思维，接近高考压轴题",
  },
};

// ====== 全量路由树 ======
export interface RoutingTree {
  stage: Stage;
  grades: string[];
  subjects: Record<Subject, TypeNode[]>;
}

export const ROUTING_TREE: RoutingTree[] = [
  {
    stage: "小学",
    grades: GRADES_BY_STAGE["小学"],
    subjects: {
      语文: [
        { name: "看拼音写词" },
        { name: "组词造句" },
        { name: "近反义词" },
        { name: "修改病句", subTypes: ["词语搭配不当", "语序不当", "重复啰嗦", "成分残缺"] },
        { name: "仿写句子" },
        { name: "阅读理解", subTypes: ["信息提取", "词语理解", "句子理解", "主要内容概括", "简单感悟"] },
        { name: "古诗默写" },
        { name: "口语交际" },
      ],
      数学: [
        { name: "口算" },
        { name: "竖式计算" },
        { name: "脱式计算" },
        { name: "应用题", subTypes: ["一步应用题", "两步应用题", "综合应用题"] },
        { name: "图形题" },
        { name: "找规律" },
        { name: "判断题" },
        { name: "填空题" },
      ],
      英语: [
        { name: "单词拼写" },
        { name: "选词填空" },
        { name: "连词成句" },
        { name: "情景对话" },
        { name: "阅读理解" },
        { name: "看图写话" },
      ],
    },
  },
  {
    stage: "初中",
    grades: GRADES_BY_STAGE["初中"],
    subjects: {
      语文: [
        { name: "字音字形" },
        { name: "成语运用" },
        { name: "病句辨析", subTypes: ["搭配不当", "成分残缺", "句式杂糅", "表意不明", "不合逻辑"] },
        {
          name: "现代文阅读",
          subTypes: ["人物形象分析", "句子赏析", "标题作用", "主旨概括", "修辞作用", "写作手法", "情感分析", "段落作用"],
          difficulties: {
            容易: "选文情节清晰、主题直白。答案可直接从文中定位，题干指向明确",
            中等: "选文有隐含情感或象征。需整合信息、简单推理，有轻度干扰",
            困难: "选文有深层主题和多义性。涉及隐性情感、深层主旨、多层文本分析",
          },
        },
        { name: "文言文阅读", subTypes: ["实词理解", "虚词用法", "句子翻译", "内容理解", "人物评价"] },
        { name: "古诗词鉴赏", subTypes: ["意象分析", "手法赏析", "情感把握", "名句品味"] },
        { name: "名著阅读" },
        { name: "综合性学习" },
        { name: "作文", subTypes: ["命题作文", "半命题作文", "材料作文", "话题作文"] },
      ],
      数学: [
        { name: "代数运算" },
        { name: "方程与不等式" },
        { name: "函数", subTypes: ["一次函数", "二次函数", "反比例函数"] },
        { name: "几何证明" },
        { name: "统计与概率" },
        { name: "应用题" },
        { name: "选择填空" },
      ],
      英语: [
        { name: "完形填空" },
        { name: "阅读理解", subTypes: ["细节理解", "推理判断", "主旨大意", "词义猜测"] },
        { name: "语法选择" },
        { name: "短文填空" },
        { name: "书面表达" },
        { name: "听力理解" },
        { name: "单选" },
      ],
    },
  },
  {
    stage: "高中",
    grades: GRADES_BY_STAGE["高中"],
    subjects: {
      语文: [
        { name: "论述类阅读" },
        { name: "文学类阅读", subTypes: ["小说", "散文", "戏剧"] },
        { name: "文言文阅读", subTypes: ["断句", "文化常识", "文意理解", "翻译"] },
        { name: "古代诗歌鉴赏", subTypes: ["形象分析", "语言鉴赏", "表达技巧", "思想情感"] },
        { name: "名句默写" },
        { name: "语言文字运用", subTypes: ["成语", "病句", "衔接", "补写", "压缩"] },
        { name: "作文", subTypes: ["材料作文", "命题作文", "任务驱动型作文"] },
        { name: "实用类阅读" },
      ],
      数学: [
        { name: "集合与逻辑" },
        { name: "函数与导数" },
        { name: "三角函数" },
        { name: "数列" },
        { name: "解析几何" },
        { name: "概率统计" },
        { name: "向量与立体几何" },
      ],
      英语: [
        { name: "阅读理解", subTypes: ["细节理解", "推理判断", "主旨大意", "词义猜测"] },
        { name: "七选五" },
        { name: "完形填空" },
        { name: "语法填空" },
        { name: "短文改错" },
        { name: "书面表达", subTypes: ["书信", "议论文", "记叙文", "读后续写"] },
        { name: "听力理解" },
      ],
    },
  },
];

// ====== 路由查询工具函数 ======

/** 年级 → 学段 */
export function detectStage(grade: string): Stage {
  const num = parseInt(grade.replace(/[^0-9]/g, ""));
  if (isNaN(num)) return "初中";
  if (num <= 6) return "小学";
  if (num <= 9) return "初中";
  return "高中";
}

/** 获取某学段+学科的题型树 */
export function getTypeTree(stage: Stage, subject: Subject): TypeNode[] {
  const node = ROUTING_TREE.find((n) => n.stage === stage);
  return node?.subjects[subject] || [];
}

/** 查找指定题型节点 */
export function findTypeNode(stage: Stage, subject: Subject, typeName: string): TypeNode | undefined {
  return getTypeTree(stage, subject).find((t) => t.name === typeName);
}

/** 获取某题型各难度的定义 */
export function getDifficultyDef(stage: Stage, typeNode?: TypeNode): DifficultyDef {
  return typeNode?.difficulties || DEFAULT_DIFFICULTY[stage];
}
