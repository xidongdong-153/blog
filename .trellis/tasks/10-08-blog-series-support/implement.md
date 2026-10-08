# 执行计划: 博客文章系列与专栏聚合 (方案B)

## 实施顺序图

```mermaid
%%{init: {"theme": "dark"}}%%
flowchart LR
    Step1["阶段 1: 数据层与专栏定义\n(series.ts & content.ts)"]
    Step2["阶段 2: 专栏详情页路由\n(/blog/series/[id])"]
    Step3["阶段 3: 文章列表页精选卡片\n(SeriesBanner 组件)"]
    Step4["阶段 4: 文章正文导轨组件\n(SeriesPaginator 组件)"]
    Step5["阶段 5: 项目页关联与 Sitemap\n(projects & sitemap.ts)"]
    Step6["阶段 6: 样例验证与质量门核验\n(Typecheck / Lint / Format)"]

    Step1 --> Step2 --> Step3 --> Step4 --> Step5 --> Step6
```

## 实施任务清单

### 阶段 1: 数据层与专栏注册表

- [x] 1.1 创建 `src/lib/series.ts`：
  - 定义 `SeriesDefinition`、`SeriesStatus` 接口。
  - 注册初始专栏元信息 `pi-agent-desktop`（《从零使用 Pi SDK 构建个人 Agent Desktop》）。
- [x] 1.2 更新 `src/lib/content.ts`：
  - 在 `BlogPost` 接口增加可选的 `series?: { id: string; order: number }`。
  - 扩展 frontmatter 解析逻辑，安全提取 `series` 字段。
  - 实现专栏数据读取辅助函数：`getAllSeries()`、`getSeriesDetail(id)`、`getSeriesNav(slug)`。
- [x] 1.3 编写或更新单元测试验证数据解析与排序逻辑。

### 阶段 2: 专栏聚合主页路由

- [x] 2.1 创建 `src/app/(site)/blog/series/[id]/page.tsx`：
  - 配置 `generateStaticParams()` 静态预渲染。
  - 渲染专栏 Hero 信息区（标题、简介、连载状态徽标、GitHub 仓库外链、篇数统计）。
  - 渲染章节目录大纲时间轴（章节序号、篇名、摘要、日期、用时、阅读链接）。
  - 处理不存在的 series id（404 notFound）。

### 阶段 3: 文章列表页精选专栏卡片

- [x] 3.1 创建组件 `src/app/(site)/_components/blog/series-banner.tsx`：
  - 采用站点设计系统风格：暖色底、精密边框、高光点缀、等宽字序。
  - 展示专栏状态、标题、简介与一键直达专栏按钮。
- [x] 3.2 在 `src/app/(site)/blog/page.tsx` 引入并在顶部渲染该专栏卡片（当存在有效专栏时展示）。

### 阶段 4: 文章正文页系列阅读导轨

- [x] 4.1 创建组件 `src/app/(site)/_components/blog/series-paginator.tsx`：
  - 展示当前章节进度（第 X / Y 讲）、返回专栏目录按钮。
  - 双栏「上一讲 / 下一讲」卡片。
- [x] 4.2 在 `src/app/(site)/blog/[slug]/page.tsx` 中嵌入：
  - 顶部元信息处增加专栏归属徽标与讲次提示。
  - 正文末尾嵌入 `SeriesPaginator`。

### 阶段 5: 项目页关联与站点地图收录

- [x] 5.1 修改 `src/app/(site)/projects/page.tsx`，在对应项目卡片添加「系列实战教程 →」外链或内链。
- [x] 5.2 修改 `src/app/sitemap.ts`，加入专栏动态路由页面 `/blog/series/${id}`。

### 阶段 6: 质量验证与文档

- [x] 6.1 运行质量门检查：
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm format:check`
- [x] 6.2 更新 `.trellis/spec/frontend/feature-status.md` 功能状态表。

## 验证命令与标准

```bash
# 1. 类型检查
pnpm typecheck

# 2. 代码规范与 Lint
pnpm lint

# 3. 代码格式化校验
pnpm format:check

# 4. 构建验证（确保静态路由 generateStaticParams 与渲染零报错）
pnpm build
```
