export interface RecentWorkItem {
  id: string;
  title: string;
  type: string;
  typeColor: string;
  updatedAt: string;
  summary: string;
}

export const recentWorkItems: RecentWorkItem[] = [
  {
    id: "1",
    title: "六年级语文教案·《草原》",
    type: "教案",
    typeColor: "bg-blue-50 text-blue-600",
    updatedAt: "2小时前",
    summary: "含教学目标、教学流程五环节、课堂提问链及分层作业设计",
  },
  {
    id: "2",
    title: "期末语文复习卷",
    type: "试卷",
    typeColor: "bg-purple-50 text-purple-600",
    updatedAt: "昨天",
    summary: "基础巩固·能力提升·拓展挑战三层结构，覆盖全单元知识点",
  },
  {
    id: "3",
    title: "三班期末学生评语",
    type: "评语",
    typeColor: "bg-green-50 text-green-600",
    updatedAt: "3天前",
    summary: "42人，亲切鼓励型风格，涵盖学习态度、课堂表现、品德发展",
  },
  {
    id: "4",
    title: "期中成绩分析报告",
    type: "分析",
    typeColor: "bg-amber-50 text-amber-600",
    updatedAt: "上周",
    summary: "班级平均分85.3，优秀率32%，需关注阅读理解模块薄弱点",
  },
  {
    id: "5",
    title: "国庆假期安全通知",
    type: "通知",
    typeColor: "bg-orange-50 text-orange-600",
    updatedAt: "2周前",
    summary: "放假时间及返校安排，假期安全注意事项及温馨提示",
  },
  {
    id: "6",
    title: "三年级数学《分数初步》",
    type: "教案",
    typeColor: "bg-blue-50 text-blue-600",
    updatedAt: "3周前",
    summary: "分数概念导入、直观比较、简单同分母加减及课堂练习",
  },
];

export interface ResultBlock {
  id: string;
  title: string;
  content: ContentItem[];
}

export type ContentItem =
  | { kind: "bullet"; text: string }
  | { kind: "step"; number: number; label: string; duration: string; text: string }
  | { kind: "question"; level: string; levelColor: string; text: string }
  | { kind: "homework"; text: string; note?: string };

export const resultBlocks: ResultBlock[] = [
  {
    id: "goals",
    title: "教学目标",
    content: [
      { kind: "bullet", text: "学生能够理解课文中比喻、拟人等修辞手法的运用，并能在写作中模仿使用。" },
      { kind: "bullet", text: "能有感情地朗读全文，感受老舍笔下内蒙古大草原的壮阔之美。" },
      { kind: "bullet", text: "培养学生热爱祖国山河、尊重少数民族文化的情感。" },
    ],
  },
  {
    id: "flow",
    title: "教学流程",
    content: [
      { kind: "step", number: 1, label: "导入新课", duration: "5分钟", text: "播放草原风光图片，引导学生谈谈对草原的印象，激发学习兴趣。" },
      { kind: "step", number: 2, label: "初读课文", duration: "10分钟", text: "学生自由朗读，圈画生字词，初步感知课文内容与情感基调。" },
      { kind: "step", number: 3, label: "精读分析", duration: "15分钟", text: "重点赏析第一、二自然段，分析比喻句的表达效果，体会语言之美。" },
      { kind: "step", number: 4, label: "课堂练习", duration: "10分钟", text: "仿照课文写一段描写家乡自然风光的短文，运用本课学到的修辞手法。" },
      { kind: "step", number: 5, label: "小结作业", duration: "5分钟", text: "总结本课修辞手法，布置课后作业，预告下节课内容。" },
    ],
  },
  {
    id: "questions",
    title: "课堂提问",
    content: [
      { kind: "question", level: "基础", levelColor: "bg-gray-100 text-gray-600", text: "课文第一段描写了草原的哪些景物？请用自己的话说一说。" },
      { kind: "question", level: "理解", levelColor: "bg-blue-50 text-blue-600", text: "作者把小丘比作什么？这样写有什么好处？你还能找出其他比喻句吗？" },
      { kind: "question", level: "应用", levelColor: "bg-indigo-50 text-indigo-600", text: "如果你是老舍，第一次见到草原，你会用什么词语来描述你的心情？" },
    ],
  },
  {
    id: "homework",
    title: "作业设计",
    content: [
      { kind: "homework", text: "有感情地朗读课文，背诵第一自然段。", note: "基础作业" },
      { kind: "homework", text: "仿照课文第一段，写一段描写家乡某处风景的短文（100字以上），至少使用一个比喻句。", note: "提升作业" },
      { kind: "homework", text: "课外阅读：搜集有关内蒙古风土人情的资料，下节课分享。", note: "拓展作业" },
    ],
  },
];
