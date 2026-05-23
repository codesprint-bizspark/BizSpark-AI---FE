export type SocialPlatform = 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK';
export type SocialPostType = 'TEXT' | 'IMAGE' | 'FLYER' | 'VIDEO';
export type SocialPostStatus =
    | 'DRAFT'
    | 'SCHEDULED'
    | 'PUBLISHING'
    | 'PUBLISHED'
    | 'FAILED'
    | 'CANCELLED';
export type SocialAccountStatus = 'CONNECTED' | 'EXPIRED' | 'REVOKED' | 'DISCONNECTED';
export type SocialMediaKind = 'IMAGE' | 'VIDEO' | 'THUMBNAIL';

export type SocialAccount = {
    id: string;
    businessId: string;
    platform: SocialPlatform;
    externalAccountId: string;
    externalPageId: string | null;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    tokenExpiresAt: string | null;
    scope: string | null;
    status: SocialAccountStatus;
    metadata: Record<string, unknown> | null;
    lastRefreshedAt: string | null;
    createdAt: string;
    updatedAt: string;
    isConnected: boolean;
    requiresReauth: boolean;
};

export type SocialPostMedia = {
    id: string;
    postId: string;
    kind: SocialMediaKind;
    source: 'AI_GENERATED' | 'USER_UPLOAD' | 'BUSINESS_ASSET';
    url: string;
    mimeType: string | null;
    width: number | null;
    height: number | null;
    durationMs: number | null;
    position: number;
    prompt: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
};

export type SocialPost = {
    id: string;
    businessId: string;
    accountId: string | null;
    platform: SocialPlatform;
    postType: SocialPostType;
    status: SocialPostStatus;
    caption: string | null;
    cta: string | null;
    hashtags: string[];
    aiMetadata: Record<string, unknown> | null;
    sourceGenerationId: string | null;
    scheduledAt: string | null;
    publishedAt: string | null;
    externalPostId: string | null;
    externalPostUrl: string | null;
    lastError: string | null;
    retryCount: number;
    createdAt: string;
    updatedAt: string;
    media?: SocialPostMedia[];
};

export type PublishingLog = {
    id: string;
    postId: string;
    platform: SocialPlatform;
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRYING';
    attempt: number;
    externalPostId: string | null;
    externalPostUrl: string | null;
    response: Record<string, unknown> | null;
    errorMessage: string | null;
    errorCode: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    createdAt: string;
};

export const PLATFORM_META: Record<SocialPlatform, { label: string; color: string; bg: string }> = {
    FACEBOOK: { label: 'Facebook', color: 'text-blue-700', bg: 'bg-blue-50' },
    INSTAGRAM: { label: 'Instagram', color: 'text-pink-600', bg: 'bg-pink-50' },
    TIKTOK: { label: 'TikTok', color: 'text-slate-900', bg: 'bg-slate-100' },
};
