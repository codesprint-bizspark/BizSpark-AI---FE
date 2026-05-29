import type { SocialMediaKind } from './types';

export type LocalMedia = {
    id: string;
    file: File;
    kind: Exclude<SocialMediaKind, 'THUMBNAIL'>;
    previewUrl: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    durationMs?: number;
};

// Hard caps so users get a clear, instant error rather than a 50mb backend
// rejection. Matches the JSON body parser limit configured in the API.
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 45 * 1024 * 1024;

export function classifyFile(file: File): 'IMAGE' | 'VIDEO' | null {
    if (file.type.startsWith('image/')) return 'IMAGE';
    if (file.type.startsWith('video/')) return 'VIDEO';
    return null;
}

export function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error || new Error('Could not read file'));
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(file);
    });
}

function probeImage(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
            URL.revokeObjectURL(url);
        };
        img.onerror = () => {
            resolve({ width: 0, height: 0 });
            URL.revokeObjectURL(url);
        };
        img.src = url;
    });
}

function probeVideo(file: File): Promise<{ width: number; height: number; durationMs: number }> {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.onloadedmetadata = () => {
            const out = {
                width: video.videoWidth || 0,
                height: video.videoHeight || 0,
                durationMs: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : 0,
            };
            URL.revokeObjectURL(url);
            resolve(out);
        };
        video.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({ width: 0, height: 0, durationMs: 0 });
        };
        video.src = url;
    });
}

/**
 * Turn a list of File objects from an <input type="file"> into LocalMedia
 * entries the UI can preview before upload. Files that are too large or have
 * an unsupported MIME type are skipped — the caller gets back an array of
 * `skipped` for surfacing as a toast.
 */
export async function buildLocalMedia(files: File[]): Promise<{ accepted: LocalMedia[]; skipped: Array<{ file: File; reason: string }> }> {
    const accepted: LocalMedia[] = [];
    const skipped: Array<{ file: File; reason: string }> = [];

    for (const file of files) {
        const kind = classifyFile(file);
        if (!kind) {
            skipped.push({ file, reason: 'Unsupported file type — pick an image or video' });
            continue;
        }
        const cap = kind === 'VIDEO' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
        if (file.size > cap) {
            skipped.push({ file, reason: `Too large (max ${Math.round(cap / 1024 / 1024)}MB)` });
            continue;
        }

        const previewUrl = URL.createObjectURL(file);
        const entry: LocalMedia = {
            id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
            file,
            kind,
            previewUrl,
            sizeBytes: file.size,
        };

        if (kind === 'IMAGE') {
            const dims = await probeImage(file);
            entry.width = dims.width || undefined;
            entry.height = dims.height || undefined;
        } else {
            const meta = await probeVideo(file);
            entry.width = meta.width || undefined;
            entry.height = meta.height || undefined;
            entry.durationMs = meta.durationMs || undefined;
        }

        accepted.push(entry);
    }

    return { accepted, skipped };
}

/**
 * Convert LocalMedia entries into the JSON payload the bulk-attach endpoint
 * expects. Files are read as base64 data URLs.
 */
export async function localMediaToAttachItems(items: LocalMedia[]): Promise<Array<{
    url: string;
    kind: 'IMAGE' | 'VIDEO';
    mimeType: string;
    width?: number;
    height?: number;
    durationMs?: number;
    position: number;
}>> {
    const result: Array<{
        url: string;
        kind: 'IMAGE' | 'VIDEO';
        mimeType: string;
        width?: number;
        height?: number;
        durationMs?: number;
        position: number;
    }> = [];
    for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const url = await readFileAsDataUrl(it.file);
        result.push({
            url,
            kind: it.kind,
            mimeType: it.file.type || (it.kind === 'VIDEO' ? 'video/mp4' : 'image/png'),
            width: it.width,
            height: it.height,
            durationMs: it.durationMs,
            position: i,
        });
    }
    return result;
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
