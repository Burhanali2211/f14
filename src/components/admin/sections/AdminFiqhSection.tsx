import { useState, useEffect } from 'react';
import { 
  CircleHelp, MessageSquare, Plus,
  Search, Trash2, Edit, BookOpen,
  ChevronDown, Save, X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const MARJA_OPTIONS = [
  'Ayatollah Sistani',
  'Ayatollah Khamenei',
  'Ayatollah Makarem Shirazi',
  'Ayatollah Wahid Khorasani',
  'General Ruling'
];

export function AdminFiqhSection() {
  const [categories, setCategories] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [isAnswerDialogOpen, setIsAnswerDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [editingAnswer, setEditingAnswer] = useState<any>(null);
  const [formData, setFormData] = useState({
    category_id: '',
    question: '',
    question_ar: '',
    question_ur: '',
    is_published: true
  });
  const [answerFormData, setAnswerFormData] = useState({
    marja: '',
    answer: '',
    answer_ar: '',
    answer_ur: '',
    source: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, questionsRes] = await Promise.all([
        supabase.from('fiqh_categories').select('*').order('display_order'),
        supabase.from('fiqh_questions').select(`
          *,
          category:fiqh_categories(name, name_ar),
          answers:fiqh_answers(*)
        `).order('created_at', { ascending: false })
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (questionsRes.error) throw questionsRes.error;

      setCategories(categoriesRes.data || []);
      setQuestions(questionsRes.data || []);
    } catch (error) {
      logger.error('Error fetching fiqh data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuestion = async () => {
    if (!formData.category_id || !formData.question) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    try {
      if (editingQuestion) {
        const { error } = await supabase
          .from('fiqh_questions')
          .update({
            category_id: formData.category_id,
            question: formData.question,
            question_ar: formData.question_ar || null,
            question_ur: formData.question_ur || null,
            is_published: formData.is_published,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingQuestion.id);
        if (error) throw error;
        toast({ title: "Question updated" });
      } else {
        const { error } = await supabase
          .from('fiqh_questions')
          .insert({
            category_id: formData.category_id,
            question: formData.question,
            question_ar: formData.question_ar || null,
            question_ur: formData.question_ur || null,
            is_published: formData.is_published
          });
        if (error) throw error;
        toast({ title: "Question added" });
      }

      setIsQuestionDialogOpen(false);
      setEditingQuestion(null);
      setFormData({ category_id: '', question: '', question_ar: '', question_ur: '', is_published: true });
      fetchData();
    } catch (error) {
      logger.error('Error saving question:', error);
      toast({ title: "Error saving question", variant: "destructive" });
    }
  };

  const handleSaveAnswer = async (questionId: string) => {
    if (!answerFormData.marja || !answerFormData.answer) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    try {
      if (editingAnswer) {
        const { error } = await supabase
          .from('fiqh_answers')
          .update({
            marja: answerFormData.marja,
            answer: answerFormData.answer,
            answer_ar: answerFormData.answer_ar || null,
            answer_ur: answerFormData.answer_ur || null,
            source: answerFormData.source || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAnswer.id);
        if (error) throw error;
        toast({ title: "Answer updated" });
      } else {
        const { error } = await supabase
          .from('fiqh_answers')
          .insert({
            question_id: questionId,
            marja: answerFormData.marja,
            answer: answerFormData.answer,
            answer_ar: answerFormData.answer_ar || null,
            answer_ur: answerFormData.answer_ur || null,
            source: answerFormData.source || null
          });
        if (error) throw error;
        toast({ title: "Answer added" });
      }

      setIsAnswerDialogOpen(false);
      setEditingAnswer(null);
      setAnswerFormData({ marja: '', answer: '', answer_ar: '', answer_ur: '', source: '' });
      fetchData();
    } catch (error) {
      logger.error('Error saving answer:', error);
      toast({ title: "Error saving answer", variant: "destructive" });
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Delete this question and all its answers?')) return;
    try {
      const { error } = await supabase.from('fiqh_questions').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Question deleted" });
      fetchData();
    } catch (error) {
      logger.error('Error deleting question:', error);
    }
  };

  const handleDeleteAnswer = async (id: string) => {
    if (!confirm('Delete this answer?')) return;
    try {
      const { error } = await supabase.from('fiqh_answers').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Answer deleted" });
      fetchData();
    } catch (error) {
      logger.error('Error deleting answer:', error);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || q.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const openEditQuestion = (question: any) => {
    setEditingQuestion(question);
    setFormData({
      category_id: question.category_id,
      question: question.question,
      question_ar: question.question_ar || '',
      question_ur: question.question_ur || '',
      is_published: question.is_published
    });
    setIsQuestionDialogOpen(true);
  };

  const openAddAnswer = (question: any) => {
    setEditingQuestion(question);
    setEditingAnswer(null);
    setAnswerFormData({ marja: '', answer: '', answer_ar: '', answer_ur: '', source: '' });
    setIsAnswerDialogOpen(true);
  };

  const openEditAnswer = (question: any, answer: any) => {
    setEditingQuestion(question);
    setEditingAnswer(answer);
    setAnswerFormData({
      marja: answer.marja,
      answer: answer.answer,
      answer_ar: answer.answer_ar || '',
      answer_ur: answer.answer_ur || '',
      source: answer.source || ''
    });
    setIsAnswerDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Fiqh Q&A Management</h2>
          <p className="text-muted-foreground">Manage questions and answers according to Fiqh Jafaria.</p>
        </div>
        <Button 
          onClick={() => {
            setEditingQuestion(null);
            setFormData({ category_id: '', question: '', question_ar: '', question_ur: '', is_published: true });
            setIsQuestionDialogOpen(true);
          }}
          className="gap-2 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search questions..." 
            className="pl-10 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[250px] rounded-xl">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="questions" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] rounded-xl">
          <TabsTrigger value="questions" className="rounded-lg">
            Questions ({filteredQuestions.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-lg">
            Categories ({categories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="mt-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border-2 border-dashed border-border">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No questions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((question) => (
                <Collapsible key={question.id} className="bg-card rounded-2xl border border-border/60">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="rounded-lg">{question.category?.name}</Badge>
                          <Badge variant={question.is_published ? 'default' : 'secondary'} className="rounded-lg">
                            {question.is_published ? 'Published' : 'Draft'}
                          </Badge>
                          <Badge variant="outline" className="rounded-lg">
                            {question.answers?.length || 0} answer(s)
                          </Badge>
                        </div>
                        <p className="text-lg font-medium line-clamp-2">{question.question}</p>
                        {question.question_ar && (
                          <p className="text-sm text-muted-foreground font-arabic mt-1">{question.question_ar}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="rounded-lg" onClick={() => openAddAnswer(question)}>
                          <Plus className="w-4 h-4 mr-1" /> Answer
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-lg" onClick={() => openEditQuestion(question)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-lg text-destructive" onClick={() => handleDeleteQuestion(question.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-lg">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div className="px-5 pb-5 border-t border-border/50 pt-4">
                      {question.answers && question.answers.length > 0 ? (
                        <div className="space-y-3">
                          {question.answers.map((answer: any) => (
                            <div key={answer.id} className="bg-secondary/30 rounded-xl p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <BookOpen className="w-4 h-4 text-primary" />
                                    <span className="font-bold text-primary">{answer.marja}</span>
                                  </div>
                                  <p className="text-sm">{answer.answer}</p>
                                  {answer.source && <p className="text-xs text-muted-foreground mt-2">Source: {answer.source}</p>}
                                </div>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditAnswer(question, answer)}>
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteAnswer(answer.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No answers yet. Click "+ Answer" to add one.</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map(cat => (
              <div key={cat.id} className="bg-card rounded-2xl border border-border/60 p-5">
                <h3 className="font-bold text-lg">{cat.name}</h3>
                {cat.name_ar && <p className="text-primary font-arabic">{cat.name_ar}</p>}
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{cat.description}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  {questions.filter(q => q.category_id === cat.id).length} questions
                </p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add New Question'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={formData.category_id} onValueChange={(v) => setFormData({...formData, category_id: v})}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Question (English) *</Label>
              <Textarea 
                value={formData.question}
                onChange={(e) => setFormData({...formData, question: e.target.value})}
                className="min-h-[100px] rounded-xl"
                placeholder="Enter the question..."
              />
            </div>
            <div className="space-y-2">
              <Label>Question (Arabic)</Label>
              <Textarea 
                value={formData.question_ar}
                onChange={(e) => setFormData({...formData, question_ar: e.target.value})}
                className="min-h-[80px] rounded-xl font-arabic text-right"
                dir="rtl"
                placeholder="أدخل السؤال..."
              />
            </div>
            <div className="space-y-2">
              <Label>Question (Urdu)</Label>
              <Textarea 
                value={formData.question_ur}
                onChange={(e) => setFormData({...formData, question_ur: e.target.value})}
                className="min-h-[80px] rounded-xl"
                dir="rtl"
                placeholder="سوال درج کریں..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_published"
                checked={formData.is_published}
                onChange={(e) => setFormData({...formData, is_published: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="is_published">Publish this question</Label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsQuestionDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleSaveQuestion} className="rounded-xl gap-2">
                <Save className="w-4 h-4" /> Save Question
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAnswerDialogOpen} onOpenChange={setIsAnswerDialogOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAnswer ? 'Edit Answer' : 'Add Answer'}</DialogTitle>
          </DialogHeader>
          {editingQuestion && (
            <div className="bg-secondary/30 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium">{editingQuestion.question}</p>
            </div>
          )}
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Marja / Source *</Label>
              <Select value={answerFormData.marja} onValueChange={(v) => setAnswerFormData({...answerFormData, marja: v})}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select marja" />
                </SelectTrigger>
                <SelectContent>
                  {MARJA_OPTIONS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Answer (English) *</Label>
              <Textarea 
                value={answerFormData.answer}
                onChange={(e) => setAnswerFormData({...answerFormData, answer: e.target.value})}
                className="min-h-[120px] rounded-xl"
                placeholder="Enter the answer..."
              />
            </div>
            <div className="space-y-2">
              <Label>Answer (Arabic)</Label>
              <Textarea 
                value={answerFormData.answer_ar}
                onChange={(e) => setAnswerFormData({...answerFormData, answer_ar: e.target.value})}
                className="min-h-[80px] rounded-xl font-arabic text-right"
                dir="rtl"
                placeholder="أدخل الجواب..."
              />
            </div>
            <div className="space-y-2">
              <Label>Answer (Urdu)</Label>
              <Textarea 
                value={answerFormData.answer_ur}
                onChange={(e) => setAnswerFormData({...answerFormData, answer_ur: e.target.value})}
                className="min-h-[80px] rounded-xl"
                dir="rtl"
                placeholder="جواب درج کریں..."
              />
            </div>
            <div className="space-y-2">
              <Label>Source / Reference</Label>
              <Input
                value={answerFormData.source}
                onChange={(e) => setAnswerFormData({...answerFormData, source: e.target.value})}
                className="rounded-xl"
                placeholder="e.g., Tawzih al-Masail, ruling #123"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsAnswerDialogOpen(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={() => handleSaveAnswer(editingQuestion?.id)} className="rounded-xl gap-2">
                <Save className="w-4 h-4" /> Save Answer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
