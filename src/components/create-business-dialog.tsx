"use client"

import { useState } from "react"
import { Loader2, Building2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api-client"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateBusinessDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({ title: "Business name is required", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      const res = await apiClient.post("/business", { name: name.trim() })
      const newBizId = res.data.id

      localStorage.setItem("active_biz_id", newBizId)

      toast({
        title: "Business created",
        description: `${name.trim()} is ready.`,
      })

      onOpenChange(false)
      window.location.reload()
    } catch (error: any) {
      toast({
        title: "Could not create business",
        description: error.message || "Unexpected error.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="text-primary" size={20} />
            </div>
            <div>
              <DialogTitle>Create a business</DialogTitle>
              <DialogDescription>You can change details and add products later.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="biz-name">Business Name</Label>
            <Input
              id="biz-name"
              autoFocus
              placeholder="e.g. Skyline Consulting"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="animate-spin mr-2 size-4" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
