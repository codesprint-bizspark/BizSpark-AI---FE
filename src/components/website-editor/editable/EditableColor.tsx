"use client"

import { cn } from "@/lib/utils"

type Props = {
  value: string
  onChange: (color: string) => void
  label?: string
  className?: string
}

export default function EditableColor({ value, onChange, label, className }: Props) {
  return (
    <label className={cn('inline-flex items-center gap-2 cursor-pointer', className)}>
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="size-8 rounded cursor-pointer border"
      />
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </label>
  )
}
