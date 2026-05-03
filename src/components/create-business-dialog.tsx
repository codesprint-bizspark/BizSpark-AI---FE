"use client"

import { useState } from "react"
import { Loader2, Building2, Sparkles, ExternalLink, Copy, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api-client"

const CATEGORIES = [
  "Restaurant / Café",
  "Bakery",
  "Retail / Shop",
  "Clothing & Fashion",
  "Beauty & Salon",
  "Health & Fitness",
  "Medical / Healthcare",
  "Technology / Software",
  "Consulting / Services",
  "Education / Coaching",
  "Real Estate",
  "Construction / Renovation",
  "Photography / Creative",
  "Legal / Law",
  "Accounting / Finance",
  "Hotel / Hospitality",
  "Event Planning",
  "Automotive",
  "Other",
]

const DESCRIPTION_EXAMPLES = [
  "We run a cozy café serving specialty coffee and homemade pastries. Our customers are local professionals and students looking for a relaxing place to work or catch up with friends.",
  "We offer professional accounting and tax services for small businesses. Our clients trust us to handle bookkeeping, payroll, and annual filings accurately and on time.",
  "We sell handmade leather bags and accessories. Our products are crafted to last a lifetime and we offer free personalised engraving on every order.",
]

type SuccessData = {
  businessName: string
  storefrontUrl: string
  adminUrl: string
  adminCredentials: { email: string; password: string } | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-center gap-2 bg-white rounded border px-3 py-2">
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="font-mono text-xs flex-1 truncate">{value}</span>
      <button onClick={copy} className="text-muted-foreground hover:text-foreground shrink-0">
        {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
      </button>
    </div>
  )
}

export function CreateBusinessDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState<SuccessData | null>(null)
  const [form, setForm] = useState({ name: "", category: "", description: "" })

  const exampleHint = DESCRIPTION_EXAMPLES[Math.floor(Math.random() * DESCRIPTION_EXAMPLES.length)]

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast({ title: "Business name is required", variant: "destructive" })
      return
    }
    setIsSaving(true)
    try {
      const payload: Record<string, string> = { name: form.name.trim() }
      if (form.category) payload.category = form.category
      if (form.description.trim()) payload.description = form.description.trim()

      const res = await apiClient.post("/business", payload)
      const biz = res.data.data ?? res.data
      localStorage.setItem("active_biz_id", biz.id)

      // Persist credentials so the website page can show them after publish
      if (res.data.adminCredentials) {
        localStorage.setItem(`admin_creds_${biz.id}`, JSON.stringify(res.data.adminCredentials))
      }

      setSuccess({
        businessName: form.name.trim(),
        storefrontUrl: biz.storefrontUrl || `http://localhost:3004/?tenant=${biz.id}`,
        adminUrl: biz.adminUrl || `http://localhost:3004/auth?tenant=${biz.id}`,
        adminCredentials: res.data.adminCredentials ?? null,
      })
    } catch (error: any) {
      toast({ title: "Could not create business", description: error.message || "Unexpected error.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setSuccess(null)
    setForm({ name: "", category: "", description: "" })
    onOpenChange(false)
    window.location.reload()
  }

  // ── Success screen ───────────────────────────────────────────────────────────
  if (success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="size-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Check className="text-green-600" size={20} />
            </div>
            <DialogTitle className="text-center">"{success.businessName}" is ready!</DialogTitle>
            <DialogDescription className="text-center">
              Your storefront and admin panel are live. Save these details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Storefront link */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your Storefront</p>
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                <span className="font-mono text-xs flex-1 truncate text-blue-800">{success.storefrontUrl}</span>
                <a href={success.storefrontUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 shrink-0">
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* Admin credentials */}
            {success.adminCredentials && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Store Admin Login — <span className="text-amber-600 normal-case font-medium">save these now, shown once</span>
                </p>
                <div className="space-y-1.5 bg-amber-50 border border-amber-200 rounded p-3">
                  <CopyField label="Login URL" value={success.adminUrl} />
                  <CopyField label="Email" value={success.adminCredentials.email} />
                  <CopyField label="Password" value={success.adminCredentials.password} />
                  <p className="text-[11px] text-amber-700 pt-1">
                    Log in to add products, manage orders, and configure your store.
                    You can change your password after logging in.
                  </p>
                </div>
              </div>
            )}

            {!success.adminCredentials && (
              <div className="text-sm text-muted-foreground bg-muted rounded p-3 text-center">
                Admin credentials will be shown after you generate and publish your website.
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={success.storefrontUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                <ExternalLink size={14} /> View Storefront
              </a>
            </Button>
            <Button onClick={handleClose} className="gap-2">
              <Sparkles size={14} /> Go to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // ── Create form ──────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="text-primary" size={20} />
            </div>
            <div>
              <DialogTitle>Create a business</DialogTitle>
              <DialogDescription>
                The more detail you provide, the better AI can write for you.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-5 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="biz-name">
              Business Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="biz-name"
              autoFocus
              placeholder="e.g. Skyline Consulting"
              value={form.name}
              onChange={set("name")}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="biz-category">Business Type</Label>
            <Select
              value={form.category}
              onValueChange={v => setForm(prev => ({ ...prev, category: v }))}
              disabled={isSaving}
            >
              <SelectTrigger id="biz-category">
                <SelectValue placeholder="Select your industry…" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="biz-desc">Tell us about your business</Label>
              <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
                <Sparkles size={11} /> Used by AI to write your website
              </span>
            </div>
            <Textarea
              id="biz-desc"
              rows={4}
              placeholder={`e.g. "${exampleHint}"`}
              value={form.description}
              onChange={set("description")}
              disabled={isSaving}
              className="text-sm leading-relaxed resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              Include: what you sell or offer · who your customers are · what makes you different · your location if relevant.
            </p>
          </div>

          <DialogFooter className="pt-1">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !form.name.trim()}>
              {isSaving && <Loader2 className="animate-spin mr-2 size-4" />}
              Create Business
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
