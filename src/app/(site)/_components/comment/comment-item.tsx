'use client'

import type { CommentAuthor, CommentItemView, CommentReplyView } from '@/server/modules/comments/comments.types'
import { Pin, Reply, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { formatDate } from '@/lib/date'
import { CommentComposer } from './comment-composer'
import { GithubIcon, GoogleIcon } from './comment-icons'

interface CommentItemProps {
  comment: CommentItemView
  slug: string
  currentUserIsOwner: boolean
  isLoggedIn: boolean
  onRefresh: () => void
}

function AuthorAvatar({ author }: { author: CommentAuthor }) {
  const fallbackLetter = (author.name || 'U').charAt(0).toUpperCase()

  return (
    <div className="relative size-8 shrink-0">
      <div className="flex size-full items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-foreground">
        {author.image ? (
          // eslint-disable-next-line next/no-img-element
          <img src={author.image} alt={author.name} className="size-full object-cover" />
        ) : (
          <span>{fallbackLetter}</span>
        )}
      </div>

      {author.providers && author.providers.length > 0 && (
        <div className="absolute -bottom-1 -right-1 flex items-center gap-0.5 rounded-full border border-background bg-card p-0.5 shadow-xs">
          {author.providers.map((p) => {
            if (p === 'github') {
              return <GithubIcon key={p} className="size-2.5 text-foreground" />
            }
            if (p === 'google') {
              return <GoogleIcon key={p} className="size-2.5" />
            }
            return null
          })}
        </div>
      )}
    </div>
  )
}

/**
 * 评论条目：渲染顶级评论、平铺回复及站长管理操作。
 */
export function CommentItem({ comment, slug, currentUserIsOwner, isLoggedIn, onRefresh }: CommentItemProps) {
  const [replyingTo, setReplyingTo] = useState<{ id: number; authorName: string } | null>(null)
  const [pinning, setPinning] = useState(false)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // 站长置顶操作
  const handleTogglePin = async () => {
    if (pinning) return
    setPinning(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/comments/${comment.id}/pin`, {
        method: 'PATCH',
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || '置顶操作失败')
      }
      onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setPinning(false)
    }
  }

  // 站长软删除操作
  const handleDeleteComment = async (id: number) => {
    if (deletingId !== null) return
    setDeletingId(id)
    setActionError(null)
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || '删除操作失败')
      }
      setConfirmingDeleteId(null)
      onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div id={`comment-${comment.id}`} className="flex flex-col gap-3 py-5 first:pt-2">
      {/* 顶级评论头部 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <AuthorAvatar author={comment.author} />
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
            <span className="truncate font-medium text-foreground">{comment.author.name}</span>
            {comment.author.isOwner && <span className="font-mono text-[11px] font-medium text-primary">· 作者</span>}
            <span className="text-muted-foreground">·</span>
            <time dateTime={comment.createdAt} className="font-mono text-muted-foreground">
              {formatDate(comment.createdAt)}
            </time>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {comment.isPinned && !comment.deleted && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-amber-700 dark:text-amber-400">
              <Pin className="size-3" />
              <span>置顶</span>
            </span>
          )}

          {/* 站长管理控件 */}
          {currentUserIsOwner && !comment.deleted && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTogglePin}
                disabled={pinning}
                title={comment.isPinned ? '取消置顶' : '置顶此讨论'}
                aria-label={comment.isPinned ? '取消置顶' : '置顶此讨论'}
                className="hit-expand inline-flex size-8 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
              >
                <Pin className="size-3.5" />
              </button>

              {confirmingDeleteId === comment.id ? (
                <div className="flex items-center gap-3.5 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(comment.id)}
                    disabled={deletingId === comment.id}
                    className="group/ink hit-expand inline-flex min-h-7 min-w-8 cursor-pointer items-center justify-center text-[11px] text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                  >
                    <span className="ink-line">确认删除</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDeleteId(null)}
                    className="group/ink hit-expand inline-flex min-h-7 min-w-8 cursor-pointer items-center justify-center text-[11px] text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="ink-line">取消</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDeleteId(comment.id)}
                  disabled={deletingId === comment.id}
                  title="删除此评论"
                  aria-label="删除此评论"
                  className="hit-expand inline-flex size-8 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 顶级评论正文 */}
      <div className="text-sm leading-relaxed">
        {comment.deleted ? (
          <p className="font-sans italic text-muted-foreground/70">该评论已被站长删除</p>
        ) : (
          <p className="text-foreground break-words whitespace-pre-wrap">{comment.content}</p>
        )}
      </div>

      {/* 顶级评论操作行 */}
      {!comment.deleted && isLoggedIn && (
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() =>
              setReplyingTo(replyingTo?.id === comment.id ? null : { id: comment.id, authorName: comment.author.name })
            }
            className="group/ink hit-expand inline-flex min-h-7 min-w-8 cursor-pointer items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Reply className="size-3" />
            <span className="ink-line">回复</span>
          </button>
        </div>
      )}

      {actionError && <div className="text-xs text-red-600 dark:text-red-400">{actionError}</div>}

      {/* 平铺回复列表 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 flex flex-col gap-3 border-t border-border/40 pt-3">
          {comment.replies.map((reply: CommentReplyView) => (
            <div
              key={reply.id}
              id={`comment-${reply.id}`}
              className="flex flex-col gap-1.5 pl-3 sm:pl-4 border-l border-border/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <AuthorAvatar author={reply.author} />
                  <div className="flex min-w-0 flex-wrap items-center gap-1 text-xs">
                    <span className="truncate font-medium text-foreground">{reply.author.name}</span>
                    {reply.author.isOwner && (
                      <span className="font-mono text-[10px] font-medium text-primary">· 作者</span>
                    )}
                    {reply.replyToUser && (
                      <span className="min-w-0 font-mono text-muted-foreground [overflow-wrap:anywhere]">
                        回复 <span className="font-medium text-foreground">@{reply.replyToUser.name}</span>:
                      </span>
                    )}
                    <span className="text-muted-foreground">·</span>
                    <time dateTime={reply.createdAt} className="font-mono text-[11px] text-muted-foreground">
                      {formatDate(reply.createdAt)}
                    </time>
                  </div>
                </div>

                {currentUserIsOwner && !reply.deleted && (
                  <div className="shrink-0">
                    {confirmingDeleteId === reply.id ? (
                      <div className="flex items-center gap-3.5 font-mono text-xs">
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(reply.id)}
                          disabled={deletingId === reply.id}
                          className="group/ink hit-expand inline-flex min-h-7 min-w-8 cursor-pointer items-center justify-center text-[10px] text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                        >
                          <span className="ink-line">确认删除</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(null)}
                          className="group/ink hit-expand inline-flex min-h-7 min-w-8 cursor-pointer items-center justify-center text-[10px] text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          <span className="ink-line">取消</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingDeleteId(reply.id)}
                        disabled={deletingId === reply.id}
                        title="删除此回复"
                        aria-label="删除此回复"
                        className="hit-expand inline-flex size-8 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="pl-10 text-xs leading-relaxed sm:text-sm">
                {reply.deleted ? (
                  <p className="italic text-muted-foreground/70">该评论已被站长删除</p>
                ) : (
                  <p className="text-foreground break-words whitespace-pre-wrap">{reply.content}</p>
                )}
              </div>

              {!reply.deleted && isLoggedIn && (
                <div className="pl-10 pt-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setReplyingTo(
                        replyingTo?.id === reply.id ? null : { id: reply.id, authorName: reply.author.name },
                      )
                    }
                    className="group/ink hit-expand inline-flex min-h-7 min-w-8 cursor-pointer items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <Reply className="size-2.5" />
                    <span className="ink-line">回复</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 内联回复输入框 */}
      {replyingTo && (
        <div className="mt-2 border-l border-primary/40 pl-4">
          <CommentComposer
            slug={slug}
            replyToId={replyingTo.id}
            replyToAuthorName={replyingTo.authorName}
            autoFocus
            onSuccess={() => {
              setReplyingTo(null)
              onRefresh()
            }}
            onCancel={() => setReplyingTo(null)}
          />
        </div>
      )}
    </div>
  )
}
