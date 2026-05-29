"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Sparkles, Loader2, ImageIcon, Type, FileImage, Video, Wand2, Check, AlertCircle, RefreshCw, Upload } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { socialApi } from "@/lib/social/api"
import { apiClient } from "@/lib/api-client"
import { SocialPlatform, SocialPostType, PLATFORM_META } from "@/lib/social/types"
import { useSocialAccounts } from "@/lib/social/use-social-accounts"
import { SocialSubNav } from "../sub-nav"
import { MediaUploader } from "@/components/social/media-uploader"
import { localMediaToAttachItems, type LocalMedia } from "@/lib/social/media-utils"

const TONES = ["professional", "friendly", "bold", "minimal"] as const
const POST_TYPES: { id: SocialPostType; label: string; icon: any; description: string }[] = [
  { id: "TEXT", label: "Text", icon: Type, description: "Caption only" },
  { id: "IMAGE", label: "Image", icon: ImageIcon, description: "AI-generated photo + caption" },
  { id: "FLYER", label: "Flyer", icon: FileImage, description: "Branded promotional flyer" },
  { id: "VIDEO", label: "Short Video", icon: Video, description: "Script + scenes for Reels / TikTok" },
]

export default function GenerateSocialContentPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeBizId, setActiveBizId] = useState("")
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([])
  const [postType, setPostType] = useState<SocialPostType>("IMAGE")
  const [topic, setTopic] = useState("")
  const [tone, setTone] = useState<typeof TONES[number]>("friendly")
  const [audience, setAudience] = useState("")
  const [generateMedia, setGenerateMedia] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [genStep, setGenStep] = useState(0)
  // User-uploaded media to attach to every generated post. Independent of
  // `generateMedia` — uploads still go through even when AI image gen is off.
  const [uploadedMedia, setUploadedMedia] = useState<LocalMedia[]>([])
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => { setActiveBizId(localStorage.getItem("active_biz_id") || "") }, [])

  // Shared hook: handles fetch + auto-refresh on window-focus / visibility, so
  // connecting in another tab (or coming back from the OAuth popup) syncs here.
  const {
    accounts,
    byPlatform: connectionByPlatform,
    anyConnected,
    isLoading: isLoadingAccounts,
    isRefetching,
    refetch: refetchAccounts,
  } = useSocialAccounts(activeBizId)

  // Auto-select the first CONNECTED platform once, after accounts arrive.
  useEffect(() => {
    if (platforms.length > 0) return
    const firstConnected = accounts.find((a) => a.isConnected)
    if (firstConnected) setPlatforms([firstConnected.platform])
  }, [accounts, platforms.length])

  const togglePlatform = (p: SocialPlatform) => {
    // Block selection of a disconnected platform — but only AFTER accounts load.
    if (!isLoadingAccounts && !connectionByPlatform[p]) {
      toast({
        title: `${PLATFORM_META[p].label} isn't connected`,
        description: `Connect a ${PLATFORM_META[p].label} account first, then come back here.`,
        variant: "destructive",
      })
      return
    }
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])
  }

  const pollUntilDone = async (taskId: string): Promise<void> => {
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise((r) => setTimeout(r, 2000))
      const res = await apiClient.get(`/agents/tasks/${taskId}`)
      const task = res.data
      if (task.status === "COMPLETED") {
        const posts: Array<{ id: string }> = task.outputData?.posts ?? []
        // userMedia was already attached by the agent inside the same DB
        // transaction that created the posts, so the detail page will see
        // them immediately. Belt-and-braces: if a post somehow has no media
        // despite us uploading, fall back to the multipart endpoint.
        if (uploadedMedia.length > 0 && posts.length > 0) {
          setIsUploading(true)
          try {
            for (const p of posts) {
              try {
                const fresh = await socialApi.getPost(activeBizId, p.id)
                const hasUserMedia = (fresh.media || []).some(
                  (m) => m.source === 'USER_UPLOAD',
                )
                if (!hasUserMedia) {
                  // Agent didn't pick up userMedia (older runner?) — fall back.
                  await socialApi.uploadMediaFiles(activeBizId, p.id, uploadedMedia.map((m) => m.file))
                }
              } catch (e: any) {
                toast({
                  title: "Couldn't verify uploads on one draft",
                  description: e.message || "Unknown error",
                  variant: "destructive",
                })
              }
            }
          } finally {
            setIsUploading(false)
          }
        }
        toast({ title: "Generated!", description: `Created ${posts.length} draft${posts.length === 1 ? "" : "s"}.` })
        if (posts[0]) {
          router.push(`/dashboard/social/posts/${posts[0].id}`)
        } else {
          router.push("/dashboard/social/posts")
        }
        return
      }
      if (task.status === "FAILED") {
        throw new Error(task.outputData?.error || "Content generation failed")
      }
    }
    throw new Error("Generation timed out — please try again")
  }

  const handleGenerate = async () => {
    if (!activeBizId) return
    if (platforms.length === 0) {
      toast({ title: "Pick at least one platform", variant: "destructive" })
      return
    }
    // Defense-in-depth: re-fetch fresh state before generating, in case the user
    // disconnected an account in another tab since the last focus event.
    const fresh = await refetchAccounts()
    const freshConnected = new Set(fresh.filter((a) => a.isConnected).map((a) => a.platform))
    const disconnected = platforms.filter((p) => !freshConnected.has(p))
    if (disconnected.length > 0) {
      toast({
        title: "Some selected platforms aren't connected",
        description: `Disconnect or remove: ${disconnected.map((p) => PLATFORM_META[p].label).join(", ")}`,
        variant: "destructive",
      })
      return
    }
    if (postType === "VIDEO" && !platforms.includes("TIKTOK") && !platforms.includes("INSTAGRAM")) {
      toast({ title: "Heads-up", description: "Short videos work best on TikTok or Instagram Reels." })
    }
    setIsGenerating(true)
    setGenStep(0)
    const steps = generateMedia && (postType === "IMAGE" || postType === "FLYER")
      ? [
          { label: "Writing captions & hashtags…", delay: 0 },
          { label: "Generating AI image…",         delay: 5000 },
          { label: "Almost ready…",                delay: 40000 },
        ]
      : [
          { label: "Writing captions & hashtags…", delay: 0 },
          { label: "Almost ready…",                delay: 4000 },
        ]
    const timers: ReturnType<typeof setTimeout>[] = []
    steps.forEach((s, i) => {
      timers.push(setTimeout(() => setGenStep(i), s.delay))
    })
    try {
      // Serialise uploaded files BEFORE calling generate so the agent receives
      // them in its input payload and can attach the media rows atomically
      // with post creation — there's no separate authenticated upload step
      // that could fail in between.
      let userMedia: Array<{
        url: string;
        kind: 'IMAGE' | 'VIDEO';
        mimeType?: string;
        width?: number;
        height?: number;
        durationMs?: number;
        originalName?: string;
        sizeBytes?: number;
      }> | undefined = undefined
      if (uploadedMedia.length > 0) {
        setIsUploading(true)
        try {
          const items = await localMediaToAttachItems(uploadedMedia)
          userMedia = items.map((it, i) => ({
            ...it,
            originalName: uploadedMedia[i]?.file.name,
            sizeBytes: uploadedMedia[i]?.sizeBytes,
          }))
        } finally {
          setIsUploading(false)
        }
      }
      const { taskId } = await socialApi.generate({
        businessId: activeBizId,
        platforms,
        postType,
        topic: topic.trim() || undefined,
        tone,
        audience: audience.trim() || undefined,
        generateMedia,
        userMedia,
      })
      await pollUntilDone(taskId)
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" })
    } finally {
      timers.forEach(clearTimeout)
      setIsGenerating(false)
      setGenStep(0)
    }
  }

  if (!activeBizId) return null

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-3xl font-bold font-headline flex items-center gap-2">
          <Wand2 size={24} className="text-primary" /> Generate Social Posts
        </h2>
        <p className="text-muted-foreground mt-1">
          The AI reads your business + website and writes platform-tailored captions, hashtags, and visuals.
        </p>
      </div>

      <SocialSubNav />

      <div className="space-y-6">
        {/* Platforms */}
        <Card className="border-2">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Platforms</p>
              <div className="flex items-center gap-3">
                {(isLoadingAccounts || isRefetching) && (
                  <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" />
                    {isLoadingAccounts ? "Checking connections…" : "Refreshing…"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => refetchAccounts()}
                  disabled={isLoadingAccounts || isRefetching}
                  className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 disabled:opacity-50"
                  title="Re-check which accounts are connected"
                >
                  <RefreshCw size={10} /> Refresh
                </button>
              </div>
            </div>

            {/* No platforms connected — offer a way out. */}
            {!isLoadingAccounts && !anyConnected && (
              <div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900">No social accounts connected yet</p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    You can still generate drafts, but you'll need to connect at least one account before publishing.
                    If you just connected one in another tab, click <span className="font-semibold">Refresh</span> above.
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Link href="/dashboard/social">
                      <Button size="sm" variant="outline" className="gap-1.5 h-8 bg-white">Connect an account</Button>
                    </Link>
                    <Button size="sm" variant="ghost" className="gap-1.5 h-8" onClick={() => refetchAccounts()}>
                      <RefreshCw size={12} /> Refresh
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-3">
              {(Object.keys(PLATFORM_META) as SocialPlatform[]).map((p) => {
                const meta = PLATFORM_META[p]
                const active = platforms.includes(p)
                const account = connectionByPlatform[p]
                const isConnected = !!account
                const disabled = !isLoadingAccounts && !isConnected

                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => togglePlatform(p)}
                    aria-pressed={active}
                    aria-disabled={disabled}
                    title={disabled ? `${meta.label} isn't connected — connect it first` : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all text-left relative",
                      active && "border-primary bg-primary/5",
                      !active && !disabled && "border-slate-200 hover:border-primary/40",
                      disabled && "border-slate-200 bg-slate-50 cursor-not-allowed opacity-70",
                    )}
                  >
                    <div className={cn("size-9 rounded-lg flex items-center justify-center", meta.bg, meta.color)}>
                      <Sparkles size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm">{meta.label}</p>
                        {isConnected ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-green-700 bg-green-100 rounded px-1.5 py-0.5">
                            <Check size={9} /> Connected
                          </span>
                        ) : !isLoadingAccounts ? (
                          <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-200 rounded px-1.5 py-0.5">
                            Not connected
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {isConnected
                          ? (account!.displayName || account!.username || `id: ${account!.externalAccountId.slice(0, 10)}…`)
                          : disabled
                            ? "Connect first"
                            : active ? "Selected" : "Tap to select"}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Inline connect links for disconnected platforms (sticky CTA). */}
            {!isLoadingAccounts && anyConnected && (Object.keys(PLATFORM_META) as SocialPlatform[]).some((p) => !connectionByPlatform[p]) && (
              <p className="text-xs text-muted-foreground pt-1">
                Want to publish to{" "}
                {(Object.keys(PLATFORM_META) as SocialPlatform[])
                  .filter((p) => !connectionByPlatform[p])
                  .map((p, i, arr) => (
                    <span key={p}>
                      <Link href="/dashboard/social" className="text-primary font-semibold hover:underline">
                        {PLATFORM_META[p].label}
                      </Link>
                      {i < arr.length - 1 ? (i === arr.length - 2 ? " or " : ", ") : ""}
                    </span>
                  ))}{" "}
                too? Connect them first.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Post type */}
        <Card className="border-2">
          <CardContent className="pt-6 space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Post Type</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {POST_TYPES.map((t) => {
                const Icon = t.icon
                const active = postType === t.id
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setPostType(t.id)}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-xl border-2 px-4 py-3 transition-all text-left",
                      active ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/40"
                    )}
                  >
                    <Icon size={20} className={cn("transition-colors", active ? "text-primary" : "text-slate-500")} />
                    <p className="font-semibold text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </button>
                )
              })}
            </div>
            {(postType === "IMAGE" || postType === "FLYER") && (
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={generateMedia}
                  onChange={(e) => setGenerateMedia(e.target.checked)}
                />
                <span className="text-sm">Also generate an AI image now (uses OpenAI Images)</span>
              </label>
            )}
          </CardContent>
        </Card>

        {/* User uploads — independent of AI image gen. Visible whenever the
            chosen post type can carry visual media (everything except TEXT). */}
        {postType !== "TEXT" && (
          <Card className="border-2">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Upload size={12} /> Upload your media <span className="text-muted-foreground/70 font-normal normal-case">(optional)</span>
                </p>
                {uploadedMedia.length > 0 && (
                  <span className="text-[10px] font-bold uppercase text-primary bg-primary/10 rounded px-1.5 py-0.5">
                    {uploadedMedia.length} ready
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload your own images or videos to attach to every generated draft.
                Works alongside AI-generated visuals — your uploads will appear in the post's media gallery,
                ready for Facebook
                {platforms.includes("INSTAGRAM") ? ", Instagram" : ""}
                {platforms.includes("TIKTOK") ? " and TikTok" : ""}.
              </p>
              <MediaUploader
                items={uploadedMedia}
                onChange={setUploadedMedia}
                accept={postType === "VIDEO" ? "video" : "both"}
                busy={isGenerating || isUploading}
                helperText={
                  postType === "VIDEO"
                    ? "Tip: portrait 9:16 videos work best for Reels / TikTok."
                    : "You can attach multiple images for a carousel post, or a single video."
                }
              />
            </CardContent>
          </Card>
        )}

        {/* Topic / tone / audience */}
        <Card className="border-2">
          <CardContent className="pt-6 space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Campaign details</p>

            <div>
              <label className="text-sm font-semibold block mb-1.5">Topic / Hook <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. weekend sale, new menu, customer appreciation week"
                className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold block mb-1.5">Tone</label>
                <div className="grid grid-cols-2 gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTone(t)}
                      className={cn(
                        "rounded-lg border-2 py-2 text-xs font-medium capitalize transition-all",
                        tone === t ? "border-primary bg-primary/5 text-primary" : "border-slate-200 hover:border-primary/40"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold block mb-1.5">Audience <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. local foodies, parents, college students"
                  className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          {isGenerating ? (
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 px-5 py-4 space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 size={18} className="animate-spin text-primary shrink-0" />
                <p className="text-sm font-semibold text-primary">
                  {isUploading
                    ? `Preparing ${uploadedMedia.length} uploaded file${uploadedMedia.length === 1 ? "" : "s"}…`
                    : (generateMedia && (postType === "IMAGE" || postType === "FLYER")
                        ? ["Writing captions & hashtags…", "Generating AI image…", "Almost ready…"]
                        : ["Writing captions & hashtags…", "Almost ready…"]
                      )[genStep] ?? "Almost ready…"}
                </p>
              </div>
              <div className="w-full h-1.5 rounded-full bg-primary/15 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-[3000ms] ease-out"
                  style={{ width: `${(generateMedia && (postType === "IMAGE" || postType === "FLYER") ? [20, 55, 90] : [30, 90])[genStep] ?? 20}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {generateMedia && (postType === "IMAGE" || postType === "FLYER")
                  ? "Caption ready in ~5s · image takes ~45s"
                  : "Usually takes 5–10 seconds"}
              </p>
            </div>
          ) : (
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2 h-12 text-base px-8"
              onClick={handleGenerate}
              disabled={platforms.length === 0}
            >
              <Sparkles size={18} /> Generate {platforms.length || ""} Draft{platforms.length === 1 ? "" : "s"}
            </Button>
          )}
          {!isGenerating && platforms.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Will generate one draft per selected platform:{" "}
              <span className="font-semibold text-foreground">
                {platforms.map((p) => PLATFORM_META[p].label).join(", ")}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
