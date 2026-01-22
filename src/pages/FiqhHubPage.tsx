import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, CircleHelp, MessageSquare, 
  Droplet, Moon, Coins, MapPin,
  Search, Plus, BookOpen, Users, Scroll,
  Utensils, Shield, FileSignature, Gavel,
  Building2, Heart, Lightbulb, HandCoins, Handshake,
  LogIn
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/auth-utils';
import { AskQuestionForm } from '@/components/fiqh/AskQuestionForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";

const ICON_MAP: Record<string, any> = {
  'droplets': Droplet,
  'hands-praying': BookOpen,
  'moon': Moon,
  'hand-coins': HandCoins,
  'kaaba': Building2,
  'handshake': Handshake,
  'users': Users,
  'scroll': Scroll,
  'utensils': Utensils,
  'shield': Shield,
  'file-signature': FileSignature,
  'gavel': Gavel,
  'mosque': Building2,
  'heart': Heart,
  'lightbulb': Lightbulb,
};

export default function FiqhHubPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [user, setUser] = useState(getCurrentUser());
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
    
    const handleAuthChange = () => {
      setUser(getCurrentUser());
    };
    window.addEventListener('auth:change', handleAuthChange);
    return () => window.removeEventListener('auth:change', handleAuthChange);
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('fiqh_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      logger.error('Error fetching Fiqh categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = () => {
    if (!user) {
      navigate('/auth?redirect=/fiqh&action=ask');
    } else {
      setIsFormOpen(true);
    }
  };
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
        <SEOHead
          title="Fiqhi Masail - Ask Religious Questions | Followers of 14"
          description="Ask and find answers to religious questions according to Fiqh Jafaria. Consult on topics like Wuzu, Namaz, Roza, Zakat, and more."
        />
      
      <Header />
      
      <main className="container py-8 flex-1 px-4 sm:px-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-base font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-4">
                Fiqhi Masail
              </h1>
              <p className="text-xl text-muted-foreground">
                Seek guidance on religious matters according to the teachings of Ahlul Bayt (a.s). Browse common masail or ask your own question privately.
              </p>
          </div>
          
          <Button 
            size="lg" 
            className="h-14 px-8 text-lg rounded-2xl gap-2 shadow-lg shadow-primary/20"
            onClick={handleAskQuestion}
          >
            {user ? (
              <>
                <Plus className="w-6 h-6" />
                Ask a Question
              </>
            ) : (
              <>
                <LogIn className="w-6 h-6" />
                Login to Ask
              </>
            )}
          </Button>
        </div>

          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-[600px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Ask a Masala</DialogTitle>
                <DialogDescription>
                  Your masala will be reviewed and answered by our scholars.
                </DialogDescription>
              </DialogHeader>
            <AskQuestionForm 
              onSuccess={() => setIsFormOpen(false)} 
              categories={categories} 
              user={user}
            />
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-3xl" />
            ))
          ) : (
            categories.map((category) => {
              const Icon = ICON_MAP[category.icon] || CircleHelp;
              return (
                <Link
                  key={category.id}
                  to={`/fiqh/${category.id}`}
                  className="group relative overflow-hidden p-8 rounded-3xl bg-card border-2 border-border/40 hover:border-primary/40 transition-all duration-300 hover:shadow-xl"
                >
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary transition-colors duration-300">
                      <Icon className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
                    </div>
                    <h2 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                      {category.name}
                    </h2>
                    {category.name_ar && (
                      <p className="text-lg font-arabic text-muted-foreground mb-2">{category.name_ar}</p>
                    )}
                    <p className="text-muted-foreground line-clamp-2">
                      {category.description}
                    </p>
                  </div>
                  <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
                </Link>
              );
            })
          )}
        </div>

          {!loading && categories.length === 0 && (
            <div className="text-center py-20 bg-card rounded-3xl border-2 border-dashed border-border">
              <CircleHelp className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-bold text-foreground mb-2">No Fiqhi categories yet</h3>
              <p className="text-muted-foreground">Please check back later.</p>
            </div>
          )}
      </main>

      <Footer />
    </div>
  );
}
