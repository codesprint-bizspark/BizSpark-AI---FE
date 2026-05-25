"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { 
  LayoutDashboard, 
  Globe, 
  Share2, 
  Package, 
  Settings, 
  Zap,
  Users,
  Sparkles,
  Smartphone
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

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Globe, label: "My Website", href: "/dashboard/website" },
  { icon: Smartphone, label: "Mobile App", href: "/dashboard/mobile-app" },
  { icon: Share2, label: "Social Media", href: "/dashboard/social" },
  { icon: Package, label: "Products", href: "/dashboard/products" },
  { icon: Users, label: "Team Management", href: "/dashboard/team" },
  { icon: Settings, label: "Domains", href: "/dashboard/domains" },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [activeName, setActiveName] = useState("BizSpark")

  useEffect(() => {
    const list = JSON.parse(localStorage.getItem("biz_list") || "[]")
    const activeId = localStorage.getItem("active_biz_id")
    const current = list.find((b: any) => b.id === activeId) || list[0]
    if (current) setActiveName(current.name)
  }, [])

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
      <SidebarFooter className="p-4">
        <div className="bg-white border rounded-xl p-4 group-data-[collapsible=icon]:hidden shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-primary">
            <Sparkles size={14} className="animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-wider">AI Assistant Ready</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">Managing <strong>{activeName}</strong>. Upgrade to unlock Veo-3 video generation.</p>
          <button className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
            Go Premium
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
