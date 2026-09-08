import type { MetadataRoute } from 'next'
import { getAllBlogPosts, getAllBlogTags, getAllNotes } from '@/lib/content'
import { siteConfig } from '@/site.config'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/notes`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/blog/archives`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/blog/tags`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/projects`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/links`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ]

  const blogRoutes: MetadataRoute.Sitemap = getAllBlogPosts()
    .filter((post) => !post.draft)
    .map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updatedDate || post.date),
      changeFrequency: 'monthly',
      priority: 0.8,
    }))

  const noteRoutes: MetadataRoute.Sitemap = getAllNotes()
    .filter((note) => !note.draft)
    .map((note) => ({
      url: `${baseUrl}/notes/${note.slug}`,
      lastModified: new Date(note.date),
      changeFrequency: 'monthly',
      priority: 0.6,
    }))

  const tagRoutes: MetadataRoute.Sitemap = getAllBlogTags().map(({ tag }) => ({
    url: `${baseUrl}/blog/tags/${encodeURIComponent(tag)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.5,
  }))

  return [...staticRoutes, ...blogRoutes, ...noteRoutes, ...tagRoutes]
}
