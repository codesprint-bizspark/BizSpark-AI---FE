"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { socialApi } from "./api"
import { SocialAccount, SocialPlatform } from "./types"

export type SocialAccountsByPlatform = Record<SocialPlatform, SocialAccount | undefined>

export type UseSocialAccountsResult = {
    /** Raw list straight from the backend (only CONNECTED + non-deleted rows have isConnected=true). */
    accounts: SocialAccount[]
    /** Convenience: connected account per platform (undefined if not connected). */
    byPlatform: SocialAccountsByPlatform
    /** True if at least one platform has a CONNECTED account. */
    anyConnected: boolean
    /** True only on the very first fetch — subsequent refetches don't flip this. */
    isLoading: boolean
    /** True while a background refetch is running (e.g. after window focus). */
    isRefetching: boolean
    /** Last fetch error, or null. */
    error: string | null
    /** Manual refresh (returns the new accounts). */
    refetch: () => Promise<SocialAccount[]>
}

/**
 * Single source of truth for the user's social accounts in the UI.
 *
 * Cancellation strategy:
 *   Each fetch gets a unique ID from `fetchIdRef`. After the awaited request
 *   resolves, we compare against the current ID — if a newer fetch has started
 *   (or the effect cleaned up), the result is stale and we skip state updates.
 *
 *   We DON'T use a "mounted" ref. That pattern is broken in React StrictMode
 *   (dev): the cleanup runs once before the re-invocation, permanently flipping
 *   the ref to false and causing every subsequent `setState` guard to skip,
 *   which manifests as an infinite loading spinner. The fetch-ID pattern works
 *   correctly in both StrictMode and production.
 *
 * Auto-refresh triggers:
 *   1. `window.focus`   — user came back from an OAuth popup/tab
 *   2. `visibilitychange → visible` — user tabbed back from a separate OAuth tab
 *   3. `refetch()`      — explicit programmatic refresh after a known event
 *
 * Diagnostic logs are tagged `[social-accounts]` — remove when stable.
 */
export function useSocialAccounts(businessId: string): UseSocialAccountsResult {
    const [accounts, setAccounts] = useState<SocialAccount[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefetching, setIsRefetching] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Monotonically increasing fetch counter. The owner of fetch #N is the
    // "latest" fetch; any older fetches that resolve after #N has bumped the
    // counter are stale and must not touch state.
    const fetchIdRef = useRef(0)
    // Has any fetch completed yet? Drives "first load" vs "background refresh".
    const hasFetchedRef = useRef(false)

    const doFetch = useCallback(async (background: boolean): Promise<SocialAccount[]> => {
        if (!businessId) return []

        const myId = ++fetchIdRef.current
        const isLatest = () => fetchIdRef.current === myId

        if (background) setIsRefetching(true)
        else setIsLoading(true)

        try {
            const rows = await socialApi.listAccounts(businessId)
            // eslint-disable-next-line no-console
            console.debug("[social-accounts] fetched", {
                fetchId: myId,
                stale: !isLatest(),
                businessId,
                count: rows.length,
                connected: rows
                    .filter((r) => r.isConnected)
                    .map((r) => `${r.platform}:${r.displayName ?? r.externalAccountId}`),
            })
            if (!isLatest()) return rows
            setAccounts(rows)
            setError(null)
            hasFetchedRef.current = true
            return rows
        } catch (e: any) {
            // eslint-disable-next-line no-console
            console.error("[social-accounts] fetch failed", {
                fetchId: myId,
                stale: !isLatest(),
                businessId,
                error: e?.message ?? e,
            })
            if (!isLatest()) return []
            setError(e?.message ?? "Failed to load accounts")
            return []
        } finally {
            // Only the LATEST fetch is allowed to flip loading flags. This is what
            // prevents the infinite-spinner bug when multiple fetches race
            // (StrictMode double-invoke, rapid refetches, businessId changes).
            if (isLatest()) {
                if (background) setIsRefetching(false)
                else setIsLoading(false)
            }
        }
    }, [businessId])

    // Initial fetch + refetch on businessId change.
    useEffect(() => {
        if (!businessId) {
            setAccounts([])
            setIsLoading(false)
            return
        }
        void doFetch(false)
        // The cleanup bumps the fetch counter so any in-flight fetch becomes stale.
        return () => { fetchIdRef.current += 1 }
    }, [businessId, doFetch])

    // Auto-refresh on window focus / tab visibility — catches "user just
    // returned from the OAuth flow" across pages and tabs.
    useEffect(() => {
        if (!businessId) return

        const onFocus = () => {
            if (!hasFetchedRef.current) return
            // eslint-disable-next-line no-console
            console.debug("[social-accounts] refetch on focus")
            void doFetch(true)
        }
        const onVisible = () => {
            if (document.visibilityState === "visible" && hasFetchedRef.current) {
                // eslint-disable-next-line no-console
                console.debug("[social-accounts] refetch on visible")
                void doFetch(true)
            }
        }

        window.addEventListener("focus", onFocus)
        document.addEventListener("visibilitychange", onVisible)
        return () => {
            window.removeEventListener("focus", onFocus)
            document.removeEventListener("visibilitychange", onVisible)
        }
    }, [businessId, doFetch])

    const byPlatform: SocialAccountsByPlatform = {
        FACEBOOK: accounts.find((a) => a.platform === "FACEBOOK" && a.isConnected),
        INSTAGRAM: accounts.find((a) => a.platform === "INSTAGRAM" && a.isConnected),
        TIKTOK: accounts.find((a) => a.platform === "TIKTOK" && a.isConnected),
    }
    const anyConnected = Object.values(byPlatform).some(Boolean)

    return {
        accounts,
        byPlatform,
        anyConnected,
        isLoading,
        isRefetching,
        error,
        refetch: () => doFetch(true),
    }
}
