import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquare, Clock, CheckCircle2, 
  ChevronRight, BookOpen, Loader2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface MyQuestionsCardProps {
  userId: string;
}

export function MyQuestionsCard({ userId }: MyQuestionsCardProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchMyQuestions();
    }
  }, [userId]);

  const fetchMyQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('fiqh_questions')
        .select(`
          *,
          category:fiqh_categories(name, name_ar),
          answers:fiqh_answers(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      logger.error('Error fetching my questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasAnswer = (q: any) => q.answers && q.answers.length > 0;

  return (
    <Card className="rounded-3xl border-border/60">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            My Fiqh Questions
          </CardTitle>
          <Link to="/fiqh" title="Ask a Fiqh question">
            <Button variant="ghost" size="sm" className="gap-1 rounded-xl">
              Ask New <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-8 bg-secondary/20 rounded-2xl">
            <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">You haven't asked any questions yet</p>
            <Link to="/fiqh" title="Browse Fiqh categories">
              <Button variant="outline" className="rounded-xl">
                Browse Fiqh Categories
              </Button>
            </Link>
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-3">
            {questions.map((q) => (
              <AccordionItem 
                key={q.id} 
                value={q.id}
                className="bg-secondary/20 rounded-2xl border-none px-4"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex flex-col items-start text-left gap-2 w-full pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="rounded-lg text-xs">
                        {q.category?.name || 'Unknown'}
                      </Badge>
                      {hasAnswer(q) ? (
                        <Badge className="rounded-lg text-xs bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Answered
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="rounded-lg text-xs">
                          <Clock className="w-3 h-3 mr-1" /> Pending
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium line-clamp-2">{q.question}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(q.created_at), 'PPP')}
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-4 pt-2 border-t border-border/50">
                    <div className="pt-3">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Your Question:</p>
                      <p className="text-sm bg-background/50 rounded-xl p-3">{q.question}</p>
                    </div>
                    
                    {hasAnswer(q) ? (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Answer(s):</p>
                        {q.answers.map((answer: any) => (
                          <div key={answer.id} className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                            <div className="flex items-center gap-2 mb-2">
                              <BookOpen className="w-4 h-4 text-primary" />
                              <span className="text-sm font-bold text-primary">{answer.marja}</span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{answer.answer}</p>
                            {answer.source && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                Source: {answer.source}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-yellow-500/5 rounded-xl p-4 border border-yellow-500/20">
                        <p className="text-sm text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Your question is awaiting review by our scholars.
                        </p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
        
        {questions.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Showing your latest {questions.length} question(s)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
