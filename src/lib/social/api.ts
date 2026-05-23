import { apiClient } from '../api-client';
import type {
    SocialAccount,
    SocialPlatform,
    SocialPost,
    SocialPostMedia,
    SocialPostStatus,
    SocialPostType,
    PublishingLog,
} from './types';

export const socialApi = {
    // ── Accounts ────────────────────────────────────────────────────────
    listAccounts: async (businessId: string): Promise<SocialAccount[]> => {
        const res = await apiClient.get(`/social/accounts/${businessId}`);
        return res.data ?? [];
    },
    startConnect: async (businessId: string, platform: SocialPlatform, redirectAfterConnect?: string) => {
        const res = await apiClient.post(`/social/accounts/connect`, {
            businessId,
            platform,
            redirectAfterConnect,
        });
        return res.data?.authorizationUrl as string;
    },
    disconnect: async (businessId: string, accountId: string) => {
        await apiClient.delete(`/social/accounts/${businessId}/${accountId}`);
    },

    // ── Generation + drafts ─────────────────────────────────────────────
    generate: async (payload: {
        businessId: string;
        platforms: SocialPlatform[];
        postType: SocialPostType;
        topic?: string;
        tone?: string;
        audience?: string;
        hashtagLimit?: number;
        generateMedia?: boolean;
    }): Promise<{ posts: SocialPost[]; generationId: string }> => {
        const res = await apiClient.post(`/social/content/generate`, payload);
        return res.data;
    },
    listPosts: async (businessId: string, params?: { status?: SocialPostStatus; platform?: SocialPlatform; take?: number }): Promise<SocialPost[]> => {
        const qs = new URLSearchParams();
        if (params?.status) qs.set('status', params.status);
        if (params?.platform) qs.set('platform', params.platform);
        if (params?.take) qs.set('take', String(params.take));
        const q = qs.toString();
        const res = await apiClient.get(`/social/content/${businessId}/posts${q ? `?${q}` : ''}`);
        return res.data ?? [];
    },
    getPost: async (businessId: string, postId: string): Promise<SocialPost> => {
        const res = await apiClient.get(`/social/content/${businessId}/posts/${postId}`);
        return res.data;
    },
    updatePost: async (businessId: string, postId: string, patch: Partial<SocialPost>): Promise<SocialPost> => {
        const res = await apiClient.patch(`/social/content/${businessId}/posts/${postId}`, patch);
        return res.data;
    },
    regenerateField: async (businessId: string, postId: string, payload: { field: 'caption' | 'hashtags' | 'cta' | 'image_prompt' | 'flyer_prompt' | 'video_script'; instructions?: string }): Promise<SocialPost> => {
        const res = await apiClient.post(`/social/content/${businessId}/posts/${postId}/regenerate`, payload);
        return res.data;
    },
    deletePost: async (businessId: string, postId: string) => {
        await apiClient.delete(`/social/content/${businessId}/posts/${postId}`);
    },

    // ── Media ───────────────────────────────────────────────────────────
    attachMedia: async (businessId: string, postId: string, payload: {
        url: string;
        kind: 'IMAGE' | 'VIDEO' | 'THUMBNAIL';
        mimeType?: string;
        width?: number;
        height?: number;
        durationMs?: number;
        position?: number;
        prompt?: string;
    }): Promise<SocialPostMedia> => {
        const res = await apiClient.post(`/social/content/${businessId}/posts/${postId}/media`, payload);
        return res.data;
    },
    generateAiImage: async (businessId: string, postId: string, prompt?: string): Promise<SocialPostMedia> => {
        const res = await apiClient.post(`/social/content/${businessId}/posts/${postId}/media/ai-image`, { prompt });
        return res.data;
    },
    removeMedia: async (businessId: string, postId: string, mediaId: string) => {
        await apiClient.delete(`/social/content/${businessId}/posts/${postId}/media/${mediaId}`);
    },

    // ── Publishing ──────────────────────────────────────────────────────
    publishNow: async (businessId: string, postId: string, accountId?: string) => {
        const res = await apiClient.post(`/social/publishing/${businessId}/posts/${postId}/publish-now`, { accountId });
        return res.data;
    },
    schedule: async (businessId: string, postId: string, scheduledAt: string) => {
        const res = await apiClient.post(`/social/publishing/${businessId}/posts/${postId}/schedule`, { scheduledAt });
        return res.data as SocialPost;
    },
    cancelScheduled: async (businessId: string, postId: string) => {
        const res = await apiClient.post(`/social/publishing/${businessId}/posts/${postId}/cancel-scheduled`, {});
        return res.data as SocialPost;
    },
    listScheduled: async (businessId: string): Promise<SocialPost[]> => {
        const res = await apiClient.get(`/social/publishing/${businessId}/scheduled`);
        return res.data ?? [];
    },
    listHistory: async (businessId: string, take = 50): Promise<SocialPost[]> => {
        const res = await apiClient.get(`/social/publishing/${businessId}/history?take=${take}`);
        return res.data ?? [];
    },
    listLogs: async (businessId: string, postId: string): Promise<PublishingLog[]> => {
        const res = await apiClient.get(`/social/publishing/${businessId}/posts/${postId}/logs`);
        return res.data ?? [];
    },
};
