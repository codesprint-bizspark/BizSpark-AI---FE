"use client"

import Link from "next/link"
import Image from "next/image"
import { Zap, ArrowRight, CheckCircle2, Globe, Share2, Sparkles, Layout } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { cn } from "@/lib/utils"

export default function LandingPage() {
  const heroImage = PlaceHolderImages.find(img => img.id === "hero-image")

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-2xl text-primary">
            <Zap className="fill-primary" />
            <span className="font-headline">BizSpark AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="#how-it-works" className="hover:text-primary">How it Works</Link>
            <Link href="#features" className="hover:text-primary">Features</Link>
            <Link href="#pricing" className="hover:text-primary">Pricing</Link>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button className="bg-primary hover:bg-primary/90" asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 overflow-hidden">
        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase">
              <span className="flex items-center gap-1"><Sparkles className="size-3" /> The Future of Small Business</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-headline leading-tight text-slate-900">
              Your AI Website & Social Media Manager
            </h1>
            <p className="text-xl text-muted-foreground max-w-lg">
              Generate a professional website in seconds and let AI manage your social media posts. The all-in-one platform for busy business owners.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg h-14 px-8" asChild>
                <Link href="/signup">
                  Start Your Business Spark <ArrowRight className="ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg h-14 px-8 border-primary text-primary hover:bg-primary/5">
                Watch Demo
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 blur-3xl rounded-full opacity-50"></div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border bg-white">
              <Image
                src={heroImage?.imageUrl || "https://picsum.photos/seed/biz1/1200/800"}
                width={1200}
                height={800}
                alt="BizSpark Dashboard"
                className="w-full h-auto"
                data-ai-hint="small business"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">How it works</h2>
            <p className="text-muted-foreground text-lg">Three simple steps to automate your online presence.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { icon: Sparkles, title: "Add Details", desc: "Tell us about your business, products, and services in a simple wizard." },
              { icon: Layout, title: "AI Generates Website", desc: "Our AI creates a beautiful, responsive website tailored to your brand." },
              { icon: Share2, title: "Automated Updates", desc: "Add a product, and AI instantly updates your site and drafts social posts." }
            ].map((step, i) => (
              <div key={i} className="text-center group">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                  <step.icon size={32} />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold font-headline leading-snug">Everything you need to succeed online</h2>
              <div className="space-y-4">
                {[
                  { icon: Layout, title: "AI Website Builder", desc: "No coding required. Just describe your business." },
                  { icon: Share2, title: "Social Media Automation", desc: "Connect IG, FB, TikTok, and X easily." },
                  { icon: Globe, title: "Custom Domains", desc: "Look professional with your own .com address." },
                  { icon: CheckCircle2, title: "Built-in Analytics", desc: "Track your growth across all channels." }
                ].map((feat, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-xl hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-border">
                    <div className="mt-1">
                      <feat.icon className="text-primary size-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{feat.title}</h4>
                      <p className="text-muted-foreground">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-xl border relative overflow-hidden">
              <Image
                src="https://picsum.photos/seed/dash2/800/600"
                width={800}
                height={600}
                alt="Product Dashboard"
                className="rounded-xl border shadow-sm"
                data-ai-hint="saas dashboard"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground">Start free, upgrade when you spark.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Starter", price: "$0", features: ["1 AI Website", "2 Social Accounts", "Basic Analytics", "Community Support"] },
              { name: "Spark Pro", price: "$29", featured: true, features: ["Unlimited AI Websites", "All Social Platforms", "AI Agent Content Manager", "Custom Domain", "Priority Support"] },
              { name: "Agency", price: "$99", features: ["Manage 10 Businesses", "White-label reports", "API Access", "Dedicated Account Manager"] }
            ].map((plan, i) => (
              <Card key={i} className={cn("relative p-8 border-2 flex flex-col", plan.featured ? "border-primary shadow-xl scale-105 z-10" : "border-border shadow-sm")}>
                {plan.featured && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                </div>
                <div className="space-y-4 mb-8 flex-1">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <CheckCircle2 className="text-primary size-4" />
                      <span className="text-sm">{f}</span>
                    </div>
                  ))}
                </div>
                <Button className={cn("w-full py-6", plan.featured ? "bg-primary hover:bg-primary/90" : "bg-slate-900")}>
                  Get Started
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-950 text-slate-400">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-bold text-2xl text-white">
                <Zap className="fill-primary text-primary" />
                <span>BizSpark AI</span>
              </div>
              <p className="text-sm">Empowering small businesses with AI-driven growth tools.</p>
            </div>
            <div>
              <h5 className="font-bold text-white mb-4">Product</h5>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white">AI Website Builder</Link></li>
                <li><Link href="#" className="hover:text-white">Social Media Manager</Link></li>
                <li><Link href="#" className="hover:text-white">CMS</Link></li>
                <li><Link href="#" className="hover:text-white">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-white mb-4">Company</h5>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white">About Us</Link></li>
                <li><Link href="#" className="hover:text-white">Blog</Link></li>
                <li><Link href="#" className="hover:text-white">Careers</Link></li>
                <li><Link href="#" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-white mb-4">Legal</h5>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-sm">
            &copy; {new Date().getFullYear()} BizSpark AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
