# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

独立开发者和技术爱好者，在碎片时间浏览技术博客获取灵感和思路。典型场景：通勤路上用手机扫一篇笔记，或在工位上用桌面浏览器精读一篇长文。

## Product Purpose

喜东东的个人技术沉淀和成长记录。文章是经过整理的深度技术输出，笔记是日常碎片化的想法和实践记录。两种内容深度不同，服务同一个目的：把学到的东西写下来，让思考可追溯。

## Positioning

一个人的技术写作空间，不追求流量和社区规模。区分于聚合技术平台（掘金、知乎），这里只有一个作者的视角和节奏，内容完全受作者控制，不受推荐算法干扰。

## Operating Context

作者使用 TypeScript 技术栈，偏好 Next.js + React。文章和笔记由仓库内容文件管理，动态功能通过应用内服务端模块与 libSQL/Turso 数据库提供。博客同时承载文章、笔记、项目展示、友链和个人简介。

## Capabilities and Constraints

- Next.js App Router，开发端口 4400，页面包含静态内容与动态服务
- MDX 内容管理，支持 KaTeX 数学公式和代码高亮
- 登录、评论、友链申请、AI 摘要和访客状态由服务端模块提供
- 浏览器内搜索、RSS 等功能的实现状态统一见[功能状态表](.trellis/spec/frontend/feature-status.md)，不在这里维护第二份清单

## Brand Commitments

- 站点名称：喜东东小站
- 中文优先
- 保留暖色背景、衬线标题与技术手记风格，具体规则见[设计规范](DESIGN.md)

## Evidence on Hand

- 真实内容存放在 content/blog/ 和 content/notes/
- 个人经历和技能信息在 src/profile.config.ts
- 已有访客统计与实时在线能力；是否有实际数据取决于当前环境，不据此推断访问量或用户规模

## Product Principles

1. 内容第一：一切 UI 决策为阅读体验服务，不让界面抢内容的注意力
2. 简洁克制：能用留白解决的不加装饰，能用文字传达的不加图标
3. 可维护性：单人维护的博客，技术选型和结构设计要对得起一个人的精力
4. 诚实呈现：不编造用户评价、不夸大项目数据、内容和事实一致
