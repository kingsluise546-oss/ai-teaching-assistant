# AI 教学助手 — 项目上下文

## 当前状态（2026-05-31）

### 出题系统 v2 ✅

**三学段全覆盖，41条规则全注册。**

#### 路由树（对齐国家考试真题模块）

| 学段 | 模块 | 题型数 | 规则数 | 覆盖率 |
|------|------|--------|--------|--------|
| 小学 | 积累与运用 / 阅读与理解 / 习作 | 16 | 15 | 94% |
| 初中 | 积累与运用 / 现代文阅读 / 古诗文阅读 / 整本书阅读 / 作文 | 11 | 11 | 100% |
| 高中 | 现代文阅读 / 古代诗文阅读 / 语言文字运用 / 写作 | 14 | 15 | 100% |

#### 核心技术架构

```
lib/
├── routingTree.ts         # 7层路由树 + 模块分组（小学/初中/高中 语文全量）
├── ruleSchema.ts          # 统一 RuleSchema 接口 + 注册表
├── questionRules.ts       # 41条规则（32条深度打磨 + 9条基础完成）
├── difficultyFramework.ts # 通用难度框架 + 1-12年级语言控制
├── tokenParser.ts         # 共享 TOKEN 解析核心（浏览器+验证脚本共用）
├── parser-browser.ts      # 浏览器端解析器（薄封装）
├── verification-runner.ts # 批量验证跑分器（L0/L1/L2）
├── rateLimit.ts           # API 滑动窗口限流（每 IP 15次/分钟）
├── storage.ts             # localStorage 容量保护（80条上限）
├── prompts.ts             # Prompt 组装引擎（备课/出题/评语/通知）
├── ai.ts                  # 前端 API 调用封装
└── mockData.ts            # 旧 mock 数据

app/
├── error.tsx              # 全局 Error Boundary
├── api/ai/route.ts        # DeepSeek API 中转（安全加固+限流）
└── assistant/
    ├── generate-questions/page.tsx  # 出题助手（两级联动 + 真题格式）
    ├── prepare-lesson/page.tsx      # 备课助手 ✅
    ├── write-comment/page.tsx       # 评语助手（mock，Prompt已写好）
    └── generate-notice/page.tsx     # 通知模板（mock，Prompt已写好）
```

#### 出题助手 UI

- 两级联动下拉：年级 → 科目 → 模块 → 题型
- 模块按真题分组（积累与运用/现代文阅读/古诗文阅读等）
- 已注册题型可选，未注册标"暂未开放"
- 输出格式：中高考真题标准（题号同行、选项分行、分值括号）
- 答案区：**答案与解析** 加粗 + **考点：**/**答案：**/**解析：** 格式
- Enter 键触发生成
- 默认题目数量：1

#### 关键决策

- **废弃内部 TOKEN 标记**：AI 不再输出 `[[ITEM_START]]` `[[KP:]]` 等，改用 `**考点：**` `**答案：**` `**解析：**` 人读格式
- **统一 ReactMarkdown 渲染**：题目区和答案区全部通过 ReactMarkdown，不再分两套渲染
- **作文暂不动**：小学/初中/高中作文规则已注册但未打磨
- **数学/英语路由已有，规则全空**

### 其他模块

- 备课助手 ✅ v1 完成（Prompt 已精简，按学段动态选范本）
- 评语助手 ❌ Prompt 已写，页面 mock
- 通知模板 ❌ Prompt 已写，页面 mock

### 下一步

1. 语文格式微调 — 实测几轮确保输出质量
2. 数学规则填充 — 路由已有，填规则比语文快 3 倍
3. 评语/通知接 API
4. 跑验证压质量

## 技术栈

Next.js 15 + React 19 + TypeScript + Tailwind CSS 3 + DeepSeek API

## 运行

```bash
npm run dev     # localhost:3000（如果被占会用3001/3002）
```
