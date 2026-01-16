import { logger } from './logger';
import { getCurrentUser } from './auth-utils';
import { supabase } from '@/integrations/supabase/client';
import { getEarningRatesConfig, EarningRatesConfig, MilestoneConfig } from './earning-settings';

export interface EarningRate {
  perRecitation: number;
  bonusPerMilestone: number;
  currency: string;
  currencySymbol: string;
  minimumPayout: number;
}

export interface Milestone {
  id: string;
  name: string;
  requiredCount: number;
  bonus: number;
  icon: string;
  description: string;
  achieved: boolean;
  achievedAt?: string;
}

export interface UploaderEarnings {
  id?: string;
  userId: string;
  totalRecitations: number;
  totalEarnings: number;
  pendingPayout: number;
  paidOut: number;
  currentStreak: number;
  longestStreak: number;
  lastUploadDate: string | null;
  milestonesAchieved: string[];
  weeklyUploads: Record<string, number>;
  monthlyUploads: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutRequest {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  paymentMethod?: string;
  paymentDetails?: string;
  notes?: string;
  adminNotes?: string;
  userName?: string;
  userEmail?: string;
}

const SETTINGS_CACHE_KEY = 'earning_settings_cache';
const SETTINGS_CACHE_DURATION = 5 * 60 * 1000;

let cachedSettings: EarningRatesConfig | null = null;
let cacheTimestamp: number = 0;

export async function getEarningRateAsync(): Promise<EarningRate> {
  const config = await getConfiguredRates();
  return {
    perRecitation: config.perRecitation,
    bonusPerMilestone: config.bonusPerMilestone,
    currency: config.currency,
    currencySymbol: config.currencySymbol,
    minimumPayout: config.minimumPayout,
  };
}

export function getEarningRate(): EarningRate {
  const cached = getCachedSettings();
  if (cached) {
    return {
      perRecitation: cached.perRecitation,
      bonusPerMilestone: cached.bonusPerMilestone,
      currency: cached.currency,
      currencySymbol: cached.currencySymbol,
      minimumPayout: cached.minimumPayout,
    };
  }
  
  return {
    perRecitation: 50,
    bonusPerMilestone: 500,
    currency: 'INR',
    currencySymbol: '₹',
    minimumPayout: 500,
  };
}

export async function getConfiguredRates(): Promise<EarningRatesConfig> {
  if (cachedSettings && (Date.now() - cacheTimestamp) < SETTINGS_CACHE_DURATION) {
    return cachedSettings;
  }
  
  try {
    const config = await getEarningRatesConfig();
    cachedSettings = config;
    cacheTimestamp = Date.now();
    
    try {
      localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({
        config,
        timestamp: Date.now(),
      }));
    } catch {
    }
    
    return config;
  } catch (error) {
    logger.error('Error fetching earning rates:', error);
    return getCachedSettings() || getDefaultConfig();
  }
}

function getCachedSettings(): EarningRatesConfig | null {
  if (cachedSettings && (Date.now() - cacheTimestamp) < SETTINGS_CACHE_DURATION) {
    return cachedSettings;
  }
  
  try {
    const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (cached) {
      const { config, timestamp } = JSON.parse(cached);
      if ((Date.now() - timestamp) < SETTINGS_CACHE_DURATION * 2) {
        cachedSettings = config;
        cacheTimestamp = timestamp;
        return config;
      }
    }
  } catch {
  }
  
  return null;
}

function getDefaultConfig(): EarningRatesConfig {
  return {
    perRecitation: 50,
    bonusPerMilestone: 500,
    currency: 'INR',
    currencySymbol: '₹',
    minimumPayout: 500,
    milestones: [
      { id: 'first_upload', name: 'First Steps', requiredCount: 1, bonus: 100, icon: '🌟', description: 'Upload your first recitation' },
      { id: 'rising_star', name: 'Rising Star', requiredCount: 10, bonus: 500, icon: '⭐', description: 'Upload 10 recitations' },
      { id: 'dedicated_uploader', name: 'Dedicated Uploader', requiredCount: 25, bonus: 1000, icon: '🏆', description: 'Upload 25 recitations' },
      { id: 'content_champion', name: 'Content Champion', requiredCount: 50, bonus: 2500, icon: '👑', description: 'Upload 50 recitations' },
      { id: 'master_contributor', name: 'Master Contributor', requiredCount: 100, bonus: 5000, icon: '💎', description: 'Upload 100 recitations' },
      { id: 'legendary_uploader', name: 'Legendary Uploader', requiredCount: 250, bonus: 15000, icon: '🔥', description: 'Upload 250 recitations' },
      { id: 'hall_of_fame', name: 'Hall of Fame', requiredCount: 500, bonus: 50000, icon: '🏛️', description: 'Upload 500 recitations' },
    ],
  };
}

