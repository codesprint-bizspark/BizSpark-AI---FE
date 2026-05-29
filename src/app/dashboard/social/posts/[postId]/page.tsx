"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  Loader2,
  Sparkles,
  ArrowLeft,
  Rocket,
  Calendar,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  Wand2,
  X as XIcon,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Play,
  ExternalLink,
  Upload,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { socialApi } from "@/lib/social/api"
import { SocialAccount, SocialPost, PLATFORM_META } from "@/lib/social/types"
import { MediaUploader } from "@/components/social/media-uploader"
import { type LocalMedia } from "@/lib/social/media-utils"

export default function SocialPostDetailPage() {
  const params = useParams<{ postId: string }>()
  const router = useRouter()
  const { toast } = useToast()

  const [activeBizId, setActiveBizId] = useState("")
  const [post, setPost] = useState<SocialPost | null>(null)
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [regenField, setRegenField] = useState<string | null>(null)
  const [isAttachingMedia, setIsAttachingMedia] = useState(false)
  const [scheduledAt, setScheduledAt] = useState("")
  // Inline uploader: holds files the user has staged but not yet sent to the
  // backend. We keep it collapsed by default so the page stays compact.
  const [showUploader, setShowUploader] = useState(false)
  const [stagedUploads, setStagedUploads] = useState<LocalMedia[]>([])
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => { setActiveBizId(localStorage.getItem("active_biz_id") || "") }, [])

  const reload = useCallback(async () => {
    if (!activeBizId || !params?.postId) return
    setIsLoading(true)
    try {
      const [p, accts] = await Promise.all([
        socialApi.getPost(activeBizId, params.postId),
        socialApi.listAccounts(activeBizId),
      ])
      setPost(p)
      setAccounts(accts)
      if (p.scheduledAt) {
        // Format to value compatible with <input type="datetime-local">
        const d = new Date(p.scheduledAt)
        const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        setScheduledAt(iso)
      }
    } catch (e: any) {
      toast({ title: "Couldn't load post", description: e.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [activeBizId, params, toast])

  useEffect(() => { reload() }, [reload])

  const patchLocal = (patch: Partial<SocialPost>) => setPost((p) => p ? { ...p, ...patch } : p)

  const handleSave = async () => {
    if (!post) return
    setIsSaving(true)
    try {
      const updated = await socialApi.updatePost(activeBizId, post.id, {
        caption: post.caption ?? "",
        cta: post.cta ?? "",
        hashtags: post.hashtags ?? [],
        accountId: post.accountId,
      })
      setPost({ ...post, ...updated })
      toast({ title: "Saved" })
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRegenerate = async (field: 'caption' | 'hashtags' | 'cta' | 'image_prompt' | 'flyer_prompt' | 'video_script', instructions?: string) => {
    if (!post) return
    setRegenField(field)
    try {
      const updated = await socialApi.regenerateField(activeBizId, post.id, { field, instructions })
      setPost(updated)
      toast({ title: "Regenerated" })
    } catch (e: any) {
      toast({ title: "Regenerate failed", description: e.message, variant: "destructive" })
    } finally {
      setRegenField(null)
    }
  }

  const handleAiImage = async () => {
    if (!post) return
    setIsAttachingMedia(true)
    try {
      await socialApi.generateAiImage(activeBizId, post.id)
      await reload()
      toast({ title: "Image generated" })
    } catch (e: any) {
      toast({ title: "Image gen failed", description: e.message, variant: "destructive" })
    } finally {
      setIsAttachingMedia(false)
    }
  }

  const handleAttachUrl = async () => {
    if (!post) return
    const url = prompt("Paste a public image or video URL")
    if (!url) return
    const isVideo = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)
    setIsAttachingMedia(true)
    try {
      await socialApi.attachMedia(activeBizId, post.id, { url, kind: isVideo ? "VIDEO" : "IMAGE" })
      await reload()
    } catch (e: any) {
      toast({ title: "Attach failed", description: e.message, variant: "destructive" })
    } finally {
      setIsAttachingMedia(false)
    }
  }

  const handleUploadStaged = async () => {
    if (!post || stagedUploads.length === 0) return
    setIsUploading(true)
    try {
      const files = stagedUploads.map((m) => m.file)
      await socialApi.uploadMediaFiles(activeBizId, post.id, files)
      // Free preview blob URLs after a successful upload.
      stagedUploads.forEach((m) => URL.revokeObjectURL(m.previewUrl))
      const count = files.length
      setStagedUploads([])
      setShowUploader(false)
      await reload()
      toast({ title: `Uploaded ${count} file${count === 1 ? "" : "s"}` })
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveMedia = async (mediaId: string) => {
    if (!post) return
    if (!confirm("Remove this media?")) return
    try {
      await socialApi.removeMedia(activeBizId, post.id, mediaId)
      await reload()
    } catch (e: any) {
      toast({ title: "Remove failed", description: e.message, variant: "destructive" })
    }
  }

  const handlePublish = async () => {
    if (!post) return
    if (!post.accountId) {
      toast({ title: "Pick an account", description: "Connect & select a social account before publishing.", variant: "destructive" })
      return
    }
    setIsPublishing(true)
    try {
      await socialApi.publishNow(activeBizId, post.id, post.accountId)
      // Poll until the post transitions out of PUBLISHING (max ~40s)
      let resolved = false
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 2000))
        const updated = await socialApi.getPost(activeBizId, post.id)
        if (updated.status !== "PUBLISHING") {
          setPost(updated)
          if (updated.status === "PUBLISHED") {
            toast({ title: "Published!", description: updated.externalPostUrl ? "View it live with the button above." : "Your post is live." })
          } else if (updated.status === "FAILED") {
            toast({ title: "Publish failed", description: updated.lastError ?? "Unknown error", variant: "destructive" })
          }
          resolved = true
          break
        }
      }
      if (!resolved) {
        await reload()
        toast({ title: "Still publishing…", description: "The platform is taking longer than usual — check back in a moment." })
      }
    } catch (e: any) {
      toast({ title: "Publish failed", description: e.message, variant: "destructive" })
    } finally {
      setIsPublishing(false)
    }
  }

  // ── Scheduling validation ─────────────────────────────────────────────────
  // <input type="datetime-local"> stores the value as "YYYY-MM-DDTHH:MM" in
  // the user's local timezone (no offset suffix). `new Date(local)` parses it
  // as local time, and `.toISOString()` converts to UTC for the API.
  // Backend requires at least 30s in the future; we require 60s as a buffer
  // so the user doesn't hit a backend rejection by clicking quickly.
  const MIN_LEAD_SECONDS = 60

  const scheduledDate = useMemo(() => {
    if (!scheduledAt) return null
    const d = new Date(scheduledAt)
    return Number.isNaN(d.getTime()) ? null : d
  }, [scheduledAt])

  const scheduleValidation = useMemo<{ ok: boolean; reason: string | null }>(() => {
    if (!scheduledAt) return { ok: false, reason: "Pick a date and time to enable scheduling" }
    if (!scheduledDate) return { ok: false, reason: "Invalid date — please pick again" }
    const earliest = Date.now() + MIN_LEAD_SECONDS * 1000
    if (scheduledDate.getTime() < earliest) {
      return { ok: false, reason: `Schedule time must be at least ${MIN_LEAD_SECONDS}s in the future` }
    }
    return { ok: true, reason: null }
  }, [scheduledAt, scheduledDate])

  // Lower bound for the <input type="datetime-local"> — prevents picking
  // dates in the past via the native picker. Format: "YYYY-MM-DDTHH:MM".
  const minLocalDatetime = useMemo(() => {
    const d = new Date(Date.now() + MIN_LEAD_SECONDS * 1000)
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
  }, [])

  const userTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "local time",
    [],
  )

  // Bust the scheduled-page sessionStorage cache so navigating there shows fresh data
  const _clearScheduledCache = () => {
    try { sessionStorage.removeItem(`bs_scheduled_${activeBizId}`) } catch {}
  }

  const handleSchedule = async () => {
    if (!post) return
    if (!post.accountId) {
      toast({ title: "Pick an account first", description: "Select a connected social account in 'Publish as'.", variant: "destructive" })
      return
    }
    if (!scheduleValidation.ok) {
      toast({ title: "Can't schedule yet", description: scheduleValidation.reason ?? "Check the date/time.", variant: "destructive" })
      return
    }
    setIsScheduling(true)
    try {
      const iso = scheduledDate!.toISOString()
      const updated = await socialApi.schedule(activeBizId, post.id, iso)
      _clearScheduledCache()
      setPost(updated)
      toast({ title: "Scheduled", description: new Date(updated.scheduledAt!).toLocaleString() })
    } catch (e: any) {
      toast({ title: "Schedule failed", description: e.message, variant: "destructive" })
    } finally {
      setIsScheduling(false)
    }
  }

  const handleCancel = async () => {
    if (!post) return
    if (!confirm("Cancel this scheduled post? It will be moved back to draft.")) return
    try {
      const updated = await socialApi.cancelScheduled(activeBizId, post.id)
      _clearScheduledCache()
      setPost(updated)
      toast({ title: "Scheduled post cancelled" })
    } catch (e: any) {
      toast({ title: "Cancel failed", description: e.message, variant: "destructive" })
    }
  }

  if (isLoading || !post) {
    return (
      <div className="h-full min-h-[40vh] flex items-center justify-center text-muted-foreground text-sm">
        <Loader2 size={14} className="animate-spin mr-2" /> Loading…
      </div>
    )
  }

  const platform = PLATFORM_META[post.platform]
  const platformAccounts = accounts.filter((a) => a.platform === post.platform && a.isConnected)
  const selectedAccount = platformAccounts.find((a) => a.id === post.accountId) || platformAccounts[0]
  const isPublished = post.status === "PUBLISHED"
  const isLocked = isPublished || post.status === "PUBLISHING"
  const isTikTok = post.platform === "TIKTOK"
  const aiMeta = (post.aiMetadata ?? {}) as Record<string, any>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/social/posts")} className="gap-2">
            <ArrowLeft size={14} /> Back
          </Button>
          <div className={cn("size-9 rounded-lg flex items-center justify-center", platform.bg, platform.color)}>
            <Sparkles size={16} />
          </div>
          <div>
            <p className="font-bold text-lg">{platform.label} · <span className="text-muted-foreground font-medium">{post.postType.toLowerCase()}</span></p>
            <p className="text-xs text-muted-foreground">Created {new Date(post.createdAt).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="uppercase text-[10px] font-bold">
            {post.status.toLowerCase()}
          </Badge>
          {post.externalPostUrl && (
            <a href={post.externalPostUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink size={12} /> View live
              </Button>
            </a>
          )}
        </div>
      </div>

      {isPublished && (
        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="size-9 rounded-full bg-green-500 flex items-center justify-center"><Rocket size={16} className="text-white" /></div>
            <p className="text-sm">Published {post.publishedAt ? new Date(post.publishedAt).toLocaleString() : ""} — editing is locked.</p>
          </CardContent>
        </Card>
      )}

      {post.status === "FAILED" && post.lastError && (
        <Card className="border-2 border-red-300 bg-red-50">
          <CardContent className="pt-4 pb-4 flex items-start gap-3">
            <div className="size-9 rounded-full bg-red-500 flex items-center justify-center shrink-0">
              <Rocket size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-red-900">Publish failed</p>
              <p className="text-xs text-red-800 mt-1 whitespace-pre-wrap break-words">{post.lastError}</p>
              <p className="text-xs text-red-700/80 mt-2">
                Fix the issue, then click <span className="font-semibold">Publish Now</span> again to retry.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* ── PREVIEW ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <PreviewCard post={post} account={selectedAccount} />
        </div>

        {/* ── EDITOR ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Caption */}
          <Card className="border-2">
            <CardContent className="pt-5 pb-5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Caption</p>
                <Button variant="ghost" size="sm" disabled={isLocked || regenField === 'caption'} onClick={() => handleRegenerate('caption')} className="gap-1 text-xs">
                  {regenField === 'caption' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Regenerate
                </Button>
              </div>
              <textarea
                value={post.caption ?? ""}
                onChange={(e) => patchLocal({ caption: e.target.value })}
                disabled={isLocked}
                rows={6}
                className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
              />
            </CardContent>
          </Card>

          {/* Hashtags + CTA */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="border-2">
              <CardContent className="pt-5 pb-5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Hashtags</p>
                  <Button variant="ghost" size="sm" disabled={isLocked || regenField === 'hashtags'} onClick={() => handleRegenerate('hashtags')} className="gap-1 text-xs">
                    {regenField === 'hashtags' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} New set
                  </Button>
                </div>
                <input
                  value={(post.hashtags ?? []).join(", ")}
                  onChange={(e) => patchLocal({ hashtags: e.target.value.split(",").map((h) => h.trim()).filter(Boolean) })}
                  disabled={isLocked}
                  placeholder="comma, separated, tags"
                  className="w-full text-sm border rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(post.hashtags ?? []).slice(0, 12).map((h) => (
                    <span key={h} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">#{h}</span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-5 pb-5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Call to action</p>
                  <Button variant="ghost" size="sm" disabled={isLocked || regenField === 'cta'} onClick={() => handleRegenerate('cta')} className="gap-1 text-xs">
                    {regenField === 'cta' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Rewrite
                  </Button>
                </div>
                <input
                  value={post.cta ?? ""}
                  onChange={(e) => patchLocal({ cta: e.target.value })}
                  disabled={isLocked}
                  placeholder="e.g. Order now"
                  className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                />
              </CardContent>
            </Card>
          </div>

          {/* Media */}
          <Card className="border-2">
            <CardContent className="pt-5 pb-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Media</p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={showUploader ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowUploader((v) => !v)}
                    disabled={isAttachingMedia || isLocked || isUploading}
                    className="gap-1.5 text-xs"
                  >
                    <Upload size={12} /> {showUploader ? "Hide uploader" : "Upload from device"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleAttachUrl} disabled={isAttachingMedia || isLocked} className="gap-1.5 text-xs">
                    <ImageIcon size={12} /> Attach URL
                  </Button>
                  {(post.postType === 'IMAGE' || post.postType === 'FLYER') && (
                    <Button variant="default" size="sm" onClick={handleAiImage} disabled={isAttachingMedia || isLocked} className="gap-1.5 text-xs">
                      {isAttachingMedia ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} AI image
                    </Button>
                  )}
                </div>
              </div>

              {showUploader && !isLocked && (
                <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-3 space-y-3">
                  <MediaUploader
                    items={stagedUploads}
                    onChange={setStagedUploads}
                    accept={post.postType === 'VIDEO' ? 'video' : 'both'}
                    busy={isUploading}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        stagedUploads.forEach((m) => URL.revokeObjectURL(m.previewUrl))
                        setStagedUploads([])
                        setShowUploader(false)
                      }}
                      disabled={isUploading}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleUploadStaged}
                      disabled={stagedUploads.length === 0 || isUploading}
                      className="gap-1.5 text-xs"
                    >
                      {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      Upload {stagedUploads.length || ""} file{stagedUploads.length === 1 ? "" : "s"}
                    </Button>
                  </div>
                </div>
              )}
              {post.media && post.media.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {post.media.map((m) => (
                    <div key={m.id} className="relative group aspect-square rounded-lg overflow-hidden border bg-slate-100">
                      {m.kind === 'VIDEO' ? (
                        <video src={m.url} className="w-full h-full object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      )}
                      {!isLocked && (
                        <button
                          onClick={() => handleRemoveMedia(m.id)}
                          className="absolute top-1 right-1 size-6 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XIcon size={12} className="m-auto" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No media attached yet.</p>
              )}

              {/* Show AI prompt / script for context */}
              {aiMeta.imagePrompt && (
                <details className="text-xs"><summary className="cursor-pointer text-muted-foreground">AI image prompt</summary>
                  <p className="font-mono text-[11px] bg-slate-50 rounded p-2 mt-1.5">{aiMeta.imagePrompt}</p>
                </details>
              )}
              {aiMeta.flyerPrompt && (
                <details className="text-xs"><summary className="cursor-pointer text-muted-foreground">AI flyer prompt</summary>
                  <p className="font-mono text-[11px] bg-slate-50 rounded p-2 mt-1.5">{aiMeta.flyerPrompt}</p>
                </details>
              )}
              {aiMeta.videoScript && (
                <details open className="text-xs"><summary className="cursor-pointer text-muted-foreground">Video script</summary>
                  {aiMeta.videoConcept && <p className="text-[11px] italic mt-1.5">{aiMeta.videoConcept}</p>}
                  <ol className="space-y-1.5 mt-2">
                    {(aiMeta.videoScript as any[]).map((s) => (
                      <li key={s.scene} className="bg-slate-50 rounded p-2">
                        <p className="text-[11px] font-bold">Scene {s.scene}</p>
                        <p className="text-[11px]">{s.visual}</p>
                        {s.subtitle && <p className="text-[10px] text-muted-foreground italic mt-1">"{s.subtitle}"</p>}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </CardContent>
          </Card>

          {/* Account selector — platform-scoped because each post is bound to one
              platform. If THAT platform isn't connected, show an inline CTA;
              other platforms' connection state is irrelevant for this post. */}
          <Card className={cn(
            "border-2",
            platformAccounts.length === 0 && !isLocked && "border-amber-300 bg-amber-50",
          )}>
            <CardContent className="pt-5 pb-5 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Publish as ({platform.label})
              </p>
              {platformAccounts.length === 0 ? (
                <div className="flex items-start gap-3">
                  <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", platform.bg, platform.color)}>
                    <Sparkles size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">No {platform.label} account connected</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      This is a {platform.label} post — connect a {platform.label} account to publish or schedule it.
                      Your other platforms aren't affected.
                    </p>
                    <Link href="/dashboard/social" className="inline-block mt-2.5">
                      <Button size="sm" variant="default" className="gap-1.5 h-8">
                        Connect {platform.label}
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <select
                  value={post.accountId ?? ""}
                  onChange={(e) => patchLocal({ accountId: e.target.value || null })}
                  disabled={isLocked}
                  className="w-full text-sm border rounded-lg px-3 py-2 bg-white disabled:opacity-60"
                >
                  <option value="">— pick an account —</option>
                  {platformAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.displayName || a.username || a.externalAccountId}{a.requiresReauth ? " (reconnect required)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </CardContent>
          </Card>

          {/* TikTok publishing banner */}
          {isTikTok && !isLocked && (
            <Card className="border-2 border-amber-300 bg-amber-50">
              <CardContent className="pt-4 pb-4 flex items-start gap-3">
                <div className="size-9 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                  <Rocket size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900">TikTok publishing coming soon</p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    TikTok API integration is not yet live. Your draft is saved — publishing and scheduling are disabled until support is added.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Schedule + publish */}
          {!isLocked && (() => {
            // Single source of truth for the Schedule button's enabled state.
            const isScheduled = post.status === 'SCHEDULED'
            const missingAccount = !post.accountId
            const canSchedule = !missingAccount && scheduleValidation.ok && !isScheduling && !isTikTok
            const disabledReason = missingAccount
              ? "Pick a connected account in 'Publish as' above"
              : !scheduleValidation.ok
                ? scheduleValidation.reason
                : null

            // Temporary debug — remove once verified in QA
            // eslint-disable-next-line no-console
            console.debug("[schedule:disabled-state]", {
              scheduledAt,
              scheduledDate: scheduledDate?.toISOString() ?? null,
              isValid: scheduleValidation.ok,
              reason: scheduleValidation.reason,
              accountId: post.accountId,
              isScheduling,
              canSchedule,
            })

            return (
              <Card className="border-2 bg-slate-50">
                <CardContent className="pt-5 pb-5 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      min={minLocalDatetime}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      disabled={isScheduled}
                      className="flex-1 text-sm border rounded-lg px-3 py-2 bg-white disabled:opacity-60"
                    />
                    {isScheduled ? (
                      <Button variant="outline" onClick={handleCancel} className="gap-2">
                        <Trash2 size={14} /> Cancel schedule
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={handleSchedule}
                        disabled={!canSchedule}
                        title={disabledReason ?? undefined}
                        className="gap-2"
                      >
                        {isScheduling ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                        Schedule
                      </Button>
                    )}
                  </div>

                  {/* Inline status: explain why disabled, or confirm the parsed time */}
                  {!isScheduled && disabledReason && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                      {disabledReason}
                    </p>
                  )}
                  {!isScheduled && canSchedule && scheduledDate && (
                    <p className="text-xs text-muted-foreground">
                      Will publish on <span className="font-semibold text-foreground">
                        {scheduledDate.toLocaleString()}
                      </span> ({userTimezone})
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-1 border-t">
                    <p className="text-xs text-muted-foreground">
                      Save your edits first, then publish or schedule. Drafts are stored automatically.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleSave} disabled={isSaving} className="gap-2">
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : null} Save
                      </Button>
                      <Button
                        onClick={handlePublish}
                        disabled={isPublishing || !post.accountId || isTikTok}
                        title={isTikTok ? "TikTok publishing coming soon" : !post.accountId ? "Pick a connected account first" : undefined}
                        className="gap-2"
                      >
                        {isPublishing ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
                        Publish Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

// ─── Social-media-style preview ────────────────────────────────────────────

function PreviewCard({ post, account }: { post: SocialPost; account?: SocialAccount }) {
  const platform = post.platform
  const handle = account?.username || account?.displayName || "your.business"
  const avatar = account?.avatarUrl
  const firstMedia = post.media?.[0]
  const caption = [post.caption, post.cta, (post.hashtags ?? []).map((h) => `#${h}`).join(" ")].filter(Boolean).join("\n\n")

  if (platform === 'INSTAGRAM') {
    return (
      <div className="border-2 rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="size-8 rounded-full" />
          ) : (
            <div className="size-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600" />
          )}
          <p className="text-sm font-semibold">{handle}</p>
        </div>
        <div className="aspect-square bg-slate-100">
          {firstMedia
            ? firstMedia.kind === 'VIDEO'
              ? <video src={firstMedia.url} controls className="w-full h-full object-cover" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={firstMedia.url} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No media yet</div>}
        </div>
        <div className="px-3 py-2 flex items-center gap-3">
          <Heart size={20} /><MessageCircle size={20} /><Send size={20} />
          <Bookmark size={20} className="ml-auto" />
        </div>
        <p className="px-3 pb-3 text-xs whitespace-pre-wrap leading-relaxed"><span className="font-semibold mr-1">{handle}</span>{caption}</p>
      </div>
    )
  }

  if (platform === 'FACEBOOK') {
    return (
      <div className="border-2 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="size-10 rounded-full" />
          ) : (
            <div className="size-10 rounded-full bg-blue-100" />
          )}
          <div>
            <p className="text-sm font-semibold">{account?.displayName || "Your Page"}</p>
            <p className="text-[11px] text-muted-foreground">Just now · <span title="public">🌎</span></p>
          </div>
        </div>
        <p className="px-4 pb-3 text-sm whitespace-pre-wrap leading-relaxed">{caption}</p>
        {firstMedia && (
          <div className="bg-slate-100">
            {firstMedia.kind === 'VIDEO'
              ? <video src={firstMedia.url} controls className="w-full" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={firstMedia.url} alt="" className="w-full" />}
          </div>
        )}
        <div className="px-4 py-2 border-t flex justify-between text-[12px] text-muted-foreground font-semibold">
          <span>👍 Like</span><span>💬 Comment</span><span>↗️ Share</span>
        </div>
      </div>
    )
  }

  // TikTok-style mock — 9:16 portrait video card
  return (
    <div className="border-2 rounded-2xl overflow-hidden bg-black text-white relative" style={{ aspectRatio: "9 / 16", maxHeight: 600 }}>
      {firstMedia?.kind === 'VIDEO' ? (
        <video src={firstMedia.url} controls className="w-full h-full object-cover" />
      ) : firstMedia ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={firstMedia.url} alt="" className="w-full h-full object-cover opacity-70" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700">
          <Play size={36} className="text-white/70" />
          <p className="text-xs mt-2 text-white/60">No video uploaded yet</p>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-sm font-bold">@{handle}</p>
        <p className="text-xs mt-1 line-clamp-3 whitespace-pre-wrap">{caption}</p>
      </div>
    </div>
  )
}
