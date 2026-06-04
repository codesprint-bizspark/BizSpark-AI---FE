"use client"

import { cn } from "@/lib/utils"
import type { SectionId } from "../types"

type Props = {
  sectionId: SectionId
  label: string
  selected: boolean
  onSelect: (id: SectionId) => void
  children: React.ReactNode
  className?: string
}

export default function SectionOutline({ sectionId, label, selected, onSelect, children, className }: Props) {
  return (
    <div
      className={cn(
        'relative group/section',
        selected && 'ring-2 ring-primary ring-offset-2',
        className,
      )}
      onClick={e => { e.stopPropagation(); onSelect(sectionId) }}
    >
      <div className={cn(
        'absolute top-2 left-2 z-20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded opacity-0 group-hover/section:opacity-100 transition-opacity pointer-events-none',
        selected ? 'bg-primary text-white opacity-100' : 'bg-black/60 text-white',
      )}>
        {label}
      </div>
      {children}
    </div>
  )
}
