"use client"

import { useCallback, useRef, useState } from "react"
import { Upload, X as XIcon, Image as ImageIcon, Film, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { buildLocalMedia, formatBytes, type LocalMedia } from "@/lib/social/media-utils"

type Props = {
    /** Currently selected local media (controlled). */
    items: LocalMedia[]
    /** Push-only setter — child only adds / removes from the array. */
    onChange: (next: LocalMedia[]) => void
    /** Restrict picker to images only, videos only, or both. */
    accept?: 'image' | 'video' | 'both'
    /** Optional cap on item count (e.g. 10 for a carousel). */
    maxCount?: number
    /** Show a busy state on the picker (used while uploading). */
    busy?: boolean
    /** Help text rendered below the dropzone. */
    helperText?: string
}

const ACCEPT_MAP: Record<NonNullable<Props['accept']>, string> = {
    image: 'image/*',
    video: 'video/*',
    both: 'image/*,video/*',
}

/**
 * Reusable drag-and-drop / click-to-pick media uploader. Reads selected files
 * client-side, probes dimensions / duration, and hands a `LocalMedia[]` array
 * back to the caller so it can be previewed before the actual upload.
 */
export function MediaUploader({
    items,
    onChange,
    accept = 'both',
    maxCount,
    busy = false,
    helperText,
}: Props) {
    const { toast } = useToast()
    const inputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)

    const addFiles = useCallback(async (files: File[]) => {
        if (!files.length) return
        setIsProcessing(true)
        try {
            // Filter to the accept type early to give a clearer error message.
            const filtered = files.filter((f) => {
                if (accept === 'image') return f.type.startsWith('image/')
                if (accept === 'video') return f.type.startsWith('video/')
                return f.type.startsWith('image/') || f.type.startsWith('video/')
            })
            if (filtered.length < files.length) {
                toast({
                    title: 'Some files were skipped',
                    description: `Only ${accept === 'both' ? 'images and videos' : `${accept}s`} are accepted.`,
                    variant: 'destructive',
                })
            }

            const { accepted, skipped } = await buildLocalMedia(filtered)
            if (skipped.length > 0) {
                toast({
                    title: `${skipped.length} file${skipped.length === 1 ? '' : 's'} skipped`,
                    description: skipped.map((s) => `${s.file.name}: ${s.reason}`).join('\n'),
                    variant: 'destructive',
                })
            }

            let next = [...items, ...accepted]
            if (maxCount && next.length > maxCount) {
                toast({
                    title: `Max ${maxCount} files`,
                    description: `Trimming to the first ${maxCount}.`,
                    variant: 'destructive',
                })
                // Revoke previews on the items we're dropping so they don't leak.
                next.slice(maxCount).forEach((m) => URL.revokeObjectURL(m.previewUrl))
                next = next.slice(0, maxCount)
            }
            onChange(next)
        } finally {
            setIsProcessing(false)
        }
    }, [items, onChange, accept, maxCount, toast])

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        addFiles(files)
        // Reset so picking the same file twice in a row still fires onChange.
        if (inputRef.current) inputRef.current.value = ''
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
        const files = Array.from(e.dataTransfer.files || [])
        addFiles(files)
    }

    const removeItem = (id: string) => {
        const target = items.find((m) => m.id === id)
        if (target) URL.revokeObjectURL(target.previewUrl)
        onChange(items.filter((m) => m.id !== id))
    }

    const acceptAttr = ACCEPT_MAP[accept]
    const disabled = busy || isProcessing

    return (
        <div className="space-y-3">
            <div
                onClick={() => !disabled && inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                    "rounded-xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors",
                    isDragging ? "border-primary bg-primary/5" : "border-slate-300 hover:border-primary/40",
                    disabled && "opacity-60 cursor-not-allowed",
                )}
            >
                <div className="flex flex-col items-center gap-2">
                    {isProcessing ? (
                        <Loader2 size={22} className="text-primary animate-spin" />
                    ) : (
                        <Upload size={22} className="text-primary" />
                    )}
                    <p className="text-sm font-semibold">
                        {isProcessing ? 'Reading files…' : 'Click or drop files here'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {accept === 'image' && 'Images (PNG, JPG, WebP). Up to 15MB each.'}
                        {accept === 'video' && 'Videos (MP4, MOV, WebM). Up to 45MB each.'}
                        {accept === 'both' && 'Images up to 15MB · Videos up to 45MB · Multiple files OK'}
                    </p>
                    {helperText && (
                        <p className="text-[11px] text-muted-foreground mt-1">{helperText}</p>
                    )}
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept={acceptAttr}
                    onChange={handleFileInput}
                    className="hidden"
                    disabled={disabled}
                />
            </div>

            {items.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {items.map((m) => (
                        <div key={m.id} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-100">
                            {m.kind === 'VIDEO' ? (
                                <video src={m.previewUrl} className="w-full h-full object-cover" muted />
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={m.previewUrl} alt={m.file.name} className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-x-0 bottom-0 px-1.5 py-1 bg-gradient-to-t from-black/70 to-transparent flex items-center gap-1 text-white">
                                {m.kind === 'VIDEO' ? <Film size={10} /> : <ImageIcon size={10} />}
                                <span className="text-[10px] font-medium truncate flex-1">{m.file.name}</span>
                                <span className="text-[10px] opacity-80">{formatBytes(m.sizeBytes)}</span>
                            </div>
                            {!busy && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); removeItem(m.id) }}
                                    className="absolute top-1 right-1 size-6 bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                    title="Remove"
                                >
                                    <XIcon size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {items.length > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                        {items.length} file{items.length === 1 ? '' : 's'} selected{maxCount ? ` / ${maxCount}` : ''}
                    </p>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                            items.forEach((m) => URL.revokeObjectURL(m.previewUrl))
                            onChange([])
                        }}
                        className="text-xs h-7"
                    >
                        Clear all
                    </Button>
                </div>
            )}
        </div>
    )
}
