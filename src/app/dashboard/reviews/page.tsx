"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageSquareText,
  RefreshCw,
  Send,
  Star,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ToastAction } from "@/components/ui/toast"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { isQuotaError, isUsageExhausted, quotaErrorDescription, usageApi, type UsageSnapshot } from "@/lib/usage"

type Location = {
  name: string
  title: string
  address: string
  verified: boolean
}

type Review = {
  id: string
  reviewerDisplayName: string | null
  reviewerIsAnonymous: boolean
  rating: number
  comment: string | null
  googleReply: string | null
  aiReply: string | null
  status: "SYNCED" | "AI_PENDING" | "PENDING_APPROVAL" | "REPLIED" | "FAILED"
  failureReason: string | null
  reviewCreateTime: string | null
}

const statusTone: Record<Review["status"], string> = {
  SYNCED: "border-slate-200 text-slate-600",
  AI_PENDING: "border-blue-200 text-blue-700 bg-blue-50",
  PENDING_APPROVAL: "border-amber-200 text-amber-700 bg-amber-50",
  REPLIED: "border-green-200 text-green-700 bg-green-50",
  FAILED: "border-red-200 text-red-700 bg-red-50",
}

export default function GoogleReviewsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [provider, setProvider] = useState("mock")
  const [connected, setConnected] = useState(false)
  const [locationName, setLocationName] = useState<string | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [usage, setUsage] = useState<UsageSnapshot | null>(null)

  const showQuotaToast = (description: string) => {
    toast({
      title: "Plan limit reached",
      description,
      variant: "destructive",
      action: (
        <ToastAction altText="Open billing" onClick={() => router.push("/dashboard/settings?tab=billing")}>
          Upgrade
        </ToastAction>
      ),
    })
  }

  const pendingAiCount = useMemo(
    () => reviews.filter(review => review.status === "AI_PENDING").length,
    [reviews],
  )

  const loadReviews = useCallback(async (id: string) => {
    const res = await apiClient.get(`/google-business/reviews?businessId=${id}`)
    const rows = res.data ?? []
    setReviews(rows)
    setDrafts(prev => {
      const next = { ...prev }
      for (const review of rows) {
        if (review.aiReply && !next[review.id]) next[review.id] = review.aiReply
      }
      return next
    })
  }, [])

  const loadAll = useCallback(async () => {
    const id = localStorage.getItem("active_biz_id")
    if (!id) return
    setBusinessId(id)
    setLoading(true)
    try {
      usageApi.get().then(setUsage).catch(() => undefined)
      const status = await apiClient.get(`/google-business/status?businessId=${id}`)
      setConnected(Boolean(status.connected))
      setProvider(status.provider || "mock")
      setLocationName(status.connection?.locationName ?? null)

      if (status.connected) {
        const locRes = await apiClient.get(`/google-business/locations?businessId=${id}`)
        setLocations(locRes.data ?? [])
      }
      if (status.connection?.locationName) {
        await loadReviews(id)
      }
    } catch (error: any) {
      toast({ title: "Could not load Google reviews", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [loadReviews, toast])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!businessId || pendingAiCount === 0) return
    const interval = setInterval(() => {
      loadReviews(businessId).catch(() => undefined)
    }, 2500)
    return () => clearInterval(interval)
  }, [businessId, loadReviews, pendingAiCount])

  const connectMock = async () => {
    if (!businessId) return
    setLoading(true)
    try {
      await apiClient.post("/google-business/connect/mock", { businessId })
      await loadAll()
      toast({ title: "Google mock connected", description: "Demo locations are ready for testing." })
    } catch (error: any) {
      toast({ title: "Connection failed", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const selectLocation = async (value: string) => {
    if (!businessId) return
    setLocationName(value)
    try {
      await apiClient.post("/google-business/locations/select", { businessId, locationName: value })
      setReviews([])
      toast({ title: "Location selected", description: "Sync reviews to start generating replies." })
    } catch (error: any) {
      toast({ title: "Could not select location", description: error.message, variant: "destructive" })
    }
  }

  const syncReviews = async () => {
    if (!businessId) return
    if (isUsageExhausted(usage, "socialPostGenerations")) {
      showQuotaToast("Social action limit reached. Upgrade in Plans & Billing to continue.")
      return
    }
    setSyncing(true)
    try {
      await apiClient.post("/google-business/reviews/sync", { businessId })
      await loadReviews(businessId)
      usageApi.get().then(setUsage).catch(() => undefined)
      toast({ title: "Reviews synced", description: "AI reply tasks have been queued." })
    } catch (error: any) {
      if (isQuotaError(error)) {
        showQuotaToast(quotaErrorDescription(error))
        usageApi.get().then(setUsage).catch(() => undefined)
        return
      }
      toast({ title: "Sync failed", description: error.message, variant: "destructive" })
    } finally {
      setSyncing(false)
    }
  }

  const approve = async (review: Review) => {
    if (!businessId) return
    const replyText = (drafts[review.id] || review.aiReply || "").trim()
    if (!replyText) return
    setApprovingId(review.id)
    try {
      await apiClient.post(`/google-business/reviews/${review.id}/approve`, { replyText })
      await loadReviews(businessId)
      toast({ title: "Reply posted", description: "The approved reply is now marked as posted." })
    } catch (error: any) {
      toast({ title: "Approval failed", description: error.message, variant: "destructive" })
    } finally {
      setApprovingId(null)
    }
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  const socialQuotaBlocked = isUsageExhausted(usage, "socialPostGenerations")

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-headline">Google Reviews</h2>
          <p className="text-muted-foreground mt-1">Auto-reply to positive reviews and approve sensitive replies before posting.</p>
        </div>
        <Badge variant="outline" className="uppercase tracking-wide text-xs">
          {provider} mode
        </Badge>
      </div>

      <Card className="border-2">
        <CardContent className="pt-6 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="font-semibold flex items-center gap-2">
              <MessageSquareText size={18} className="text-primary" />
              Google Business Profile
            </p>
            <p className="text-sm text-muted-foreground">
              {connected ? "Connected. Select a location and sync reviews." : "Connect mock Google to test the full review workflow locally."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {!connected ? (
              <Button onClick={connectMock} className="gap-2">
                <CheckCircle2 size={16} /> Connect Mock Google
              </Button>
            ) : (
              <>
                <Select value={locationName ?? ""} onValueChange={selectLocation}>
                  <SelectTrigger className="w-full sm:w-[280px]">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(location => (
                      <SelectItem key={location.name} value={location.name}>
                        {location.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={syncReviews} disabled={!locationName || syncing || socialQuotaBlocked} className="gap-2">
                  {syncing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                  Sync Reviews
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {connected && socialQuotaBlocked && (
        <p className="text-xs text-destructive">
          Social action limit reached. <Link href="/dashboard/settings?tab=billing" className="font-semibold underline">Upgrade plan</Link>
        </p>
      )}

      {locationName && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin size={15} />
          {locations.find(location => location.name === locationName)?.address ?? "Selected Google Business location"}
        </div>
      )}

      <div className="grid gap-4">
        {reviews.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="py-12 text-center">
              <p className="font-semibold">No reviews synced yet</p>
              <p className="text-sm text-muted-foreground mt-1">Select a location, then sync reviews to queue AI replies.</p>
            </CardContent>
          </Card>
        ) : reviews.map(review => (
          <Card key={review.id} className="border-2">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    {review.reviewerDisplayName || "Anonymous reviewer"}
                  </CardTitle>
                  <div className="flex items-center gap-1 mt-2">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        size={15}
                        className={cn(index < review.rating ? "fill-amber-400 text-amber-400" : "text-slate-300")}
                      />
                    ))}
                  </div>
                </div>
                <Badge variant="outline" className={cn("w-fit", statusTone[review.status])}>
                  {review.status.replaceAll("_", " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-700">
                {review.comment || "Rating-only review"}
              </p>

              {review.status === "AI_PENDING" && (
                <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <Loader2 size={15} className="animate-spin" />
                  AI is writing a brand-safe reply.
                </div>
              )}

              {review.status === "FAILED" && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <AlertTriangle size={15} />
                  {review.failureReason || "Reply generation failed."}
                </div>
              )}

              {review.googleReply && (
                <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                  <p className="text-xs font-bold text-green-700 uppercase mb-1">Posted Reply</p>
                  <p className="text-sm text-green-900">{review.googleReply}</p>
                </div>
              )}

              {review.status === "PENDING_APPROVAL" && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-amber-700 uppercase">Review before posting</p>
                  <Textarea
                    value={drafts[review.id] ?? review.aiReply ?? ""}
                    onChange={event => setDrafts(prev => ({ ...prev, [review.id]: event.target.value }))}
                    rows={4}
                    className="text-sm"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={() => approve(review)}
                      disabled={approvingId === review.id || !(drafts[review.id] || review.aiReply || "").trim()}
                      className="gap-2"
                    >
                      {approvingId === review.id ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}
                      Approve & Post
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
