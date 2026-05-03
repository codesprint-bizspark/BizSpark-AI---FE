"use client"

import { useEffect, useState } from "react"
import { Globe, Share2, Package, Wand2, ArrowRight, Building2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api-client"
import Link from "next/link"
import { cn } from "@/lib/utils"

const QUICK_LINKS = [
  {
    href: "/dashboard/website",
    icon: Globe,
    title: "Website",
    description: "Generate and publish your AI-powered website.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    href: "/dashboard/social",
    icon: Share2,
    title: "Social Media",
    description: "Manage posts across Instagram, Facebook and more.",
    color: "text-pink-600",
    bg: "bg-pink-50",
  },
  {
    href: "/dashboard/products",
    icon: Package,
    title: "Products",
    description: "Add and manage your product catalogue.",
    color: "text-green-600",
    bg: "bg-green-50",
  },
]

export default function DashboardOverview() {
  const [activeBiz, setActiveBiz] = useState<any>(null)

  useEffect(() => {
    const fetchBiz = async () => {
      const activeId = localStorage.getItem("active_biz_id")
      if (!activeId) return
      try {
        const res = await apiClient.get(`/business/${activeId}`)
        setActiveBiz(res.data)
      } catch (e) {
        console.error(e)
      }
    }
    fetchBiz()
  }, [])

  if (!activeBiz) return null

  const hasWebsite = activeBiz.websites && activeBiz.websites.length > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold font-headline">
            Welcome, {activeBiz.name}
          </h2>
          <p className="text-muted-foreground mt-1 text-base">
            {activeBiz.category
              ? `${activeBiz.category} · `
              : ""}
            Manage your AI-powered business presence.
          </p>
        </div>
        <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Building2 className="text-primary" size={26} />
        </div>
      </div>

      {/* Business info card */}
      <Card className="border-2">
        <CardContent className="pt-6 grid sm:grid-cols-3 gap-6">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Business</p>
            <p className="font-semibold">{activeBiz.name}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Category</p>
            <p className="font-semibold">{activeBiz.category || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Website</p>
            <p className={cn("font-semibold", hasWebsite ? "text-green-600" : "text-muted-foreground")}>
              {hasWebsite ? "Configured" : "Not set up yet"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick links */}
      <div>
        <h3 className="text-lg font-bold mb-4">What would you like to do?</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {QUICK_LINKS.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="border-2 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group h-full">
                <CardContent className="pt-6 space-y-3">
                  <div className={cn("size-10 rounded-xl flex items-center justify-center", item.bg, item.color)}>
                    <item.icon size={20} />
                  </div>
                  <div>
                    <p className="font-bold">{item.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ArrowRight size={12} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* AI tip */}
      {!hasWebsite && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="pt-6 flex items-start gap-4">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Wand2 className="text-primary" size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold">Start with your website</p>
              <p className="text-sm text-muted-foreground mt-1">
                Generate a professional website in under a minute using AI — just pick a tone and color.
              </p>
            </div>
            <Link href="/dashboard/website">
              <Button size="sm" className="shrink-0">Go →</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
