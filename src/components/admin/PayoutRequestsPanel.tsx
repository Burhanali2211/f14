import { useState, useEffect } from 'react';
import {
  Wallet,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  IndianRupee,
  User,
  Calendar,
  MessageSquare,
  RefreshCcw,
  ExternalLink,
  Copy,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  getAllPayoutRequests,
  updatePayoutRequestStatus,
  formatCurrency,
  PayoutRequest,
  generatePaymentLink,
} from '@/lib/uploader-earnings';
import { getCurrentUser } from '@/lib/auth-utils';

export function PayoutRequestsPanel() {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PayoutRequest | null>(null);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [processAction, setProcessAction] = useState<'approved' | 'paid' | 'rejected'>('approved');
  const [adminNotes, setAdminNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadRequests();
    // Auto-refresh every 30 seconds to catch new requests
    const interval = setInterval(() => {
      loadRequests();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadRequests = async () => {
    try {
      const data = await getAllPayoutRequests();
      // Sort by requested_at descending (newest first)
      const sortedData = data.sort((a, b) => 
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );
      setRequests(sortedData);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load payout requests', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!selectedRequest) return;

    setProcessing(selectedRequest.id);
    try {
      const currentUser = getCurrentUser();
      const success = await updatePayoutRequestStatus(
        selectedRequest.id,
        processAction,
        adminNotes,
        currentUser?.id
      );

      if (success) {
        toast({ title: 'Success', description: `Request ${processAction} successfully` });
        setShowProcessDialog(false);
        setSelectedRequest(null);
        setAdminNotes('');
        loadRequests();
      } else {
        toast({ title: 'Error', description: 'Failed to update request', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to process request', variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  const openProcessDialog = (request: PayoutRequest, action: 'approved' | 'paid' | 'rejected') => {
    setSelectedRequest(request);
    setProcessAction(action);
    setAdminNotes('');
    setShowProcessDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-600"><Clock className="w-3 h-3" />Pending</span>;
      case 'approved':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-600"><CheckCircle className="w-3 h-3" />Approved</span>;
      case 'paid':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-600"><CheckCircle className="w-3 h-3" />Paid</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-600"><XCircle className="w-3 h-3" />Rejected</span>;
      default:
        return null;
    }
  };

  const filteredRequests = filterStatus === 'all' 
    ? requests 
    : requests.filter(r => r.status === filterStatus);

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    paid: requests.filter(r => r.status === 'paid').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    totalAmount: requests.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0),
    paidAmount: requests.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0),
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                Payout Requests
              </CardTitle>
              <CardDescription>Manage uploader payout requests</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadRequests} disabled={loading}>
              <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pending</p>
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            </div>
            <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Approved</p>
              <p className="text-2xl font-bold text-blue-600">{stats.approved}</p>
            </div>
            <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Paid</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.paid}</p>
            </div>
            <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pending Amount</p>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(stats.totalAmount)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Showing {filteredRequests.length} of {requests.length} requests
            </p>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No payout requests found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg flex items-center gap-1">
                          <IndianRupee className="w-4 h-4" />
                          {request.amount.toLocaleString('en-IN')}
                        </span>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {request.userName || request.userEmail || 'Unknown User'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(request.requestedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {request.paymentMethod && request.paymentDetails && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CreditCard className="w-3 h-3" />
                              <span className="font-medium uppercase">{request.paymentMethod}:</span>
                              <span>{request.paymentDetails}</span>
                            </div>
                            {request.paymentMethod === 'bank' && request.paymentDetails && (
                              <p className="text-xs pl-4 text-muted-foreground/80">
                                {request.paymentDetails.includes(',') 
                                  ? request.paymentDetails.split(',').map((part, i) => (
                                      <span key={i}>
                                        {i > 0 && <br />}
                                        {part.trim()}
                                      </span>
                                    ))
                                  : request.paymentDetails}
                              </p>
                            )}
                          </div>
                          {generatePaymentLink(request.paymentMethod, request.paymentDetails, request.amount) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const link = generatePaymentLink(request.paymentMethod!, request.paymentDetails!, request.amount);
                                if (link) {
                                  window.open(link, '_blank');
                                }
                              }}
                              className="h-6 px-2 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Pay
                            </Button>
                          )}
                          {request.paymentMethod === 'bank' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const bankDetails = `Account Details:\n${request.paymentDetails}\nAmount: ${formatCurrency(request.amount)}`;
                                navigator.clipboard.writeText(bankDetails);
                                toast({ title: 'Copied', description: 'Bank details copied to clipboard' });
                              }}
                              className="h-6 px-2 text-xs border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </Button>
                          )}
                        </div>
                      )}
                      {request.adminNotes && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Admin: {request.adminNotes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {request.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openProcessDialog(request, 'approved')}
                            disabled={!!processing}
                            className="border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openProcessDialog(request, 'rejected')}
                            disabled={!!processing}
                            className="border-red-500/30 text-red-600 hover:bg-red-500/10"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {request.status === 'approved' && (
                        <Button
                          size="sm"
                          onClick={() => openProcessDialog(request, 'paid')}
                          disabled={!!processing}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Mark as Paid
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {processAction === 'approved' && 'Approve Payout Request'}
              {processAction === 'paid' && 'Mark as Paid'}
              {processAction === 'rejected' && 'Reject Payout Request'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <span>
                  Amount: {formatCurrency(selectedRequest.amount)} for{' '}
                  {selectedRequest.userName || selectedRequest.userEmail}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-notes">Admin Notes (optional)</Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={
                  processAction === 'rejected'
                    ? 'Reason for rejection...'
                    : 'Add any notes about this transaction...'
                }
              />
            </div>

            {selectedRequest?.paymentDetails && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div>
                  <p className="text-sm font-medium mb-1">Payment Details:</p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium uppercase">{selectedRequest.paymentMethod}:</span> {selectedRequest.paymentDetails}
                  </p>
                </div>
                {generatePaymentLink(selectedRequest.paymentMethod || '', selectedRequest.paymentDetails, selectedRequest.amount) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const link = generatePaymentLink(selectedRequest.paymentMethod!, selectedRequest.paymentDetails!, selectedRequest.amount);
                      if (link) {
                        window.open(link, '_blank');
                      }
                    }}
                    className="w-full border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Payment App
                  </Button>
                )}
                {selectedRequest.paymentMethod === 'bank' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const bankDetails = `Account Details:\n${selectedRequest.paymentDetails}\nAmount: ${formatCurrency(selectedRequest.amount)}`;
                      navigator.clipboard.writeText(bankDetails);
                      toast({ title: 'Copied', description: 'Bank details copied to clipboard' });
                    }}
                    className="w-full border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Bank Details
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProcessDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleProcess}
              disabled={!!processing}
              className={
                processAction === 'rejected'
                  ? 'bg-red-600 hover:bg-red-700'
                  : processAction === 'paid'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {processAction === 'approved' && 'Approve'}
                  {processAction === 'paid' && 'Confirm Payment'}
                  {processAction === 'rejected' && 'Reject'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
