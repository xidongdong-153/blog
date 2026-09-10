export interface FriendLinkItem {
  id?: number
  name: string
  description: string
  url: string
  avatarUrl?: string
}

export interface ApplyFriendLinkInput {
  nickname: string
  siteName: string
  siteUrl: string
  email: string
  avatarUrl?: string
  description: string
  hasAddedUs?: boolean
}

export interface ApplyFriendLinkResult {
  success: boolean
  message: string
}

export interface FriendReviewRecordDto {
  id: number
  siteName: string
  siteUrl: string
  description: string
  avatarUrl: string | null
  nickname: string
  email: string
  hasAddedUs: boolean
  status: string
  createdAt: Date
}

export interface ReviewFriendLinkInput {
  token: string
  action: 'approve' | 'reject'
}

export interface ReviewFriendLinkResult {
  success: boolean
  message: string
  action: 'approve' | 'reject'
}
