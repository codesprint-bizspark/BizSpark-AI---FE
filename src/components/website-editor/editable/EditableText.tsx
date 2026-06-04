"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Pencil } from "lucide-react"

type Props = {
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  className?: string
  placeholder?: string
  as?: 'h1' | 'h2' | 'p' | 'span'
}

export default function EditableText({
  value,
  onChange,
  multiline = false,
  className,
  placeholder = 'Click to edit',
  as = 'span',
}: Props) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const finish = (v: string) => {
    onChange(v)
    setEditing(false)
  }

  if (editing) {
    const shared = {
      ref: inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>,
      defaultValue: value,
      className: cn('w-full bg-white/90 border-2 border-primary rounded px-2 py-1 outline-none', className),
      onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => finish(e.target.value),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) finish((e.target as HTMLInputElement).value)
        if (e.key === 'Escape') setEditing(false)
      },
    }
    return multiline
      ? <textarea {...shared} rows={3} />
      : <input type="text" {...shared} />
  }

  const Tag = as
  return (
    <Tag
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={e => { if (e.key === 'Enter') setEditing(true) }}
      className={cn(
        'group relative cursor-text rounded px-1 -mx-1 hover:outline hover:outline-2 hover:outline-primary/40 hover:outline-dashed',
        !value && 'text-gray-400 italic',
        className,
      )}
    >
      {value || placeholder}
      <Pencil className="inline-block ml-1 size-3 opacity-0 group-hover:opacity-50" />
    </Tag>
  )
}
