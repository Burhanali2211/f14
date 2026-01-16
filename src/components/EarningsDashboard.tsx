import { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  Award, 
  Target, 
  Flame, 
  Calendar,
  ChevronRight,
  Gift,
  Sparkles,
  Clock,
  IndianRupee,
  Trophy,
  Zap,
  Star,
  Crown,
  Gem,
  Medal,
  CreditCard,
  Plus,
  Trash2,
  Edit,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  UploaderEarnings,
  Milestone,
  getEarningRate,
  getEarningRateAsync,
  getMilestonesWithProgress,
  getNextMilestone,
  formatCurrency,
  getWeeklyStats,
  requestPayoutToDB,
  getPayoutRequestsFromDB,
  PayoutRequest,
  getUserPaymentDetails,
  savePaymentDetail,
  deletePaymentDetail,
  setDefaultPaymentDetail,
  PaymentDetail,
} from '@/lib/uploader-earnings';

interface EarningsDashboardProps {
  earnings: UploaderEarnings | null;
  onRefresh?: () => void;
}

const MILESTONE_ICONS: Record<string, React.ReactNode> = {
  first_upload: <Star className="w-6 h-6" />,
  rising_star: <Sparkles className="w-6 h-6" />,
  dedicated_uploader: <Trophy className="w-6 h-6" />,
  content_champion: <Crown className="w-6 h-6" />,
  master_contributor: <Gem className="w-6 h-6" />,
  legendary_uploader: <Zap className="w-6 h-6" />,
  hall_of_fame: <Medal className="w-6 h-6" />,
};