export async function getMilestones(): Promise<Milestone[]> {
  const config = await getConfiguredRates();
  return config.milestones.map(m => ({ ...m, achieved: false }));
}

export function getMilestonesSync(): Milestone[] {
  const cached = getCachedSettings();
  const milestones = cached?.milestones || getDefaultConfig().milestones;
  return milestones.map(m => ({ ...m, achieved: false }));
}

export async function getUploaderEarningsFromDB(userId?: string): Promise<UploaderEarnings | null> {
  try {
    const user = userId || getCurrentUser()?.id;
    if (!user) return null;

    const { data, error } = await supabase
      .from('uploader_earnings')
      .select('*')
      .eq('user_id', user)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching uploader earnings:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      totalRecitations: data.total_recitations || 0,
      totalEarnings: parseFloat(data.total_earnings) || 0,
      pendingPayout: parseFloat(data.pending_payout) || 0,
      paidOut: parseFloat(data.paid_out) || 0,
      currentStreak: data.current_streak || 0,
      longestStreak: data.longest_streak || 0,
      lastUploadDate: data.last_upload_date,
      milestonesAchieved: data.milestones_achieved || [],
      weeklyUploads: data.weekly_uploads || {},
      monthlyUploads: data.monthly_uploads || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    logger.error('Error getting uploader earnings:', error);
    return null;
  }
}

export function getUploaderEarnings(userId?: string): UploaderEarnings | null {
  const user = userId || getCurrentUser()?.id;
  if (!user) return null;
  
  return null;
}

