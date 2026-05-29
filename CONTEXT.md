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

## 当前状态（2026-05-29）

### 已完成

- [x] 项目初始化，Git 仓库，已推送 GitHub
- [x] 侧边栏 + 全局 CSS / 8 个页面
- [x] 所有技能页：生成→继续优化→收藏→复制，完整交互闭环
- [x] 详情页、资产库、首页最近工作（读 localStorage，限6条）
- [x] DeepSeek API 接入（/api/ai 中转，key 在 .env.local）
- [x] 备课助手已接真实 API，其余技能页仍为 mock
- [x] 大纲级 prompt 架构设计（五层结构 + SkillOptions 接口预留）
- [x] `prepareLessonPrompt` 按架构重写：通用规则 + 语文学科 + 学段 + 参数占位 + few-shot（《草船借箭》）
- [x] prompt 强制要求直接输出，禁止开场白/聊天式开头

### 下一步（按优先级）

**第一阶段：打磨备课助手 prompt**
- [ ] 试生成《铁杵成针》《草船借箭》等，反馈效果
- [ ] 迭代 prompt 内容（学科层、学段层、few-shot 示例）
- [ ] 调至满意后，积累一套"好教案"标准

**第二阶段：接入其他技能**
- [ ] 出题助手、评语助手、通知模板替换 mock 为真实 API
- [ ] 各自写好对应的 prompt

**第三阶段：路由系统**
- [ ] 实现课程解析器（用户输入→学科/年级/课型识别）
- [ ] 学科 Prompt 模块化（语文/数学/英语独立）
- [ ] 动态拼接

**第四阶段：工作流**
- [ ] 自审 + 优化 + 多模式输出（日常/优质/公开课）

## 开发约定

- 交互流程：首页 → 核心技能 → 技能页 → 输入 → 生成 → 优化/收藏/复制
- 数据存储：v1 使用 localStorage
- UI 风格：Tailwind CSS，蓝白配色，卡片式布局
- Prompt 开发原则：先打磨单个技能，再做路由和模块化
