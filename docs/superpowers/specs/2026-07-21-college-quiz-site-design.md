# 大学生刷题网站 — v1 设计文档

- 日期：2026-07-21
- 状态：已确认（方案 A：纯客户端刷题）
- 作者：用户 + Claude

## 1. 目标与范围

为大学生提供一个**期末复习刷题**的网站。v1 聚焦最小可用闭环：

> 点"开始刷题" → 按题库顺序一题一题过 → 每题作答后提交看解析 → 点"下一题" → 退出自动保存进度 → 下次进来接着刷。

**v1 范围内：**
- 一份平铺题库（无科目/章节分组）
- 四类题型：单选题、多选题、判断题、填空/简答题
- 示例数据（硬编码在代码里），题库导入功能**后置**
- 进度用浏览器 localStorage 保存，无登录、无后端、无数据库

**v1 范围外（后续迭代）：**
- 题库导入（Excel/CSV/JSON 上传、后台手动录入）
- 科目/章节分组
- 随机抽题、模拟考试、限时
- 用户账号、云端进度同步
- 填空/简答自动判分

## 2. 架构

方案 A：**纯客户端应用**。
- 题库作为静态 TypeScript 模块直接 `import`，不通过任何 API。
- 全部交互页面使用 React client component。
- 进度读写封装在 localStorage hook 中。
- 无 `app/api` 路由、无数据库、可纯静态部署。

技术栈沿用项目现有脚手架：Next.js 16 + React 19 + Tailwind CSS 4 + TypeScript。

> 实现前注意：本项目 `AGENTS.md` 指明这是"非你所知"的 Next.js 版本，写代码前需先读 `node_modules/next/dist/docs/` 中相关指南，并留意弃用提示。

## 3. 数据模型

题库定义在 `lib/questions.ts`：

```ts
export type QuestionType = 'single' | 'multiple' | 'judge' | 'fill'

export interface Question {
  id: string
  type: QuestionType
  stem: string                 // 题干
  options?: string[]           // 单选/多选/判断的选项；判断用 ['正确', '错误']
  answer: string | string[]    // 标准答案
  explanation?: string         // 解析
}
```

字段约定：
- `answer`：`single` / `judge` 为单值字符串；`multiple` 为字符串数组（需全选对）；`fill` 为可接受答案数组（支持多种写法）。
- `options`：`fill` 题型不设置。

## 4. 填空/简答判分规则（设计决策）

自动判分不可靠，v1 采用：
- 提交后**直接显示参考答案与解析**，**不自动判对/错**，由用户自行对照。
- 该题标记为"已做"并计入进度，但**不进入错题本**、**不计入正确率统计**。

这是 v1 最简且最诚实的处理，自动判分留待后续迭代。

## 5. 进度模型

定义在 `lib/progress.ts`，持久化到 localStorage（key 如 `quiz-progress-v1`）：

```ts
export interface UserAnswer {
  questionId: string
  type: QuestionType
  value: string | string[]    // 用户的作答
  correct: boolean | null     // 自动判分型为 boolean；填空/简答为 null
}

export interface Progress {
  currentIndex: number                    // 当前刷到第几题（0 基）
  answers: Record<string, UserAnswer>     // questionId -> 作答
  wrongIds: string[]                       // 答错的题 id（仅自动判分型）
  updatedAt: number
}
```

- 首页读取 `Progress`，存在且未完成则显示"继续刷题"，并显示"已做 X / 共 Y"。
- 完成的判定：`currentIndex >= questions.length`。

## 6. 页面与组件

| 文件 | 职责 |
|------|------|
| `app/page.tsx` | 首页：开始/继续按钮 + 进度展示 + 重置进度 |
| `app/practice/page.tsx` | 刷题页：按 `currentIndex` 取题，渲染 `QuestionCard` |
| `components/QuestionCard.tsx` | 按题型渲染（单选/多选/判断用选项按钮，填空用输入框）+ 提交/下一题 |
| `lib/questions.ts` | 示例题库数据 + 类型定义 |
| `lib/grading.ts` | 自动判分函数（单选/多选/判断） |
| `lib/useProgress.ts` | 进度读写 hook（封装 localStorage） |

组件边界：
- `QuestionCard` 只负责"渲染一道题 + 收集作答 + 提交后展示结果"，通过 props 接收题目与回调节点（onSubmit / onNext）。
- `useProgress` 只负责进度读写，不关心 UI。
- `grading` 是纯函数，输入（题目, 用户作答）输出是否答对。

## 7. 刷题闭环（数据流）

1. 首页点"开始/继续" → 进入 `app/practice/page.tsx`。
2. 按 `currentIndex` 从题库取当前题，渲染 `QuestionCard`。
3. 用户作答 → 点"提交"：
   - 自动判分型：调用 `grading` 判分，展示对错 + 标准答案 + 解析；错的写入 `wrongIds`。
   - 填空/简答：展示参考答案 + 解析，不自判。
4. 点"下一题" → `currentIndex++`，写入 localStorage。
5. 若 `currentIndex >= 总题数` → 显示小结（自动判分型正确率、错题数），可"重新开始"。
6. 中途刷新/退出：进度已在每次提交/下一题时落盘，重新进入自动续刷。

## 8. 异常处理

- **题库为空**：首页提示"暂无题目"，不进入刷题页。
- **localStorage 解析失败/损坏**：忽略坏数据，重置为初始进度（`currentIndex: 0`，空记录）。
- **进度越界**（如题库被替换后 `currentIndex` 超出范围）：clamp 到有效区间。

## 9. 示例数据

在 `lib/questions.ts` 放置 **10–15 道**覆盖四种题型的题目（混合学校科目风格，如高数、英语、计算机基础），仅用于跑通闭环。后续导入真实题库时整体替换该文件。

## 10. 验证方式

`pnpm dev` 手动走查，覆盖：
- 开始 → 逐题提交看解析 → 下一题
- 中途退出 → 重新进入可续刷（进度正确）
- 自动判分型答错进入错题、影响正确率
- 填空/简答显示参考答案、不计入正确率
- 刷完显示小结 → 重置后可重新开始
- 题库为空时首页提示

v1 不写自动化测试（范围所限）。
