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

作者使用 TypeScript 技术栈，偏好 Next.js + React。内容用 MDX 文件管理，不依赖数据库或后端服务。博客同时承载文章、笔记、项目展示、友链和个人简介。

## Capabilities and Constraints

- 静态内容站点，无数据库、无后端、无用户登录
- MDX 内容管理，支持 KaTeX 数学公式和代码高亮
- App Router 架构，开发端口 4400
- RSS、搜索、评论、OG 图等功能尚未实现

## Brand Commitments

- 站点名称：喜东东的博客
- 中文优先
- 视觉风格简洁克制，不用花哨装饰

## Evidence on Hand

- 真实内容存放在 content/blog/ 和 content/notes/
- 个人经历和技能信息在 src/profile.config.ts
- 无真实用户数据、无流量统计

## Product Principles

1. 内容第一：一切 UI 决策为阅读体验服务，不让界面抢内容的注意力
2. 简洁克制：能用留白解决的不加装饰，能用文字传达的不加图标
3. 可维护性：单人维护的博客，技术选型和结构设计要对得起一个人的精力
4. 诚实呈现：不编造用户评价、不夸大项目数据、内容和事实一致
