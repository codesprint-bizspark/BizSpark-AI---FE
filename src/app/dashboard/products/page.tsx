"use client"

import { useState } from "react"
import { Package, Plus, Search, Sparkles, ImageIcon, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface Product {
  id: string
  name: string
  price: string
  description: string
}

export default function ProductsPage() {
  const { toast } = useToast()
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [newProduct, setNewProduct] = useState({ name: "", description: "", price: "" })

  const handleAddProduct = async () => {
    if (!newProduct.name.trim()) return
    setIsSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setProducts(prev => [...prev, { id: crypto.randomUUID(), ...newProduct }])
    setNewProduct({ name: "", description: "", price: "" })
    setIsAdding(false)
    setIsSaving(false)
    toast({ title: "Product added", description: `${newProduct.name} is now in your catalogue.` })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-headline">Products & Services</h2>
          <p className="text-muted-foreground mt-1">Manage your offerings and let AI handle the marketing.</p>
        </div>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={16} /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>Fill in the details to add a product to your catalogue.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Product Name</label>
                <Input
                  placeholder="e.g. Lavender Honey Cake"
                  value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Price</label>
                <Input
                  placeholder="e.g. $8.50"
                  value={newProduct.price}
                  onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Describe the product..."
                  className="min-h-[80px]"
                  value={newProduct.description}
                  onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                />
              </div>
              <div className="p-6 border-2 border-dashed rounded-xl bg-slate-50 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 transition-colors">
                <ImageIcon className="size-7 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-muted-foreground">Image upload coming soon</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button onClick={handleAddProduct} disabled={isSaving || !newProduct.name.trim()} className="min-w-[120px]">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : "Add Product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {products.length > 0 && (
        <div className="flex items-center gap-4 bg-white p-3 rounded-xl border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input className="pl-9 h-9" placeholder="Search products..." />
          </div>
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
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {products.map(product => (
            <Card key={product.id} className="border-2">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold">{product.name}</p>
                  {product.price && <p className="font-bold text-primary shrink-0">{product.price}</p>}
                </div>
                {product.description && (
                  <p className="text-sm text-muted-foreground">{product.description}</p>
                )}
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs" disabled>
                  <Sparkles size={12} /> Boost with AI (coming soon)
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {products.length > 0 && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="pt-6 flex items-start gap-4">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="text-primary" size={20} />
            </div>
            <div>
              <p className="font-bold">AI Product Marketing — Coming Soon</p>
              <p className="text-sm text-muted-foreground mt-1">
                BizSpark AI will automatically generate social media captions, website descriptions, and promotional posts for each product you add.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
