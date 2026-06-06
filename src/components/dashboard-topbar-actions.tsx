"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Bell, Sparkles, Check, MessageSquareText, Share2, Smartphone, CreditCard, Gauge } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { formatQuotaNumber, quotaPercent, spentForUsage, usageApi, type UsageSnapshot } from "@/lib/usage"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Notice = {
  id: string
  icon: "review" | "social" | "mobile" | "billing"
  title: string
  desc: string
  href: string
}

const ICONS = {
  review: MessageSquareText,
  social: Share2,
  mobile: Smartphone,
  billing: CreditCard,
}

const PLAN_STYLES: Record<string, string> = {
  Free: "bg-slate-100 text-slate-600",
  Starter: "bg-blue-100 text-blue-700",
  Growth: "bg-violet-100 text-violet-700",
  Pro: "bg-amber-100 text-amber-700",
  Business: "bg-emerald-100 text-emerald-700",
}

export function DashboardTopbarActions() {
  const [bizId, setBizId] = useState("")
  const [planName, setPlanName] = useState("Free")
  const [usage, setUsage] = useState<UsageSnapshot | null>(null)
  const [notices, setNotices] = useState<Notice[]>([])

  const loadNotices = useCallback(async (id: string) => {
    const out: Notice[] = []
    // Google reviews awaiting approval
    try {
      const r = await apiClient.get(`/google-business/reviews?businessId=${id}`)
      const pending = (r.data ?? []).filter((rv: any) => rv.status === "PENDING_APPROVAL")
      pending.slice(0, 5).forEach((rv: any) =>
        out.push({
          id: `review_${rv.id}`,
          icon: "review",
          title: "Review needs approval",
          desc: `${rv.reviewerDisplayName || "A customer"} · ${rv.rating}★`,
          href: "/dashboard/reviews",
        }),
      )
    } catch {}
    // Recent published / failed social posts
    try {
      const h = await apiClient.get(`/social/publishing/${id}/history?limit=5`)
      ;(h.data ?? []).slice(0, 3).forEach((p: any) =>
        out.push({
          id: `post_${p.id}`,
          icon: "social",
          title: p.status === "FAILED" ? "Post failed" : "Post published",
          desc: `${p.platform} · ${p.caption?.slice(0, 30) || "post"}`,
          href: "/dashboard/social",
        }),
      )
    } catch {}
    setNotices(out)
  }, [])

  useEffect(() => {
    const id = localStorage.getItem("active_biz_id") || ""
    setBizId(id)
    if (!id) return

    const refresh = () => {
      apiClient.get(`/billing/status?businessId=${id}`)
        .then((res) => { if (res?.data?.planName) setPlanName(res.data.planName) })
        .catch(() => {})
      usageApi.get()
        .then((data) => {
          setUsage(data)
          if (data?.effectivePlan?.name) setPlanName(data.effectivePlan.name)
        })
        .catch(() => {})
      loadNotices(id)
    }

    refresh()
    // Re-fetch when the tab regains focus (e.g. returning from the PayHere
    // checkout) or when the billing page broadcasts an upgrade, so a plan change
    // reflects without a manual refresh / re-login.
    window.addEventListener("focus", refresh)
    window.addEventListener("bizspark:refresh-plan", refresh)
    return () => {
      window.removeEventListener("focus", refresh)
      window.removeEventListener("bizspark:refresh-plan", refresh)
    }
  }, [loadNotices])

  const tokenPercent = usage ? quotaPercent(usage, "monthlyTokens") : 0
  const tokenSpent = usage ? spentForUsage(usage, "monthlyTokens") : 0
  const tokenLimit = usage?.quotas.monthlyTokens ?? 0
  const tokenTone = tokenPercent >= 100
    ? "border-red-200 bg-red-50 text-red-700"
    : tokenPercent >= 80
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700"
  const tokenBar = tokenPercent >= 100
    ? "bg-red-500"
    : tokenPercent >= 80
      ? "bg-amber-500"
      : "bg-emerald-500"

  return (
    <div className="flex items-center gap-2">
      {usage && (
        <Link
          href="/dashboard/settings?tab=billing"
          className={cn(
            "inline-flex h-9 min-w-0 items-center gap-2 rounded-full border px-3 text-xs font-bold transition-opacity hover:opacity-80",
            tokenTone,
          )}
          title={`${formatQuotaNumber(tokenSpent, "monthlyTokens")} of ${formatQuotaNumber(tokenLimit, "monthlyTokens")} tokens used`}
        >
          <Gauge size={13} />
          <span className="hidden sm:inline">Tokens</span>
          <span className="tabular-nums">
            {formatQuotaNumber(tokenSpent, "monthlyTokens")} / {formatQuotaNumber(tokenLimit, "monthlyTokens")}
          </span>
          <span className="hidden md:block h-1.5 w-16 overflow-hidden rounded-full bg-white/70">
            <span
              className={cn("block h-full rounded-full", tokenBar)}
              style={{ width: `${tokenPercent}%` }}
            />
          </span>
        </Link>
      )}

      {/* Plan badge */}
      <Link
        href="/dashboard/settings?tab=billing"
        className={cn(
          "hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-opacity hover:opacity-80",
          PLAN_STYLES[planName] ?? PLAN_STYLES.Free,
        )}
      >
        <Sparkles size={12} /> {planName} plan
      </Link>

      {/* Notifications bell */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Notifications"
            className="relative h-9 w-9 rounded-full border bg-white flex items-center justify-center hover:bg-slate-50 transition-colors"
          >
            <Bell size={16} className="text-slate-600" />
            {notices.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {notices.length}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notices.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Check className="text-green-500" size={20} />
              You&apos;re all caught up.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notices.map((n) => {
                const Icon = ICONS[n.icon]
                return (
                  <Link key={n.id} href={n.href}
                    className="flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors">
                    <span className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon size={14} className="text-primary" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.desc}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
