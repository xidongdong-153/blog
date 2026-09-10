export type CommentSortOrder = 'default' | 'newest' | 'oldest'

export interface CommentAuthor {
  id: string
  name: string
  image: string | null
  providers: string[]
  isOwner: boolean
}

export interface CommentReplyView {
  id: number
  parentId: number
  replyToId: number | null
  replyToUser: {
    id: string
    name: string
  } | null
  author: CommentAuthor
  content: string
  isPinned: boolean
  deleted: boolean
  createdAt: string
  updatedAt: string
}

export interface CommentItemView {
  id: number
  parentId: null
  replyToId: null
  author: CommentAuthor
  content: string
  isPinned: boolean
  deleted: boolean
  createdAt: string
  updatedAt: string
  replies: CommentReplyView[]
}

export interface CommentsResult {
  targetKey: string
  totalCount: number
  comments: CommentItemView[]
  isOwner: boolean
}

export interface CommentDeletePreview {
  id: number
  articleTitle: string
  articleSlug: string
  authorName: string
  contentSnippet: string
  createdAt: string
}

export interface CreateCommentInput {
  slug: string
  userId: string
  userEmail: string
  userName: string
  content: string
  replyToId?: number | null
}

export interface CreateCommentResult {
  id: number
  parentId: number | null
}

export interface TogglePinResult {
  id: number
  isPinned: boolean
}

export interface DeleteCommentResult {
  success: boolean
}
