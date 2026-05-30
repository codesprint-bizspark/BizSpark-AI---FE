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
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

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
      } catch (e) { console.error(e) }
    }
    fetchBiz()
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [])

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
    const expoBase = (process.env.NEXT_PUBLIC_EXPO_URL || "exp://10.193.30.83:8081").replace(/\/$/, "")
    const expoDeepLink = `${expoBase}/--/?tenant=${activeBiz.id}`
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(expoDeepLink)}`

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

        <div className="rounded-2xl border-2 border-green-200 bg-green-50 px-6 py-5 flex items-center gap-4">
          <div className="size-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
            <Check size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-green-800">Your mobile app config is live!</p>
            <p className="text-sm text-green-700 mt-0.5">
              Scan the QR code below with the <strong>Expo Go</strong> app to preview your branded mobile app.
            </p>
          </div>
        </div>

        {/* ── QR Code — scan to open the live app ── */}
        <Card className="border-2">
          <CardContent className="pt-6 pb-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="rounded-xl border-2 border-slate-100 p-3 bg-white shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt="Scan to open mobile app" width={200} height={200} className="rounded-lg" />
            </div>
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div>
                <p className="font-bold text-lg flex items-center gap-2 justify-center sm:justify-start">
                  <Smartphone size={18} className="text-primary" /> Preview on your phone
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Install <strong>Expo Go</strong> (App Store / Play Store), then scan this QR code.
                  Your phone must be on the same Wi-Fi as the dev server.
                </p>
              </div>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Open the <strong>Expo Go</strong> app</li>
                <li>Tap <strong>Scan QR Code</strong></li>
                <li>Point at the code — your {activeBiz.name} app loads live</li>
              </ol>
              <code className="block text-[11px] text-muted-foreground bg-slate-50 border rounded px-2 py-1.5 break-all">
                {expoDeepLink}
              </code>
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
