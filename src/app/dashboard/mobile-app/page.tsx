"use client"

import { useEffect, useState, useRef } from "react"
import {
  Smartphone, RefreshCw, Sparkles, Check, Loader2, Rocket
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

const TONES = [
  { value: "professional", label: "Professional", emoji: "💼" },
  { value: "friendly",     label: "Friendly",     emoji: "😊" },
  { value: "bold",         label: "Bold",          emoji: "⚡" },
  { value: "minimal",      label: "Minimal",       emoji: "✦"  },
]

const STEPS = [
  { key: "QUEUED",           label: "Sending to AI",        desc: "Request queued"                         },
  { key: "PROCESSING",       label: "Building your app",    desc: "AI is crafting your mobile config"  },
  { key: "PENDING_APPROVAL", label: "Ready to review",      desc: "Config generated — awaiting you"        },
]

export default function MobileAppManagement() {
  const { toast } = useToast()
  const [activeBiz, setActiveBiz]               = useState<any>(null)
  const [deployStatus, setDeployStatus]         = useState<string | null>(null)
  const [currentTaskId, setCurrentTaskId]       = useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [isGenerating, setIsGenerating]         = useState(false)
  const [isApproving, setIsApproving]           = useState(false)
  const [isPublished, setIsPublished]           = useState(false)
  const [tone, setTone]                         = useState("professional")
  const [primaryColor, setPrimaryColor]         = useState("#3b82f6")
  const [tab, setTabState]                      = useState<"config" | "stores">(() => {
    if (typeof window === "undefined") return "config"
    return (sessionStorage.getItem("bs_mobile_tab") as "config" | "stores") || "config"
  })
  const setTab = (t: "config" | "stores") => {
    setTabState(t)
    try { sessionStorage.setItem("bs_mobile_tab", t) } catch {}
  }
  const [storeData, setStoreData]               = useState<any>(null)
  const [isRequestingStore, setIsRequestingStore] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const loadStoreStatus = async (bizId: string) => {
    try {
      const res = await apiClient.get(`/business/${bizId}/mobile-app/store-status`)
      setStoreData(res.data)
    } catch { /* no mobile app yet */ }
  }

  useEffect(() => {
    const fetchBiz = async () => {
      const activeId = localStorage.getItem("active_biz_id")
      if (!activeId) return
      try {
        const res = await apiClient.get(`/business/${activeId}`)
        if (res.data) {
          setActiveBiz(res.data)
          if (res.data.mobileApps?.length > 0 && res.data.mobileApps[0].status === "PUBLISHED") {
            setIsPublished(true)
          }
        }
        await loadStoreStatus(activeId)
      } catch (e) { console.error(e) }
    }
    fetchBiz()
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [])

  const handleRequestStore = async () => {
    if (!activeBiz) return
    setIsRequestingStore(true)
    try {
      await apiClient.post(`/business/${activeBiz.id}/mobile-app/store-request`, {})
      await loadStoreStatus(activeBiz.id)
      toast({ title: "Request submitted", description: "Our team will review your store publishing request." })
    } catch (e: any) {
      toast({ title: "Request failed", description: e.message, variant: "destructive" })
    } finally {
      setIsRequestingStore(false)
    }
  }

  const startPolling = (taskId: string) => {
    pollingRef.current = setInterval(async () => {
      try {
        const res = await apiClient.get(`/agents/tasks/${taskId}`)
        const task = res.data
        if (!task) return
        setDeployStatus(task.status)

        if (task.status === "PENDING_APPROVAL") {
          clearInterval(pollingRef.current!)
          setGeneratedContent(task.outputData?.generatedContent)
          setIsGenerating(false)
        }
        if (task.status === "FAILED") {
          clearInterval(pollingRef.current!)
          setIsGenerating(false)
          toast({ title: "Generation failed", description: task.outputData?.error || "Unknown error", variant: "destructive" })
        }
      } catch (e) { console.error(e) }
    }, 500)
  }

  const handleGenerate = async () => {
    if (!activeBiz) return
    setIsGenerating(true)
    setIsPublished(false)
    setGeneratedContent(null)
    setDeployStatus("QUEUED")

    try {
      await apiClient.post(`/business/${activeBiz.id}/mobile-app`, { primaryColor })
      const res = await apiClient.post(`/business/${activeBiz.id}/mobile-app/deploy`, { tone, primaryColor })
      const taskId = res?.data?.taskId
      if (!taskId) throw new Error("No taskId returned")
      setCurrentTaskId(taskId)
      startPolling(taskId)
    } catch (e: any) {
      setIsGenerating(false)
      setDeployStatus(null)
      toast({ title: "Failed to start generation", description: e.message, variant: "destructive" })
    }
  }

  const handleApprove = async () => {
    if (!currentTaskId || !generatedContent) return
    setIsApproving(true)
    try {
      await apiClient.post(`/agents/tasks/${currentTaskId}/approve`, { content: generatedContent })
      setIsPublished(true)
      setGeneratedContent(null)
      setDeployStatus("COMPLETED")
    } catch (e: any) {
      toast({ title: "Publish failed", description: e.message, variant: "destructive" })
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!currentTaskId) return
    try { await apiClient.post(`/agents/tasks/${currentTaskId}/reject`, {}) } catch { /* best-effort */ }
    setGeneratedContent(null)
    setDeployStatus(null)
    setCurrentTaskId(null)
  }

  if (!activeBiz) return null

  // ── Tab navigation (shown on settled screens) ────────────────────────────────
  const TabNav = () => (
    <div className="flex gap-1 border-b mb-6">
      <button
        onClick={() => setTab("config")}
        className={cn(
          "px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors",
          tab === "config" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-slate-700"
        )}
      >
        App Config
      </button>
      <button
        onClick={() => setTab("stores")}
        className={cn(
          "px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors",
          tab === "stores" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-slate-700"
        )}
      >
        Publish to Stores
      </button>
    </div>
  )

  // ── STORE PUBLISHING TAB ──────────────────────────────────────────────────────
  if (tab === "stores" && !isGenerating && !(generatedContent && deployStatus === "PENDING_APPROVAL")) {
    const s = storeData?.storeStatus ?? "NONE"
    const configReady = storeData?.configStatus === "PUBLISHED" || isPublished

    const STATUS_META: Record<string, { label: string; cls: string; desc: string }> = {
      NONE:      { label: "Not requested", cls: "bg-slate-100 text-slate-600", desc: "Request publishing to the App Store and Google Play." },
      REQUESTED: { label: "Requested",     cls: "bg-blue-100 text-blue-700",   desc: "Your request was received. Our team will start the review soon." },
      IN_REVIEW: { label: "In review",     cls: "bg-amber-100 text-amber-700", desc: "Store submission in progress. This typically takes 2–3 months." },
      PUBLISHED: { label: "Published",     cls: "bg-green-100 text-green-700", desc: "Your app is live! Share the store links below." },
      REJECTED:  { label: "Rejected",      cls: "bg-red-100 text-red-700",     desc: "The request was declined. See the note below." },
    }
    const meta = STATUS_META[s] ?? STATUS_META.NONE

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold font-headline">My Mobile App</h2>
          <p className="text-muted-foreground mt-1">{activeBiz.name} · publish to app stores</p>
        </div>
        <TabNav />

        <div className="max-w-2xl space-y-5">
          {/* ── Delivery-style progress tracker ── */}
          {s !== "NONE" && (
            <Card className="border-2">
              <CardContent className="pt-7 pb-7 px-8">
                {(() => {
                  const TRACK = [
                    { key: "REQUESTED", label: "Requested", desc: "Request received" },
                    { key: "IN_REVIEW", label: "In Review", desc: "Store submission" },
                    { key: "PUBLISHED", label: "Published", desc: "Live on stores" },
                  ]
                  const rejected = s === "REJECTED"
                  const currentIdx = rejected ? 1 : TRACK.findIndex(t => t.key === s)
                  return (
                    <div className="flex items-start">
                      {TRACK.map((step, i) => {
                        const done = i < currentIdx
                        const active = i === currentIdx && !rejected
                        const isRejectedStep = rejected && i === 1
                        return (
                          <div key={step.key} className="flex-1 flex flex-col items-center relative">
                            {/* connector line */}
                            {i > 0 && (
                              <span className={cn(
                                "absolute top-4 right-1/2 w-full h-0.5 -z-0",
                                i <= currentIdx && !rejected ? "bg-primary" : "bg-slate-200"
                              )} />
                            )}
                            {/* node */}
                            <div className={cn(
                              "relative z-10 size-9 rounded-full flex items-center justify-center shrink-0 transition-all",
                              isRejectedStep ? "bg-red-500" :
                              done ? "bg-primary" :
                              active ? "bg-primary ring-4 ring-primary/20" :
                              "bg-slate-200"
                            )}>
                              {isRejectedStep ? <span className="text-white text-sm font-bold">×</span>
                              : done ? <Check size={16} className="text-white" />
                              : active ? <span className="size-2.5 rounded-full bg-white animate-pulse" />
                              : <span className="text-[11px] font-bold text-slate-400">{i + 1}</span>}
                            </div>
                            <p className={cn(
                              "text-xs font-semibold mt-2 text-center",
                              isRejectedStep ? "text-red-600" :
                              (done || active) ? "text-primary" : "text-slate-400"
                            )}>{isRejectedStep ? "Rejected" : step.label}</p>
                            <p className="text-[10px] text-muted-foreground text-center mt-0.5">{isRejectedStep ? "Declined" : step.desc}</p>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

                <div className="mt-6 pt-5 border-t text-center">
                  <p className="text-sm text-muted-foreground">{meta.desc}</p>
                  {storeData?.storeNote && (
                    <p className="text-sm mt-3 rounded-lg bg-slate-50 border px-3 py-2 text-left">
                      <strong>Note from our team:</strong> {storeData.storeNote}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Published — show store links */}
          {s === "PUBLISHED" && (
            <div className="grid sm:grid-cols-2 gap-3">
              <a href={storeData?.playStoreUrl || "#"} target="_blank" rel="noreferrer"
                className={cn("rounded-xl border-2 p-4 flex flex-col gap-2 transition-colors",
                  storeData?.playStoreUrl ? "hover:border-primary/40" : "opacity-40 pointer-events-none")}>
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-lg bg-white border flex items-center justify-center shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://img.icons8.com/color/96/google-play.png" alt="Google Play" width={24} height={24} />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Get it on</p>
                    <p className="font-bold text-sm leading-tight">Google Play</p>
                    <p className="text-xs text-primary font-medium">{storeData?.playStoreUrl ? "View listing →" : "Not linked yet"}</p>
                  </div>
                </div>
                {storeData?.playStoreUrl && (
                  <code className="text-[10px] text-muted-foreground bg-slate-50 border rounded px-2 py-1 break-all leading-snug">
                    {storeData.playStoreUrl}
                  </code>
                )}
              </a>
              <a href={storeData?.appStoreUrl || "#"} target="_blank" rel="noreferrer"
                className={cn("rounded-xl border-2 p-4 flex flex-col gap-2 transition-colors",
                  storeData?.appStoreUrl ? "hover:border-primary/40" : "opacity-40 pointer-events-none")}>
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-lg bg-black flex items-center justify-center shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://cdn.simpleicons.org/apple/white" alt="App Store" width={22} height={22} />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Download on the</p>
                    <p className="font-bold text-sm leading-tight">App Store</p>
                    <p className="text-xs text-primary font-medium">{storeData?.appStoreUrl ? "View listing →" : "Not linked yet"}</p>
                  </div>
                </div>
                {storeData?.appStoreUrl && (
                  <code className="text-[10px] text-muted-foreground bg-slate-50 border rounded px-2 py-1 break-all leading-snug">
                    {storeData.appStoreUrl}
                  </code>
                )}
              </a>
            </div>
          )}

          {/* Request button */}
          {(s === "NONE" || s === "REJECTED") && (
            <Card className="border-2">
              <CardContent className="pt-5 pb-5 space-y-4">
                <div>
                  <p className="text-sm font-semibold">Request store publishing</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    We&apos;ll prepare your branded app for both stores, handle the
                    submission, and add the live links here once approved. Store review typically takes 2–3 months.
                  </p>
                </div>

                {/* Target stores */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border-2 border-dashed p-4 flex items-center gap-3">
                    <div className="size-11 rounded-lg bg-white border flex items-center justify-center shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="https://img.icons8.com/color/96/google-play.png" alt="Google Play" width={24} height={24} />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Get it on</p>
                      <p className="font-bold text-sm leading-tight">Google Play</p>
                    </div>
                  </div>
                  <div className="rounded-xl border-2 border-dashed p-4 flex items-center gap-3">
                    <div className="size-11 rounded-lg bg-black flex items-center justify-center shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="https://cdn.simpleicons.org/apple/white" alt="App Store" width={22} height={22} />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Download on the</p>
                      <p className="font-bold text-sm leading-tight">App Store</p>
                    </div>
                  </div>
                </div>

                {!configReady && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Publish your app config first (App Config tab) before requesting store publishing.
                  </p>
                )}
                <Button onClick={handleRequestStore} disabled={isRequestingStore || !configReady} className="gap-2">
                  {isRequestingStore ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}
                  Request Publishing
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Target stores preview while in progress */}
          {(s === "REQUESTED" || s === "IN_REVIEW") && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl border-2 p-4 flex items-center gap-3 bg-slate-50/50">
                  <div className="size-11 rounded-lg bg-white border flex items-center justify-center shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://img.icons8.com/color/96/google-play.png" alt="Google Play" width={24} height={24} />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Get it on</p>
                    <p className="font-bold text-sm leading-tight">Google Play</p>
                    <p className="text-xs text-amber-600">Preparing…</p>
                  </div>
                </div>
                <div className="rounded-xl border-2 p-4 flex items-center gap-3 bg-slate-50/50">
                  <div className="size-11 rounded-lg bg-black flex items-center justify-center shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://cdn.simpleicons.org/apple/white" alt="App Store" width={22} height={22} />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Download on the</p>
                    <p className="font-bold text-sm leading-tight">App Store</p>
                    <p className="text-xs text-amber-600">Preparing…</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Store review typically takes 2–3 months. We&apos;ll update this page once your app is live.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── GENERATING ──────────────────────────────────────────────────────────────
  if (isGenerating) {
    const activeIdx = Math.max(0, STEPS.findIndex(s => s.key === deployStatus))
    return (
      <div className="h-full flex flex-col items-center justify-center gap-10 text-center px-6">
        <div className="relative flex items-center justify-center">
          <span className="absolute inline-flex size-28 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "1.8s" }} />
          <span className="absolute inline-flex size-20 rounded-full bg-primary/15 animate-ping" style={{ animationDuration: "2.4s", animationDelay: "0.4s" }} />
          <div className="relative size-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Smartphone className="text-white animate-pulse" size={26} />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Generating <span className="text-primary">{activeBiz.name}</span> App</h2>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            AI is designing a custom mobile app experience tailored to your business.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 w-full max-w-sm text-left">
          {STEPS.map((step, i) => {
            const done   = i < activeIdx
            const active = i === activeIdx
            return (
              <div key={step.key} className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 border transition-all duration-500",
                active  && "border-primary/30 bg-primary/5 shadow-sm",
                done    && "border-green-200 bg-green-50",
                !active && !done && "border-slate-100 opacity-35"
              )}>
                <div className={cn(
                  "size-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
                  done   && "bg-green-500",
                  active && "bg-primary",
                  !active && !done && "bg-slate-200"
                )}>
                  {done    ? <Check size={13} className="text-white" />
                  : active ? <Loader2 size={13} className="text-white animate-spin" />
                  :          <span className="text-[11px] text-slate-400 font-bold">{i + 1}</span>}
                </div>
                <div>
                  <p className={cn("text-sm font-semibold leading-none mb-0.5",
                    active ? "text-primary" : done ? "text-green-700" : "text-slate-400"
                  )}>{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">Usually 15–30 seconds</p>
      </div>
    )
  }

  // ── APPROVE ──────────────────────────────────────────────────────────────────
  if (generatedContent && deployStatus === "PENDING_APPROVAL") {
    const g = generatedContent

    const setG = (patch: any) => setGeneratedContent((prev: any) => ({ ...prev, ...patch }))
    const setScreen = (key: string, patch: any) => setGeneratedContent((prev: any) => ({
      ...prev,
      screens: { ...(prev.screens ?? {}), [key]: { ...(prev.screens?.[key] ?? {}), ...patch } }
    }))
    const setNavItem = (i: number, patch: any) => setGeneratedContent((prev: any) => {
      const nav = [...(prev.navigation ?? [])]
      nav[i] = { ...nav[i], ...patch }
      return { ...prev, navigation: nav }
    })

    const field = "w-full text-sm border rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
    const textarea = "w-full text-xs border rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold font-headline flex items-center gap-2">
              <Sparkles size={22} className="text-primary" /> Review & Edit
            </h2>
            <p className="text-muted-foreground mt-1">Edit any field, then publish your mobile app config.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReject} disabled={isApproving}>
              <RefreshCw size={14} className="mr-1.5" /> Redo
            </Button>
            <Button size="sm" onClick={handleApprove} disabled={isApproving} className="gap-2 px-5">
              {isApproving
                ? <><Loader2 size={14} className="animate-spin" /> Publishing…</>
                : <><Rocket size={14} /> Publish Config</>}
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Branding */}
          <Card className="border-2">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Branding</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <input className={field} value={g.tagline ?? ""} onChange={e => setG({ tagline: e.target.value })} placeholder="Tagline" />
              <div className="flex flex-wrap items-center gap-3">
                {[
                  { key: "primaryColor", label: "Primary" },
                  { key: "accentColor", label: "Accent" },
                  { key: "backgroundColor", label: "Background" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <input type="color" value={g[key] ?? "#000000"} onChange={e => setG({ [key]: e.target.value })}
                      className="size-8 rounded cursor-pointer border" />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Splash Screen */}
          <Card className="border-2">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Splash Screen</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              <input className={field} value={g.splashScreen?.title ?? ""} placeholder="App title"
                onChange={e => setG({ splashScreen: { ...(g.splashScreen ?? {}), title: e.target.value } })} />
              <input className={field} value={g.splashScreen?.subtitle ?? ""} placeholder="Subtitle"
                onChange={e => setG({ splashScreen: { ...(g.splashScreen ?? {}), subtitle: e.target.value } })} />
            </CardContent>
          </Card>

          {/* Home Screen */}
          <Card className="border-2">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Home Screen</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              <input className={field} value={g.screens?.home?.heroTitle ?? ""} placeholder="Hero title"
                onChange={e => setScreen("home", { heroTitle: e.target.value })} />
              <input className={field} value={g.screens?.home?.heroSubtitle ?? ""} placeholder="Hero subtitle"
                onChange={e => setScreen("home", { heroSubtitle: e.target.value })} />
              <input className={field} value={g.screens?.home?.ctaText ?? ""} placeholder="CTA button text"
                onChange={e => setScreen("home", { ctaText: e.target.value })} />
              <input className={field} value={g.screens?.home?.promoText ?? ""} placeholder="Promo message"
                onChange={e => setScreen("home", { promoText: e.target.value })} />
            </CardContent>
          </Card>

          {/* About Screen */}
          <Card className="border-2">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">About Screen</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              <input className={field} value={g.screens?.about?.title ?? ""} placeholder="About title"
                onChange={e => setScreen("about", { title: e.target.value })} />
              <textarea className={textarea} rows={3} value={g.screens?.about?.text ?? ""} placeholder="About text"
                onChange={e => setScreen("about", { text: e.target.value })} />
            </CardContent>
          </Card>

          {/* Navigation Tabs */}
          {g.navigation?.length > 0 && (
            <Card className="border-2 sm:col-span-2">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Navigation Tabs</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {g.navigation.map((nav: any, i: number) => (
                    <div key={i} className="rounded-lg border bg-slate-50 px-3 py-2.5 space-y-1.5">
                      <input className={field + " font-semibold"} value={nav.label ?? ""} placeholder="Tab label"
                        onChange={e => setNavItem(i, { label: e.target.value })} />
                      <span className="text-[10px] font-mono text-slate-400">icon: {nav.icon}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* App Store Copy */}
          <Card className="border-2">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">App Store Copy</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              <textarea className={textarea} rows={3} value={g.appStoreDescription ?? ""} placeholder="App store description"
                onChange={e => setG({ appStoreDescription: e.target.value })} />
              <input className={field} value={g.appStoreKeywords ?? ""} placeholder="Keywords (comma separated)"
                onChange={e => setG({ appStoreKeywords: e.target.value })} />
            </CardContent>
          </Card>

          {/* Push Notifications */}
          <Card className="border-2">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Push Notifications</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              <input className={field} value={g.notificationMessages?.orderConfirmed ?? ""} placeholder="Order confirmed message"
                onChange={e => setG({ notificationMessages: { ...(g.notificationMessages ?? {}), orderConfirmed: e.target.value } })} />
              <input className={field} value={g.notificationMessages?.orderReady ?? ""} placeholder="Order ready message"
                onChange={e => setG({ notificationMessages: { ...(g.notificationMessages ?? {}), orderReady: e.target.value } })} />
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Edit any field above, then hit <strong>Publish Config</strong>. Want a completely different result? Hit <strong>Redo</strong>.
        </p>
      </div>
    )
  }

  // ── PUBLISHED ────────────────────────────────────────────────────────────────
  if (isPublished) {
    // EAS Build install link — installs the real BizSpark APK once (no laptop, works anywhere).
    const installUrl = process.env.NEXT_PUBLIC_MOBILE_INSTALL_URL
      || "https://expo.dev/accounts/adithaf7/projects/bizpark-mobile/builds/eb04861b-de2f-46db-a1cb-cf9c07ce4085"
    // Per-business deep link — opens the installed app showing THIS business's branding.
    const appScheme = process.env.NEXT_PUBLIC_MOBILE_SCHEME || "bizpark"
    const deepLink = `${appScheme}://?tenant=${activeBiz.id}`
    // QR encodes an https "open" page (scanners can open https, not custom schemes).
    // That page bounces into the app via the deep link, with an install fallback.
    const origin = typeof window !== "undefined" ? window.location.origin : "https://bizspark.online"
    const openUrl = `${origin}/m?tenant=${activeBiz.id}`
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(openUrl)}`

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold font-headline">My Mobile App</h2>
            <p className="text-muted-foreground mt-1">{activeBiz.name} · AI-powered mobile configuration</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setIsPublished(false); setDeployStatus(null); setCurrentTaskId(null) }} className="gap-2">
            <RefreshCw size={14} /> Regenerate
          </Button>
        </div>

        <TabNav />

        <div className="rounded-2xl border-2 border-green-200 bg-green-50 px-6 py-5 flex items-center gap-4">
          <div className="size-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
            <Check size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-green-800">Your mobile app is live!</p>
            <p className="text-sm text-green-700 mt-0.5">
              Scan the QR with your phone camera to open your branded {activeBiz.name} app.
            </p>
          </div>
        </div>

        {/* ── Per-business QR — opens the installed app with THIS tenant's branding ── */}
        <Card className="border-2">
          <CardContent className="pt-6 pb-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="rounded-xl border-2 border-slate-100 p-3 bg-white shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt={`Open ${activeBiz.name} app`} width={200} height={200} className="rounded-lg" />
            </div>
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div>
                <p className="font-bold text-lg flex items-center gap-2 justify-center sm:justify-start">
                  <Smartphone size={18} className="text-primary" /> Open your app
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Scan with your phone camera — the app opens showing <strong>{activeBiz.name}</strong>&apos;s
                  branding, products and content.
                </p>
              </div>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li><strong>First time?</strong> Install the app once (link below)</li>
                <li>Open your phone <strong>Camera</strong> → point at this QR</li>
                <li>The app opens as your {activeBiz.name} app</li>
              </ol>
              <div className="flex flex-col gap-1 pt-1">
                <code className="text-[11px] text-muted-foreground bg-slate-50 border rounded px-2 py-1.5 break-all">
                  {deepLink}
                </code>
                <a href={installUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-primary font-medium underline underline-offset-2">
                  First time? Install the app →
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">What was generated</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {[
                "Brand colors (primary, accent, background)",
                "Splash screen content",
                "4 bottom navigation tabs",
                "Home screen copy & CTA",
                "About screen brand story",
                "App Store description & keywords",
                "Push notification templates",
              ].map(item => (
                <div key={item} className="flex items-center gap-2 text-slate-700">
                  <Check size={14} className="text-green-500 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── INTAKE FORM ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold font-headline flex items-center gap-2">
          <Smartphone size={24} className="text-primary" /> Generate Your Mobile App
        </h2>
        <p className="text-muted-foreground mt-1">
          AI will design a complete mobile app configuration for <strong>{activeBiz.name}</strong> in seconds.
        </p>
      </div>

      <TabNav />

      <div className="max-w-lg">
        <Card className="border-2">
          <CardContent className="pt-6 space-y-6">
            <div>
              <p className="text-sm font-semibold mb-3">App tone</p>
              <div className="grid grid-cols-4 gap-2">
                {TONES.map(t => (
                  <button key={t.value} type="button" onClick={() => setTone(t.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl py-3 px-2 border-2 text-xs font-medium transition-all",
                      tone === t.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-slate-200 hover:border-primary/40 text-slate-600"
                    )}>
                    <span className="text-lg">{t.emoji}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-3">Brand color</p>
              <div className="flex items-center gap-3">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                  className="size-10 rounded-lg cursor-pointer border-2 border-slate-200" />
                <span className="font-mono text-sm text-muted-foreground">{primaryColor}</span>
                <span className="text-xs text-muted-foreground">· AI builds a full color system from this</span>
              </div>
            </div>

            <Button size="lg" className="w-full gap-2 h-12 text-base" onClick={handleGenerate}>
              <Sparkles size={18} /> Generate Mobile App
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground mt-3">
          AI-powered · 15–30 seconds · Review before publishing
        </p>
      </div>
    </div>
  )
}