export async function initializeUploaderEarningsInDB(userId: string): Promise<UploaderEarnings> {
  const existing = await getUploaderEarningsFromDB(userId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('uploader_earnings')
    .insert({
      user_id: userId,
      total_recitations: 0,
      total_earnings: 0,
      pending_payout: 0,
      paid_out: 0,
      current_streak: 0,
      longest_streak: 0,
      last_upload_date: null,
      milestones_achieved: [],
      weekly_uploads: {},
      monthly_uploads: {},
    })
    .select()
    .single();

  if (error) {
    logger.error('Error initializing uploader earnings:', error);
    return {
      userId,
      totalRecitations: 0,
      totalEarnings: 0,
      pendingPayout: 0,
      paidOut: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastUploadDate: null,
      milestonesAchieved: [],
      weeklyUploads: {},
      monthlyUploads: {},
      createdAt: now,
      updatedAt: now,
    };
  }

  return {
    id: data.id,
    userId: data.user_id,
    totalRecitations: data.total_recitations || 0,
    totalEarnings: parseFloat(data.total_earnings) || 0,
    pendingPayout: parseFloat(data.pending_payout) || 0,
    paidOut: parseFloat(data.paid_out) || 0,
    currentStreak: data.current_streak || 0,
    longestStreak: data.longest_streak || 0,
    lastUploadDate: data.last_upload_date,
    milestonesAchieved: data.milestones_achieved || [],
    weeklyUploads: data.weekly_uploads || {},
    monthlyUploads: data.monthly_uploads || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export function initializeUploaderEarnings(userId: string): UploaderEarnings {
  const now = new Date().toISOString();
  return {
    userId,
    totalRecitations: 0,
    totalEarnings: 0,
    pendingPayout: 0,
    paidOut: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastUploadDate: null,
    milestonesAchieved: [],
    weeklyUploads: {},
    monthlyUploads: {},
    createdAt: now,
    updatedAt: now,
  };
}

export async function saveUploaderEarningsToDB(earnings: UploaderEarnings): Promise<void> {
  try {
    const { error } = await supabase
      .from('uploader_earnings')
      .upsert({
        user_id: earnings.userId,
        total_recitations: earnings.totalRecitations,
        total_earnings: earnings.totalEarnings,
        pending_payout: earnings.pendingPayout,
        paid_out: earnings.paidOut,
        current_streak: earnings.currentStreak,
        longest_streak: earnings.longestStreak,
        last_upload_date: earnings.lastUploadDate,
        milestones_achieved: earnings.milestonesAchieved,
        weekly_uploads: earnings.weeklyUploads,
        monthly_uploads: earnings.monthlyUploads,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      logger.error('Error saving uploader earnings to DB:', error);
    }
  } catch (error) {
    logger.error('Error saving uploader earnings:', error);
  }
}

export function saveUploaderEarnings(earnings: UploaderEarnings): void {
  saveUploaderEarningsToDB(earnings);
}

export async function syncEarningsWithPieceCountAsync(userId: string, actualPieceCount: number): Promise<UploaderEarnings> {
  let earnings = await getUploaderEarningsFromDB(userId);
  if (!earnings) {
    earnings = await initializeUploaderEarningsInDB(userId);
  }

  const config = await getConfiguredRates();
  const prevCount = earnings.totalRecitations;

  if (actualPieceCount !== prevCount) {
    earnings.totalRecitations = actualPieceCount;
    
    let baseEarnings = actualPieceCount * config.perRecitation;
    
    const newlyAchievedMilestones: string[] = [];
    for (const milestone of config.milestones) {
      if (actualPieceCount >= milestone.requiredCount) {
        if (!earnings.milestonesAchieved.includes(milestone.id)) {
          newlyAchievedMilestones.push(milestone.id);
          baseEarnings += milestone.bonus;
        } else {
          baseEarnings += milestone.bonus;
        }
      }
    }
    
    earnings.milestonesAchieved = [
      ...earnings.milestonesAchieved,
      ...newlyAchievedMilestones,
    ];
    
    earnings.totalEarnings = baseEarnings;
    earnings.pendingPayout = earnings.totalEarnings - earnings.paidOut;
    
    if (actualPieceCount > prevCount) {
      const today = new Date().toISOString().split('T')[0];
      earnings.lastUploadDate = today;
      
      const thisWeek = getWeekKey(new Date());
      const thisMonth = getMonthKey(new Date());
      earnings.weeklyUploads[thisWeek] = (earnings.weeklyUploads[thisWeek] || 0) + (actualPieceCount - prevCount);
      earnings.monthlyUploads[thisMonth] = (earnings.monthlyUploads[thisMonth] || 0) + (actualPieceCount - prevCount);
    }

    await saveUploaderEarningsToDB(earnings);
  }

  return earnings;
}

export function syncEarningsWithPieceCount(userId: string, actualPieceCount: number): UploaderEarnings {
  const rate = getEarningRate();
  const milestones = getMilestonesSync();
  
  let baseEarnings = actualPieceCount * rate.perRecitation;
  const achievedMilestones: string[] = [];
  
  for (const milestone of milestones) {
    if (actualPieceCount >= milestone.requiredCount) {
      achievedMilestones.push(milestone.id);
      baseEarnings += milestone.bonus;
    }
  }

  const now = new Date().toISOString();
  const earnings: UploaderEarnings = {
    userId,
    totalRecitations: actualPieceCount,
    totalEarnings: baseEarnings,
    pendingPayout: baseEarnings,
    paidOut: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastUploadDate: now.split('T')[0],
    milestonesAchieved: achievedMilestones,
    weeklyUploads: {},
    monthlyUploads: {},
    createdAt: now,
    updatedAt: now,
  };

  syncEarningsWithPieceCountAsync(userId, actualPieceCount);

  return earnings;
}

export async function recordUploadAsync(userId: string, pieceCount: number = 1): Promise<{ earnings: UploaderEarnings; newMilestones: Milestone[] }> {
  let earnings = await getUploaderEarningsFromDB(userId);
  if (!earnings) {
    earnings = await initializeUploaderEarningsInDB(userId);
  }

  const config = await getConfiguredRates();
  const today = new Date().toISOString().split('T')[0];
  const thisWeek = getWeekKey(new Date());
  const thisMonth = getMonthKey(new Date());

  const prevCount = earnings.totalRecitations;
  earnings.totalRecitations += pieceCount;
  earnings.totalEarnings += pieceCount * config.perRecitation;
  earnings.pendingPayout += pieceCount * config.perRecitation;

  if (earnings.lastUploadDate) {
    const lastDate = new Date(earnings.lastUploadDate);
    const currentDate = new Date(today);
    const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      earnings.currentStreak += 1;
    } else if (diffDays > 1) {
      earnings.currentStreak = 1;
    }
  } else {
    earnings.currentStreak = 1;
  }

  earnings.longestStreak = Math.max(earnings.longestStreak, earnings.currentStreak);
  earnings.lastUploadDate = today;

  earnings.weeklyUploads[thisWeek] = (earnings.weeklyUploads[thisWeek] || 0) + pieceCount;
  earnings.monthlyUploads[thisMonth] = (earnings.monthlyUploads[thisMonth] || 0) + pieceCount;

  const newMilestones: Milestone[] = [];
  for (const milestone of config.milestones) {
    if (
      !earnings.milestonesAchieved.includes(milestone.id) &&
      earnings.totalRecitations >= milestone.requiredCount &&
      prevCount < milestone.requiredCount
    ) {
      earnings.milestonesAchieved.push(milestone.id);
      earnings.totalEarnings += milestone.bonus;
      earnings.pendingPayout += milestone.bonus;
      newMilestones.push({ ...milestone, achieved: true, achievedAt: new Date().toISOString() });
    }
  }

  await saveUploaderEarningsToDB(earnings);
  return { earnings, newMilestones };
}

export function recordUpload(userId: string, pieceCount: number = 1): { earnings: UploaderEarnings; newMilestones: Milestone[] } {
  const rate = getEarningRate();
  const milestones = getMilestonesSync();
  const now = new Date().toISOString();
  
  const earnings: UploaderEarnings = {
    userId,
    totalRecitations: pieceCount,
    totalEarnings: pieceCount * rate.perRecitation,
    pendingPayout: pieceCount * rate.perRecitation,
    paidOut: 0,
    currentStreak: 1,
    longestStreak: 1,
    lastUploadDate: now.split('T')[0],
    milestonesAchieved: [],
    weeklyUploads: {},
    monthlyUploads: {},
    createdAt: now,
    updatedAt: now,
  };

  const newMilestones: Milestone[] = [];
  for (const milestone of milestones) {
    if (pieceCount >= milestone.requiredCount) {
      earnings.milestonesAchieved.push(milestone.id);
      earnings.totalEarnings += milestone.bonus;
      earnings.pendingPayout += milestone.bonus;
      newMilestones.push({ ...milestone, achieved: true, achievedAt: now });
    }
  }

  recordUploadAsync(userId, pieceCount);
  
  return { earnings, newMilestones };
}

export function getMilestonesWithProgress(earnings: UploaderEarnings | null): (Milestone & { progress: number })[] {
  const count = earnings?.totalRecitations || 0;
  const achieved = earnings?.milestonesAchieved || [];
  const milestones = getMilestonesSync();

  return milestones.map((milestone) => {
    const progress = Math.min(100, (count / milestone.requiredCount) * 100);
    return {
      ...milestone,
      achieved: achieved.includes(milestone.id),
      progress,
    };
  });
}

export function getNextMilestone(earnings: UploaderEarnings | null): Milestone | null {
  const count = earnings?.totalRecitations || 0;
  const milestones = getMilestonesSync();
  return milestones.find((m) => count < m.requiredCount) || null;
}

export async function getPayoutRequestsFromDB(userId?: string): Promise<PayoutRequest[]> {
  try {
    let query = supabase
      .from('payout_requests')
      .select(`
        *,
        user:users!payout_requests_user_id_fkey(email, full_name)
      `)
      .order('requested_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching payout requests:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data.map((req: any) => ({
      id: req.id,
      userId: req.user_id,
      amount: parseFloat(req.amount),
      status: req.status,
      requestedAt: req.requested_at,
      processedAt: req.processed_at,
      processedBy: req.processed_by,
      paymentMethod: req.payment_method,
      paymentDetails: req.payment_details,
      notes: req.notes,
      adminNotes: req.admin_notes,
      userName: req.user?.full_name || req.user?.email || 'Unknown User',
      userEmail: req.user?.email,
    }));
  } catch (error) {
    logger.error('Error getting payout requests:', error);
    return [];
  }
}

export function getPayoutRequests(userId: string): PayoutRequest[] {
  return [];
}

export async function requestPayoutToDB(
  userId: string, 
  amount: number, 
  paymentMethod?: string, 
  paymentDetails?: string
): Promise<PayoutRequest | null> {
  try {
    const earnings = await getUploaderEarningsFromDB(userId);
    if (!earnings) {
      logger.error('No earnings found for user:', userId);
      return null;
    }

    // Get minimum payout threshold
    const rate = await getEarningRateAsync();
    const minimumPayout = rate.minimumPayout;

    // Check if amount meets minimum threshold
    if (amount < minimumPayout) {
      logger.error(`Amount ${amount} is below minimum payout threshold ${minimumPayout}`);
      return null;
    }

    // Check if user has enough pending payout
    if (earnings.pendingPayout < amount) {
      logger.error(`Insufficient balance. Requested: ${amount}, Available: ${earnings.pendingPayout}`);
      return null;
    }

    // Check for pending requests that haven't been processed yet
    const pendingRequests = await getPayoutRequestsFromDB(userId);
    const totalPendingAmount = pendingRequests
      .filter(req => req.status === 'pending' || req.status === 'approved')
      .reduce((sum, req) => sum + req.amount, 0);

    // Check if requested amount + existing pending requests exceed available balance
    if (totalPendingAmount + amount > earnings.pendingPayout) {
      logger.error(`Requested amount plus pending requests exceeds available balance`);
      return null;
    }

    const { data, error } = await supabase
      .from('payout_requests')
      .insert({
        user_id: userId,
        amount,
        status: 'pending',
        payment_method: paymentMethod,
        payment_details: paymentDetails,
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating payout request:', error);
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      amount: parseFloat(data.amount),
      status: data.status,
      requestedAt: data.requested_at,
      paymentMethod: data.payment_method,
      paymentDetails: data.payment_details,
    };
  } catch (error) {
    logger.error('Error requesting payout:', error);
    return null;
  }
}

export function requestPayout(userId: string, amount: number, paymentMethod?: string, paymentDetails?: string): PayoutRequest | null {
  const request: PayoutRequest = {
    id: `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    amount,
    status: 'pending',
    requestedAt: new Date().toISOString(),
    paymentMethod,
    paymentDetails,
  };

  requestPayoutToDB(userId, amount, paymentMethod, paymentDetails);

  return request;
}

export async function updatePayoutRequestStatus(
  requestId: string,
  status: 'approved' | 'paid' | 'rejected',
  adminNotes?: string,
  processedBy?: string
): Promise<boolean> {
  try {
    const { data: request, error: fetchError } = await supabase
      .from('payout_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      logger.error('Error fetching payout request:', fetchError);
      return false;
    }

    const { error: updateError } = await supabase
      .from('payout_requests')
      .update({
        status,
        admin_notes: adminNotes,
        processed_at: new Date().toISOString(),
        processed_by: processedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      logger.error('Error updating payout request:', updateError);
      return false;
    }

    if (status === 'paid') {
      const earnings = await getUploaderEarningsFromDB(request.user_id);
      if (earnings) {
        const newPendingPayout = Math.max(0, earnings.pendingPayout - parseFloat(request.amount));
        const newPaidOut = earnings.paidOut + parseFloat(request.amount);
        
        const { error: earningsError } = await supabase
          .from('uploader_earnings')
          .update({
            pending_payout: newPendingPayout,
            paid_out: newPaidOut,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', request.user_id);

        if (earningsError) {
          logger.error('Error updating earnings after payout:', earningsError);
        }
      }
    }

    return true;
  } catch (error) {
    logger.error('Error updating payout status:', error);
    return false;
  }
}

export async function getAllPayoutRequests(): Promise<PayoutRequest[]> {
  return getPayoutRequestsFromDB();
}

// Payment Details Interface
export interface PaymentDetail {
  id: string;
  userId: string;
  paymentMethod: 'upi' | 'bank' | 'paytm';
  paymentDetails: string;
  accountHolderName?: string;
  ifscCode?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Get payment details for a user
export async function getUserPaymentDetails(userId: string): Promise<PaymentDetail[]> {
  try {
    const { data, error } = await supabase
      .from('user_payment_details')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching payment details:', error);
      return [];
    }

    return (data || []).map((pd: any) => ({
      id: pd.id,
      userId: pd.user_id,
      paymentMethod: pd.payment_method,
      paymentDetails: pd.payment_details,
      accountHolderName: pd.account_holder_name,
      ifscCode: pd.ifsc_code,
      isDefault: pd.is_default,
      createdAt: pd.created_at,
      updatedAt: pd.updated_at,
    }));
  } catch (error) {
    logger.error('Error getting payment details:', error);
    return [];
  }
}

// Save payment detail
export async function savePaymentDetail(
  userId: string,
  paymentMethod: 'upi' | 'bank' | 'paytm',
  paymentDetails: string,
  accountHolderName?: string,
  ifscCode?: string,
  isDefault: boolean = false
): Promise<PaymentDetail | null> {
  try {
    // If setting as default, unset other defaults for this user
    if (isDefault) {
      await supabase
        .from('user_payment_details')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true);
    }

    const { data, error } = await supabase
      .from('user_payment_details')
      .upsert({
        user_id: userId,
        payment_method: paymentMethod,
        payment_details: paymentDetails,
        account_holder_name: accountHolderName,
        ifsc_code: ifscCode,
        is_default: isDefault,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: paymentMethod === 'bank' 
          ? undefined // Let the unique index handle it
          : 'user_id,payment_method,payment_details',
      })
      .select()
      .single();

    if (error) {
      logger.error('Error saving payment detail:', error);
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      paymentMethod: data.payment_method,
      paymentDetails: data.payment_details,
      accountHolderName: data.account_holder_name,
      ifscCode: data.ifsc_code,
      isDefault: data.is_default,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    logger.error('Error saving payment detail:', error);
    return null;
  }
}

// Delete payment detail
export async function deletePaymentDetail(paymentDetailId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_payment_details')
      .delete()
      .eq('id', paymentDetailId);

    if (error) {
      logger.error('Error deleting payment detail:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error deleting payment detail:', error);
    return false;
  }
}

// Set default payment detail
export async function setDefaultPaymentDetail(paymentDetailId: string, userId: string): Promise<boolean> {
  try {
    // Unset all defaults for this user
    await supabase
      .from('user_payment_details')
      .update({ is_default: false })
      .eq('user_id', userId);

    // Set the selected one as default
    const { error } = await supabase
      .from('user_payment_details')
      .update({ is_default: true })
      .eq('id', paymentDetailId);

    if (error) {
      logger.error('Error setting default payment detail:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error setting default payment detail:', error);
    return false;
  }
}

// Generate payment links for admin
export function generatePaymentLink(
  paymentMethod: string,
  paymentDetails: string,
  amount: number
): string | null {
  if (!paymentDetails) return null;

  const encodedAmount = amount.toString();
  const encodedDetails = encodeURIComponent(paymentDetails);

  switch (paymentMethod?.toLowerCase()) {
    case 'upi':
      // UPI payment link format: upi://pay?pa=<upi_id>&am=<amount>&cu=INR
      return `upi://pay?pa=${encodedDetails}&am=${encodedAmount}&cu=INR`;
    
    case 'paytm':
      // Paytm payment link
      return `paytmmp://pay?pa=${encodedDetails}&am=${encodedAmount}`;
    
    case 'bank':
      // For bank transfers, we can't create a direct link, but we can format the details
      // Return null and handle it differently in the UI
      return null;
    
    default:
      return null;
  }
}

function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

export function formatCurrency(amount: number, rate?: EarningRate): string {
  const r = rate || getEarningRate();
  return `${r.currencySymbol}${amount.toLocaleString('en-IN')}`;
}

export function getWeeklyStats(earnings: UploaderEarnings | null): { week: string; count: number }[] {
  if (!earnings) return [];

  const weeks = Object.entries(earnings.weeklyUploads)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 8)
    .reverse();

  return weeks.map(([week, count]) => ({ week, count }));
}

export function getMonthlyStats(earnings: UploaderEarnings | null): { month: string; count: number }[] {
  if (!earnings) return [];

  const months = Object.entries(earnings.monthlyUploads)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .reverse();

  return months.map(([month, count]) => ({ month, count }));
}

export function clearEarningsSettingsCache(): void {
  cachedSettings = null;
  cacheTimestamp = 0;
  try {
    localStorage.removeItem(SETTINGS_CACHE_KEY);
  } catch {
  }
}
