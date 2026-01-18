import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, MessageSquare, 
  Search, CircleHelp,
  MessageCircle, Calendar, 
  CheckCircle2, Clock, BookOpen,
  Share2, Plus, LogIn
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';
import { getCurrentUser } from '@/lib/auth-utils';
import { AskQuestionForm } from '@/components/fiqh/AskQuestionForm';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function FiqhTopicPage() {
  const { topicSlug } = useParams<{ topicSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [category, setCategory] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    const handleAuthChange = () => {
      setUser(getCurrentUser());
    };
    window.addEventListener('auth:change', handleAuthChange);
    return () => window.removeEventListener('auth:change', handleAuthChange);
  }, []);

  useEffect(() => {
    if (topicSlug) {
      fetchCategoryAndQuestions();
    }
  }, [topicSlug]);

  const fetchCategoryAndQuestions = async () => {
    try {
      setLoading(true);
      const { data: categoryData, error: categoryError } = await supabase
        .from('fiqh_categories')
        .select('id, name, name_ar, description, icon, display_order')
        .eq('id', topicSlug)
        .maybeSingle();

      if (categoryError) throw categoryError;
      if (!categoryData) return;
      setCategory(categoryData);

      const { data: questionsData, error: questionsError } = await supabase
        .from('fiqh_questions')
        .select(`
          id, question, category_id, is_published, created_at, updated_at,
          answers:fiqh_answers (id, question_id, marja, answer, source, created_at, updated_at)
        `)
        .eq('category_id', categoryData.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      const { data: allCategories } = await supabase
        .from('fiqh_categories')
        .select('id, name, name_ar, description, icon, display_order')
        .order('display_order', { ascending: true });
      setCategories(allCategories || []);
    } catch (error) {
      logger.error('Error fetching category questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter(q => 
    q.question?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const answeredQuestions = filteredQuestions.filter(q => q.answers && q.answers.length > 0);

  const handleAskQuestion = () => {
    if (!user) {
      navigate(`/auth?redirect=/fiqh/${topicSlug}&action=ask`);
    } else {
      setIsFormOpen(true);
    }
  };

  const handleShare = async (question: any) => {
    const shareUrl = `${window.location.origin}/fiqh/${topicSlug}?q=${question.id}`;
    const shareText = `Masala: ${question.question}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Fiqhi Masala - ${category?.name}`,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await copyToClipboard(shareUrl);
        }
      }
    } else {
      await copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Link Copied",
        description: "Masala link has been copied to clipboard",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title={`${category?.name || 'Category'} - Fiqhi Masail | Followers of 14`}
        description={category?.description || 'Browse Fiqhi masail and answers.'}
      />
      
      <Header />
      
      <main className="container py-8 flex-1 px-4 sm:px-6">
        <Link 
          to="/fiqh" 
          className="inline-flex items-center gap-2 text-base font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Fiqhi Masail
        </Link>

        <div className="mb-12">
          <h1 className="font-display text-4xl font-bold mb-2">{category?.name}</h1>
          {category?.name_ar && (
            <p className="text-2xl font-arabic text-primary mb-4">{category?.name_ar}</p>
          )}
          <p className="text-xl text-muted-foreground max-w-3xl">
            {category?.description}
          </p>
        </div>

        <div className="relative mb-10 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder="Search masail in this category..." 
            className="pl-12 h-14 rounded-2xl bg-card border-border/50 shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-6">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-3xl" />
            ))
          ) : answeredQuestions.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-4">
              {answeredQuestions.map((question) => (
                <AccordionItem 
                  key={question.id} 
                  value={question.id}
                  className="bg-card border-2 border-border/40 rounded-3xl overflow-hidden px-6 py-2 transition-all hover:border-primary/20"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex flex-col items-start text-left gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="default" className="rounded-lg h-7 px-3">
                          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Answered</span>
                        </Badge>
                      </div>
                      <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                        {question.question}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(question.created_at), 'PPP')}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-6 border-t border-border/40 mt-2">
                      <div className="space-y-6 pt-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-bold text-primary mb-1">
                              <CircleHelp className="w-4 h-4" />
                              MASALA
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-3 text-muted-foreground hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShare(question);
                              }}
                            >
                              <Share2 className="w-4 h-4 mr-1.5" />
                              Share
                            </Button>
                          </div>
                          <p className="text-lg leading-relaxed text-foreground whitespace-pre-wrap">
                            {question.question}
                          </p>
                        </div>

                      {question.answers && question.answers.length > 0 && (
                        <div className="space-y-4">
                          {question.answers.map((answer: any) => (
                            <div key={answer.id} className="bg-secondary/30 rounded-2xl p-6 border border-primary/10">
                              <div className="flex items-center gap-2 text-sm font-bold text-primary mb-3">
                                <BookOpen className="w-4 h-4" />
                                {answer.marja && <span className="uppercase">{answer.marja}</span>}
                              </div>
                              <div className="prose prose-slate dark:prose-invert max-w-none text-lg leading-relaxed whitespace-pre-wrap">
                                {answer.answer}
                              </div>
                              {answer.source && (
                                <p className="mt-4 text-sm text-muted-foreground italic">
                                  Source: {answer.source}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            ) : (
              <div className="text-center py-20 bg-card rounded-3xl border-2 border-dashed border-border">
                <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
                <h3 className="text-xl font-bold text-foreground mb-2">No masail found in this category</h3>
                <p className="text-muted-foreground mb-6">Be the first to ask a question about {category?.name}</p>
                <Button 
                  size="lg" 
                  className="h-12 px-6 rounded-xl gap-2"
                  onClick={handleAskQuestion}
                >
                  {user ? (
                    <>
                      <Plus className="w-5 h-5" />
                      Ask Your Question
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      Login to Ask
                    </>
                  )}
                </Button>
              </div>
            )}
        </div>
      </main>

      <Footer />

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
            defaultCategory={topicSlug}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
