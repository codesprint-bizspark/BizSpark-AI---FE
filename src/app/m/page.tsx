"use client"

import { useEffect, useState } from "react"

// Custom scheme + install link (the EAS build). Overridable via env.
const SCHEME = process.env.NEXT_PUBLIC_MOBILE_SCHEME || "bizpark"
const INSTALL_URL =
  process.env.NEXT_PUBLIC_MOBILE_INSTALL_URL ||
  "https://expo.dev/accounts/adithaf7/projects/bizpark-mobile/builds/015e85c9-e08e-4ee7-a7bf-9c179342bc6f"

/**
 * Public "open in app" bounce page.
 *
 * QR codes encode https://<host>/m?tenant=<id> (scanners can open https, not
 * custom schemes). On load we fire the bizpark:// deep link to open the app;
 * if it isn't installed, the user taps "Install the app".
 */
export default function OpenAppPage() {
  const [tenant, setTenant] = useState("")
  const [deepLink, setDeepLink] = useState("")

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tenant") || ""
    setTenant(t)
    if (t) {
      const link = `${SCHEME}://?tenant=${t}`
      setDeepLink(link)
      // Try to open the installed app.
      window.location.href = link
    }
  }, [])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center bg-slate-50">
      <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <span className="text-3xl">📱</span>
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Opening your app…</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          If the app doesn&apos;t open automatically, use the buttons below.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <a
          href={deepLink || "#"}
          className="rounded-xl bg-primary text-white font-semibold py-3 text-sm"
        >
          Open in app
        </a>
        <a
          href={INSTALL_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border-2 border-slate-200 font-semibold py-3 text-sm text-slate-700"
        >
          Don&apos;t have the app? Install it
        </a>
      </div>

      {tenant && (
        <code className="text-[11px] text-muted-foreground break-all max-w-xs">
          {SCHEME}://?tenant={tenant}
        </code>
      )}
    </main>
  )
}
