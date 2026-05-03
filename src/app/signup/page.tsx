"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Zap, Loader2, Mail, Lock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api-client"

export default function SignupPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: ""
    })

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.email || !formData.password || !formData.name) {
            toast({
                title: "Error",
                description: "Please fill out all fields.",
                variant: "destructive"
            })
            return
        }

        setIsLoading(true)

        try {
            const data = await apiClient.post('/auth/register', formData)
            apiClient.setAuthToken(data.access_token, data.user)

            toast({
                title: "Welcome to BizSpark AI",
                description: "Account created. You can create your first business from the dashboard."
            })

            router.push("/dashboard")
        } catch (error: any) {
            toast({
                title: "Registration Failed",
                description: error.message || "Could not complete registration.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F1F0F5] px-6">
            <div className="w-full max-w-[400px] space-y-8">
                <div className="flex flex-col items-center gap-2 mb-8">
                    <Link href="/" className="flex items-center gap-2 font-bold text-3xl text-primary">
                        <Zap className="fill-primary" size={32} />
                        <span className="font-headline tracking-tight">BizSpark AI</span>
                    </Link>
                    <p className="text-muted-foreground font-medium">Create your account to start building.</p>
                </div>

                <Card className="border-2 shadow-xl">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold">Sign up</CardTitle>
                        <CardDescription>
                            Enter your details to register a new account
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSignup}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="John Doe"
                                        className="pl-10"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        className="pl-10"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        className="pl-10"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full h-11" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Create Account"}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="text-primary font-bold hover:underline">
                        Log in instead
                    </Link>
                </p>
            </div>
        </div>
    )
}
