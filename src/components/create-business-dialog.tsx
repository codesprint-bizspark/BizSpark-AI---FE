"use client"

import { useState } from "react"
import { Loader2, Building2, Sparkles } from "lucide-react"
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
import { cn } from "@/lib/utils"

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

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateBusinessDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
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
      localStorage.setItem("active_biz_id", res.data.id)

      toast({ title: "Business created", description: `${form.name.trim()} is ready.` })
      onOpenChange(false)
      window.location.reload()
    } catch (error: any) {
      toast({ title: "Could not create business", description: error.message || "Unexpected error.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

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
          {/* Business Name */}
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

          {/* Category */}
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

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="biz-desc">
                Tell us about your business
              </Label>
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