export function EarningsDashboard({ earnings, onRefresh }: EarningsDashboardProps) {
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [showMilestonesDialog, setShowMilestonesDialog] = useState(false);
  const [showPayoutHistoryDialog, setShowPayoutHistoryDialog] = useState(false);
  const [showPaymentDetailsDialog, setShowPaymentDetailsDialog] = useState(false);
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [selectedPaymentDetailId, setSelectedPaymentDetailId] = useState<string>('');
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [savedPaymentDetails, setSavedPaymentDetails] = useState<PaymentDetail[]>([]);
  const [rate, setRate] = useState(getEarningRate()); // Start with cached/default, then update
  
  // Add payment form state
  const [newPaymentMethod, setNewPaymentMethod] = useState<'upi' | 'bank' | 'paytm'>('upi');
  const [newPaymentDetails, setNewPaymentDetails] = useState('');
  const [newAccountHolderName, setNewAccountHolderName] = useState('');
  const [newIfscCode, setNewIfscCode] = useState('');
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const milestones = useMemo(() => getMilestonesWithProgress(earnings), [earnings]);
  const nextMilestone = useMemo(() => getNextMilestone(earnings), [earnings]);
  const weeklyStats = useMemo(() => getWeeklyStats(earnings), [earnings]);

  useEffect(() => {
    const loadPayoutRequests = async () => {
      if (earnings?.userId) {
        const requests = await getPayoutRequestsFromDB(earnings.userId);
        setPayoutRequests(requests);
      }
    };
    loadPayoutRequests();
  }, [earnings?.userId]);

  useEffect(() => {
    const loadPaymentDetails = async () => {
      if (earnings?.userId) {
        const details = await getUserPaymentDetails(earnings.userId);
        setSavedPaymentDetails(details);
      }
    };
    loadPaymentDetails();
  }, [earnings?.userId]);

  // Load earning rate from admin settings
  useEffect(() => {
    const loadEarningRate = async () => {
      const configuredRate = await getEarningRateAsync();
      setRate(configuredRate);
    };
    loadEarningRate();
  }, []);

  const progressToNextMilestone = useMemo(() => {
    if (!nextMilestone || !earnings) return 0;
    const prevMilestone = milestones.find(m => m.requiredCount < nextMilestone.requiredCount && m.achieved);
    const prevCount = prevMilestone?.requiredCount || 0;
    const range = nextMilestone.requiredCount - prevCount;
    const progress = earnings.totalRecitations - prevCount;
    return Math.min(100, (progress / range) * 100);
  }, [nextMilestone, earnings, milestones]);

  const handleRequestPayout = async () => {
    if (!earnings?.userId || !payoutAmount) {
      toast({ title: 'Error', description: 'Please enter an amount', variant: 'destructive' });
      return;
    }

    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }

    // Check minimum payout threshold
    if (amount < rate.minimumPayout) {
      toast({ 
        title: 'Error', 
        description: `Minimum payout amount is ${formatCurrency(rate.minimumPayout)}`, 
        variant: 'destructive' 
      });
      return;
    }

    // Check if amount exceeds available balance
    if (amount > earnings.pendingPayout) {
      toast({ 
        title: 'Error', 
        description: `Amount exceeds available balance. Available: ${formatCurrency(earnings.pendingPayout)}`, 
        variant: 'destructive' 
      });
      return;
    }

    // Check for existing pending requests
    const pendingRequests = payoutRequests.filter(
      req => req.status === 'pending' || req.status === 'approved'
    );
    const totalPendingAmount = pendingRequests.reduce((sum, req) => sum + req.amount, 0);
    
    if (totalPendingAmount + amount > earnings.pendingPayout) {
      toast({ 
        title: 'Error', 
        description: `You have ${formatCurrency(totalPendingAmount)} in pending requests. Total cannot exceed available balance.`, 
        variant: 'destructive' 
      });
      return;
    }

    // Get payment details from selected saved detail or use manual entry
    let finalPaymentMethod = paymentMethod;
    let finalPaymentDetails = paymentDetails;

    if (selectedPaymentDetailId) {
      const selectedDetail = savedPaymentDetails.find(d => d.id === selectedPaymentDetailId);
      if (selectedDetail) {
        finalPaymentMethod = selectedDetail.paymentMethod;
        finalPaymentDetails = selectedDetail.paymentDetails;
      }
    }

    if (!finalPaymentMethod || !finalPaymentDetails) {
      toast({ title: 'Error', description: 'Please select or enter payment details', variant: 'destructive' });
      return;
    }

    const request = await requestPayoutToDB(earnings.userId, amount, finalPaymentMethod, finalPaymentDetails);
    if (request) {
      toast({ title: 'Success', description: 'Payout request submitted! Admin will review it shortly.' });
      setShowPayoutDialog(false);
      setPayoutAmount('');
      setPaymentMethod('');
      setPaymentDetails('');
      setSelectedPaymentDetailId('');
      // Reload payout requests to get the latest data
      const updatedRequests = await getPayoutRequestsFromDB(earnings.userId);
      setPayoutRequests(updatedRequests);
      onRefresh?.();
    } else {
      toast({ 
        title: 'Error', 
        description: 'Failed to submit payout request. Please check your balance and try again.', 
        variant: 'destructive' 
      });
    }
  };

  const handleSavePaymentDetail = async () => {
    if (!earnings?.userId || !newPaymentDetails) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    // For bank payments, require account holder name and IFSC code
    if (newPaymentMethod === 'bank' && (!newAccountHolderName || !newIfscCode)) {
      toast({ title: 'Error', description: 'Please fill account holder name and IFSC code for bank transfers', variant: 'destructive' });
      return;
    }

    setSavingPayment(true);
    try {
      const saved = await savePaymentDetail(
        earnings.userId,
        newPaymentMethod,
        newPaymentDetails,
        newAccountHolderName || undefined,
        newIfscCode || undefined,
        newIsDefault
      );

      if (saved) {
        toast({ title: 'Success', description: 'Payment details saved successfully' });
        setShowAddPaymentDialog(false);
        setNewPaymentMethod('upi');
        setNewPaymentDetails('');
        setNewAccountHolderName('');
        setNewIfscCode('');
        setNewIsDefault(false);
        const details = await getUserPaymentDetails(earnings.userId);
        setSavedPaymentDetails(details);
      } else {
        toast({ title: 'Error', description: 'Failed to save payment details', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save payment details', variant: 'destructive' });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePaymentDetail = async (id: string) => {
    const success = await deletePaymentDetail(id);
    if (success) {
      toast({ title: 'Success', description: 'Payment detail deleted' });
      if (earnings?.userId) {
        const details = await getUserPaymentDetails(earnings.userId);
        setSavedPaymentDetails(details);
      }
    } else {
      toast({ title: 'Error', description: 'Failed to delete payment detail', variant: 'destructive' });
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!earnings?.userId) return;
    const success = await setDefaultPaymentDetail(id, earnings.userId);
    if (success) {
      toast({ title: 'Success', description: 'Default payment method updated' });
      const details = await getUserPaymentDetails(earnings.userId);
      setSavedPaymentDetails(details);
    } else {
      toast({ title: 'Error', description: 'Failed to update default payment method', variant: 'destructive' });
    }
  };

  const achievedCount = milestones.filter(m => m.achieved).length;

  if (!earnings) {
    return (
      <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6">
        <div className="text-center py-8">
          <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Start uploading recitations to track your earnings!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-teal-500/20 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Your Earnings</h2>
                <p className="text-sm text-muted-foreground">Track your rewards progress</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowPayoutHistoryDialog(true)}
              className="border-emerald-500/30 hover:bg-emerald-500/10"
            >
              <Clock className="w-4 h-4 mr-2" />
              History
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/50 dark:bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <IndianRupee className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Earned</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(earnings.totalEarnings)}
              </p>
            </div>

            <div className="bg-white/50 dark:bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Available</span>
              </div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(earnings.pendingPayout)}
              </p>
            </div>

            <div className="bg-white/50 dark:bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recitations</span>
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {earnings.totalRecitations}
              </p>
            </div>

            <div className="bg-white/50 dark:bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Streak</span>
              </div>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {earnings.currentStreak} <span className="text-sm font-normal">days</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {earnings.pendingPayout >= rate.minimumPayout && (
              <Button 
                onClick={() => setShowPayoutDialog(true)} 
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Request Payout ({formatCurrency(earnings.pendingPayout)} available)
              </Button>
            )}
            <Button 
              variant="outline"
              onClick={() => setShowPaymentDetailsDialog(true)}
              className="border-primary/30 hover:bg-primary/10"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Payment Details
            </Button>
          </div>
          {earnings.pendingPayout < rate.minimumPayout && earnings.pendingPayout > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              <span className="text-amber-600">{formatCurrency(rate.minimumPayout - earnings.pendingPayout)}</span> more needed for minimum payout ({formatCurrency(rate.minimumPayout)})
            </div>
          )}
        </div>
      </div>

      {nextMilestone && (
        <div className="bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-fuchsia-500/10 border border-violet-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/30 to-transparent rounded-full blur-2xl" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/20 rounded-lg text-2xl">
                  {nextMilestone.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Next Milestone</h3>
                  <p className="text-sm text-muted-foreground">{nextMilestone.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-violet-600 dark:text-violet-400">
                  +{formatCurrency(nextMilestone.bonus)}
                </p>
                <p className="text-xs text-muted-foreground">bonus</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{earnings.totalRecitations} / {nextMilestone.requiredCount} recitations</span>
                <span className="font-medium text-violet-600">{Math.round(progressToNextMilestone)}%</span>
              </div>
              <Progress value={progressToNextMilestone} className="h-3 bg-violet-500/20" />
              <p className="text-xs text-muted-foreground text-center">
                {nextMilestone.requiredCount - earnings.totalRecitations} more recitations to unlock!
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Achievements</h3>
              <p className="text-sm text-muted-foreground">{achievedCount} / {milestones.length} unlocked</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowMilestonesDialog(true)}>
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className={`aspect-square rounded-lg flex items-center justify-center text-lg transition-all ${
                milestone.achieved
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/25 scale-105'
                  : 'bg-muted/50 text-muted-foreground grayscale opacity-50'
              }`}
              title={`${milestone.name}: ${milestone.description}`}
            >
              {milestone.icon}
            </div>
          ))}
        </div>
      </div>

      {weeklyStats.length > 0 && (
        <div className="bg-card border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Weekly Activity</h3>
              <p className="text-sm text-muted-foreground">Your upload history</p>
            </div>
          </div>

          <div className="flex items-end gap-2 h-24">
            {weeklyStats.map((stat, index) => {
              const maxCount = Math.max(...weeklyStats.map(s => s.count), 1);
              const height = (stat.count / maxCount) * 100;
              return (
                <div key={stat.week} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">{stat.count}</span>
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      index === weeklyStats.length - 1
                        ? 'bg-gradient-to-t from-blue-600 to-blue-400'
                        : 'bg-blue-500/30'
                    }`}
                    style={{ height: `${Math.max(height, 8)}%` }}
                  />
                  <span className="text-xs text-muted-foreground">
                    W{stat.week.split('-W')[1]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Earning Rate</p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(rate.perRecitation)} per recitation + milestone bonuses
            </p>
          </div>
          <Sparkles className="w-5 h-5 text-amber-500" />
        </div>
      </div>

      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" />
              Request Payout
            </DialogTitle>
            <DialogDescription>
              Available balance: {formatCurrency(earnings.pendingPayout)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ({rate.currencySymbol})</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                min={rate.minimumPayout}
                max={earnings.pendingPayout}
                step="0.01"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Minimum: {formatCurrency(rate.minimumPayout)}</span>
                <span>Available: {formatCurrency(earnings.pendingPayout)}</span>
              </div>
              {payoutRequests.filter(req => req.status === 'pending' || req.status === 'approved').length > 0 && (
                <p className="text-xs text-amber-600">
                  You have {payoutRequests.filter(req => req.status === 'pending' || req.status === 'approved').length} pending request(s)
                </p>
              )}
            </div>

            {savedPaymentDetails.length > 0 && (
              <div className="space-y-2">
                <Label>Use Saved Payment Details</Label>
                <Select value={selectedPaymentDetailId} onValueChange={(value) => {
                  setSelectedPaymentDetailId(value);
                  if (value === 'manual') {
                    setPaymentMethod('');
                    setPaymentDetails('');
                  } else {
                    const selected = savedPaymentDetails.find(d => d.id === value);
                    if (selected) {
                      setPaymentMethod(selected.paymentMethod);
                      setPaymentDetails(selected.paymentDetails);
                    }
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select saved payment method or enter manually" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Enter manually</SelectItem>
                    {savedPaymentDetails.map((detail) => (
                      <SelectItem key={detail.id} value={detail.id}>
                        {detail.paymentMethod.toUpperCase()} - {detail.paymentDetails}
                        {detail.isDefault && ' (Default)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(!selectedPaymentDetailId || selectedPaymentDetailId === 'manual') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="method">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="paytm">Paytm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="details">Payment Details</Label>
                  <Textarea
                    id="details"
                    placeholder={
                      paymentMethod === 'upi' ? 'Enter your UPI ID (e.g., name@upi)' :
                      paymentMethod === 'bank' ? 'Enter account number, account holder name, and IFSC code' :
                      paymentMethod === 'paytm' ? 'Enter your Paytm number' :
                      'Enter your payment details'
                    }
                    value={paymentDetails}
                    onChange={(e) => setPaymentDetails(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>Cancel</Button>
            <Button onClick={handleRequestPayout} className="bg-emerald-600 hover:bg-emerald-700">
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMilestonesDialog} onOpenChange={setShowMilestonesDialog}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              All Milestones
            </DialogTitle>
            <DialogDescription>
              {achievedCount} of {milestones.length} achievements unlocked
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {milestones.map((milestone) => (
              <div
                key={milestone.id}
                className={`p-4 rounded-xl border transition-all ${
                  milestone.achieved
                    ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30'
                    : 'bg-muted/30 border-muted'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`text-3xl ${milestone.achieved ? '' : 'grayscale opacity-50'}`}>
                    {MILESTONE_ICONS[milestone.id] || milestone.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-semibold ${milestone.achieved ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {milestone.name}
                      </h4>
                      {milestone.achieved && (
                        <span className="text-xs bg-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded-full">
                          Achieved
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{milestone.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {Math.min(earnings?.totalRecitations || 0, milestone.requiredCount)} / {milestone.requiredCount} recitations
                      </span>
                      <span className={`text-sm font-medium ${milestone.achieved ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        +{formatCurrency(milestone.bonus)}
                      </span>
                    </div>
                    {!milestone.achieved && (
                      <Progress value={milestone.progress} className="h-1.5 mt-2" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPayoutHistoryDialog} onOpenChange={setShowPayoutHistoryDialog}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Payout History
            </DialogTitle>
            <DialogDescription>
              Your payout requests and status
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {payoutRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No payout requests yet</p>
              </div>
            ) : (
              payoutRequests.map((request) => (
                <div key={request.id} className="p-4 rounded-xl border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{formatCurrency(request.amount)}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      request.status === 'paid' ? 'bg-emerald-500/20 text-emerald-600' :
                      request.status === 'approved' ? 'bg-blue-500/20 text-blue-600' :
                      request.status === 'rejected' ? 'bg-red-500/20 text-red-600' :
                      'bg-amber-500/20 text-amber-600'
                    }`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Method: {request.paymentMethod}</p>
                    <p>Requested: {new Date(request.requestedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Details Management Dialog */}
      <Dialog open={showPaymentDetailsDialog} onOpenChange={setShowPaymentDetailsDialog}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Payment Details
            </DialogTitle>
            <DialogDescription>
              Manage your payment details for faster payout requests
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Button 
              onClick={() => {
                setShowPaymentDetailsDialog(false);
                setShowAddPaymentDialog(true);
              }}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Details
            </Button>

            {savedPaymentDetails.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No payment details saved yet</p>
                <p className="text-xs mt-1">Add payment details to make payout requests faster</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedPaymentDetails.map((detail) => (
                  <div key={detail.id} className="p-4 rounded-xl border bg-card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-sm uppercase">{detail.paymentMethod}</span>
                          {detail.isDefault && (
                            <span className="text-xs bg-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium mb-1">
                          {detail.paymentMethod === 'bank' 
                            ? `Account: ${detail.paymentDetails}`
                            : detail.paymentDetails}
                        </p>
                        {detail.accountHolderName && (
                          <p className="text-xs text-muted-foreground">Name: {detail.accountHolderName}</p>
                        )}
                        {detail.ifscCode && (
                          <p className="text-xs text-muted-foreground">IFSC: {detail.ifscCode}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!detail.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(detail.id)}
                            className="h-8 w-8 p-0"
                            title="Set as default"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePaymentDetail(detail.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Payment Details Dialog */}
      <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              Add Payment Details
            </DialogTitle>
            <DialogDescription>
              Save your payment details for faster payout requests
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-method">Payment Method</Label>
              <Select value={newPaymentMethod} onValueChange={(v) => setNewPaymentMethod(v as 'upi' | 'bank' | 'paytm')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="paytm">Paytm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-details">
                {newPaymentMethod === 'upi' ? 'UPI ID' :
                 newPaymentMethod === 'bank' ? 'Account Number' :
                 'Paytm Number'}
              </Label>
              <Input
                id="new-details"
                placeholder={
                  newPaymentMethod === 'upi' ? 'name@upi' :
                  newPaymentMethod === 'bank' ? 'Enter account number' :
                  'Paytm Number'
                }
                value={newPaymentDetails}
                onChange={(e) => setNewPaymentDetails(e.target.value)}
              />
            </div>

            {newPaymentMethod === 'bank' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="account-name">Account Holder Name *</Label>
                  <Input
                    id="account-name"
                    placeholder="Account holder name"
                    value={newAccountHolderName}
                    onChange={(e) => setNewAccountHolderName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ifsc-code">IFSC Code *</Label>
                  <Input
                    id="ifsc-code"
                    placeholder="Enter IFSC code (e.g., SBIN0001234)"
                    value={newIfscCode}
                    onChange={(e) => setNewIfscCode(e.target.value.toUpperCase())}
                    maxLength={11}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Format: 4 letters + 0 + 6 digits (e.g., SBIN0001234)</p>
                </div>
              </>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is-default"
                checked={newIsDefault}
                onChange={(e) => setNewIsDefault(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is-default" className="text-sm font-normal cursor-pointer">
                Set as default payment method
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePaymentDetail} disabled={savingPayment || !newPaymentDetails} className="bg-emerald-600 hover:bg-emerald-700">
              {savingPayment ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
