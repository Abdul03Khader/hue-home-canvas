import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const AuthPage = () => {
  const navigate = useNavigate();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginEmail || !loginPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    // Simple localStorage auth simulation
    const users = JSON.parse(localStorage.getItem("visualizer_users") || "[]");
    const user = users.find((u: any) => u.email === loginEmail && u.password === loginPassword);
    
    if (user) {
      localStorage.setItem("visualizer_current_user", JSON.stringify(user));
      toast.success("Welcome back!");
      navigate("/editor");
    } else {
      toast.error("Invalid email or password");
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupEmail || !signupPassword || !signupConfirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (signupPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    const users = JSON.parse(localStorage.getItem("visualizer_users") || "[]");
    
    if (users.find((u: any) => u.email === signupEmail)) {
      toast.error("Email already registered");
      return;
    }

    const newUser = { email: signupEmail, password: signupPassword, createdAt: new Date().toISOString() };
    users.push(newUser);
    localStorage.setItem("visualizer_users", JSON.stringify(users));
    localStorage.setItem("visualizer_current_user", JSON.stringify(newUser));
    
    toast.success("Account created successfully!");
    navigate("/editor");
  };

  const handleGuestAccess = () => {
    localStorage.setItem("visualizer_current_user", JSON.stringify({ email: "guest@example.com", guest: true }));
    toast.success("Continuing as guest");
    navigate("/editor");
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-96 h-96 bg-primary/40 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/40 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0 backdrop-blur-sm bg-card/95 animate-fade-in relative z-10">
        <CardHeader className="text-center">
          <div className="mb-4">
            <h1 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
              Home Visualizer Pro
            </h1>
          </div>
          <CardTitle className="text-3xl">Welcome</CardTitle>
          <CardDescription>Sign in to save and manage your designs</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="transition-smooth focus:shadow-glow"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="transition-smooth focus:shadow-glow"
                  />
                </div>
                <Button type="submit" variant="hero" className="w-full" size="lg">
                  Login
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="transition-smooth focus:shadow-glow"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="transition-smooth focus:shadow-glow"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm Password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    className="transition-smooth focus:shadow-glow"
                  />
                </div>
                <Button type="submit" variant="hero" className="w-full" size="lg">
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full mt-4" 
              size="lg"
              onClick={handleGuestAccess}
            >
              Continue as Guest
            </Button>
          </div>

          <div className="mt-6 text-center">
            <Button variant="link" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
