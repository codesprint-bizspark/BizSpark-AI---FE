"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Loader2, Sparkles, FileText, ImageIcon, Video, FileImage, Trash2, ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { socialApi } from "@/lib/social/api"
import { SocialPost, PLATFORM_META } from "@/lib/social/types"
import { SocialSubNav } from "../sub-nav"

// Module-level cache — survives tab switches (component unmount/remount)
let _cachedPosts: SocialPost[] | null = null
let _cacheKey = ""

// sessionStorage helpers — survive page refreshes within the same tab
function _ssKey(bizId: string) { return `bs_posts_${bizId}` }

function _ssGet(bizId: string): SocialPost[] | null {
  if (typeof window === "undefined" || !bizId) return null
  try {
    const raw = sessionStorage.getItem(_ssKey(bizId))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function _ssSet(bizId: string, posts: SocialPost[]) {
  if (typeof window === "undefined" || !bizId) return
  const key = _ssKey(bizId)
  // Try storing with full images first; quota error → strip data URIs and retry
  try {
    sessionStorage.setItem(key, JSON.stringify(posts))
    return
  } catch {}
  const slim = posts.map(p => ({
    ...p,
    media: p.media?.map(m => ({ ...m, url: m.url?.startsWith("data:") ? "" : m.url })),
  }))
  try { sessionStorage.setItem(key, JSON.stringify(slim)) } catch {}
}

const TYPE_ICONS: Record<SocialPost["postType"], any> = {
  TEXT: FileText,
  IMAGE: ImageIcon,
  FLYER: FileImage,
  VIDEO: Video,
}

const STATUS_STYLES: Record<SocialPost["status"], string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  PUBLISHING: "bg-amber-100 text-amber-700",
  PUBLISHED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-500",
}

export default function SocialDraftsPage() {
  const { toast } = useToast()
  const [activeBizId, setActiveBizId] = useState("")

  // Lazy initialisers run once on mount — read from module cache (tab switch)
  // or sessionStorage (page refresh) to avoid a loading flash.
  const [posts, setPosts] = useState<SocialPost[]>(() => {
    if (typeof window === "undefined") return []
    const bizId = localStorage.getItem("active_biz_id") || ""
    if (_cachedPosts && _cacheKey === bizId) return _cachedPosts
    return _ssGet(bizId) ?? []
  })

  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === "undefined") return true
    const bizId = localStorage.getItem("active_biz_id") || ""
    if (_cachedPosts && _cacheKey === bizId) return false
    return _ssGet(bizId) === null
  })

  useEffect(() => { setActiveBizId(localStorage.getItem("active_biz_id") || "") }, [])

  const reload = useCallback(async () => {
    if (!activeBizId) return
    // Only show the spinner when there is truly no data at all
    const hasAnyCache =
      (_cachedPosts !== null && _cacheKey === activeBizId) ||
      _ssGet(activeBizId) !== null
    if (!hasAnyCache) setIsLoading(true)
    try {
      const rows = await socialApi.listPosts(activeBizId, { take: 100 })
      _cachedPosts = rows
      _cacheKey = activeBizId
      _ssSet(activeBizId, rows)
      setPosts(rows)
    } catch (e: any) {
      toast({ title: "Couldn't load posts", description: e.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [activeBizId, toast])

  useEffect(() => { reload() }, [reload])

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this draft?")) return
    try {
      await socialApi.deletePost(activeBizId, id)
      const next = posts.filter((p) => p.id !== id)
      if (_cacheKey === activeBizId) _cachedPosts = next
      _ssSet(activeBizId, next)
      setPosts(next)
      toast({ title: "Deleted" })
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" })
    }
  }

  if (!activeBizId) return null

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold font-headline">Drafts & Posts</h2>
          <p className="text-muted-foreground mt-1">Preview, edit, schedule or publish your AI-generated posts.</p>
        </div>
        <Link href="/dashboard/social/generate">
          <Button className="gap-2"><Sparkles size={16} /> Generate</Button>
        </Link>
      </div>

      <SocialSubNav />

      {isLoading ? (
        <div className="text-center text-muted-foreground text-sm">
          <Loader2 size={14} className="inline animate-spin mr-2" /> Loading…
        </div>
      ) : posts.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="pt-10 pb-10 text-center">
            <Sparkles className="mx-auto text-muted-foreground" size={28} />
            <p className="font-semibold mt-3">No posts yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Generate your first batch of AI posts to see them here.</p>
            <Link href="/dashboard/social/generate">
              <Button className="gap-2"><Sparkles size={14} /> Generate Posts</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((p) => {
            const Icon = TYPE_ICONS[p.postType]
            const meta = PLATFORM_META[p.platform]
            const firstMediaUrl = p.media?.[0]?.url
            return (
              <Card key={p.id} className="border-2 overflow-hidden hover:border-primary/40 transition-colors group">
                <Link href={`/dashboard/social/posts/${p.id}`} className="block">
                  {firstMediaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={firstMediaUrl} alt="" className="w-full aspect-square object-cover bg-slate-100" />
                  ) : (
                    <div className="w-full aspect-square bg-gradient-to-br from-primary/5 to-primary/20 flex items-center justify-center">
                      <Icon size={36} className="text-primary/60" />
                    </div>
                  )}
                </Link>
                <CardContent className="pt-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("size-7 rounded-md flex items-center justify-center", meta.bg, meta.color)}>
                        <Icon size={14} />
                      </div>
                      <span className="text-xs font-semibold">{meta.label}</span>
                    </div>
                    <Badge variant="secondary" className={cn("text-[10px] uppercase font-bold", STATUS_STYLES[p.status])}>
                      {p.status.toLowerCase()}
                    </Badge>
                  </div>
                  <Link href={`/dashboard/social/posts/${p.id}`}>
                    <p className="text-sm line-clamp-2 leading-snug">{p.caption || <span className="italic text-muted-foreground">(no caption yet)</span>}</p>
                  </Link>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                    <div className="flex gap-1">
                      {p.externalPostUrl && (
                        <a href={p.externalPostUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                          className="hover:text-primary">
                          <ExternalLink size={12} />
                        </a>
                      )}
                      <button onClick={(e) => { e.preventDefault(); handleDelete(p.id) }} className="hover:text-red-600">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
