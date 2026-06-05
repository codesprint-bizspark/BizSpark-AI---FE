"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { ImagePlus, Loader2, Link as LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Props = {
  value?: string | null
  onChange: (url: string | null) => void
  onUpload?: (file: File) => Promise<string>
  uploading?: boolean
  className?: string
  aspectClass?: string
  label?: string
}

export default function EditableImage({
  value,
  onChange,
  onUpload,
  uploading = false,
  className,
  aspectClass = 'aspect-video',
  label = 'Image',
}: Props) {
  const [open, setOpen] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [failed, setFailed] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setFailed(false) }, [value])

  const handleFile = async (file: File) => {
    if (!onUpload) return
    const url = await onUpload(file)
    onChange(url)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setUrlInput(value ?? ''); setOpen(true) }}
        className={cn(
          'relative w-full overflow-hidden rounded-lg border-2 border-dashed border-gray-300 hover:border-primary/50 transition-colors group',
          aspectClass,
          className,
        )}
      >
        {value && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} onError={() => setFailed(true)} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400 bg-gray-50">
            <ImagePlus className="size-8" />
            <span className="text-sm">{value ? `Couldn't load ${label.toLowerCase()} — click to replace` : `Click to add ${label.toLowerCase()}`}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded">Change {label}</span>
        </div>
        {uploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Paste image URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://..."
                />
                <Button type="button" variant="outline" size="icon" onClick={() => { onChange(urlInput || null); setOpen(false) }}>
                  <LinkIcon className="size-4" />
                </Button>
              </div>
            </div>
            {onUpload && (
              <div>
                <Label>Or upload a file</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) void handleFile(f)
                  }}
                />
                <Button type="button" variant="secondary" className="w-full mt-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="size-4 animate-spin mr-2" /> : <ImagePlus className="size-4 mr-2" />}
                  Upload image
                </Button>
              </div>
            )}
            {value && (
              <Button type="button" variant="ghost" className="text-destructive" onClick={() => { onChange(null); setOpen(false) }}>
                Remove image
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { onChange(urlInput || null); setOpen(false) }}>Apply URL</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
