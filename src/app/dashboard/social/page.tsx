"use client"

import { useEffect, useState } from "react"
import { Instagram, Facebook, Loader2, Sparkles, Plug, AlertTriangle, Check, Trash2, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { socialApi } from "@/lib/social/api"
import { SocialPlatform, PLATFORM_META } from "@/lib/social/types"
import { useSocialAccounts } from "@/lib/social/use-social-accounts"
import { SocialSubNav } from "./sub-nav"

// TikTok glyph (lucide doesn't ship one)
function TikTokIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21 8.4a8.66 8.66 0 0 1-5-1.6v7.7a6.7 6.7 0 1 1-6.7-6.7c.36 0 .7 0 1 .07v3.4a3.3 3.3 0 1 0 2.3 3.16V2h3.4a5.2 5.2 0 0 0 5 5.2v3.2Z" />
    </svg>
  )
}

const PLATFORMS: { id: SocialPlatform; icon: any; description: string }[] = [
  { id: "FACEBOOK", icon: Facebook, description: "Publish to a Facebook Page" },
  { id: "INSTAGRAM", icon: Instagram, description: "Publish to an IG Business account" },
  { id: "TIKTOK", icon: TikTokIcon, description: "Publish short-form videos" },
]

export default function SocialMediaAccountsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [activeBizId, setActiveBizId] = useState<string>("")
  const [connectingPlatform, setConnectingPlatform] = useState<SocialPlatform | null>(null)
  // Persistent OAuth error banner — survives the `router.replace` cleanup so
  // the user can actually read why the connection failed instead of catching
  // a fleeting toast. Cleared by either reconnecting or pressing dismiss.
  const [oauthError, setOauthError] = useState<{ platform: string | null; message: string } | null>(null)

  // Read business id from localStorage like the rest of the app
  useEffect(() => {
    const id = localStorage.getItem("active_biz_id") || ""
    setActiveBizId(id)
  }, [])

  // Single source of truth for accounts — shared with Generate page so the two
  // never drift. Auto-refreshes on focus/visibility (catches OAuth in another tab).
  const {
    accounts,
    byPlatform,
    anyConnected,
    isLoading,
    isRefetching,
    refetch: reload,
  } = useSocialAccounts(activeBizId)

  // Surface OAuth callback result (the /callback route redirects here with status params).
  useEffect(() => {
    const status = searchParams.get("connect_status")
    // eslint-disable-next-line no-console
    console.debug("[oauth-callback-handler]", {
      status,
      platform: searchParams.get("platform"),
      error: searchParams.get("connect_error"),
      url: typeof window !== "undefined" ? window.location.href : null,
    })

    if (status === "success") {
      const platform = searchParams.get("platform")
      setOauthError(null) // clear any previous error
      toast({ title: "Account connected", description: platform ? `${platform} is now connected.` : undefined })
      router.replace("/dashboard/social")
      void reload()
    } else if (status === "error") {
      const err = searchParams.get("connect_error")
      const platform = searchParams.get("platform")
      // Capture into persistent state BEFORE the router.replace strips the URL.
      setOauthError({ platform, message: err || "Unknown error" })
      toast({ title: "Connection failed", description: err || "Unknown error", variant: "destructive" })
      router.replace("/dashboard/social")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleConnect = async (platform: SocialPlatform) => {
    if (!activeBizId) return
    setConnectingPlatform(platform)
    setOauthError(null) // clear any prior failure before starting a new attempt
    try {
      const redirectAfterConnect = `${window.location.origin}/dashboard/social`
      const url = await socialApi.startConnect(activeBizId, platform, redirectAfterConnect)
      window.location.href = url
    } catch (e: any) {
      toast({ title: "Couldn't start OAuth", description: e.message, variant: "destructive" })
      setConnectingPlatform(null)
    }
  }

  const handleDisconnect = async (accountId: string) => {
    if (!activeBizId) return
    if (!confirm("Disconnect this account? Scheduled posts to this account will fail until you reconnect.")) return
    try {
      await socialApi.disconnect(activeBizId, accountId)
      toast({ title: "Account disconnected" })
      void reload()
    } catch (e: any) {
      toast({ title: "Disconnect failed", description: e.message, variant: "destructive" })
    }
  }

  if (!activeBizId) return null

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold font-headline">Social Media Agent</h2>
          <p className="text-muted-foreground mt-1">
            Connect your social accounts and let AI write, design, and schedule your posts.
          </p>
        </div>
        <div className="flex gap-2 shrink-0 items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => reload()}
            disabled={isLoading || isRefetching}
            className="gap-1.5 text-xs"
            title="Re-check connection status"
          >
            <RefreshCw size={12} className={cn(isRefetching && "animate-spin")} />
            {isRefetching ? "Refreshing" : "Refresh"}
          </Button>
          <Link href="/dashboard/social/generate">
            <Button className="gap-2" disabled={!anyConnected}>
              <Sparkles size={16} /> Generate Posts
            </Button>
          </Link>
        </div>
      </div>

      <SocialSubNav />

      {/* Persistent OAuth error banner — replaces the fleeting toast that
          disappeared with `router.replace` before the user could read it. */}
      {oauthError && (
        <Card className="border-2 border-red-300 bg-red-50">
          <CardContent className="pt-5 pb-5 flex items-start gap-3">
            <div className="size-9 rounded-full bg-red-500 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-red-900">
                {oauthError.platform ? `${oauthError.platform} connection failed` : "Connection failed"}
              </p>
              <p className="text-sm text-red-800 mt-1 whitespace-pre-wrap break-words">
                {oauthError.message}
              </p>
              <p className="text-xs text-red-700/80 mt-2">
                Check your server logs for the full stack trace (search for <code className="font-mono bg-red-100 px-1 py-0.5 rounded">[callback] handler failed</code>).
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOauthError(null)}
              className="text-red-700 hover:bg-red-100 -mt-1 -mr-1 shrink-0"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PLATFORMS.map((p) => {
          const account = byPlatform[p.id]
          const meta = PLATFORM_META[p.id]
          const Icon = p.icon
          const requiresReauth = account?.requiresReauth
          // "Limited" = OAuth completed but publishing scopes weren't granted.
          // The publish API will fail until the user re-consents with full perms.
          const missingScopes = (account?.metadata as { missingPublishingScopes?: string[] } | null | undefined)
            ?.missingPublishingScopes ?? []
          const isLimited = account && !requiresReauth && missingScopes.length > 0
          return (
            <Card key={p.id} className="border-2 overflow-hidden">
              <CardContent className="pt-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className={cn("p-3 rounded-xl", meta.bg, meta.color)}>
                    <Icon size={24} />
                  </div>
                  {account && requiresReauth ? (
                    <Badge variant="destructive" className="bg-amber-500">
                      <AlertTriangle size={12} className="mr-1" /> Reconnect
                    </Badge>
                  ) : isLimited ? (
                    <Badge variant="default" className="bg-amber-500 text-white" title={`Missing: ${missingScopes.join(', ')}`}>
                      <AlertTriangle size={12} className="mr-1" /> Limited
                    </Badge>
                  ) : account ? (
                    <Badge variant="default" className="bg-green-500 text-white">
                      <Check size={12} className="mr-1" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Not connected</Badge>
                  )}
                </div>
                {isLimited && (
                  <div className="-mt-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                    <p className="font-semibold">Connected, but publishing is blocked.</p>
                    <p className="mt-0.5 text-amber-800">
                      Missing permissions: <span className="font-mono">{missingScopes.join(", ")}</span>.
                      Remove the app from facebook.com → Settings → Apps and Websites, then click Reconnect below to re-prompt.
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold">{meta.label}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{p.description}</p>
                </div>

                {account ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                      {account.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={account.avatarUrl} alt="" className="size-10 rounded-full" />
                      ) : (
                        <div className="size-10 rounded-full bg-slate-200" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{account.displayName || account.username || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {account.username ? `@${account.username}` : `id: ${account.externalAccountId.slice(0, 12)}…`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => handleConnect(p.id)}>
                        <RefreshCw size={12} /> Reconnect
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDisconnect(account.id)}
                        className="text-red-600 hover:bg-red-50">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleConnect(p.id)}
                    disabled={connectingPlatform === p.id}
                    className="w-full h-10 gap-2"
                  >
                    {connectingPlatform === p.id ? (
                      <><Loader2 size={14} className="animate-spin" /> Redirecting…</>
                    ) : (
                      <><Plug size={14} /> Connect Account</>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {isLoading && (
        <div className="text-center text-muted-foreground text-sm">
          <Loader2 size={14} className="inline animate-spin mr-2" /> Loading accounts…
        </div>
      )}

      {!anyConnected && !isLoading && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="pt-6 flex items-start gap-4">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="text-primary" size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold">Connect at least one account to get started</p>
              <p className="text-sm text-muted-foreground mt-1">
                The AI agent reads your business and website, then generates platform-specific posts.
                Connecting your account lets you publish or schedule with a single click — never any passwords.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

