import { apiClient, type ApiClientError } from "./api-client"

export type UsageQuotaKey =
  | "monthlyTokens"
  | "websiteGenerations"
  | "mobileAppGenerations"
  | "socialPostGenerations"
  | "businesses"
  | "mcpKeys"

export type MeterQuotaKey =
  | "monthlyTokens"
  | "websiteGenerations"
  | "mobileAppGenerations"
  | "socialPostGenerations"

export type UsageQuotas = Record<UsageQuotaKey, number>

export type UsageMeter = {
  used: number
  reserved: number
}

export type UsageSnapshot = {
  effectivePlan: {
    id: string
    name: string
    priceMonthly: number
    currency: string
    quotas: UsageQuotas
  }
  planId: string
  month: string
  resetAt: string
  quotas: UsageQuotas
  usage: Record<MeterQuotaKey, UsageMeter>
  remaining: UsageQuotas
  recentEvents: Array<Record<string, any>>
}

export const usageApi = {
  async get(month?: string): Promise<UsageSnapshot> {
    const qs = month ? `?month=${encodeURIComponent(month)}` : ""
    const res = await apiClient.get(`/usage${qs}`)
    return res.data ?? res
  },
}

export function formatQuotaNumber(value: number, key?: UsageQuotaKey) {
  if (key === "monthlyTokens") {
    return new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
    }).format(value)
  }
  return new Intl.NumberFormat("en").format(value)
}

export function spentForUsage(usage: UsageSnapshot, key: MeterQuotaKey) {
  const meter = usage.usage[key]
  return (meter?.used ?? 0) + (meter?.reserved ?? 0)
}

export function quotaPercent(usage: UsageSnapshot, key: MeterQuotaKey) {
  const limit = usage.quotas[key]
  if (limit <= 0) return 100
  return Math.min(100, Math.round((spentForUsage(usage, key) / limit) * 100))
}

export function isUsageExhausted(usage: UsageSnapshot | null, key: MeterQuotaKey, amount = 1) {
  if (!usage) return false
  return usage.remaining.monthlyTokens <= 0 || usage.remaining[key] < amount
}

export function isQuotaError(error: unknown): error is ApiClientError {
  const apiError = error as ApiClientError
  return apiError?.status === 402 || apiError?.code === "QUOTA_EXCEEDED" || apiError?.details?.code === "QUOTA_EXCEEDED"
}

export function quotaErrorDescription(error: unknown) {
  const apiError = error as ApiClientError
  const details = apiError?.details ?? {}
  const remaining = Number(details.remaining ?? 0)
  const resetAt = details.resetAt ? ` Resets ${new Date(details.resetAt).toLocaleDateString()}.` : ""
  if (details.limitKey) {
    return `${details.limitKey} limit reached. ${remaining} remaining.${resetAt}`
  }
  return "Your plan limit has been reached. Upgrade to continue."
}
