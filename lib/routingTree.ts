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

// ====== 模块分组（用于 UI 层级展示） ======
export interface ModuleGroup {
  /** 模块名（如"积累与运用"） */
  label: string;
  /** 模块分值 */
  score?: string;
  /** 该模块下的题型名列表 */
  types: string[];
}

/** 按学段+学科返回模块分组，未定义则返回 null（扁平展示） */
export function getModuleGroups(stage: Stage, subject: Subject): ModuleGroup[] | null {
  const groups: Record<string, Record<string, ModuleGroup[]>> = {
    小学: {
      英语: [
        { label: "基础知识与运用", types: ["单词拼写", "选词填空", "单项选择", "补全对话"] },
        { label: "阅读理解", types: ["阅读理解"] },
        { label: "书面表达", types: ["书面表达"] },
      ],
      数学: [
        { label: "数与代数", types: ["口算", "竖式计算", "脱式计算", "填空题", "判断题", "找规律", "应用题"] },
        { label: "图形与几何", types: ["图形题"] },
        { label: "统计与概率", types: ["统计图表"] },
        { label: "综合与实践", types: ["解决问题"] },
      ],
      语文: [
        { label: "积累与运用", score: "40-50分", types: ["看拼音写词", "形近字组词", "选词填空", "近反义词", "成语填空", "句式转换", "修改病句", "仿写句子", "修辞判断", "标点运用", "古诗默写", "名言警句", "口语交际"] },
        { label: "阅读与理解", score: "20-30分", types: ["阅读理解"] },
        { label: "习作", score: "25-30分", types: ["习作"] },
      ],
    },
    初中: {
      英语: [
        { label: "语言知识运用", types: ["语法选择", "完形填空", "词汇运用"] },
        { label: "阅读理解", types: ["阅读理解", "任务型阅读"] },
        { label: "书面表达", types: ["书面表达"] },
      ],
      数学: [
        { label: "数与代数", types: ["实数运算", "代数式", "方程与不等式", "函数"] },
        { label: "图形与几何", types: ["三角形与全等", "四边形", "相似与三角", "圆", "图形变换"] },
        { label: "统计与概率", types: ["统计与概率"] },
      ],
      语文: [
        { label: "积累与运用", score: "22分", types: ["字音字形", "成语运用", "病句辨析", "古诗文默写", "综合性学习"] },
        { label: "现代文阅读", score: "28分", types: ["实用类阅读", "文学类阅读"] },
        { label: "古诗文阅读", score: "15分", types: ["文言文阅读", "古诗词鉴赏"] },
        { label: "整本书阅读", score: "5分", types: ["名著阅读"] },
        { label: "作文", score: "50分", types: ["作文"] },
      ],
    },
    高中: {
      英语: [
        { label: "阅读理解", types: ["阅读理解", "七选五"] },
        { label: "语言知识运用", types: ["完形填空", "语法填空"] },
        { label: "写作", types: ["应用文写作", "读后续写"] },
      ],
      数学: [
        { label: "函数", types: ["集合与逻辑", "函数与导数", "三角函数", "数列"] },
        { label: "几何与代数", types: ["平面向量", "立体几何", "解析几何"] },
        { label: "概率与统计", types: ["概率统计"] },
      ],
      语文: [
        { label: "现代文阅读", score: "35-40分", types: ["信息类阅读", "文学类阅读"] },
        { label: "古代诗文阅读", score: "34-35分", types: ["文言文阅读", "古代诗歌鉴赏", "名句默写"] },
        { label: "语言文字运用", score: "20分", types: ["成语辨析", "病句修改", "语句补写", "修辞分析", "句式变换", "标点符号", "图文转换", "词句含义"] },
        { label: "写作", score: "60分", types: ["写作"] },
      ],
    },
  };
  return groups[stage]?.[subject] || null;
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
    容易: "单一知识点直接考查，基础题型",
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
        // ── 积累与运用（40-50分）──
        { name: "看拼音写词" },
        { name: "形近字组词" },
        { name: "选词填空" },
        { name: "近反义词" },
        { name: "成语填空" },
        { name: "句式转换", subTypes: ["陈述反问", "双重否定", "直述转述"] },
        { name: "修改病句", subTypes: ["词语搭配不当", "语序不当", "重复啰嗦", "成分残缺"] },
        { name: "仿写句子" },
        { name: "修辞判断", subTypes: ["比喻", "拟人", "夸张", "排比"] },
        { name: "标点运用", subTypes: ["句号逗号", "引号", "省略号"] },
        { name: "古诗默写" },
        { name: "名言警句" },
        { name: "口语交际" },
        // ── 阅读与理解（20-30分）──
        {
          name: "阅读理解",
          subTypes: ["内容概括", "词语理解", "句子理解", "人物形象", "修辞赏析", "句段作用", "中心思想", "拓展延伸"],
          difficulties: {
            容易: "短文300-500字，情节简单、主题直白。答案可直接从文中找到",
            中等: "短文500-700字，有隐含情感或寓意。需要联系上下文推理",
            困难: "短文700-900字，有复杂情感或多重主题。需要综合分析",
          },
        },
        // ── 习作（25-30分）──
        { name: "习作", subTypes: ["记实作文", "想象作文", "半命题作文"] },
      ],
      数学: [
        // ── 数与代数（40-50分）──
        { name: "口算" },
        { name: "竖式计算" },
        { name: "脱式计算" },
        { name: "填空题", subTypes: ["单位换算", "概念填空", "规律填空"] },
        { name: "判断题" },
        { name: "找规律" },
        { name: "应用题", subTypes: ["一步应用题", "两步应用题", "综合应用题"] },
        // ── 图形与几何（20-25分）──
        { name: "图形题", subTypes: ["图形辨认", "周长面积", "立体图形"] },
        // ── 统计与概率（10-15分）──
        { name: "统计图表", subTypes: ["条形统计图", "平均数", "可能性"] },
        // ── 综合与实践（10-15分）──
        { name: "解决问题", subTypes: ["购物问题", "行程问题", "工程问题"] },
      ],
      英语: [
        // ── 基础知识与运用（25-35分）──
        { name: "单词拼写" },
        { name: "选词填空" },
        { name: "单项选择" },
        { name: "补全对话" },
        // ── 阅读理解（20-25分）──
        { name: "阅读理解", subTypes: ["判断对错", "选择填空", "图文匹配"] },
        // ── 书面表达（10-15分）──
        { name: "书面表达", subTypes: ["仿写句子", "命题作文"] },
      ],
    },
  },
  {
    stage: "初中",
    grades: GRADES_BY_STAGE["初中"],
    subjects: {
      语文: [
        // ── 积累与运用（22分）──
        { name: "字音字形" },
        { name: "成语运用" },
        { name: "病句辨析", subTypes: ["搭配不当", "成分残缺", "句式杂糅", "表意不明", "不合逻辑"] },
        { name: "古诗文默写", subTypes: ["直接默写", "理解性默写", "主题关联"] },
        { name: "综合性学习", subTypes: ["信息提取", "口语交际", "活动设计", "图文转换", "材料探究"] },
        // ── 现代文阅读（28分）──
        { name: "实用类阅读", subTypes: ["信息筛选与概括", "论证方法分析", "语言特点分析"] },
        {
          name: "文学类阅读",
          subTypes: ["内容概括", "语言赏析", "句段作用", "人物形象", "标题含义", "情感主旨", "词句含义", "写作手法", "拓展探究"],
          difficulties: {
            容易: "选文情节清晰、主题直白。答案可直接从文中定位，题干指向明确",
            中等: "选文有隐含情感或象征。需整合信息、简单推理，有轻度干扰",
            困难: "选文有深层主题和多义性。涉及隐性情感、深层主旨、多层文本分析",
          },
        },
        // ── 古诗文阅读（15分+5分整本书）──
        { name: "文言文阅读", subTypes: ["实词虚词", "断句", "句子翻译", "内容理解", "对比分析"] },
        { name: "古诗词鉴赏", subTypes: ["意象分析", "手法赏析", "情感把握"] },
        { name: "名著阅读", subTypes: ["情节识记", "人物分析", "主题理解"] },
        // ── 作文（50分）──
        { name: "作文", subTypes: ["命题作文", "半命题作文", "材料作文"] },
      ],
      数学: [
        // ── 数与代数（70-75分）──
        { name: "实数运算", subTypes: ["相反数绝对值", "科学记数法", "幂的运算"] },
        { name: "代数式", subTypes: ["因式分解", "分式化简", "二次根式"] },
        { name: "方程与不等式", subTypes: ["一元一次方程", "一元二次方程", "不等式组"] },
        { name: "函数", subTypes: ["一次函数", "二次函数", "反比例函数", "函数综合"] },
        // ── 图形与几何（60-68分）──
        { name: "三角形与全等", subTypes: ["三角形性质", "全等判定", "勾股定理"] },
        { name: "四边形", subTypes: ["平行四边形", "矩形菱形", "梯形"] },
        { name: "相似与三角", subTypes: ["相似判定", "锐角三角函数", "解直角三角形"] },
        { name: "圆", subTypes: ["垂径定理", "圆周角", "切线性质"] },
        { name: "图形变换", subTypes: ["平移", "旋转", "轴对称", "折叠"] },
        // ── 统计与概率（15-22分）──
        { name: "统计与概率", subTypes: ["数据特征", "统计图分析", "概率计算", "样本估计"] },
      ],
      英语: [
        // ── 语言知识运用（25-30分）──
        { name: "语法选择" },
        { name: "完形填空" },
        { name: "词汇运用", subTypes: ["首字母填空", "适当形式填空", "选词填空"] },
        // ── 阅读理解（30-40分）──
        { name: "阅读理解", subTypes: ["细节理解", "推理判断", "主旨大意", "词义猜测"] },
        { name: "任务型阅读", subTypes: ["信息匹配", "完成表格", "回答问题"] },
        // ── 书面表达（15分）──
        { name: "书面表达", subTypes: ["应用文", "话题作文"] },
      ],
    },
  },
  {
    stage: "高中",
    grades: GRADES_BY_STAGE["高中"],
    subjects: {
      语文: [
        // ── 现代文阅读（35-40分）──
        { name: "信息类阅读", subTypes: ["内容理解", "论证分析", "信息整合", "比较探究"] },
        {
          name: "文学类阅读",
          subTypes: ["人物形象分析", "情节作用分析", "环境描写作用", "叙事特征", "语言特色赏析", "标题含义", "句段含义", "情感主旨", "物象作用", "谋篇布局"],
          difficulties: {
            容易: "选文情节清晰、主题直白。小说人物形象鲜明，散文情感明确",
            中等: "选文有隐含情感和象征。需要多角度文本解读，涉及叙事技巧分析",
            困难: "选文有复杂叙事结构和多元主题。涉及多角度探究和批判性评价，接近高考压轴题",
          },
        },
        // ── 古代诗文阅读（34-35分）──
        { name: "文言文阅读", subTypes: ["断句", "词语解说", "内容理解", "句子翻译", "简答概括"] },
        { name: "古代诗歌鉴赏", subTypes: ["思想情感", "意象意境", "炼字炼句", "表达技巧"] },
        { name: "名句默写", subTypes: ["情境默写"] },
        // ── 语言文字运用（20分）──
        { name: "成语辨析", subTypes: ["语境填空", "用法辨析"] },
        { name: "病句修改", subTypes: ["语序不当", "搭配不当", "成分残缺", "句式杂糅", "表意不明", "不合逻辑"] },
        { name: "语句补写", subTypes: ["逻辑衔接", "语境连贯"] },
        { name: "修辞分析", subTypes: ["比喻", "拟人", "排比", "其他修辞"] },
        { name: "句式变换", subTypes: ["长短句互换", "整散句互换"] },
        { name: "标点符号", subTypes: ["破折号", "省略号", "引号"] },
        { name: "图文转换", subTypes: ["图表转文字", "框架图解读"] },
        { name: "词句含义", subTypes: ["语境理解", "深层含义"] },
        // ── 写作（60分）──
        { name: "写作", subTypes: ["材料作文", "概念作文", "多材料作文"] },
      ],
      数学: [
        // ── 函数（40-50分）──
        { name: "集合与逻辑" },
        { name: "函数与导数", subTypes: ["函数性质", "指数对数", "导数应用", "导数压轴"] },
        { name: "三角函数", subTypes: ["图像性质", "恒等变换", "解三角形"] },
        { name: "数列", subTypes: ["等差数列", "等比数列", "数列求和"] },
        // ── 几何与代数（50-60分）──
        { name: "平面向量", subTypes: ["数量积", "坐标运算", "向量应用"] },
        { name: "立体几何", subTypes: ["线面关系", "二面角", "体积计算"] },
        { name: "解析几何", subTypes: ["椭圆", "双曲线", "抛物线", "综合应用"] },
        // ── 概率与统计（20-25分）──
        { name: "概率统计", subTypes: ["排列组合", "古典概型", "条件概率", "分布列", "统计推断"] },
      ],
      英语: [
        // ── 阅读理解（50分）──
        { name: "阅读理解", subTypes: ["细节理解", "推理判断", "主旨大意", "词义猜测"] },
        { name: "七选五" },
        // ── 语言知识运用（30分）──
        { name: "完形填空" },
        { name: "语法填空" },
        // ── 写作（40分）──
        { name: "应用文写作" },
        { name: "读后续写" },
      ],
    },
  },
];

