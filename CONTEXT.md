# AI 教学助手 — 项目上下文

## 项目定位

面向中小学教师的 AI 辅助工具，帮助完成备课、出题、写评语、写通知等日常教学工作。核心交互模式：**点按钮 → 输入一点东西 → 出结果 → 复制走**。

## 架构理念

本质是 **Prompt Infrastructure（Prompt 基础设施）**，而非单一 Prompt。最终形态是 **Skill = Prompt系统 + 参数系统 + 路由系统**。

### 教案 Skill 架构设计（已确认）
- **通用系统层**：所有学科共用的输出结构（七项）、质量控制规则
- **学科层**：语文教学逻辑（导入→初读→精读→情感→拓展→总结）、语文味要求
- **学段层**：小学风格（趣味化、鼓励式、指令清晰），MVP 阶段由 AI 从输入自识别
- **参数系统**：SkillOptions 接口已预留（学科、学段、年级、课型）
- **Few-shot 示例**：《草船借箭》优秀教案已写入 prompt

### 四步工作流（已规划，MVP 先做第一步）
1. 轻量 Prompt 生成初版教案
2. 调用"优秀教案标准"自动审查
3. 自动优化修改
4. 根据模式输出日常版/优质版/公开课版

## 页面结构

| 路由 | 页面 | 内容 |
|------|------|------|
| `/workspace` | **首页** | 场景化问候 + 教学提醒 + 最近工作（最近6条） |
| `/assistant` | **核心技能** | 四个技能块展示页（教学分析灰色占位） |
| `/assistant/prepare-lesson` | **备课助手** | 输入课题 → AI 生成完整教案（已接 DeepSeek API） |
| `/assistant/generate-questions` | 出题助手 | 选知识点 → 出三层练习题（mock） |
| `/assistant/write-comment` | 评语助手 | 导入名单+选关键词 → 出N条评语（mock） |
| `/assistant/generate-notice` | 通知模板 | 选场景+填信息 → 生成可复制文字（mock） |
| `/result?id=xxx` | 详情页 | 查看已保存内容，支持继续优化/收藏/复制/删除 |
| `/assets` | 资产库 | 展示所有收藏内容，支持取消收藏 |

## 技术栈

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 3 + lucide-react
- DeepSeek Flash API（通过 `/api/ai` 路由中转，key 在服务端）
- localStorage 存储（`lib/storage.ts`）
- `react-markdown` 渲染 AI 输出

### 已知问题
- Next.js 开发服务器偶尔 CSS hash 失效导致纯文字页面 → 重启或 `Ctrl+F5` 解决

## 文件结构

```
lib/
├── storage.ts        # localStorage 读写，支持收藏/覆盖更新
├── ai.ts             # 前端调 /api/ai 的封装
├── prompts.ts        # 所有 Prompt 模板 + SkillOptions 接口
│                     # 已注册: registerSubject() 预留接口
└── mockData.ts       # 旧的 mock 数据（首页/详情页用）

app/
├── api/ai/route.ts   # DeepSeek API 中转（服务端持有 key）
└── assistant/
    └── prepare-lesson/page.tsx  # 备课助手（唯一接 API 的技能）
```

## 当前状态（2026-05-30）

### 备课助手 ✅ v1

- [x] 决策链（5步+年级适配）+ 7条执行标准 + 7条质量标准
- [x] 4个范本：草船借箭/铁杵成针/草原/诫子书（历史故事/文言寓言/现代散文/初中文言论述）
- [x] 编号体系：一、（一）1.，三级编号
- [x] 4年级及以上禁止句式填空
- [x] CSS `.doc-lesson-plan`：黑体小三15pt / 宋体小四12pt / 行距1.5 / 打印A4边距

### 出题助手 🚧 v2

**架构（6个新文件）**
```
lib/routingTree.ts          —— 7层路由树，3学段×3学科全量题型+子题型
lib/difficultyFramework.ts  —— 通用难度框架 + 1-12年级语言控制表
lib/ruleSchema.ts           —— 统一RuleSchema模板 + 规则注册表 + 严格降级
lib/questionRules.ts        —— 已注册4条初中语文规则
lib/questionTypes.ts        —— 统一导出层
lib/prompts.ts              —— 模块化Prompt组装器（含generateQuestionsPrompt）
```

**规则实现**
- [x] 现代文阅读（选文800-1200字/4-5题/5考点维度）
- [x] 文言文阅读（课外150-300字/3-4题）
- [x] 古诗词鉴赏（课外唐宋诗词/2-3题）
- [x] 病句辨析（搭配不当/成分残缺/句式杂糅/表意不明/不合逻辑，已跑通）
- [ ] 字音字形、成语、名著、综合性学习、作文（空路由）

**通用框架（全学科复用）**
- UNIVERSAL_DIFFICULTY：容易/中等/困难的知识点深度+隐蔽度+材料+思维层级
- GRADE_LANGUAGE：1-12年级句子长度/词汇/语境/句法
- 严格降级：未注册规则→"该题型暂未完成"，不自由发挥

**UI**
- 级联下拉：年级→自动判定学段→加载可选题型→已注册标✓
- 科目/难度/题型下拉框，知识点选填，数量输入

### 未开始
- [ ] 评语助手（仍是 mock）
- [ ] 通知模板（仍是 mock）
- [ ] 初中语文剩余5种题型规则
- [ ] 小学/高中 全学科规则

### 下一步
1. 验证病句辨析的年级感+难度感是否成立（批量生成对比）
2. 病句稳定后→复制模板填字音字形、成语
3. 基础客观题跑通→阅读主观题→作文最后

## 开发约定

- 交互流程：首页 → 核心技能 → 技能页 → 输入 → 生成 → 优化/收藏/复制
- 数据存储：v1 使用 localStorage
- UI 风格：Tailwind CSS，蓝白配色，卡片式布局
- Prompt 开发原则：先打磨单个技能，再做路由和模块化
