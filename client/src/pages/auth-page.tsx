import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MessageSquare, Bot } from 'lucide-react';

const AuthPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('login');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { login, signup, user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to home if already logged in
  useEffect(() => {
    if (user) {
      setLocation('/');
    }
  }, [user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (activeTab === 'signup') {
        // Validate password confirmation
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        // Validate password strength
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }

        await signup(username, password);
      } else {
        await login(username, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription>
              {activeTab === 'login' 
                ? 'Sign in to access your conversations' 
                : 'Sign up to save your chat history'}
            </CardDescription>
          </CardHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <form onSubmit={handleSubmit}>
              <TabsContent value="login" className="space-y-4">
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      placeholder="Enter your username" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button type="submit" className="w-full">Sign In</Button>
                </CardFooter>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Username</Label>
                    <Input 
                      id="signup-username" 
                      placeholder="Choose a username" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input 
                      id="signup-password" 
                      type="password" 
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input 
                      id="confirm-password" 
                      type="password" 
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button type="submit" className="w-full">Create Account</Button>
                </CardFooter>
              </TabsContent>
            </form>
          </Tabs>
          
          {error && (
            <div className="px-6 pb-4 text-sm text-red-600">
              {error}
            </div>
          )}
        </Card>
      </div>
      
      {/* Right side - Hero */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-tr from-primary to-primary-foreground justify-center items-center p-8">
        <div className="max-w-md text-white">
          <div className="flex items-center mb-8">
            <Bot size={48} className="mr-4" />
            <h1 className="text-4xl font-bold">AI Chatbot</h1>
          </div>
          
          <h2 className="text-3xl font-bold mb-6">Smart Conversations with AI</h2>
          
          <p className="text-lg mb-8">
            Ask questions, get creative responses, and have meaningful conversations with our advanced AI chatbot.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <MessageSquare className="mr-3 mt-1" />
              <div>
                <h3 className="font-semibold">Multiple AI Models</h3>
                <p>Powered by OpenAI with Qwen fallback</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <MessageSquare className="mr-3 mt-1" />
              <div>
                <h3 className="font-semibold">Conversation Memory</h3>
                <p>Your chat history is saved for continuity</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <MessageSquare className="mr-3 mt-1" />
              <div>
                <h3 className="font-semibold">Personality Options</h3>
                <p>Choose how your AI assistant responds</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;