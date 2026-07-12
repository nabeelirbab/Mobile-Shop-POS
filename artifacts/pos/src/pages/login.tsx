import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLogin } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token);
        toast({ title: "Welcome back!", description: `Logged in as ${data.user.name}` });
        setLocation("/");
      },
      onError: (error: any) => {
        toast({
          title: "Login failed",
          description: error?.data?.error || error?.message || "Invalid credentials",
          variant: "destructive",
        });
      },
    },
  });

  useEffect(() => {
    if (isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { username, password } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-24 h-24 rounded-full overflow-hidden shadow-xl border-4 border-primary/20 bg-white flex items-center justify-center">
            <img
              src="/umg-logo.jpg"
              alt="UMG Logo"
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Umair Mobile Gallery</h1>
            <p className="text-sm text-muted-foreground">UMG · Point of Sale System</p>
          </div>
        </div>

        <Card className="border-border shadow-xl">
          <CardHeader className="space-y-1 text-center pb-2">
            <CardTitle className="text-xl font-bold">Sign In</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loginMutation.isPending}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginMutation.isPending}
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center pt-2">
            <p className="text-xs text-muted-foreground">
              Default: <strong className="text-foreground">admin / admin123</strong>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
