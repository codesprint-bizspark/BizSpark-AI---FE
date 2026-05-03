"use client"

import { Globe, Shield, Plus, Copy, Link2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export default function DomainManagement() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold font-headline">Domains</h2>
          <p className="text-muted-foreground mt-1">Manage your custom web addresses and DNS settings.</p>
        </div>
        <Badge variant="outline" className="text-xs uppercase tracking-wide mt-2">Coming Soon</Badge>
      </div>

      {/* Connected domains — empty state */}
      <Card className="border-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Connected Domains</CardTitle>
            <CardDescription>Custom domains pointing to your storefront.</CardDescription>
          </div>
          <Button size="sm" className="gap-2" disabled>
            <Plus size={16} /> Add Custom Domain
          </Button>
        </CardHeader>
        <CardContent>
          <div className="py-12 flex flex-col items-center justify-center text-center gap-3 border-2 border-dashed rounded-xl bg-slate-50">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Link2 className="text-primary" size={22} />
            </div>
            <p className="font-semibold">No custom domains yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Custom domain management is coming soon. Your storefront is accessible via the preview URL in the Website tab.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* DNS info — stays as static reference content */}
      <Card>
        <CardHeader>
          <CardTitle>DNS Configuration</CardTitle>
          <CardDescription>When custom domains launch, point these records to BizSpark.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">A Record</h4>
              <div className="p-4 bg-slate-50 rounded-lg flex items-center justify-between border">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Type: A</p>
                  <p className="font-mono text-sm">76.76.21.21</p>
                </div>
                <Button variant="ghost" size="icon"><Copy size={16} /></Button>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">CNAME Record</h4>
              <div className="p-4 bg-slate-50 rounded-lg flex items-center justify-between border">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Type: CNAME</p>
                  <p className="font-mono text-sm break-all">cname.bizspark.ai</p>
                </div>
                <Button variant="ghost" size="icon"><Copy size={16} /></Button>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t flex gap-3 items-start">
            <Shield className="text-primary shrink-0" size={20} />
            <div>
              <p className="text-sm font-bold mb-1">Secure by Default</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every domain connected to BizSpark AI automatically receives an SSL certificate for secure HTTPS connections. No renewal fees or setup required.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
