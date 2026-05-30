"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { User, CreditCard, Check, Loader2, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api-client"

type Plan = {
  id: string
  name: string
  priceMonthly: number
  currency: string
  description: string
  ctaText: string
  badgeText: string
  isPopular: boolean
  benefits: string[]
}

type SubStatus = {
  tier: string
  status: string
  planName: string
  expiresAt: string | null
} | null

export default function SettingsPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<"profile" | "billing">(
    searchParams.get("tab") === "billing" ? "billing" : "profile"
  )
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null)
  const [bizId, setBizId] = useState("")
  const [plans, setPlans] = useState<Plan[]>([])
  const [sub, setSub] = useState<SubStatus>(null)
  const [loading, setLoading] = useState(true)
  const [subscribingId, setSubscribingId] = useState<string | null>(null)

  const load = useCallback(async (id: string) => {
    try {
      const [plansRes, statusRes] = await Promise.all([
        apiClient.get(`/subscription-plans`).catch(() => ({ data: [] })),
        apiClient.get(`/billing/status?businessId=${id}`).catch(() => ({ data: null })),
      ])
      const rawPlans: Plan[] = plansRes.data ?? plansRes ?? []
      // Dedupe by id (data source may merge old + new plan sets)
      const seen = new Set<string>()
      const unique = rawPlans.filter((p) => {
        if (seen.has(p.id)) return false
        seen.add(p.id)
        return true
      })
      setPlans(unique)
      setSub(statusRes.data ?? null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const userStr = localStorage.getItem("current_user")
    if (userStr) { try { setUser(JSON.parse(userStr)) } catch {} }
    const id = localStorage.getItem("active_biz_id") || ""
    setBizId(id)
    if (id) load(id); else setLoading(false)

    // Show toast on PayHere return
    const billing = searchParams.get("billing")
    if (billing === "success") toast({ title: "Payment received", description: "Your subscription is being activated." })
    if (billing === "cancelled") toast({ title: "Payment cancelled", variant: "destructive" })
  }, [load, searchParams, toast])

  const subscribe = async (planId: string) => {
    if (!bizId) { toast({ title: "No business selected", variant: "destructive" }); return }
    setSubscribingId(planId)
    try {
      const res = await apiClient.post(`/billing/checkout`, { businessId: bizId, planId })
      const { checkoutUrl, fields } = res.data ?? res
      if (!checkoutUrl || !fields) throw new Error("Checkout could not be started")

      // Build a hidden form and POST to PayHere (redirects to their hosted checkout)
      const form = document.createElement("form")
      form.method = "POST"
      form.action = checkoutUrl
      Object.entries(fields).forEach(([k, v]) => {
        const input = document.createElement("input")
        input.type = "hidden"
        input.name = k
        input.value = String(v)
        form.appendChild(input)
      })
      document.body.appendChild(form)
      form.submit()
    } catch (e: any) {
      toast({ title: "Couldn't start checkout", description: e.message, variant: "destructive" })
      setSubscribingId(null)
    }
  }

  if (loading) return (
    <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>
  )

  const fmtPrice = (p: Plan) =>
    p.priceMonthly === 0 ? "Free" : `${p.currency === "USD" ? "$" : p.currency + " "}${p.priceMonthly}`

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-3xl font-bold font-headline">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your profile and subscription.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([["profile", "Profile", User], ["billing", "Plans & Billing", CreditCard]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn("px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px flex items-center gap-2 transition-colors",
              tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-slate-700")}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* PROFILE */}
      {tab === "profile" && (
        <Card className="border-2 max-w-lg">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-4">
              <span className="size-14 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold">
                {(user?.name || "U").charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="font-bold text-lg">{user?.name || "User"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="grid gap-3 pt-2">
              {[["Full name", user?.name], ["Email", user?.email]].map(([label, val]) => (
                <div key={label} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2.5 border">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
                  <span className="text-sm font-medium">{val || "—"}</span>
                </div>
              ))}
            </div>
            {sub && (
              <div className="pt-2">
                <Badge variant="secondary" className="gap-1.5">
                  <Sparkles size={12} /> {sub.planName} plan · {sub.status.toLowerCase()}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* BILLING */}
      {tab === "billing" && (
        <div className="space-y-5">
          {sub && sub.status === "ACTIVE" && (
            <div className="rounded-xl border-2 border-green-200 bg-green-50 px-5 py-4 flex items-center gap-3">
              <Check className="text-green-600" size={20} />
              <div>
                <p className="font-semibold text-green-800">You&apos;re on the {sub.planName} plan</p>
                {sub.expiresAt && <p className="text-sm text-green-700">Renews {new Date(sub.expiresAt).toLocaleDateString()}</p>}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const isCurrent = sub?.status === "ACTIVE" && sub.planName === plan.name
              return (
                <Card key={plan.id} className={cn("border-2 relative flex flex-col",
                  plan.isPopular ? "border-primary shadow-lg" : "")}>
                  {plan.badgeText && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                      {plan.badgeText}
                    </span>
                  )}
                  <CardContent className="pt-6 pb-5 flex flex-col flex-1">
                    <p className="font-bold text-lg">{plan.name}</p>
                    <p className="text-2xl font-bold mt-1">
                      {fmtPrice(plan)}
                      {plan.priceMonthly > 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 min-h-[32px]">{plan.description}</p>
                    <ul className="space-y-1.5 mt-4 flex-1">
                      {plan.benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <Check size={13} className="text-green-500 shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => subscribe(plan.id)}
                      disabled={!!subscribingId || isCurrent}
                      variant={plan.isPopular ? "default" : "outline"}
                      className="w-full mt-4 gap-2"
                    >
                      {subscribingId === plan.id ? <Loader2 size={14} className="animate-spin" />
                        : isCurrent ? "Current plan"
                        : plan.ctaText || "Subscribe"}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Secure payments via PayHere · Sandbox mode. You can cancel anytime.
          </p>
        </div>
      )}
    </div>
  )
}
