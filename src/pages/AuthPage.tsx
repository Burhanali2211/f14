import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Mail, Lock, Loader2, Home, UserPlus, LogIn, User, Phone, MapPin, CheckCircle2, Navigation, Info, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { safeQuery } from '@/lib/db-utils';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { useIsMobile } from '@/hooks/use-mobile';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone_number: z.string().optional().refine((val) => !val || val.length >= 10, {
    message: 'Please enter a valid phone number (at least 10 characters)',
  }),
  address: z.string().optional().refine((val) => !val || val.length >= 5, {
    message: 'Please enter a valid address (at least 5 characters)',
  }),
});

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const openGmail = () => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isAndroid = /android/i.test(userAgent);
    
    if (isMobile) {
      if (isIOS) {
        // Try to open Gmail app on iOS
        // Use googlegmail:// scheme for Gmail app
        const gmailAppUrl = 'googlegmail://';
        window.location.href = gmailAppUrl;
        
        // Fallback: If app doesn't open, redirect to gmail.com after a short delay
        setTimeout(() => {
          window.open('https://mail.google.com', '_blank');
        }, 500);
      } else if (isAndroid) {
        // Try to open Gmail app on Android using intent
        try {
          // Try Gmail app intent first
          window.location.href = 'intent://mail.google.com/#Intent;scheme=https;action=android.intent.action.VIEW;end';
          
          // Fallback to gmail.com after a delay
          setTimeout(() => {
            window.open('https://mail.google.com', '_blank');
          }, 500);
        } catch (error) {
          // If intent fails, open gmail.com directly
          window.open('https://mail.google.com', '_blank');
        }
      } else {
        // Other mobile devices - open gmail.com
        window.open('https://mail.google.com', '_blank');
      }
    } else {
      // Desktop/Laptop - open gmail.com in new tab
      window.open('https://mail.google.com', '_blank');
    }
  };

  const fetchLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Location not available',
        description: 'Geolocation is not supported by your browser.',
        variant: 'destructive',
      });
      return;
    }

    setFetchingLocation(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;

      // Use reverse geocoding to get address
      try {
        // Using OpenStreetMap Nominatim API (free, no API key required)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'SacredRecitationsHub/1.0',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch address');
        }

        const data = await response.json();
        
        if (data && data.address) {
          const addr = data.address;
          const addressParts = [];
          
          if (addr.house_number) addressParts.push(addr.house_number);
          if (addr.road) addressParts.push(addr.road);
          if (addr.suburb) addressParts.push(addr.suburb);
          if (addr.city || addr.town || addr.village) {
            addressParts.push(addr.city || addr.town || addr.village);
          }
          if (addr.state) addressParts.push(addr.state);
          if (addr.postcode) addressParts.push(addr.postcode);
          if (addr.country) addressParts.push(addr.country);

          const fullAddress = addressParts.join(', ');
          
          if (fullAddress) {
            setAddress(fullAddress);
            toast({
              title: 'Location fetched',
              description: 'Your address has been automatically filled.',
            });
          } else {
            // Fallback to coordinates if address parsing fails
            setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            toast({
              title: 'Location fetched',
              description: 'Coordinates have been added. You can edit the address manually.',
            });
          }
        } else {
          // Fallback to coordinates
          setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          toast({
            title: 'Location fetched',
            description: 'Coordinates have been added. You can edit the address manually.',
          });
        }
      } catch (error) {
        logger.error('Error fetching address:', error);
        // Fallback to coordinates
        setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        toast({
          title: 'Location fetched',
          description: 'Coordinates have been added. You can edit the address manually.',
        });
      }
    } catch (error: any) {
      logger.error('Error getting location:', error);
      toast({
        title: 'Location access denied',
        description: error.message?.includes('denied') 
          ? 'Please allow location access or enter your address manually.'
          : 'Failed to get your location. Please enter your address manually.',
        variant: 'destructive',
      });
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    logger.debug('Auth: Starting', isLogin ? 'login' : 'signup');
    
    // Validate input
    let result;
    if (isLogin) {
      result = loginSchema.safeParse({ email, password });
    } else {
      result = signupSchema.safeParse({ 
        full_name: fullName, 
        email, 
        password, 
        phone_number: phoneNumber,
        address 
      });
    }
    
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
            throw new Error('Invalid email or password. Please check your credentials or confirm your email.');
          } else if (error.message?.includes('network') || 
                     error.message?.includes('fetch')) {
            throw new Error('Network error. Please check your internet connection and try again.');
          }
          throw error;
        }

        if (!authData.user) {
          throw new Error('Failed to get user data. Please try again.');
        }

        // Check if email is confirmed
        if (!authData.user.email_confirmed_at) {
          throw new Error('Please confirm your email address before logging in. Check your inbox for the confirmation link.');
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
            data: {
              full_name: fullName,
              phone_number: phoneNumber || null,
              address: address || null,
            },
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

        if (!signUpData.user) {
          throw new Error('Failed to create account. Please try again.');
        }

        // Update profile with additional information
        if (signUpData.user) {
          logger.debug('Auth: User created, updating profile');
          
          // Wait a moment for trigger to create profile
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Update profile with additional fields
          const { error: updateError } = await safeQuery(async () =>
            await supabase
              .from('profiles')
              .update({
                full_name: fullName,
                phone_number: phoneNumber || null,
                address: address || null,
                email: signUpData.user.email || email,
              })
              .eq('id', signUpData.user.id)
          );

          if (updateError) {
            logger.error('Auth: Error updating profile:', updateError);
            // Try to insert if update fails (profile might not exist yet)
            const { error: insertError } = await safeQuery(async () =>
              await supabase
                .from('profiles')
                .insert({
                  id: signUpData.user.id,
                  email: signUpData.user.email || email,
                  full_name: fullName,
                  phone_number: phoneNumber || null,
                  address: address || null,
                  role: 'user',
                })
            );

            if (insertError) {
              logger.error('Auth: Error creating profile:', insertError);
            }
          }
        }

        setEmailSent(true);
        toast({
          title: 'Account created!',
          description: 'Please check your email to confirm your account. You can then log in with your credentials.',
        });
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

  if (emailSent && !isLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 md:p-6 safe-area-inset relative">
        {/* Immersive Background - Better Colors */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/6 via-background to-primary/4 dark:from-emerald/8 dark:via-background dark:to-emerald/6" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/8 via-transparent to-transparent dark:from-emerald/12 dark:via-transparent dark:to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/6 via-transparent to-transparent dark:from-emerald/10 dark:via-transparent dark:to-transparent" />
        
        <div className="w-full max-w-md relative z-10">
          <div className="p-4 md:p-6 animate-fade-in">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary dark:from-emerald dark:to-emerald flex items-center justify-center shadow-md dark:shadow-emerald/30 animate-pulse-slow">
                  <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary dark:bg-emerald rounded-full animate-bounce-gentle shadow-sm" />
              </div>
              <div className="space-y-1.5">
                <h1 className="font-display text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary dark:from-emerald dark:to-emerald bg-clip-text text-transparent">
                  Check Your Email
                </h1>
                <p className="text-muted-foreground dark:text-muted-foreground text-xs md:text-sm leading-relaxed max-w-sm">
                  We've sent a confirmation email to <strong className="text-foreground dark:text-foreground font-semibold">{email}</strong>. 
                  Please click the link to verify your account.
                </p>
                <p className="text-muted-foreground dark:text-muted-foreground text-xs">
                  Once verified, you can log in.
                </p>
              </div>
              <div className="pt-1 space-y-2.5 w-full">
                <Button
                  onClick={openGmail}
                  className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-primary to-primary hover:from-primary/90 hover:to-primary/80 dark:from-emerald dark:to-emerald dark:hover:from-emerald/90 dark:hover:to-emerald/80 shadow-md dark:shadow-emerald/30 transition-all duration-300 rounded-lg"
                  size="lg"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {isMobile ? 'Open Gmail App' : 'Open Gmail.com'}
                  <ExternalLink className="w-3.5 h-3.5 ml-2" />
                </Button>
                <Button
                  onClick={() => {
                    setEmailSent(false);
                    setIsLogin(true);
                    setFullName('');
                    setEmail('');
                    setPassword('');
                    setPhoneNumber('');
                    setAddress('');
                  }}
                  variant="outline"
                  className="w-full h-11 text-sm font-semibold border border-input dark:border-border hover:bg-muted/50 dark:hover:bg-muted/30 transition-all duration-300 rounded-lg"
                  size="lg"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Go to Login
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="w-full h-9 hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors text-sm"
                >
                  <Home className="w-3.5 h-3.5 mr-2" />
                  Go to Home
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 safe-area-inset relative">
      {/* Immersive Full-Screen Background - Better Colors */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/6 via-background to-primary/4 dark:from-emerald/8 dark:via-background dark:to-emerald/6" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/8 via-transparent to-transparent dark:from-emerald/12 dark:via-transparent dark:to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/6 via-transparent to-transparent dark:from-emerald/10 dark:via-transparent dark:to-transparent" />
      
      {/* Content Container - Compact Layout */}
      <div className="w-full max-w-md relative z-10">
        <div className="p-4 md:p-6 animate-fade-in">
          {/* Go to Home Button - Compact */}
          <div className="flex justify-end mb-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:hover:bg-muted/30 rounded-full transition-colors h-8"
            >
              <Home className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Home</span>
            </Button>
          </div>

          {/* Logo with Gradient - Smaller */}
          <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 md:w-18 md:h-18 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary dark:from-emerald dark:via-emerald/90 dark:to-emerald flex items-center justify-center shadow-md dark:shadow-emerald/30 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <BookOpen className="w-8 h-8 md:w-9 md:h-9 text-primary-foreground" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary dark:bg-emerald rounded-full animate-pulse-slow shadow-sm" />
            </div>
          </div>

          <div className="text-center mb-5 space-y-1">
            <h1 className="font-display text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-accent bg-clip-text text-transparent dark:from-accent dark:via-accent/90 dark:to-primary">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm">
              {isLogin 
                ? 'Sign in to continue' 
                : 'Join us to get started'}
            </p>
          </div>

          {/* Email Confirmation Notice - Compact */}
          {!isLogin && (
            <div className="mb-4 p-3 rounded-lg bg-primary/5 dark:bg-primary/15 border border-primary/10 dark:border-primary/30 flex items-start gap-2.5">
              <div className="p-1 rounded-md bg-primary/15 dark:bg-primary/25 flex-shrink-0 mt-0.5">
                <Info className="w-3.5 h-3.5 text-primary dark:text-accent" />
              </div>
              <p className="text-xs text-foreground/90 dark:text-foreground/80 leading-relaxed flex-1">
                <strong className="text-foreground dark:text-foreground font-semibold">Email confirmation required:</strong> Check your inbox after signing up to verify your account.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-semibold text-foreground dark:text-foreground">Full Name</Label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-muted-foreground/80 group-focus-within:text-primary dark:group-focus-within:text-emerald transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="pl-10 h-10 text-sm bg-white dark:bg-card border-2 border-input dark:border-border/60 text-foreground dark:text-foreground placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/70 hover:border-primary/70 dark:hover:border-emerald/60 focus-visible:border-primary dark:focus-visible:border-emerald focus-visible:ring-2 focus-visible:ring-primary/25 dark:focus-visible:ring-emerald/25 transition-all duration-200 rounded-lg shadow-sm dark:shadow-none"
                    autoComplete="name"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-foreground dark:text-foreground">Email</Label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-muted-foreground group-focus-within:text-primary dark:group-focus-within:text-accent transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="pl-10 h-10 text-sm bg-white dark:bg-card border-2 border-input dark:border-border/60 text-foreground dark:text-foreground placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/70 hover:border-primary/70 dark:hover:border-emerald/60 focus-visible:border-primary dark:focus-visible:border-emerald focus-visible:ring-2 focus-visible:ring-primary/25 dark:focus-visible:ring-emerald/25 transition-all duration-200 rounded-lg shadow-sm dark:shadow-none"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <>
                {/* Phone and Address Side by Side on Desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="phoneNumber" className="text-xs font-semibold text-foreground dark:text-foreground">Phone <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-muted-foreground/80 group-focus-within:text-primary dark:group-focus-within:text-emerald transition-colors">
                        <Phone className="w-4 h-4" />
                      </div>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="pl-10 h-10 text-sm bg-white dark:bg-card border-2 border-input dark:border-border/60 text-foreground dark:text-foreground placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/70 hover:border-primary/70 dark:hover:border-emerald/60 focus-visible:border-primary dark:focus-visible:border-emerald focus-visible:ring-2 focus-visible:ring-primary/25 dark:focus-visible:ring-emerald/25 transition-all duration-200 rounded-lg shadow-sm dark:shadow-none"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="text-xs font-semibold text-foreground dark:text-foreground">Address <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                    <div className="relative flex gap-2">
                      <div className="relative flex-1 group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-muted-foreground/80 group-focus-within:text-primary dark:group-focus-within:text-emerald transition-colors">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <Input
                          id="address"
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Enter address"
                          className="pl-10 pr-2 h-10 text-sm bg-white dark:bg-card border-2 border-input dark:border-border/60 text-foreground dark:text-foreground placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/70 hover:border-primary/70 dark:hover:border-emerald/60 focus-visible:border-primary dark:focus-visible:border-emerald focus-visible:ring-2 focus-visible:ring-primary/25 dark:focus-visible:ring-emerald/25 transition-all duration-200 rounded-lg shadow-sm dark:shadow-none"
                          autoComplete="street-address"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={fetchLocation}
                        disabled={fetchingLocation}
                        className="h-10 w-10 flex-shrink-0 border-2 border-input dark:border-border/60 hover:border-primary/70 dark:hover:border-emerald/60 hover:bg-primary/10 dark:hover:bg-emerald/10 transition-all duration-200 rounded-lg shadow-sm dark:shadow-none"
                        title="Use my current location"
                      >
                        {fetchingLocation ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Navigation className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground flex items-center gap-1.5 -mt-2">
                  <MapPin className="w-3 h-3" />
                  Click location icon to auto-fill address
                </p>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-foreground dark:text-foreground">Password</Label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-muted-foreground group-focus-within:text-primary dark:group-focus-within:text-accent transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 h-10 text-sm bg-white dark:bg-card border-2 border-input dark:border-border/60 text-foreground dark:text-foreground placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/70 hover:border-primary/70 dark:hover:border-emerald/60 focus-visible:border-primary dark:focus-visible:border-emerald focus-visible:ring-2 focus-visible:ring-primary/25 dark:focus-visible:ring-emerald/25 transition-all duration-200 rounded-lg shadow-sm dark:shadow-none"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                />
              </div>
              {!isLogin && (
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                  Must be at least 6 characters
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 dark:from-accent dark:to-primary dark:hover:from-accent/90 dark:hover:to-primary/90 shadow-md dark:shadow-accent/30 mt-4 rounded-lg transition-all duration-300"
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

            {/* Email Confirmation Reminder at Bottom */}
            {!isLogin && (
              <div className="mt-3 pt-3 border-t border-border/30 dark:border-border/20">
                <p className="text-xs text-muted-foreground dark:text-muted-foreground text-center flex items-center justify-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-primary/70 dark:text-emerald/70" />
                  <span>Confirmation email will be sent</span>
                </p>
              </div>
            )}
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/20 dark:border-border/15"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background dark:bg-background px-3 py-0.5 text-muted-foreground dark:text-muted-foreground rounded-full">Or</span>
            </div>
          </div>

          {/* Secondary Action */}
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground dark:text-muted-foreground">
              {isLogin 
                ? "Don't have an account?" 
                : 'Already have an account?'}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setEmailSent(false);
                if (isLogin) {
                  // Clear form when switching to signup
                  setFullName('');
                  setPhoneNumber('');
                  setAddress('');
                }
              }}
              className="text-sm font-semibold text-primary hover:text-primary/80 dark:text-emerald dark:hover:text-emerald/80 underline underline-offset-4 transition-colors duration-200"
            >
              {isLogin 
                ? 'Create a new account' 
                : 'Sign in to existing account'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Footer Text - Compact */}
      <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-muted-foreground dark:text-muted-foreground px-4 z-10">
        By continuing, you agree to use this app responsibly.
      </p>
    </div>
  );
}
