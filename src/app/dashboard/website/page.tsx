"use client"

import { useEffect, useState, useRef } from "react"
import { ExternalLink, RefreshCw, Sparkles, Check, Loader2, Rocket, Eye } from "lucide-react"
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
  { key: "QUEUED",           label: "Sending to AI",        desc: "Request queued"                     },
  { key: "PROCESSING",       label: "Writing your website", desc: "AI is crafting your content"  },
  { key: "PENDING_APPROVAL", label: "Ready to review",      desc: "Content generated — awaiting you"   },
]

export default function WebsiteManagement() {
  const { toast } = useToast()
  const [activeBiz, setActiveBiz]         = useState<any>(null)
  const [deployStatus, setDeployStatus]   = useState<string | null>(null)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [isGenerating, setIsGenerating]   = useState(false)
  const [isApproving, setIsApproving]     = useState(false)
  const [isPublished, setIsPublished]     = useState(false)
  const [adminCredentials, setAdminCredentials] = useState<{ email: string; password: string } | null>(null)
  const [isRevealing, setIsRevealing]     = useState(false)
  const [tone, setTone]                   = useState("professional")
  const [primaryColor, setPrimaryColor]   = useState("#2563eb")
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const fetchBiz = async () => {
      const activeId = localStorage.getItem("active_biz_id")
      if (!activeId) return
      try {
        const res = await apiClient.get(`/business/${activeId}`)
        if (res.data) {
          setActiveBiz(res.data)
          if (res.data.websites?.length > 0) {
            setIsPublished(true)
            const stored = localStorage.getItem(`admin_creds_${res.data.id}`)
            if (stored) setAdminCredentials(JSON.parse(stored))
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
      await apiClient.post(`/business/${activeBiz.id}/website`, {
        cmsData: { "brand.primaryColor": primaryColor },
      })
      const res = await apiClient.post(`/business/${activeBiz.id}/website/deploy`, { tone })
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

  const handleApprove = async () => {
    if (!currentTaskId || !generatedContent) return
    setIsApproving(true)
    try {
      const res = await apiClient.post(`/agents/tasks/${currentTaskId}/approve`, { content: generatedContent })
      const creds = res.adminCredentials
        ?? JSON.parse(localStorage.getItem(`admin_creds_${activeBiz?.id}`) || "null")
      if (creds) {
        setAdminCredentials(creds)
        if (activeBiz?.id) localStorage.setItem(`admin_creds_${activeBiz.id}`, JSON.stringify(creds))
      }
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
    try {
      await apiClient.post(`/agents/tasks/${currentTaskId}/reject`, {})
    } catch { /* best-effort */ }
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

  // ── APPROVE ──────────────────────────────────────────────────────────────────
  if (generatedContent && deployStatus === "PENDING_APPROVAL") {
    const g = generatedContent
    const c = g.content ?? {}

    const setG = (patch: any) => setGeneratedContent((prev: any) => ({ ...prev, ...patch }))
    const setC = (patch: any) => setGeneratedContent((prev: any) => ({
      ...prev, content: { ...(prev.content ?? {}), ...patch }
    }))
    const setFeature = (i: number, patch: any) => setGeneratedContent((prev: any) => {
      const features = [...(prev.content?.features ?? [])]
      features[i] = { ...features[i], ...patch }
      return { ...prev, content: { ...(prev.content ?? {}), features } }
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
            <p className="text-muted-foreground mt-1">Edit any field, then publish to your storefront.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReject} disabled={isApproving}>
              <RefreshCw size={14} className="mr-1.5" /> Redo
            </Button>
            <Button size="sm" onClick={handleApprove} disabled={isApproving} className="gap-2 px-5">
              {isApproving
                ? <><Loader2 size={14} className="animate-spin" /> Publishing…</>
                : <><Rocket size={14} /> Publish Now</>}
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
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <input type="color" value={g.primaryColor ?? "#2563eb"} onChange={e => setG({ primaryColor: e.target.value })}
                    className="size-8 rounded cursor-pointer border" />
                  <span className="text-xs text-muted-foreground">Primary</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input type="color" value={g.secondaryColor ?? "#ffffff"} onChange={e => setG({ secondaryColor: e.target.value })}
                    className="size-8 rounded cursor-pointer border" />
                  <span className="text-xs text-muted-foreground">Secondary</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Announcement */}
          <Card className="border-2">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Announcement Banner</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <input className={field} value={c.announcement?.text ?? ""} placeholder="Announcement text"
                onChange={e => setC({ announcement: { ...(c.announcement ?? {}), text: e.target.value, enabled: true } })} />
            </CardContent>
          </Card>

          {/* Hero */}
          <Card className="border-2">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Hero Section</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              <input className={field} value={c.hero?.title ?? ""} placeholder="Hero title"
                onChange={e => setC({ hero: { ...(c.hero ?? {}), title: e.target.value } })} />
              <textarea className={textarea} rows={2} value={c.hero?.subtitle ?? ""} placeholder="Hero subtitle"
                onChange={e => setC({ hero: { ...(c.hero ?? {}), subtitle: e.target.value } })} />
              <input className={field} value={c.hero?.ctaText ?? ""} placeholder="CTA button text"
                onChange={e => setC({ hero: { ...(c.hero ?? {}), ctaText: e.target.value } })} />
            </CardContent>
          </Card>

          {/* About */}
          <Card className="border-2">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">About Section</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              <input className={field} value={c.about?.title ?? ""} placeholder="About title"
                onChange={e => setC({ about: { ...(c.about ?? {}), title: e.target.value } })} />
              <textarea className={textarea} rows={3} value={c.about?.text ?? ""} placeholder="About text"
                onChange={e => setC({ about: { ...(c.about ?? {}), text: e.target.value } })} />
            </CardContent>
          </Card>

          {/* Features */}
          {c.features?.length > 0 && (
            <Card className="border-2 sm:col-span-2">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Features</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {c.features.map((f: any, i: number) => (
                    <div key={i} className="rounded-lg border bg-slate-50 px-3 py-2.5 space-y-1.5">
                      <input className={field + " font-semibold"} value={f.title ?? ""} placeholder="Title"
                        onChange={e => setFeature(i, { title: e.target.value })} />
                      <textarea className={textarea} rows={2} value={f.description ?? ""} placeholder="Description"
                        onChange={e => setFeature(i, { description: e.target.value })} />
                      <span className="text-[10px] font-mono text-slate-400">{f.icon}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* SEO */}
          <Card className="border-2">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">SEO</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              <textarea className={textarea} rows={2} value={c.seo?.metaDescription ?? ""} placeholder="Meta description"
                onChange={e => setC({ seo: { ...(c.seo ?? {}), metaDescription: e.target.value } })} />
              <input className={field} value={c.seo?.keywords ?? ""} placeholder="Keywords (comma separated)"
                onChange={e => setC({ seo: { ...(c.seo ?? {}), keywords: e.target.value } })} />
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="border-2">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Contact Email</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <input className={field + " font-mono"} type="email" value={c.footer?.contactEmail ?? ""} placeholder="contact@yourbusiness.com"
                onChange={e => setC({ footer: { ...(c.footer ?? {}), contactEmail: e.target.value } })} />
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Edit any field above, then hit <strong>Publish Now</strong>. Want a completely different result? Hit <strong>Redo</strong>.
        </p>
      </div>
    )
  }

  // ── PUBLISHED ────────────────────────────────────────────────────────────────
  if (isPublished) {
    const commerceBase = (process.env.NEXT_PUBLIC_COMMERCE_URL || 'http://localhost:3004').replace(/\/$/, '')
    const storefrontUrl = `${commerceBase}/?tenant=${activeBiz.id}`
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

        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-sm text-amber-800">Store Admin Login</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2">
            {adminCredentials ? (
              <>
                {[
                  { label: "Login URL", value: `${commerceBase}/auth?tenant=${activeBiz.id}` },
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

            <Button size="lg" className="w-full gap-2 h-12 text-base" onClick={handleGenerate}>
              <Sparkles size={18} /> Generate Website
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground mt-3">
          Powered by OpenAI · 10–20 seconds · Review before publishing
        </p>
      </div>
    </div>
  )
}
