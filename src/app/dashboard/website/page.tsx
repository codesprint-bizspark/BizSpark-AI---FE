"use client"

import { useEffect, useState, useRef } from "react"
import { ExternalLink, RefreshCw, Sparkles, Check, Wand2, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "bold", label: "Bold" },
  { value: "minimal", label: "Minimal" },
]

export default function WebsiteManagement() {
  const { toast } = useToast()
  const [activeBiz, setActiveBiz] = useState<any>(null)
  const [deployStatus, setDeployStatus] = useState<string | null>(null)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [editedContent, setEditedContent] = useState<any>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  const [adminCredentials, setAdminCredentials] = useState<{ email: string; password: string } | null>(null)

  // Intake form state
  const [tone, setTone] = useState("professional")
  const [primaryColor, setPrimaryColor] = useState("#2563eb")
  const [isGenerating, setIsGenerating] = useState(false)

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
          setIsGenerating(false)
          const content = task.outputData?.generatedContent
          setGeneratedContent(content)
          setEditedContent(content)
          toast({ title: "AI content ready!", description: "Review and approve your website below." })
        }
        if (task.status === "FAILED") {
          clearInterval(pollingRef.current!)
          setIsGenerating(false)
          toast({ title: "Generation failed", description: task.outputData?.error || "Unknown error", variant: "destructive" })
        }
      } catch (e) { console.error(e) }
    }, 2000)
  }

  const handleGenerate = async () => {
    if (!activeBiz) return
    setIsGenerating(true)
    setGeneratedContent(null)
    setEditedContent(null)
    setIsPublished(false)

    try {
      // Save minimal config first
      await apiClient.post(`/business/${activeBiz.id}/website`, {
        cmsData: { "brand.primaryColor": primaryColor }
      })

      // Trigger deploy with tone
      const res = await apiClient.post(`/business/${activeBiz.id}/website/deploy`, { tone })
      const taskId = res?.data?.taskId
      if (!taskId) throw new Error("No taskId returned")

      setCurrentTaskId(taskId)
      setDeployStatus("QUEUED")
      startPolling(taskId)
    } catch (e: any) {
      setIsGenerating(false)
      toast({ title: "Failed to start generation", description: e.message, variant: "destructive" })
    }
  }

  const handleApprove = async () => {
    if (!currentTaskId || !editedContent) return
    setIsApproving(true)
    try {
      const res = await apiClient.post(`/agents/tasks/${currentTaskId}/approve`, { content: editedContent })
      // approve returns { success, message, adminCredentials } — apiClient gives raw JSON (no .data wrapper)
      const creds = res.adminCredentials
        ?? JSON.parse(localStorage.getItem(`admin_creds_${activeBiz.id}`) || 'null')
      if (creds) setAdminCredentials(creds)
      setIsPublished(true)
      setDeployStatus("COMPLETED")
      toast({ title: "Website Published!", description: "Your site is now live." })
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
      setGeneratedContent(null)
      setEditedContent(null)
      setDeployStatus(null)
      setCurrentTaskId(null)
      toast({ title: "Rejected", description: "Generate again with different settings." })
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  }

  const updateField = (path: string, value: string) => {
    const keys = path.split(".")
    setEditedContent((prev: any) => {
      const next = { ...prev }
      let cur = next
      for (let i = 0; i < keys.length - 1; i++) {
        cur[keys[i]] = { ...cur[keys[i]] }
        cur = cur[keys[i]]
      }
      cur[keys[keys.length - 1]] = value
      return next
    })
  }

  if (!activeBiz) return null

  // ── GENERATING STATE ──
  if (isGenerating) {
    const steps = [
      { key: "QUEUED",            label: "Sending to AI",        desc: "Your request is queued"              },
      { key: "PROCESSING",        label: "Writing your website", desc: "Gemini AI is crafting your content"  },
      { key: "PENDING_APPROVAL",  label: "Finishing up",         desc: "Applying final touches"              },
    ]
    const currentIdx = steps.findIndex(s => s.key === deployStatus)
    const activeIdx = currentIdx === -1 ? 0 : currentIdx

    return (
      <div className="h-full flex flex-col items-center justify-center gap-10 text-center px-6">
        {/* Animated orb */}
        <div className="relative flex items-center justify-center">
          <span className="absolute inline-flex size-24 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "1.6s" }} />
          <span className="absolute inline-flex size-20 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: "2.2s", animationDelay: "0.3s" }} />
          <div className="relative size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="text-primary animate-spin" size={28} style={{ animationDuration: "3s" }} />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Building <span className="text-primary">{activeBiz.name}</span></h2>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Gemini AI is writing professional copy tailored to your business. Hang tight…
          </p>
        </div>

        {/* Step progress */}
        <div className="flex flex-col gap-3 w-full max-w-xs text-left">
          {steps.map((step, i) => {
            const done = i < activeIdx
            const active = i === activeIdx
            return (
              <div key={step.key} className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 border transition-all duration-500",
                active  ? "border-primary/40 bg-primary/5 shadow-sm" : "",
                done    ? "border-green-200 bg-green-50" : "",
                !active && !done ? "border-slate-100 opacity-40" : ""
              )}>
                <div className={cn(
                  "size-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
                  done   ? "bg-green-500" : "",
                  active ? "bg-primary" : "",
                  !active && !done ? "bg-slate-200" : ""
                )}>
                  {done
                    ? <Check size={14} className="text-white" />
                    : active
                      ? <Loader2 size={14} className="text-white animate-spin" />
                      : <span className="text-xs text-slate-400 font-bold">{i + 1}</span>
                  }
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", active ? "text-primary" : done ? "text-green-700" : "text-slate-400")}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-muted-foreground">Usually takes 10–20 seconds</p>
      </div>
    )
  }

  // ── REVIEW STATE ──
  if (generatedContent && editedContent && deployStatus === "PENDING_APPROVAL") {
    return (
      <div className="h-full flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold font-headline flex items-center gap-2">
              <Sparkles size={24} className="text-primary" /> AI Generated Content
            </h2>
            <p className="text-muted-foreground mt-1">Review, edit if needed, then approve to publish.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReject} disabled={isApproving}>
              Reject & Redo
            </Button>
            <Button onClick={handleApprove} disabled={isApproving} className="gap-2">
              {isApproving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Approve & Publish
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Branding */}
          <Card>
            <CardHeader><CardTitle className="text-base">Branding</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Business Name</Label>
                <Input value={editedContent.businessName || ""} onChange={e => updateField("businessName", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tagline</Label>
                <Input value={editedContent.tagline || ""} onChange={e => updateField("tagline", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Primary Color</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" className="size-8 rounded cursor-pointer border" value={editedContent.primaryColor || "#2563eb"} onChange={e => updateField("primaryColor", e.target.value)} />
                    <Input className="h-8 text-xs" value={editedContent.primaryColor || ""} onChange={e => updateField("primaryColor", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Secondary Color</Label>
                  <div className="flex gap-2 items-center">
                    <input type="color" className="size-8 rounded cursor-pointer border" value={editedContent.secondaryColor || "#1e40af"} onChange={e => updateField("secondaryColor", e.target.value)} />
                    <Input className="h-8 text-xs" value={editedContent.secondaryColor || ""} onChange={e => updateField("secondaryColor", e.target.value)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hero */}
          <Card>
            <CardHeader><CardTitle className="text-base">Hero Section</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Headline</Label>
                <Input value={editedContent.content?.hero?.title || ""} onChange={e => updateField("content.hero.title", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Subtitle</Label>
                <Input value={editedContent.content?.hero?.subtitle || ""} onChange={e => updateField("content.hero.subtitle", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CTA Button Text</Label>
                <Input value={editedContent.content?.hero?.ctaText || ""} onChange={e => updateField("content.hero.ctaText", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader><CardTitle className="text-base">About Section</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">About Title</Label>
                <Input value={editedContent.content?.about?.title || ""} onChange={e => updateField("content.about.title", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">About Text</Label>
                <Textarea rows={4} value={editedContent.content?.about?.text || ""} onChange={e => updateField("content.about.text", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ── PUBLISHED STATE ──
  if (isPublished) {
    return (
      <div className="h-full flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold font-headline">My Website</h2>
            <p className="text-muted-foreground mt-1">Manage the online presence for {activeBiz.name}.</p>
          </div>
          <div className="flex gap-3">
            <a href={`http://localhost:3004/?tenant=${activeBiz.id}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <ExternalLink size={16} /> View Storefront
              </Button>
            </a>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => { setIsPublished(false); setGeneratedContent(null); setDeployStatus(null) }}
            >
              <RefreshCw size={16} /> Regenerate
            </Button>
            <Button className="gap-2 bg-green-600 hover:bg-green-700">
              <Check size={16} /> Published!
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border bg-green-50">
            <CardContent className="py-6 text-center">
              <Check size={32} className="text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-700">Your website is live!</p>
              <p className="text-sm text-muted-foreground mt-1">
                View it at{" "}
                <a href={`http://localhost:3004/?tenant=${activeBiz.id}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  localhost:3004/?tenant={activeBiz.id}
                </a>
              </p>
            </CardContent>
          </Card>

          {adminCredentials && (
            <Card className="border border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-800 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                  Store Admin Credentials — save these now
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between bg-white rounded px-3 py-2 border">
                  <span className="text-muted-foreground text-xs w-16 shrink-0">Email</span>
                  <span className="font-mono text-xs flex-1 text-center">{adminCredentials.email}</span>
                </div>
                <div className="flex items-center justify-between bg-white rounded px-3 py-2 border">
                  <span className="text-muted-foreground text-xs w-16 shrink-0">Password</span>
                  <span className="font-mono text-xs flex-1 text-center font-bold tracking-wide">{adminCredentials.password}</span>
                </div>
                <p className="text-xs text-amber-700 pt-1">
                  Use these to log in to your store admin at{" "}
                  <a href={`http://localhost:3004/auth?tenant=${activeBiz.id}`} target="_blank" rel="noopener noreferrer" className="underline">
                    the storefront
                  </a>
                  . You can change your password after logging in.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }

  // ── INTAKE FORM (default) ──
  return (
    <div className="h-full flex flex-col space-y-6">
      <div>
        <h2 className="text-3xl font-bold font-headline flex items-center gap-2">
          <Wand2 size={24} /> Generate Your Website
        </h2>
        <p className="text-muted-foreground mt-1">
          Tell us your preferences — AI will write professional content for <strong>{activeBiz.name}</strong>.
        </p>
      </div>

      <div className="max-w-xl space-y-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base">What tone suits your business?</CardTitle>
            <CardDescription>AI will match the writing style to your selection.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {TONES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTone(t.value)}
                  className={cn(
                    "p-3 rounded-lg border-2 text-sm font-medium transition-all text-left",
                    tone === t.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200 hover:border-primary/50"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base">Brand Color</CardTitle>
            <CardDescription>AI will generate a complementary color palette.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                className="size-10 rounded-lg cursor-pointer border-2"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
              />
              <Input
                className="max-w-[140px]"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                placeholder="#2563eb"
              />
              <span className="text-sm text-muted-foreground">Primary brand color</span>
            </div>
          </CardContent>
        </Card>

        <Button size="lg" className="w-full gap-2 h-12 text-base" onClick={handleGenerate}>
          <Sparkles size={18} /> Generate with AI
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Powered by Google Gemini · Takes 10–20 seconds · You can edit before publishing
        </p>
      </div>
    </div>
  )
}
