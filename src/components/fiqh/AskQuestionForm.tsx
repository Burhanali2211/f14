import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, Lock, Unlock } from 'lucide-react';
import { logger } from '@/lib/logger';
import type { User } from '@/lib/auth-utils';

interface AskQuestionFormProps {
  onSuccess?: () => void;
  categories: any[];
  user: User | null;
  defaultCategory?: string;
}

export function AskQuestionForm({ onSuccess, categories, user, defaultCategory }: AskQuestionFormProps) {
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState<string>(defaultCategory || '');
  const [question, setQuestion] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to ask a masala.",
        variant: "destructive",
      });
      return;
    }

    if (!categoryId || !question) {
      toast({
        title: "Missing Fields",
        description: "Please select a category and enter your masala.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('fiqh_questions')
        .insert({
          category_id: categoryId,
          question,
          is_published: !isPrivate,
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name || user.email.split('@')[0]
        });

      if (error) throw error;

      toast({
        title: "Masala Submitted",
        description: "Your masala has been sent. You will be notified when it's answered.",
      });

      if (onSuccess) onSuccess();
      setQuestion('');
      setCategoryId('');
    } catch (error) {
      logger.error('Error submitting question:', error);
      toast({
        title: "Error",
        description: "Failed to submit your masala. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
        <p className="text-sm text-muted-foreground">
          Submitting as: <span className="font-medium text-foreground">{user?.full_name || user?.email}</span>
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select value={categoryId} onValueChange={setCategoryId} required>
          <SelectTrigger className="h-12 rounded-xl">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent className="rounded-xl max-h-60">
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id} className="rounded-lg h-10">
                {c.name} {c.name_ar && `- ${c.name_ar}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="question">Your Question *</Label>
        <Textarea
          id="question"
          placeholder="Type your question here in detail..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
          className="min-h-[150px] rounded-2xl p-4 resize-none"
        />
      </div>

        <div className="flex items-center space-x-3 p-4 bg-secondary/30 rounded-2xl border border-border/50">
          <Checkbox
            id="privacy"
            checked={isPrivate}
            onCheckedChange={(checked) => setIsPrivate(checked as boolean)}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="privacy"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
            >
              Keep this masala private
              {isPrivate ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </Label>
            <p className="text-sm text-muted-foreground">
              If checked, your masala and its answer will only be visible to you and the admin.
            </p>
          </div>
        </div>

      <Button 
        type="submit" 
        className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Submitting...
          </>
        ) : (
          'Submit Masala'
        )}
      </Button>
    </form>
  );
}
