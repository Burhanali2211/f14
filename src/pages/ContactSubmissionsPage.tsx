import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  Loader2,
  Mail,
  MailOpen,
  Reply,
  Archive,
  Trash2,
  Eye,
  Clock,
  User,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/use-user-role';
import { logger } from '@/lib/logger';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: 'unread' | 'read' | 'replied' | 'archived';
  created_at: string;
  updated_at: string;
  admin_notes: string | null;
  replied_at: string | null;
}

export default function ContactSubmissionsPage() {
  const navigate = useNavigate();
  const { role: currentRole, loading: roleLoading, user: currentUser } = useUserRole();
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (roleLoading) return;

    if (!currentUser) {
      toast({
        title: 'Login required',
        description: 'Please log in as an admin to access this page.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (currentRole !== 'admin') {
      toast({
        title: 'Access denied',
        description: 'Only admins can access this page.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    fetchSubmissions();
  }, [currentUser, currentRole, roleLoading]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('id, name, email, subject, message, status, created_at, updated_at, admin_notes, replied_at')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching contact submissions:', error);
        toast({
          title: 'Error',
          description: 'Failed to load contact submissions',
          variant: 'destructive',
        });
        return;
      }

      setSubmissions(data || []);
    } catch (error) {
      logger.error('Unexpected error fetching submissions:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openViewDialog = async (submission: ContactSubmission) => {
    setSelectedSubmission(submission);
    setAdminNotes(submission.admin_notes || '');
    setViewDialogOpen(true);

    if (submission.status === 'unread') {
      await updateStatus(submission.id, 'read');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const updateData: any = { status };
      if (status === 'replied') {
        updateData.replied_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('contact_submissions')
        .update(updateData)
        .eq('id', id);

      if (error) {
        logger.error('Error updating status:', error);
        toast({
          title: 'Error',
          description: 'Failed to update status',
          variant: 'destructive',
        });
        return;
      }

      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: status as any, ...updateData } : s
        )
      );

      if (selectedSubmission?.id === id) {
        setSelectedSubmission((prev) =>
          prev ? { ...prev, status: status as any, ...updateData } : null
        );
      }
    } catch (error) {
      logger.error('Unexpected error updating status:', error);
    }
  };

  const saveAdminNotes = async () => {
    if (!selectedSubmission) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .update({ admin_notes: adminNotes })
        .eq('id', selectedSubmission.id);

      if (error) {
        logger.error('Error saving admin notes:', error);
        toast({
          title: 'Error',
          description: 'Failed to save notes',
          variant: 'destructive',
        });
        return;
      }

      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === selectedSubmission.id ? { ...s, admin_notes: adminNotes } : s
        )
      );

      setSelectedSubmission((prev) =>
        prev ? { ...prev, admin_notes: adminNotes } : null
      );

      toast({
        title: 'Success',
        description: 'Notes saved',
      });
    } catch (error) {
      logger.error('Unexpected error saving notes:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;

    try {
      const { error } = await supabase
        .from('contact_submissions')
        .delete()
        .eq('id', deleteDialog);

      if (error) {
        logger.error('Error deleting submission:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete submission',
          variant: 'destructive',
        });
        return;
      }

      setSubmissions((prev) => prev.filter((s) => s.id !== deleteDialog));
      toast({
        title: 'Success',
        description: 'Submission deleted',
      });

      if (selectedSubmission?.id === deleteDialog) {
        setViewDialogOpen(false);
        setSelectedSubmission(null);
      }
    } catch (error) {
      logger.error('Unexpected error deleting submission:', error);
    } finally {
      setDeleteDialog(null);
    }
  };

  const filteredSubmissions = submissions.filter((s) => {
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unread':
        return (
          <Badge variant="destructive" className="gap-1">
            <Mail className="w-3 h-3" /> Unread
          </Badge>
        );
      case 'read':
        return (
          <Badge variant="secondary" className="gap-1">
            <MailOpen className="w-3 h-3" /> Read
          </Badge>
        );
      case 'replied':
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <Reply className="w-3 h-3" /> Replied
          </Badge>
        );
      case 'archived':
        return (
          <Badge variant="outline" className="gap-1">
            <Archive className="w-3 h-3" /> Archived
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const unreadCount = submissions.filter((s) => s.status === 'unread').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-4 sm:py-6 md:py-8">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Admin</span>
        </Link>

        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Contact Submissions
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-3">
                  {unreadCount} unread
                </Badge>
              )}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              View and manage messages from users
            </p>
          </div>
          <Button onClick={fetchSubmissions} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        <div className="bg-card rounded-lg border border-border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, subject, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {filteredSubmissions.map((submission) => (
            <div
              key={submission.id}
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 bg-card rounded-lg shadow-soft border ${submission.status === 'unread'
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border'
                }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-medium text-foreground truncate text-sm sm:text-base">
                    {submission.subject || 'No Subject'}
                  </h3>
                  {getStatusBadge(submission.status)}
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span className="truncate">{submission.name}</span>
                  <span>•</span>
                  <span className="truncate">{submission.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(submission.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openViewDialog(submission)}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteDialog(submission.id)}
                  className="text-destructive hover:text-destructive h-9 w-9"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {filteredSubmissions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>
                {submissions.length === 0
                  ? 'No contact submissions yet.'
                  : 'No submissions match your filters.'}
              </p>
            </div>
          )}
        </div>
      </main>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedSubmission?.subject || 'No Subject'}
              {selectedSubmission && getStatusBadge(selectedSubmission.status)}
            </DialogTitle>
            <DialogDescription>
              From {selectedSubmission?.name} ({selectedSubmission?.email})
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Received on
                </h4>
                <p className="text-sm">{formatDate(selectedSubmission.created_at)}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Message
                </h4>
                <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                  {selectedSubmission.message}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Update Status
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedSubmission.status === 'read' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateStatus(selectedSubmission.id, 'read')}
                    className="gap-1"
                  >
                    <MailOpen className="w-4 h-4" /> Read
                  </Button>
                  <Button
                    variant={selectedSubmission.status === 'replied' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateStatus(selectedSubmission.id, 'replied')}
                    className="gap-1"
                  >
                    <Reply className="w-4 h-4" /> Replied
                  </Button>
                  <Button
                    variant={selectedSubmission.status === 'archived' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateStatus(selectedSubmission.id, 'archived')}
                    className="gap-1"
                  >
                    <Archive className="w-4 h-4" /> Archive
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Admin Notes
                </h4>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this submission..."
                  rows={3}
                  className="resize-none"
                />
                <Button
                  onClick={saveAdminNotes}
                  disabled={saving}
                  className="mt-2"
                  size="sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Notes'
                  )}
                </Button>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t">
                <a
                  href={`mailto:${selectedSubmission.email}?subject=Re: ${selectedSubmission.subject || 'Your message'}`}
                  className="flex-1"
                >
                  <Button className="w-full gap-2">
                    <Mail className="w-4 h-4" />
                    Reply via Email
                  </Button>
                </a>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this contact submission? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
