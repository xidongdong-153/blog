/* eslint-disable test/no-import-node-test */

import assert from 'node:assert/strict'
import test from 'node:test'
import { eq } from 'drizzle-orm'
import { db } from '@/server/infra/db/client'
import { account, user } from '@/server/infra/db/schema/auth'
import { comments } from '@/server/infra/db/schema/comments'
import {
  CommentServiceError,
  confirmDeleteCommentByToken,
  createComment,
  getCommentDeletePreviewByToken,
  getCommentsBySlug,
  softDeleteCommentByOwner,
  togglePinComment,
} from './comments.service'

const TEST_SLUG = '20260615-hello-blog'
const TEST_USER_ID = 'test-user-service-01'
const TEST_ADMIN_USER_ID = 'test-admin-service-01'
const ADMIN_EMAIL = 'admin-service@example.com'

test('评论 Service 综合测试', async (t) => {
  const originalAdmin = process.env.ADMIN_EMAIL
  process.env.ADMIN_EMAIL = ADMIN_EMAIL

  // 初始化测试用户
  await db.delete(comments).where(eq(comments.targetKey, TEST_SLUG))
  await db.delete(account).where(eq(account.userId, TEST_USER_ID))
  await db.delete(user).where(eq(user.id, TEST_USER_ID))
  await db.delete(user).where(eq(user.id, TEST_ADMIN_USER_ID))

  await db.insert(user).values([
    {
      id: TEST_USER_ID,
      name: '测试访客',
      email: 'visitor@example.com',
      image: 'https://example.com/avatar.png',
    },
    {
      id: TEST_ADMIN_USER_ID,
      name: '站长本人',
      email: ADMIN_EMAIL,
      image: null,
    },
  ])

  await db.insert(account).values({
    id: 'test-account-01',
    accountId: 'gh-12345',
    providerId: 'github',
    userId: TEST_USER_ID,
  })

  t.after(async () => {
    process.env.ADMIN_EMAIL = originalAdmin
    await db.delete(comments).where(eq(comments.targetKey, TEST_SLUG))
    await db.delete(account).where(eq(account.userId, TEST_USER_ID))
    await db.delete(user).where(eq(user.id, TEST_USER_ID))
    await db.delete(user).where(eq(user.id, TEST_ADMIN_USER_ID))
  })

  await t.test('字数限制与不存在的文章校验', async () => {
    // 1. 空内容
    await assert.rejects(
      () =>
        createComment({
          slug: TEST_SLUG,
          userId: TEST_USER_ID,
          userEmail: 'visitor@example.com',
          userName: '测试访客',
          content: '   ',
        }),
      (err: unknown) => err instanceof CommentServiceError && err.statusCode === 400,
    )

    // 2. 超长 1000 字
    const superLong = 'a'.repeat(1001)
    await assert.rejects(
      () =>
        createComment({
          slug: TEST_SLUG,
          userId: TEST_USER_ID,
          userEmail: 'visitor@example.com',
          userName: '测试访客',
          content: superLong,
        }),
      (err: unknown) => err instanceof CommentServiceError && err.statusCode === 400,
    )

    // 3. 不存在的 slug
    await assert.rejects(
      () =>
        createComment({
          slug: 'non-existing-slug-xyz',
          userId: TEST_USER_ID,
          userEmail: 'visitor@example.com',
          userName: '测试访客',
          content: '合法的评论内容',
        }),
      (err: unknown) => err instanceof CommentServiceError && err.statusCode === 404,
    )
  })

  let topCommentId1: number
  let topCommentId2: number
  let replyCommentId1: number
  let replyCommentId2: number

  await t.test('发布顶级评论与单层平铺回复', async () => {
    // 发布两条顶级评论
    const c1 = await createComment({
      slug: TEST_SLUG,
      userId: TEST_USER_ID,
      userEmail: 'visitor@example.com',
      userName: '测试访客',
      content: '第一条讨论',
    })
    topCommentId1 = c1.id
    assert.equal(c1.parentId, null)

    // 延时保证时间戳区别
    await new Promise((r) => setTimeout(r, 10))

    const c2 = await createComment({
      slug: TEST_SLUG,
      userId: TEST_ADMIN_USER_ID,
      userEmail: ADMIN_EMAIL,
      userName: '站长本人',
      content: '第二条讨论',
    })
    topCommentId2 = c2.id
    assert.equal(c2.parentId, null)

    // 回复顶级评论 c1
    const r1 = await createComment({
      slug: TEST_SLUG,
      userId: TEST_ADMIN_USER_ID,
      userEmail: ADMIN_EMAIL,
      userName: '站长本人',
      content: '回复顶级评论 c1',
      replyToId: topCommentId1,
    })
    replyCommentId1 = r1.id
    assert.equal(r1.parentId, topCommentId1)

    // 回复回复 r1（核心规则：平铺单层，parentId 仍为 topCommentId1，replyToId 记录 r1）
    const r2 = await createComment({
      slug: TEST_SLUG,
      userId: TEST_USER_ID,
      userEmail: 'visitor@example.com',
      userName: '测试访客',
      content: '回复回复 r1',
      replyToId: replyCommentId1,
    })
    replyCommentId2 = r2.id
    assert.equal(r2.parentId, topCommentId1)

    // 检查树形查询结果
    const tree = await getCommentsBySlug(TEST_SLUG, 'default', ADMIN_EMAIL)
    assert.equal(tree.isOwner, true)
    assert.equal(tree.totalCount, 4)

    const targetTree = tree.comments.find((c) => c.id === topCommentId1)
    assert.ok(targetTree)
    assert.equal(targetTree.replies.length, 2)
    assert.equal(targetTree.replies[0].id, replyCommentId1)
    assert.equal(targetTree.replies[0].replyToId, null) // 回复顶级评论时不带额外 replyToUser
    assert.equal(targetTree.replies[1].id, replyCommentId2)
    assert.equal(targetTree.replies[1].replyToId, replyCommentId1)
    assert.equal(targetTree.replies[1].replyToUser?.name, '站长本人')
    assert.deepEqual(targetTree.author.providers, ['github'])
  })

  await t.test('置顶与排序规则', async () => {
    // 只有站长能置顶顶级评论
    await assert.rejects(
      () => togglePinComment(topCommentId1, false),
      (err: unknown) => err instanceof CommentServiceError && err.statusCode === 403,
    )

    // 回复不能置顶
    await assert.rejects(
      () => togglePinComment(replyCommentId1, true),
      (err: unknown) => err instanceof CommentServiceError && err.statusCode === 400,
    )

    // 置顶 topCommentId1（较早的一条）
    const pinRes = await togglePinComment(topCommentId1, true)
    assert.equal(pinRes.isPinned, true)

    // default 排序：置顶的 topCommentId1 排在最前面
    const defaultSorted = await getCommentsBySlug(TEST_SLUG, 'default')
    assert.equal(defaultSorted.comments[0].id, topCommentId1)
    assert.equal(defaultSorted.comments[1].id, topCommentId2)

    // newest 排序：忽略置顶，最新创建的 topCommentId2 排在最前面
    const newestSorted = await getCommentsBySlug(TEST_SLUG, 'newest')
    assert.equal(newestSorted.comments[0].id, topCommentId2)
    assert.equal(newestSorted.comments[1].id, topCommentId1)

    // oldest 排序：忽略置顶，最早创建的 topCommentId1 排在最前面
    const oldestSorted = await getCommentsBySlug(TEST_SLUG, 'oldest')
    assert.equal(oldestSorted.comments[0].id, topCommentId1)
    assert.equal(oldestSorted.comments[1].id, topCommentId2)
  })

  await t.test('站长软删除', async () => {
    // 非站长无法删除
    await assert.rejects(
      () => softDeleteCommentByOwner(replyCommentId2, false),
      (err: unknown) => err instanceof CommentServiceError && err.statusCode === 403,
    )

    // 站长软删除回复 replyCommentId2
    await softDeleteCommentByOwner(replyCommentId2, true)

    const tree = await getCommentsBySlug(TEST_SLUG, 'default')
    const targetTree = tree.comments.find((c) => c.id === topCommentId1)!
    const deletedReply = targetTree.replies.find((r) => r.id === replyCommentId2)!
    assert.equal(deletedReply.deleted, true)
    assert.equal(deletedReply.content, '')

    // 不能回复已删除的评论
    await assert.rejects(
      () =>
        createComment({
          slug: TEST_SLUG,
          userId: TEST_USER_ID,
          userEmail: 'visitor@example.com',
          userName: '测试访客',
          content: '尝试回复已删除的评论',
          replyToId: replyCommentId2,
        }),
      (err: unknown) => err instanceof CommentServiceError && err.statusCode === 400,
    )
  })

  await t.test('一次性邮件凭证删除流程', async () => {
    // 再发一条带有删除凭证的新评论
    const newComment = await createComment({
      slug: TEST_SLUG,
      userId: TEST_USER_ID,
      userEmail: 'visitor@example.com',
      userName: '测试访客',
      content: '待测试邮件删除的评论',
    })

    // 获取数据库中保存的 hash，反向验证凭证逻辑
    const row = await db.select().from(comments).where(eq(comments.id, newComment.id)).get()
    assert.ok(row?.deleteTokenHash)

    // 使用伪造或无效凭证查询预览
    await assert.rejects(
      () => getCommentDeletePreviewByToken('invalid-token-12345'),
      (err: unknown) => err instanceof CommentServiceError && err.statusCode === 404,
    )

    // 模拟确认删除（直接使用 hash 对应的数据库状态校验）
    // 先手动插入一条测试已知明文 token 的记录
    const crypto = await import('node:crypto')
    const rawToken = 'my-secret-test-token-abcdef123456'
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    const [tokenComment] = await db
      .insert(comments)
      .values({
        targetKey: TEST_SLUG,
        userId: TEST_USER_ID,
        content: '通过已知 token 删除的内容',
        isPinned: false,
        deleteTokenHash: tokenHash,
        tokenExpiresAt: new Date(Date.now() + 100000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: comments.id })

    // 1. GET 预览（只读，不应删除）
    const preview = await getCommentDeletePreviewByToken(rawToken)
    assert.equal(preview.id, tokenComment.id)
    assert.equal(preview.contentSnippet, '通过已知 token 删除的内容')

    const stillExists = await db.select().from(comments).where(eq(comments.id, tokenComment.id)).get()
    assert.equal(stillExists?.deletedAt, null)

    // 2. POST 确认软删除
    const deleteRes = await confirmDeleteCommentByToken(rawToken)
    assert.equal(deleteRes.success, true)

    const afterDelete = await db.select().from(comments).where(eq(comments.id, tokenComment.id)).get()
    assert.ok(afterDelete?.deletedAt)
    assert.equal(afterDelete?.content, '')
    assert.equal(afterDelete?.deleteTokenHash, null)

    // 3. 再次使用相同 token 应被拒绝
    await assert.rejects(
      () => confirmDeleteCommentByToken(rawToken),
      (err: unknown) => err instanceof CommentServiceError && err.statusCode === 404,
    )

    // 4. 过期边界与无有效 expiresAt 凭证拒绝确认删除
    const noExpiryToken = 'token-without-expiry-12345678'
    const noExpiryHash = crypto.createHash('sha256').update(noExpiryToken).digest('hex')
    await db.insert(comments).values({
      targetKey: TEST_SLUG,
      userId: TEST_USER_ID,
      content: '无有效过期时间的评论',
      isPinned: false,
      deleteTokenHash: noExpiryHash,
      tokenExpiresAt: null, // 无有效 expiresAt
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await assert.rejects(
      () => getCommentDeletePreviewByToken(noExpiryToken),
      (err: unknown) => err instanceof CommentServiceError && err.statusCode === 400,
    )
    await assert.rejects(
      () => confirmDeleteCommentByToken(noExpiryToken),
      (err: unknown) => err instanceof CommentServiceError && err.statusCode === 400,
    )

    const expiredToken = 'token-already-expired-12345678'
    const expiredHash = crypto.createHash('sha256').update(expiredToken).digest('hex')
    await db.insert(comments).values({
      targetKey: TEST_SLUG,
      userId: TEST_USER_ID,
      content: '已过期的凭证内容',
      isPinned: false,
      deleteTokenHash: expiredHash,
      tokenExpiresAt: new Date(Date.now() - 10000), // 已过期
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await assert.rejects(
      () => getCommentDeletePreviewByToken(expiredToken),
      (err: unknown) => err instanceof CommentServiceError && err.statusCode === 400,
    )
    await assert.rejects(
      () => confirmDeleteCommentByToken(expiredToken),
      (err: unknown) => err instanceof CommentServiceError && err.statusCode === 400,
    )
  })
})
