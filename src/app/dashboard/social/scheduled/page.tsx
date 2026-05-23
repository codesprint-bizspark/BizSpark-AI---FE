"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Loader2, Calendar, Trash2, ExternalLink, Rocket } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { socialApi } from "@/lib/social/api"
import { SocialPost, PLATFORM_META } from "@/lib/social/types"
import { SocialSubNav } from "../sub-nav"

const STATUS_STYLES: Record<SocialPost["status"], string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  PUBLISHING: "bg-amber-100 text-amber-700",
  PUBLISHED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-500",
}

export default function ScheduledSocialPostsPage() {
  const { toast } = useToast()
  const [activeBizId, setActiveBizId] = useState("")
  const [scheduled, setScheduled] = useState<SocialPost[]>([])
  const [history, setHistory] = useState<SocialPost[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => { setActiveBizId(localStorage.getItem("active_biz_id") || "") }, [])

  const reload = useCallback(async () => {
    if (!activeBizId) return
    setIsLoading(true)
    try {
      const [s, h] = await Promise.all([
        socialApi.listScheduled(activeBizId),
        socialApi.listHistory(activeBizId, 50),
      ])
      setScheduled(s)
      setHistory(h)
    } catch (e: any) {
      toast({ title: "Couldn't load", description: e.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [activeBizId, toast])

  useEffect(() => { reload() }, [reload])

  const handleCancel = async (postId: string) => {
    if (!confirm("Cancel this scheduled post?")) return
    try {
      await socialApi.cancelScheduled(activeBizId, postId)
      await reload()
      toast({ title: "Cancelled" })
    } catch (e: any) {
      toast({ title: "Cancel failed", description: e.message, variant: "destructive" })
    }
  }

  if (!activeBizId) return null

  // group scheduled by day
  const grouped = scheduled.reduce<Record<string, SocialPost[]>>((acc, p) => {
    const day = p.scheduledAt ? new Date(p.scheduledAt).toDateString() : "Unscheduled"
    if (!acc[day]) acc[day] = []
    acc[day].push(p)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold font-headline">Scheduled & History</h2>
        <p className="text-muted-foreground mt-1">Upcoming posts and what you've already published.</p>
      </div>

      <SocialSubNav />

      {/* ── Upcoming ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-xl font-bold">Upcoming</h3>
          <span className="text-xs text-muted-foreground">{scheduled.length} post{scheduled.length === 1 ? "" : "s"}</span>
        </div>
        {isLoading ? (
          <div className="text-center text-muted-foreground text-sm"><Loader2 size={14} className="inline animate-spin mr-2" /> Loading…</div>
        ) : scheduled.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
              <Calendar className="mx-auto" size={26} />
              <p className="mt-2 text-sm">Nothing scheduled. Generate a post and schedule it from the preview screen.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([day, posts]) => (
              <div key={day}>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">{day}</p>
                <div className="space-y-2">
                  {posts.map((p) => {
                    const meta = PLATFORM_META[p.platform]
                    return (
                      <Card key={p.id} className="border-2 hover:border-primary/30 transition-colors">
                        <CardContent className="pt-3 pb-3 flex items-center gap-4">
                          <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", meta.bg, meta.color)}>
                            <Rocket size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold line-clamp-1">{p.caption || <span className="italic">No caption</span>}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {meta.label} · {p.scheduledAt ? new Date(p.scheduledAt).toLocaleString() : "—"}
                            </p>
                          </div>
                          <Badge variant="secondary" className={cn("uppercase text-[10px] font-bold", STATUS_STYLES[p.status])}>{p.status.toLowerCase()}</Badge>
                          <div className="flex gap-1">
                            <Link href={`/dashboard/social/posts/${p.id}`}>
                              <Button variant="ghost" size="sm">Open</Button>
                            </Link>
                            <Button variant="ghost" size="sm" onClick={() => handleCancel(p.id)} className="text-red-600 hover:bg-red-50">
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── History ───────────────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-xl font-bold">Published</h3>
          <span className="text-xs text-muted-foreground">{history.length}</span>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing published yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((p) => {
              const meta = PLATFORM_META[p.platform]
              return (
                <Card key={p.id} className="border-2">
                  <CardContent className="pt-3 pb-3 flex items-center gap-4">
                    <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", meta.bg, meta.color)}>
                      <Rocket size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold line-clamp-1">{p.caption || "—"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {meta.label} · {p.publishedAt ? new Date(p.publishedAt).toLocaleString() : "—"}
                      </p>
                    </div>
                    <Badge variant="secondary" className={cn("uppercase text-[10px] font-bold", STATUS_STYLES[p.status])}>{p.status.toLowerCase()}</Badge>
                    {p.externalPostUrl && (
                      <a href={p.externalPostUrl} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="sm" className="gap-1.5"><ExternalLink size={12} /> View</Button>
                      </a>
                    )}
                    <Link href={`/dashboard/social/posts/${p.id}`}>
                      <Button variant="ghost" size="sm">Open</Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
