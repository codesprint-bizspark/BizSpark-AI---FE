"use client"

import { useEffect, useRef, useState } from "react"
import { Globe, Check, Loader2, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"

type CheckResult = {
  available: boolean
  slug: string
  reason: string | null
  suggestions: string[]
}

// Sanitise input to a DNS-safe label as the user types.
function clean(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-/, "").slice(0, 63)
}

export function StoreAddressCard({
  businessId,
  initialSlug,
  baseDomain,
  onClaimed,
}: {
  businessId: string
  initialSlug?: string | null
  baseDomain: string
  onClaimed?: (slug: string) => void
}) {
  const [value, setValue] = useState(initialSlug ?? "")
  const [claimedSlug, setClaimedSlug] = useState<string | null>(initialSlug ?? null)
  const [check, setCheck] = useState<CheckResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced availability check (skips the already-claimed value).
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    setError(null)
    const slug = value.trim()
    if (!slug || slug === claimedSlug) {
      setCheck(null)
      setChecking(false)
      return
    }
    setChecking(true)
    debounce.current = setTimeout(async () => {
      try {
        const res = (await apiClient.get(
          `/business/${businessId}/subdomain/check?slug=${encodeURIComponent(slug)}`,
        )) as CheckResult
        setCheck(res)
      } catch {
        setCheck(null)
      } finally {
        setChecking(false)
      }
    }, 400)
    return () => {
      if (debounce.current) clearTimeout(debounce.current)
    }
  }, [value, businessId, claimedSlug])

  const claim = async (slug: string) => {
    setClaiming(true)
    setError(null)
    try {
      const res = (await apiClient.post(`/business/${businessId}/subdomain`, { slug })) as {
        slug: string
        url: string
      }
      setClaimedSlug(res.slug)
      setValue(res.slug)
      setCheck(null)
      onClaimed?.(res.slug)
    } catch (e: any) {
      setError(e?.message || "Could not claim this address")
    } finally {
      setClaiming(false)
    }
  }

  const canClaim = check?.available && !checking && value.trim() !== claimedSlug

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe size={15} className="text-primary" /> Your store address
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">
            {claimedSlug ? "Change your address" : "Pick a custom address for your store"}
          </p>
          <div className="flex items-stretch rounded-lg border-2 overflow-hidden focus-within:border-primary">
            <Input
              value={value}
              onChange={(e) => setValue(clean(e.target.value))}
              placeholder="your-store"
              className="border-0 focus-visible:ring-0 rounded-none font-mono text-sm"
              maxLength={63}
            />
            <span className="flex items-center px-3 bg-muted text-sm text-muted-foreground font-mono shrink-0">
              .{baseDomain}
            </span>
          </div>

          {/* Status line */}
          <div className="min-h-5 mt-1.5 text-xs">
            {checking && (
              <span className="text-muted-foreground inline-flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> Checking…
              </span>
            )}
            {!checking && check && check.available && (
              <span className="text-green-600 inline-flex items-center gap-1">
                <Check size={12} /> Available
              </span>
            )}
            {!checking && check && !check.available && (
              <span className="text-red-500 inline-flex items-center gap-1">
                <X size={12} /> {check.reason}
              </span>
            )}
            {error && <span className="text-red-500">{error}</span>}
          </div>

          {/* Suggestions when taken */}
          {!checking && check && !check.available && check.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {check.suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setValue(s)}
                  className="text-xs font-mono rounded-md border px-2 py-1 hover:border-primary hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          size="sm"
          className="gap-2"
          disabled={!canClaim || claiming}
          onClick={() => claim(value.trim())}
        >
          {claiming ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
          {claimedSlug ? "Update address" : "Claim address"}
        </Button>
      </CardContent>
    </Card>
  )
}
