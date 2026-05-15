"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const ITEMS = [
  { href: "/dashboard/social", label: "Accounts" },
  { href: "/dashboard/social/generate", label: "Generate" },
  { href: "/dashboard/social/posts", label: "Drafts" },
  { href: "/dashboard/social/scheduled", label: "Scheduled" },
]

export function SocialSubNav() {
  const pathname = usePathname()
  return (
    <div className="flex items-center gap-1 border-b">
      {ITEMS.map((it) => {
        const active = pathname === it.href || (it.href !== "/dashboard/social" && pathname.startsWith(it.href))
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              active
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            {it.label}
          </Link>
        )
      })}
    </div>
  )
}
