"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  LayoutDashboard,
  Globe,
  Share2,
  MessageSquareText,
  Settings,
  Zap,
  Users,
  Bot,
  Smartphone,
  CreditCard,
  LogOut,
  ChevronsUpDown,
  Sparkles,
  ArrowUpRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { apiClient } from "@/lib/api-client"

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Globe, label: "My Website", href: "/dashboard/website" },
  { icon: Smartphone, label: "Mobile App", href: "/dashboard/mobile-app" },
  { icon: Share2, label: "Social Media", href: "/dashboard/social" },
  { icon: MessageSquareText, label: "Google Reviews", href: "/dashboard/reviews" },
  { icon: Users, label: "Team Management", href: "/dashboard/team" },
  { icon: Settings, label: "Domains", href: "/dashboard/domains" },
  { icon: Bot, label: "AI Connect", href: "/dashboard/ai-connect" },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [activeName, setActiveName] = useState("BizSpark")
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null)
  const [planName, setPlanName] = useState<string>("Free")

  useEffect(() => {
    const list = JSON.parse(localStorage.getItem("biz_list") || "[]")
    const activeId = localStorage.getItem("active_biz_id")
    const current = list.find((b: any) => b.id === activeId) || list[0]
    if (current) setActiveName(current.name)

    const userStr = localStorage.getItem("current_user")
    if (userStr) { try { setUser(JSON.parse(userStr)) } catch {} }

    // Fetch current plan (best-effort)
    if (activeId) {
      apiClient.get(`/billing/status?businessId=${activeId}`)
        .then((res) => { if (res?.data?.planName) setPlanName(res.data.planName) })
        .catch(() => {})
    }
  }, [])

  const handleLogout = () => {
    apiClient.logout()
    localStorage.removeItem("active_biz_id")
    router.push("/login")
  }

  const initial = (user?.name || "U").trim().charAt(0).toUpperCase()

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="h-16 flex items-center px-4 overflow-hidden">
        <Link href="/" className="flex items-center gap-3 font-bold text-xl text-primary">
          <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/30">
            <Zap className="fill-white text-white" size={18} />
          </div>
          <span className="truncate group-data-[collapsible=icon]:hidden font-headline tracking-tight">
            BizSpark AI
          </span>
        </Link>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarMenu className="px-2 pt-4">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton 
                asChild 
                isActive={pathname === item.href}
                tooltip={item.label}
                className={cn(
                  "h-11 transition-all",
                  pathname === item.href ? "bg-primary/10 text-primary font-bold" : "hover:bg-slate-100"
                )}
              >
                <Link href={item.href}>
                  <item.icon className={cn("size-5", pathname === item.href && "text-primary")} />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-2 space-y-2">
        {/* Upgrade CTA — hidden when already on the top plan */}
        {planName !== "Business" && (
          <Link
            href="/dashboard/settings?tab=billing"
            className="group/upgrade relative block overflow-hidden rounded-xl bg-gradient-to-br from-primary to-violet-600 p-3 text-white shadow-sm group-data-[collapsible=icon]:hidden"
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-amber-300" />
              <p className="text-xs font-bold uppercase tracking-wide">Upgrade plan</p>
            </div>
            <p className="text-[11px] text-white/80 leading-snug mb-2">
              Unlock more websites, mobile apps & AI generations.
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-white/20 rounded-lg px-2 py-1 group-hover/upgrade:bg-white/30 transition-colors">
              See plans <ArrowUpRight size={12} />
            </span>
          </Link>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5 hover:bg-slate-50 transition-colors group-data-[collapsible=icon]:justify-center"
            >
              <span className="size-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                {initial}
              </span>
              <div className="flex-1 min-w-0 text-left group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-semibold truncate leading-tight">{user?.name || "User"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{planName} plan</p>
              </div>
              <ChevronsUpDown size={15} className="text-muted-foreground shrink-0 group-data-[collapsible=icon]:hidden" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/dashboard/settings"><Settings className="mr-2 size-4" /> Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/dashboard/settings?tab=billing"><CreditCard className="mr-2 size-4" /> Plans & Billing</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
              <LogOut className="mr-2 size-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
