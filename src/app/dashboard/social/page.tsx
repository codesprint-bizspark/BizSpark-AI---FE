"use client"

import { Instagram, Facebook, Twitter, Share2, ChevronRight, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const PLATFORMS = [
  { id: "instagram", name: "Instagram", icon: Instagram, color: "text-pink-600", bg: "bg-pink-50" },
  { id: "facebook", name: "Facebook", icon: Facebook, color: "text-blue-700", bg: "bg-blue-50" },
  { id: "tiktok", name: "TikTok", icon: Share2, color: "text-slate-900", bg: "bg-slate-100" },
  { id: "twitter", name: "Twitter / X", icon: Twitter, color: "text-slate-900", bg: "bg-slate-100" },
]

export default function SocialMediaPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold font-headline">Social Media Manager</h2>
          <p className="text-muted-foreground mt-1">Connect your accounts to start managing posts with AI.</p>
        </div>
        <Badge variant="outline" className="text-xs uppercase tracking-wide mt-2">Coming Soon</Badge>
      </div>

      {/* Platform cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLATFORMS.map((platform) => (
          <Card key={platform.id} className="border-2 opacity-80">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-6">
                <div className={cn("p-3 rounded-xl", platform.bg, platform.color)}>
                  <platform.icon size={24} />
                </div>
                <Badge variant="outline" className="text-muted-foreground text-xs">Not connected</Badge>
              </div>
              <h3 className="text-xl font-bold mb-1">{platform.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">Connect to manage posts</p>
              <Button variant="default" className="w-full h-10" disabled>
                Connect Account
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coming soon callout */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="pt-6 flex items-start gap-4">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="text-primary" size={20} />
          </div>
          <div>
            <p className="font-bold">AI Social Media — Coming Soon</p>
            <p className="text-sm text-muted-foreground mt-1">
              Once connected, BizSpark AI will generate platform-optimised posts, schedule them automatically,
              and suggest the best times to publish based on your audience.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
