/**
 * Giscus 评论组件占位。
 *
 * 接入步骤（实现时照做）：
 * 1. 博客仓库打开 Discussions，安装 giscus App。
 * 2. 去 https://giscus.app 生成配置，拿到 repo、repoId、category、categoryId。
 * 3. 把下面的占位 return 换成 giscus 官方的 <script> 标签注入
 *    （dangerouslySetInnerHTML）或 @giscus/react 组件。
 * 4. 评论组件只挂在文章详情页（/blog/[slug]）。
 */
export function GiscusComments() {
  return (
    <section className="border-t border-stone-200 pt-6 dark:border-stone-800">
      <p className="text-sm text-stone-400 dark:text-stone-500">评论区待接入（Giscus，TODO）。</p>
    </section>
  )
}
