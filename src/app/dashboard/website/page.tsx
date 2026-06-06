"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ExternalLink, RefreshCw, Sparkles, Check, Loader2, Pencil, Eye } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ToastAction } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { isQuotaError, isUsageExhausted, quotaErrorDescription, usageApi, type UsageSnapshot } from "@/lib/usage"
import { StoreAddressCard } from "./store-address-card"

const TONES = [
  { value: "professional", label: "Professional", emoji: "💼" },
  { value: "friendly",     label: "Friendly",     emoji: "😊" },
  { value: "bold",         label: "Bold",          emoji: "⚡" },
  { value: "minimal",      label: "Minimal",       emoji: "✦"  },
]

const STEPS = [
  { key: "QUEUED",           label: "Sending to AI",        desc: "Request queued"                     },
  { key: "PROCESSING",       label: "Writing your website", desc: "AI is crafting your content"  },
  { key: "PENDING_APPROVAL", label: "Ready to review",      desc: "Content generated — awaiting you"   },
]

export default function WebsiteManagement() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeBiz, setActiveBiz]         = useState<any>(null)
  const [deployStatus, setDeployStatus]   = useState<string | null>(null)
  const [, setCurrentTaskId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating]   = useState(false)
  const [isPublished, setIsPublished]     = useState(false)
  const [adminCredentials, setAdminCredentials] = useState<{ email: string; password: string } | null>(null)
  const [isRevealing, setIsRevealing]     = useState(false)
  const [tone, setTone]                   = useState("professional")
  const [primaryColor, setPrimaryColor]   = useState("#2563eb")
  const [usage, setUsage]                 = useState<UsageSnapshot | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

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

  useEffect(() => {
    const fetchBiz = async () => {
      const activeId = localStorage.getItem("active_biz_id")
      if (!activeId) return
      try {
        const [res, usageRes] = await Promise.all([
          apiClient.get(`/business/${activeId}`),
          usageApi.get().catch(() => null),
        ])
        if (res.data) {
          setActiveBiz(res.data)
          if (res.data.websites?.length > 0) {
            const website = res.data.websites[0]
            if (website.status === "PUBLISHED") setIsPublished(true)
            const stored = localStorage.getItem(`admin_creds_${res.data.id}`)
            if (stored) setAdminCredentials(JSON.parse(stored))
          }
        }
        setUsage(usageRes)
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
          setIsGenerating(false)
          router.push(`/dashboard/website/editor?taskId=${taskId}`)
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
    if (isUsageExhausted(usage, "websiteGenerations")) {
      showQuotaToast("Website generation limit reached. Upgrade in Plans & Billing to continue.")
      return
    }
    setIsGenerating(true)
    setIsPublished(false)
    setDeployStatus("QUEUED")

    try {
      await apiClient.post(`/business/${activeBiz.id}/website`, {
        cmsData: { "brand.primaryColor": primaryColor },
      })
      const res = await apiClient.post(`/business/${activeBiz.id}/website/deploy`, { tone })
      const taskId = res?.data?.taskId
      if (!taskId) throw new Error("No taskId returned")
      setCurrentTaskId(taskId)
      usageApi.get().then(setUsage).catch(() => undefined)
      startPolling(taskId)
    } catch (e: any) {
      setIsGenerating(false)
      setDeployStatus(null)
      if (isQuotaError(e)) {
        showQuotaToast(quotaErrorDescription(e))
        usageApi.get().then(setUsage).catch(() => undefined)
        return
      }
      toast({ title: "Failed to start generation", description: e.message, variant: "destructive" })
    }
  }

  const handleRevealCredentials = async () => {
    if (!activeBiz?.id) return
    setIsRevealing(true)
    try {
      const res = await apiClient.post(`/business/${activeBiz.id}/store-credentials/reveal`, {})
      const creds = res.data
      if (creds) {
        setAdminCredentials(creds)
        localStorage.setItem(`admin_creds_${activeBiz.id}`, JSON.stringify(creds))
        toast({ title: "Store login ready", description: "A fresh password was generated — save it." })
      }
    } catch (e: any) {
      toast({ title: "Couldn't reveal login", description: e.message, variant: "destructive" })
    } finally {
      setIsRevealing(false)
    }
  }

  if (!activeBiz) return null
  const websiteQuotaBlocked = isUsageExhausted(usage, "websiteGenerations")

  // ── GENERATING ──────────────────────────────────────────────────────────────
  if (isGenerating) {
    const activeIdx = Math.max(0, STEPS.findIndex(s => s.key === deployStatus))

    return (
      <div className="h-full flex flex-col items-center justify-center gap-10 text-center px-6">
        <div className="relative flex items-center justify-center">
          <span className="absolute inline-flex size-28 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "1.8s" }} />
          <span className="absolute inline-flex size-20 rounded-full bg-primary/15 animate-ping" style={{ animationDuration: "2.4s", animationDelay: "0.4s" }} />
          <div className="relative size-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Sparkles className="text-white animate-spin" size={26} style={{ animationDuration: "3s" }} />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Building <span className="text-primary">{activeBiz.name}</span></h2>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            AI is crafting professional content tailored to your business.
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

        <p className="text-xs text-muted-foreground">Usually 10–20 seconds</p>
      </div>
    )
  }

  // ── PUBLISHED ────────────────────────────────────────────────────────────────
  if (isPublished) {
    const commerceBase = (process.env.NEXT_PUBLIC_COMMERCE_WEB_URL || process.env.NEXT_PUBLIC_COMMERCE_URL || 'http://localhost:3004').replace(/\/$/, '')
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'bizspark.online'
    // Once the business has claimed a subdomain, show that as the live URL
    // (e.g. kalu.bizspark.online); otherwise fall back to the shared store host.
    const storefrontUrl = activeBiz.slug
      ? `https://${activeBiz.slug}.${baseDomain}`
      : `${commerceBase}/?tenant=${activeBiz.id}`
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold font-headline">My Website</h2>
            <p className="text-muted-foreground mt-1">{activeBiz.name} · AI-powered storefront</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setIsPublished(false); setDeployStatus(null); setCurrentTaskId(null) }} className="gap-2">
              <RefreshCw size={14} /> Regenerate
            </Button>
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link href="/dashboard/website/editor">
                <Pencil size={14} /> Edit Website
              </Link>
            </Button>
            <Button size="sm" className="gap-2" asChild>
              <a href={storefrontUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> View Storefront
              </a>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-green-200 bg-green-50 px-6 py-5 flex items-center gap-4">
          <div className="size-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
            <Check size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-green-800">Your website is live!</p>
            <a href={storefrontUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm text-green-700 underline underline-offset-2 truncate block">
              {storefrontUrl}
            </a>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 border-green-300 text-green-700 hover:bg-green-100 shrink-0" asChild>
            <a href={storefrontUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={13} /> Open
            </a>
          </Button>
        </div>

        <StoreAddressCard
          businessId={activeBiz.id}
          initialSlug={activeBiz.slug}
          baseDomain={process.env.NEXT_PUBLIC_BASE_DOMAIN || "bizspark.online"}
          onClaimed={(slug) => setActiveBiz((prev: any) => ({ ...prev, slug }))}
        />

        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm text-amber-800">Store Admin Login</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2">
            {adminCredentials ? (
              <>
                {[
                  { label: "Login URL", value: activeBiz.slug ? `https://${activeBiz.slug}.${baseDomain}/auth` : `${commerceBase}/auth?tenant=${activeBiz.id}` },
                  { label: "Email",     value: adminCredentials.email },
                  { label: "Password",  value: adminCredentials.password },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">{row.label}</span>
                    <span className="font-mono text-xs flex-1 truncate">{row.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-amber-700">Use these to manage products, orders, and store settings.</p>
                  <Button variant="ghost" size="sm" onClick={handleRevealCredentials} disabled={isRevealing}
                    className="text-amber-700 hover:bg-amber-100 gap-1.5">
                    {isRevealing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    Reset password
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-amber-700">
                  Reveal your store admin login to manage products, orders, and settings.
                  A fresh password is generated each time.
                </p>
                <Button onClick={handleRevealCredentials} disabled={isRevealing} className="gap-2">
                  {isRevealing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                  Reveal store login
                </Button>
              </div>
            )}
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
          <Sparkles size={24} className="text-primary" /> Generate Your Website
        </h2>
        <p className="text-muted-foreground mt-1">
          AI will write professional content for <strong>{activeBiz.name}</strong> in seconds.
        </p>
      </div>

      <div className="max-w-lg">
        <Card className="border-2">
          <CardContent className="pt-6 space-y-6">
            <div>
              <p className="text-sm font-semibold mb-3">Writing tone</p>
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
                <span className="text-xs text-muted-foreground">· AI builds a full palette from this</span>
              </div>
            </div>

            <Button size="lg" className="w-full gap-2 h-12 text-base" onClick={handleGenerate} disabled={websiteQuotaBlocked}>
              <Sparkles size={18} /> Generate Website
            </Button>
            {websiteQuotaBlocked && (
              <p className="text-xs text-center text-destructive">
                Website limit reached. <Link href="/dashboard/settings?tab=billing" className="font-semibold underline">Upgrade plan</Link>
              </p>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground mt-3">
          Powered by OpenAI · 10–20 seconds · Review before publishing
        </p>
      </div>
    </div>
  )
}