// ====== 路由查询工具函数 ======

/** 中文数字 → 阿拉伯数字 映射 */
const CN_NUM: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
};

/** 从年级字符串中提取数字（支持中文数字和阿拉伯数字，处理别名） */
function extractGradeNumber(grade: string): number {
  // 别名偏移
  if (grade.includes("初")) {
    // 初一→7, 初二→8, 初三→9
    for (const [cn, num] of Object.entries(CN_NUM)) {
      if (grade.includes(cn)) return num + 6;
    }
    return 7;
  }
  if (grade.includes("高")) {
    // 高一→10, 高二→11, 高三→12
    for (const [cn, num] of Object.entries(CN_NUM)) {
      if (grade.includes(cn)) return num + 9;
    }
    return 10;
  }
  if (grade.startsWith("小")) {
    // 小一→1, 小二→2 ... 小六→6
    for (const [cn, num] of Object.entries(CN_NUM)) {
      if (grade.includes(cn)) return num;
    }
    return 1;
  }

  // 先尝试阿拉伯数字
  const arabic = parseInt(grade.replace(/[^0-9]/g, ""));
  if (!isNaN(arabic)) return arabic;

  // 再尝试中文数字
  for (const [cn, num] of Object.entries(CN_NUM)) {
    if (grade.includes(cn)) return num;
  }

  return NaN;
}

export { extractGradeNumber };

/** 年级 → 学段 */
export function detectStage(grade: string): Stage {
  // 别名映射
  if (grade.includes("高")) return "高中";
  if (grade.includes("初")) return "初中";   // 初一/初二/初三
  if (grade.startsWith("小")) return "小学"; // 小一~小六

  const num = extractGradeNumber(grade);
  if (isNaN(num)) return "初中"; // 兜底
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
