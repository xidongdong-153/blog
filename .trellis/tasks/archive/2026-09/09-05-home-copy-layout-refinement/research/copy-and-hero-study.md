# 首页文案与 Hero 信息设计研究

## 研究目标

为首页文案和 Hero 顶部信息设计找到可执行的语言与视觉原则，避免直接复制电影台词或套用常见 AI 站点模板。

## 当前页面证据

本地首页 `http://localhost:4400/` 的语义结构显示：

- Hero 顶部依次出现「独立开发 · 全栈 · 智能体」「上海」「联系我」。
- 身份标签与联系入口均使用绿色状态点，联系入口还有 `ping` 动画。
- Hero 主标题、tagline、quote 连续出现，三者都在表达“写代码、做工具、与 AI 协作”，信息重复。
- 「最近写作」「关于」「技能」在 DOM 中是标题后接内容，但 `Section` 在桌面端将其排成左右两列。

Ego Browser 已完成语义检查；截图调用因 `Page.captureScreenshot` 超时未生成文件，不影响上述 DOM 结论。

## 文案研究

搜索主题：

- 王家卫电影台词的语言结构与叙事特点
- 独立开发者中文个人网站首页文案
- Portfolio Hero 状态与身份信息设计

可借鉴的语言机制：

1. **具体而不是宏大**：用地点、时间、动作或习惯建立画面，不写抽象愿景。
2. **一句事实，一次转折**：短句之间存在轻微反差，让读者自行补全含义。
3. **第一人称观察**：像个人笔记，不像公司宣传页。
4. **保留空白**：主标题只负责情绪或记忆点，tagline 再交代职业事实，不让每一行都解释完整。
5. **数字谨慎使用**：电影对白中的精确数字能制造记忆，但本站没有适合 Hero 的真实时间数据，不为追求风格编造数字。

不采用：

- 直接引用已有电影台词。
- 模仿「不知道从什么时候开始……」「每样东西都有期限……」等已形成固定印象的句式。
- 把开发工作强行写成爱情、错过、孤独等情感隐喻。
- 使用「热爱技术」「探索可能」「改变世界」等个人站模板文案。

参考来源：

- 王家卫电影台词语言研究摘要：http://www.knowcat.cn/p/20260128/2775292.html
- 王家卫导演与美学梳理：https://yololab.net/archives/wong-kar-wai-director-profile-aesthetics
- 《东邪西毒》叙事与时间主题讨论：https://movie.douban.com/review/17109291/
- 中文独立站简洁设计讨论：https://guanqr.com/tech/website/simplicity-is-the-ultimate-sophistication/

这些来源只用于提炼结构特征，不把原句写进站点。

## 个人主页短句补充研究

用户进一步明确：tagline 不必与开发相关，要表达「想把一件事做好」的个人状态，并且需要更像当下个人主页签名。

即刻、个人简介与搜索结果中的有效模式是：

- 句子尽量短，通常在 15 字左右完成表达。
- 用口语和轻微反差建立记忆点，不堆意象。
- 「小事 / 很久」「野心 / 漂亮」「有用 / 认真」比“远方、答案、脚下的路”等泛化意象更当代。
- 不直接复制来源不清楚的网络签名；吸收结构后重新写。

候选方向将从「励志式做好一件事」改为「个人主页状态式表达」。进一步检索后，中文网络签名容易落入自我鼓励文案；更适合本站的是已经进入互联网与设计文化的短句：

- Unix 哲学由 Doug McIlroy 总结为「Write programs that do one thing and do it well.」，可缩写为 `Do one thing well.`。来源：https://en.wikipedia.org/wiki/Unix_philosophy
- Dieter Rams 的第十条好设计原则使用 `Less, but better.`，强调减少无关内容并把必要部分做好。来源：https://www.vitsoe.com/us/about/good-design

这两句有明确来源。若采用，站内只使用短句本身，不伪装成原创中文金句。

参考检索：

- 即刻“做点具体的事”相关公开内容：https://m.okjike.com/originalPosts/69cf9fb025bae56612dd1adb
- Bing 个性签名检索建议：短句、反差和个人化组合，避免过时梗与不明所以的意象。

## 联盟阵营台词筛选

用户说明自己主要认同联盟阵营，但各联盟种族都玩过，因此按首页气质而非单一种族筛选。

从 Warcraft Wiki 的 `NPC quotes` 页面核对到以下原句：

- 矮人：`Keep your feet on the ground.`
- 暗夜精灵：`May the stars guide you.`、`Goddess watch over you.`
- 人类：`Go with honor, friend.`、`Light bless you.`
- 德莱尼：`Remember the lessons of the past.`、`Favor the road traveled by few.`
- 狼人 / 吉尔尼斯人：`Keep your chin up, eh?`、`The past must not be repeated.`
- 侏儒：`Daylight's burning.`、`Hmmm, interesting.`

来源：https://warcraft.wiki.gg/wiki/NPC_quotes

适合首页的首选原为 `Keep your feet on the ground.`。用户最终选择联盟侏儒 NPC 的 `Daylight’s burning.`，页面只显示英文；其中文含义是「天光不等人」。这句比自创的“做好一件事”更像真实的游戏记忆，也为 Hero 提供了简短的行动感。

## Hero 信息设计结论

当前绿色点的问题来自语义和表现同时失真：页面并没有实时在线状态，却用了在线指示点；两处循环动画又放大了这种误导。

推荐改为**署名式元数据行**：

- 使用一条细线、短横或序号作为视觉起点，不使用发光圆点。
- 主要文本交代「独立开发者」或更具体的身份。
- 地点使用低对比度辅助文本。
- 联系入口保留为普通文本链接，通过下划线或箭头表达可点击，不伪装成在线状态。
- 整行保持无底色或极弱边框，像杂志页眉或作品署名，而不是状态徽章组。

## Section 布局结论

`Section` 应改为稳定的纵向结构：小号 Label 在上，内容区在下。这样更适合时间线、段落和技能墙三种不同内容，也能减少桌面端左栏造成的宽度浪费。

建议：

- Label 使用等宽小字、序号与短横线，建立阅读顺序。
- 内容宽度由各组件自己控制，不再通过固定 `md:min-w-36` 分栏。
- 三个 Section 使用一致的顶部间距和 Label 到内容的距离。
- 不把 Section 包成卡片，也不增加背景块。
