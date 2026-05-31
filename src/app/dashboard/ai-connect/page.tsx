"use client"

import { useCallback, useEffect, useState } from "react"
import { Bot, Check, Copy, Key, Loader2, Plus, Trash2, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api-client"

const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_URL || "http://localhost:3006"

type ApiKey = {
  id: string
  keyPrefix: string
  label: string | null
  lastUsedAt: string | null
  createdAt: string
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="outline" size="sm" onClick={copy} className="gap-1.5 shrink-0">
      {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
      {label ?? (copied ? "Copied!" : "Copy")}
    </Button>
  )
}

export default function AiConnectPage() {
  const { toast } = useToast()
  const [bizId, setBizId] = useState("")
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [newKey, setNewKey] = useState<string | null>(null)
  const [label, setLabel] = useState("")
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const loadKeys = useCallback(async (id: string) => {
    try {
      const res = await apiClient.get(`/mcp/keys?businessId=${id}`)
      setKeys(res.data ?? [])
    } catch {
      // silently skip — shown on initial load only
    }
  }, [])

  useEffect(() => {
    const id = localStorage.getItem("active_biz_id") || ""
    setBizId(id)
    if (id) loadKeys(id).finally(() => setLoading(false))
    else setLoading(false)
  }, [loadKeys])

  const generate = async () => {
    if (!bizId) return
    setGenerating(true)
    setNewKey(null)
    try {
      const res = await apiClient.post("/mcp/keys", { businessId: bizId, label: label.trim() || undefined })
      setNewKey(res.data.key)
      setLabel("")
      await loadKeys(bizId)
      toast({ title: "API key created", description: "Copy it now — it won't be shown again." })
    } catch (e: any) {
      toast({ title: "Failed to generate key", description: e.message, variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  const revoke = async (id: string) => {
    if (!confirm("Revoke this API key? Any connected bots will lose access immediately.")) return
    setRevokingId(id)
    try {
      await apiClient.delete(`/mcp/keys/${id}?businessId=${bizId}`)
      setKeys(prev => prev.filter(k => k.id !== id))
      toast({ title: "Key revoked" })
    } catch (e: any) {
      toast({ title: "Revoke failed", description: e.message, variant: "destructive" })
    } finally {
      setRevokingId(null)
    }
  }

  const sseUrl = `${MCP_SERVER_URL}/sse`
  const configJson = (key: string) => JSON.stringify({
    mcpServers: {
      bizspark: {
        command: "mcp-remote",
        args: [sseUrl, "--header", `Authorization:Bearer ${key}`],
      },
    },
  }, null, 2)

  if (loading) return (
    <div className="h-64 flex items-center justify-center">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  )

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-3xl font-bold font-headline flex items-center gap-3">
          <Bot className="text-primary" size={28} /> AI Connect
        </h2>
        <p className="text-muted-foreground mt-1">
          Connect Claude or any AI chatbot to your business data using MCP.
        </p>
      </div>

      {/* How it works */}
      <Card className="border-2 bg-slate-50">
        <CardContent className="pt-5 pb-5">
          <p className="text-sm font-semibold mb-3">How it works</p>
          <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Generate an API key below</li>
            <li><span className="font-medium text-slate-700">Claude.ai (web):</span> Settings → Connectors → Add custom connector → paste the SSE URL → Connect → paste your key on the BizSpark sign-in page</li>
            <li><span className="font-medium text-slate-700">Claude Desktop:</span> install <code className="text-xs bg-slate-200 px-1 rounded">mcp-remote</code> (<code className="text-xs bg-slate-200 px-1 rounded">npm i -g mcp-remote</code>), then paste the config into settings</li>
            <li>Ask Claude about your store: products, orders, customers, revenue, and more</li>
          </ol>
        </CardContent>
      </Card>

      {/* Generate key */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key size={16} /> Generate API Key
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Label (optional) — e.g. Claude Desktop"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="flex-1"
            />
            <Button onClick={generate} disabled={generating} className="gap-2 shrink-0">
              {generating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Generate
            </Button>
          </div>

          {newKey && (
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-green-800">
                Key created — copy it now. It will not be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white border rounded px-3 py-2 font-mono break-all">
                  {newKey}
                </code>
                <CopyButton text={newKey} />
              </div>

              <div className="pt-1">
                <p className="text-xs font-semibold text-slate-600 mb-1.5">Claude.ai (web) — add as a custom connector:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white border rounded px-3 py-2 font-mono break-all">
                    {sseUrl}
                  </code>
                  <CopyButton text={sseUrl} label="Copy URL" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Settings → Connectors → Add custom connector → paste this URL → Connect, then
                  paste the key above on the BizSpark sign-in page that appears.
                </p>
              </div>

              <div className="pt-1">
                <p className="text-xs font-semibold text-slate-600 mb-1.5">Claude Desktop config:</p>
                <div className="relative">
                  <pre className="text-xs bg-white border rounded p-3 overflow-x-auto">
                    {configJson(newKey)}
                  </pre>
                  <div className="absolute top-2 right-2">
                    <CopyButton text={configJson(newKey)} label="Copy config" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing keys */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Active Keys</h3>
          <Button variant="ghost" size="sm" onClick={() => loadKeys(bizId)} className="gap-1.5">
            <RefreshCw size={13} /> Refresh
          </Button>
        </div>

        {keys.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              No active API keys. Generate one above to connect your AI assistant.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {keys.map(k => (
              <Card key={k.id} className="border-2">
                <CardContent className="pt-3 pb-3 flex items-center gap-4">
                  <Key size={16} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">
                      {k.label || <span className="italic text-muted-foreground">Unlabelled key</span>}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {k.keyPrefix}••••••••••••••••
                    </p>
                  </div>
                  {k.lastUsedAt && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      Used {new Date(k.lastUsedAt).toLocaleDateString()}
                    </Badge>
                  )}
                  <p className="text-xs text-muted-foreground shrink-0">
                    Created {new Date(k.createdAt).toLocaleDateString()}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={revokingId === k.id}
                    onClick={() => revoke(k.id)}
                    className="text-red-500 hover:bg-red-50 hover:text-red-700 shrink-0"
                  >
                    {revokingId === k.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Trash2 size={14} />}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* MCP server info */}
      <Card className="border-2 bg-slate-50">
        <CardContent className="pt-5 pb-5 space-y-2">
          <p className="text-sm font-semibold">MCP Server Details</p>
          <div className="flex items-center gap-2">
            <code className="text-xs text-muted-foreground flex-1">{sseUrl}</code>
            <CopyButton text={sseUrl} />
          </div>
          <p className="text-xs text-muted-foreground">
            Compatible with Claude Desktop, Claude.ai, and any MCP-enabled AI client.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
