import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Mail, Lock, Loader2, Home, UserPlus, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    logger.debug('Auth: Starting', isLogin ? 'login' : 'signup');
    
    // Validate input
    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      toast({
        title: 'Validation Error',
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        logger.debug('Auth: Attempting login for', email);
        
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        logger.debug('Auth: Login response', { hasUser: !!authData?.user, error: error?.message });

        if (error) {
          // Handle specific error cases
          if (error.message?.includes('Invalid login credentials') || 
              error.message?.includes('Email not confirmed')) {
            throw new Error('Invalid email or password. Please check your credentials.');
          } else if (error.message?.includes('network') || 
                     error.message?.includes('fetch')) {
            throw new Error('Network error. Please check your internet connection and try again.');
          }
          throw error;
        }

        if (!authData.user) {
          throw new Error('Failed to get user data. Please try again.');
        }

        logger.debug('Auth: Login successful, navigating');
        
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });

        // Wait a moment for session to be fully established before navigating
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Navigate to home
        navigate('/', { replace: true });
      } else {
        logger.debug('Auth: Attempting signup for', email);
        
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        logger.debug('Auth: Signup response', { hasUser: !!signUpData?.user, error: error?.message });

        if (error) {
          // Handle specific error cases
          if (error.message?.includes('User already registered')) {
            throw new Error('This email is already registered. Please sign in instead.');
          } else if (error.message?.includes('network') || 
                     error.message?.includes('fetch')) {
            throw new Error('Network error. Please check your internet connection and try again.');
          }
          throw error;
        }

        // Profile should be created by trigger, but ensure it exists
        if (signUpData.user) {
          logger.debug('Auth: User created, checking profile');
          
          // Wait a moment for trigger to create profile
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if profile exists, create if not
          const { data: existingProfile, error: profileError } = await safeQuery(async () =>
            await (supabase as any)
              .from('profiles')
              .select('*')
              .eq('id', signUpData.user.id)
              .maybeSingle()
          );

          if (profileError) {
            logger.error('Auth: Error checking profile:', profileError);
          }

          if (!existingProfile) {
            logger.debug('Auth: Profile not found, creating');
            const { error: insertError } = await safeQuery(async () =>
              await (supabase as any)
                .from('profiles')
                .insert({
                  id: signUpData.user.id,
                  email: signUpData.user.email || email,
                  role: 'user',
                })
            );

            if (insertError) {
              logger.error('Auth: Error creating profile:', insertError);
              // Don't throw - user is created, profile can be fixed later
            } else {
              logger.debug('Auth: Profile created');
            }
          } else {
            logger.debug('Auth: Profile already exists');
          }
        }

        toast({
          title: 'Account created!',
          description: 'You can now log in with your credentials. Contact an admin to get uploader permissions.',
        });
        setIsLogin(true);
        setEmail('');
        setPassword('');
      }
    } catch (error: any) {
      logger.error('Auth: Error occurred', error);
      toast({
        title: 'Error',
        description: error.message || 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pattern-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl p-8 shadow-elevated animate-scale-in">
          {/* Go to Home Button */}
          <div className="flex justify-end mb-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Button>
          </div>

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground text-center mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            {isLogin 
              ? 'Sign in to your account' 
              : 'Create a new account'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="pl-11"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-11"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-semibold shadow-lg"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : isLogin ? (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Create Account
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Secondary Action - Less Prominent */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {isLogin 
                ? "Don't have an account?" 
                : 'Already have an account?'}
            </p>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-medium text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
            >
              {isLogin 
                ? 'Create a new account' 
                : 'Sign in to existing account'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to use this app responsibly.
        </p>
      </div>
    </div>
  );
}
