import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Mail, Lock, Loader2, Home, UserPlus, LogIn, User, Phone, MapPin, Navigation, Eye, EyeOff, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { useIsMobile } from '@/hooks/use-mobile';
import { login, register } from '@/lib/auth-utils';

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

// LocalStorage keys for auto-save
const STORAGE_KEYS = {
  EMAIL: 'auth_email',
  PASSWORD: 'auth_password',
  REMEMBER_ME: 'auth_remember_me',
};

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Load saved credentials on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem(STORAGE_KEYS.EMAIL);
    const savedPassword = localStorage.getItem(STORAGE_KEYS.PASSWORD);
    const savedRememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
    
    if (savedEmail) {
      setEmail(savedEmail);
    }
    if (savedPassword && savedRememberMe) {
      setPassword(savedPassword);
    }
    setRememberMe(savedRememberMe);
  }, []);

  // Auto-save email and password with debounce
  useEffect(() => {
    if (!email && !password) return;
    
    const timeoutId = setTimeout(() => {
      if (email) {
        localStorage.setItem(STORAGE_KEYS.EMAIL, email);
      }
      if (password && rememberMe) {
        localStorage.setItem(STORAGE_KEYS.PASSWORD, password);
      } else if (!rememberMe) {
        localStorage.removeItem(STORAGE_KEYS.PASSWORD);
      }
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, rememberMe.toString());
      
      // Show saved indicator
      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 2000);
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [email, password, rememberMe]);

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
        
        const result = await login(email, password);

        if (!result.success || result.error) {
          throw new Error(result.error || 'Failed to log in. Please try again.');
        }

        if (!result.user) {
          throw new Error('Failed to get user data. Please try again.');
        }

        logger.debug('Auth: Login successful, navigating');
        
        // Save credentials if remember me is checked
        if (rememberMe) {
          localStorage.setItem(STORAGE_KEYS.EMAIL, email);
          localStorage.setItem(STORAGE_KEYS.PASSWORD, password);
          localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
        } else {
          localStorage.removeItem(STORAGE_KEYS.PASSWORD);
          localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'false');
        }
        
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });

        // Navigate to profile page
        navigate('/profile', { replace: true });
      } else {
        logger.debug('Auth: Attempting signup for', email);
        
        const result = await register(
          email,
          password,
          fullName,
          phoneNumber || undefined,
          address || undefined
        );

        if (!result.success || result.error) {
          if (result.error && (result.error.includes('already registered') || result.error.includes('Email already'))) {
            throw new Error('This email is already registered. Please sign in instead.');
          }
          throw new Error(result.error || 'Failed to create account. Please try again.');
        }

        if (!result.user) {
          throw new Error('Failed to create account. Please try again.');
        }

        logger.debug('Auth: Signup successful');
        
        // Save credentials if remember me is checked
        if (rememberMe) {
          localStorage.setItem(STORAGE_KEYS.EMAIL, email);
          localStorage.setItem(STORAGE_KEYS.PASSWORD, password);
          localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
        } else {
          localStorage.removeItem(STORAGE_KEYS.PASSWORD);
          localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'false');
        }
        
        toast({
          title: 'Account created!',
          description: 'Your account has been created successfully. You are now logged in.',
        });

        // Navigate to profile page
        navigate('/profile', { replace: true });
      }
    } catch (error: any) {
      logger.error('Auth: Error occurred', error);
      
      // Provide more helpful error messages for mobile users
      let errorMessage = error.message || 'An error occurred. Please try again.';
      
      // Check if it's a network error
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('NetworkError') ||
          error.message?.includes('Network error')) {
        errorMessage = 'Unable to connect to the server. Please check:\n\n' +
          '• Your internet connection\n' +
          '• If using mobile data, try WiFi (or vice versa)\n' +
          '• Make sure you\'re accessing the correct URL\n' +
          '• Try refreshing the page';
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000, // Show longer for mobile users
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 safe-area-inset relative overflow-hidden">
      {/* Enhanced Immersive Full-Screen Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-primary/6 dark:from-emerald/10 dark:via-background dark:to-emerald/8" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/12 via-transparent to-transparent dark:from-emerald/15 dark:via-transparent dark:to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent dark:from-emerald/12 dark:via-transparent dark:to-transparent" />
      
      {/* Animated floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-primary/20 dark:bg-emerald/20 rounded-full animate-float"
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + i * 12}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i * 0.5}s`,
            }}
          />
        ))}
      </div>
      
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

          {/* Enhanced Logo with Gradient */}
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent dark:from-emerald dark:via-emerald/90 dark:to-primary flex items-center justify-center shadow-xl dark:shadow-emerald/40 transform rotate-3 group-hover:rotate-0 transition-all duration-500 group-hover:scale-110">
                <BookOpen className="w-10 h-10 md:w-12 md:h-12 text-primary-foreground" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary dark:bg-emerald rounded-full animate-pulse shadow-lg">
                <Sparkles className="w-3 h-3 text-primary-foreground m-1" />
              </div>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
            </div>
          </div>

          <div className="text-center mb-6 space-y-2">
            <h1 className="font-display text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-primary/90 to-accent bg-clip-text text-transparent dark:from-accent dark:via-accent/90 dark:to-primary animate-fade-in">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              {isLogin 
                ? 'Sign in to continue your journey' 
                : 'Join us and start your spiritual journey'}
            </p>
          </div>


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
                    className="pl-10 h-11 text-sm bg-white/90 dark:bg-card/90 backdrop-blur-sm border-2 border-input dark:border-border/60 text-foreground dark:text-foreground placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/70 hover:border-primary/70 dark:hover:border-emerald/60 focus-visible:border-primary dark:focus-visible:border-emerald focus-visible:ring-2 focus-visible:ring-primary/25 dark:focus-visible:ring-emerald/25 transition-all duration-200 rounded-xl shadow-sm dark:shadow-none"
                    autoComplete="name"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground dark:text-foreground">Email</Label>
                {savedIndicator && email && (
                  <div className="flex items-center gap-1 text-xs text-primary dark:text-emerald animate-fade-in">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Saved</span>
                  </div>
                )}
              </div>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-muted-foreground group-focus-within:text-primary dark:group-focus-within:text-accent transition-colors z-10">
                  <Mail className="w-4 h-4" />
                </div>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="pl-10 pr-3 h-11 text-sm bg-white/90 dark:bg-card/90 backdrop-blur-sm border-2 border-input dark:border-border/60 text-foreground dark:text-foreground placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/70 hover:border-primary/70 dark:hover:border-emerald/60 focus-visible:border-primary dark:focus-visible:border-emerald focus-visible:ring-2 focus-visible:ring-primary/25 dark:focus-visible:ring-emerald/25 transition-all duration-200 rounded-xl shadow-sm dark:shadow-none"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <>
                {/* Phone and Address Side by Side on Desktop - Enhanced Design */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                  {/* Phone Number Field */}
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="text-sm font-semibold text-foreground dark:text-foreground flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-primary dark:text-emerald" />
                      Phone Number
                      <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground dark:text-muted-foreground/80 group-focus-within:text-primary dark:group-focus-within:text-emerald transition-colors z-10">
                        <Phone className="w-5 h-5" />
                      </div>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="pl-12 pr-4 h-12 text-base bg-white/95 dark:bg-card/95 backdrop-blur-sm border-2 border-input dark:border-border/60 text-foreground dark:text-foreground placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/70 hover:border-primary/70 dark:hover:border-emerald/60 focus-visible:border-primary dark:focus-visible:border-emerald focus-visible:ring-2 focus-visible:ring-primary/25 dark:focus-visible:ring-emerald/25 transition-all duration-200 rounded-xl shadow-md dark:shadow-none"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  {/* Address Field */}
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-semibold text-foreground dark:text-foreground flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-primary dark:text-emerald" />
                      Address
                      <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <div className="relative flex gap-3">
                      <div className="relative flex-1 group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground dark:text-muted-foreground/80 group-focus-within:text-primary dark:group-focus-within:text-emerald transition-colors z-10">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <Input
                          id="address"
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Enter your address"
                          className="pl-12 pr-4 h-12 text-base bg-white/95 dark:bg-card/95 backdrop-blur-sm border-2 border-input dark:border-border/60 text-foreground dark:text-foreground placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/70 hover:border-primary/70 dark:hover:border-emerald/60 focus-visible:border-primary dark:focus-visible:border-emerald focus-visible:ring-2 focus-visible:ring-primary/25 dark:focus-visible:ring-emerald/25 transition-all duration-200 rounded-xl shadow-md dark:shadow-none"
                          autoComplete="street-address"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={fetchLocation}
                        disabled={fetchingLocation}
                        className="h-12 w-12 flex-shrink-0 border-2 border-input dark:border-border/60 hover:border-primary/70 dark:hover:border-emerald/60 hover:bg-primary/10 dark:hover:bg-emerald/10 transition-all duration-200 rounded-xl shadow-md dark:shadow-none hover:scale-105 active:scale-95"
                        title="Use my current location"
                      >
                        {fetchingLocation ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Navigation className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground flex items-center gap-2 mt-1 ml-1">
                  <MapPin className="w-3.5 h-3.5 text-primary/60 dark:text-emerald/60" />
                  <span>Click the location icon to auto-fill your address</span>
                </p>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-foreground dark:text-foreground">Password</Label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-muted-foreground group-focus-within:text-primary dark:group-focus-within:text-accent transition-colors z-10">
                  <Lock className="w-4 h-4" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 text-sm bg-white/90 dark:bg-card/90 backdrop-blur-sm border-2 border-input dark:border-border/60 text-foreground dark:text-foreground placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/70 hover:border-primary/70 dark:hover:border-emerald/60 focus-visible:border-primary dark:focus-visible:border-emerald focus-visible:ring-2 focus-visible:ring-primary/25 dark:focus-visible:ring-emerald/25 transition-all duration-200 rounded-xl shadow-sm dark:shadow-none"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground dark:text-muted-foreground hover:text-primary dark:hover:text-accent transition-colors focus:outline-none rounded hover:bg-muted/50 p-0.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {!isLogin && (
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                  Must be at least 6 characters
                </p>
              )}
            </div>

            {/* Remember Me Checkbox */}
            {isLogin && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-input text-primary dark:text-emerald focus:ring-2 focus:ring-primary/25 dark:focus:ring-emerald/25 cursor-pointer"
                />
                <Label htmlFor="rememberMe" className="text-xs text-foreground dark:text-foreground cursor-pointer">
                  Remember me
                </Label>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 dark:from-accent dark:to-primary dark:hover:from-accent/90 dark:hover:to-primary/90 shadow-lg dark:shadow-accent/40 mt-6 rounded-xl transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
                if (isLogin) {
                  // Clear form when switching to signup
                  setFullName('');
                  setPhoneNumber('');
                  setAddress('');
                }
              }}
              className="text-sm font-semibold text-primary hover:text-primary/80 dark:text-emerald dark:hover:text-emerald/80 underline underline-offset-4 transition-colors duration-200 hover:scale-105 active:scale-95"
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
