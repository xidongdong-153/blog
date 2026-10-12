# 实施与验证

## 执行顺序

- [x] 读取规范和当前结构，用户已批准完整方案。
- [x] 更新 origin/main，切出 `feat/ai-article-source`。
- [x] 保存 PRD、设计与执行计划，配置真实 spec manifest。
- [x] 数据/筛选 worker：来源字段、纯筛选与 URL 构造、主列表/工具栏/搜索、fixture 和测试。
- [x] 标记 worker：统一来源标记、PostCard 来源链接、详情/首页/归档/专栏显示。
- [x] 写作 worker：共享技能、Git 草稿忽略、技能结构校验。
- [x] 主代理集成，更新内容规范、搜索规范和功能状态；独立 check worker 检查。
- [x] 按序质量门及自动化测试。
- [x] 临时混合内容做桌面/移动端、明暗主题以及搜索状态验收，验证 MDX 模板构建后清理。
- [x] 隔离试写检验技能交付与覆盖边界。
- [x] 更新验收记录、任务检查项，工作区保留改动等待提交授权。

## 命令

宿主默认 Node 24；每条项目命令使用 `fnm exec --using=26.7.0`，不修改全局默认版本。

```bash
fnm exec --using=26.7.0 pnpm typecheck
fnm exec --using=26.7.0 pnpm lint
fnm exec --using=26.7.0 pnpm format:check
fnm exec --using=26.7.0 pnpm test
fnm exec --using=26.7.0 pnpm build
git diff --check
python3 ./.trellis/scripts/task.py validate 10-12-ai-article-source
python3 /Users/wuwanzhu/.agents/skills/.system/skill-creator/scripts/quick_validate.py /Users/wuwanzhu/.agents/skills/xdd-blog-writing
```

显式检查本次变更的 Trellis Markdown 格式。临时 fixture 不覆盖已有文件，清理仅自身创建的文件及空目录。浏览器验收用 ego-browser，截图与日志放临时目录。

## 检查点

- 搜索处于激活状态或非 AI 零结果时，来源入口都存在；切换不丢失 query。
- 分类眉标、工具栏和分页保留 source；客户端值导入不带 node:fs。
- draft 目录在全部读取入口不可见且 Git ignored。
- 技能默认只输出本地草稿，不写正式文章、不提交、不推送。
- 不修任务外已有问题，不重构现有摘要、专栏或页面布局。
- 提交前向用户展示改动摘要取得确认；本次实现授权不包含 commit/push/merge。

## 验证记录

- Node 26.7.0：`pnpm typecheck`、`pnpm lint`、`pnpm format:check` 按序通过。
- 最终 `pnpm test`：157 项通过，0 失败。新增读取、生产列表分页、URL 和搜索断言均通过。
- 隔离临时 SQLite 迁移通过；测试、dev 和构建均使用该数据库，未写入生产数据。
- `pnpm build`：含 15 篇临时文章及技能生成的 Map 文章通过；清理后的无内容构建再次通过。
- 浏览器：搜索词保留，全部 14 个命中切至非 AI 后为 12 个，AI 标记为 0；AI 独有关键词变为空结果且能恢复为 2 个命中。
- URL：来源切换清除 page、保留 category/sort；分类/排序/分页及文章分类眉标保留 source。未知 source 视为全部。
- 零篇非 AI 分类仍显示来源和搜索；键盘 Tab 焦点可见，Enter 能激活切换。
- 1440px 桌面与 390px 移动端、明暗主题：标记 12px，无横向溢出。首页/标签/归档/专栏保留完整集合，AI 标记数量分别为 3/2/3/1。
- 技能结构及显式格式校验通过。独立 Agent 生成双文件、运行示例；重复同名请求停止写入，两文件哈希不变。Map 稿件已通过真实 MDX 渲染与构建。
- 独立 check 最终无未解决问题。原分页测试复制顺序的缺口已改为调用页面同一生产函数。
- 15 篇临时文章和技能试写仓库已清理，未留下示例内容；浏览器已关闭、主题偏好已恢复、开发服务已停止。
- 文档相对链接、任务 manifest、`git diff --check` 均通过。测试仍输出仓库现有 Node loader/module type 提示，未调整任务外配置。
- 验收日志与截图保存于 `/tmp/xdd-blog-ai-article-qa.iUNRFl/`。

代码与技能已实现并验证。任务保持 `in_progress`，停在 Git 授权前；未提交、推送、创建 PR、合并或部署。
