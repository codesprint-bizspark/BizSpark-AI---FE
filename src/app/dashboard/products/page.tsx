"use client"

import { useEffect, useState, useCallback } from "react"
import { Package, Plus, Search, Trash2, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

const COMMERCE = process.env.NEXT_PUBLIC_COMMERCE_URL || "http://localhost:3003"

interface Product {
  id: string
  title: string
  price: number
  description: string | null
  currency: string
}

async function getCommerceToken(bizId: string): Promise<string> {
  const raw = localStorage.getItem(`admin_creds_${bizId}`)
  if (!raw) throw new Error("no_creds")
  const { email, password } = JSON.parse(raw)
  const res = await fetch(`${COMMERCE}/api/commerce/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-tenant-id": bizId },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error("Store login failed — credentials may be incorrect.")
  return (await res.json()).access_token
}

async function apiFetch(bizId: string, token: string, path: string, opts: RequestInit = {}) {
  const res = await fetch(`${COMMERCE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": bizId,
      Authorization: `Bearer ${token}`,
      ...(opts.headers as Record<string, string>),
    },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.message || `Request failed: ${res.status}`)
  return json
}

export default function ProductsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noCreds, setNoCreds] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [bizId, setBizId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: "", description: "", price: "" })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNoCreds(false)
    try {
      const id = localStorage.getItem("active_biz_id")
      if (!id) { setError("No active business selected."); return }
      setBizId(id)
      let tok: string
      try {
        tok = await getCommerceToken(id)
      } catch (e: any) {
        if (e.message === "no_creds") { setNoCreds(true); return }
        throw e
      }
      setToken(tok)
      const data = await apiFetch(id, tok, "/api/commerce/catalog/products?limit=100")
      setProducts(data.data ?? [])
    } catch (e: any) {
      setError(e.message || "Could not connect to store.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!token || !bizId || !form.title.trim()) return
    const price = parseFloat(form.price.replace(/[^0-9.]/g, ""))
    if (isNaN(price) || price < 0) {
      toast({ title: "Invalid price", description: "Enter a number e.g. 8.50", variant: "destructive" })
      return
    }
    setIsSaving(true)
    try {
      const created = await apiFetch(bizId, token, "/api/commerce/catalog/products", {
        method: "POST",
        body: JSON.stringify({ title: form.title.trim(), price, description: form.description.trim() || undefined }),
      })
      setProducts(prev => [created.data, ...prev])
      setForm({ title: "", description: "", price: "" })
      setIsAdding(false)
      toast({ title: "Product added", description: `"${created.data.title}" is now live in your store.` })
    } catch (e: any) {
      toast({ title: "Failed to add product", description: e.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!token || !bizId) return
    setDeletingId(id)
    try {
      await apiFetch(bizId, token, `/api/commerce/catalog/products/${id}`, { method: "DELETE" })
      setProducts(prev => prev.filter(p => p.id !== id))
      toast({ title: "Deleted", description: `"${title}" removed from your store.` })
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" })
    } finally {
      setDeletingId(null)
    }
  }

  const fmt = (price: number, currency = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price)

  const filtered = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="h-64 flex items-center justify-center">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  )

  if (noCreds) return (
    <div className="space-y-6">
      <div><h2 className="text-3xl font-bold font-headline">Products & Services</h2></div>
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="text-amber-500" size={32} />
          <p className="font-semibold text-amber-800">Store not activated yet</p>
          <p className="text-sm text-amber-700 max-w-sm">
            Generate and publish your AI website first. This activates your store and creates your admin account.
          </p>
        </CardContent>
      </Card>
    </div>
  )

  if (error) return (
    <div className="space-y-6">
      <div><h2 className="text-3xl font-bold font-headline">Products & Services</h2></div>
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="text-red-500" size={32} />
          <p className="font-semibold text-red-800">{error}</p>
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            <RefreshCw size={14} /> Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-headline">Products & Services</h2>
          <p className="text-muted-foreground mt-1">
            {products.length} product{products.length !== 1 ? "s" : ""} in your store.
          </p>
        </div>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus size={16} /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>Goes live in your storefront immediately.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Product Name *</label>
                <Input
                  placeholder="e.g. Lavender Honey Cake"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Price (USD) *</label>
                <Input
                  placeholder="e.g. 8.50"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Describe the product..."
                  className="min-h-[80px]"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button
                onClick={handleAdd}
                disabled={isSaving || !form.title.trim() || !form.price.trim()}
                className="min-w-[120px]"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : "Add Product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {products.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input className="pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {products.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="py-20 flex flex-col items-center justify-center text-center gap-4">
            <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Package className="text-primary" size={26} />
            </div>
            <div>
              <p className="font-bold text-lg">No products yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add your first product to build your catalogue.</p>
            </div>
            <Button className="gap-2 mt-2" onClick={() => setIsAdding(true)}>
              <Plus size={16} /> Add Your First Product
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No products match your search.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {filtered.map(product => (
            <Card key={product.id} className="border-2">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold leading-tight">{product.title}</p>
                  <p className="font-bold text-primary shrink-0">{fmt(product.price, product.currency)}</p>
                </div>
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                  disabled={deletingId === product.id}
                  onClick={() => handleDelete(product.id, product.title)}
                >
                  {deletingId === product.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Trash2 size={12} />}
                  Remove
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
