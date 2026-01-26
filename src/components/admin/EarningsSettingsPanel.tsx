import { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  IndianRupee,
  Save,
  RotateCcw,
  AlertTriangle,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Settings,
  Award,
  LogOut,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { toast } from '@/hooks/use-toast';
import {
  EarningRatesConfig,
  MilestoneConfig,
  verifySettingsPassword,
  isSettingsSessionValid,
  clearSettingsSession,
  getEarningRatesConfig,
  saveEarningRatesConfig,
  getDefaultRates,
} from '@/lib/earning-settings';

export function EarningsSettingsPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<EarningRatesConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  useEffect(() => {
    const sessionValid = isSettingsSessionValid();
    setIsAuthenticated(sessionValid);
    
    if (sessionValid) {
      loadConfig();
    } else {
      setLoading(false);
    }
    
    const storedLockout = sessionStorage.getItem('earnings_lockout');
    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout, 10);
      if (lockoutTime > Date.now()) {
        setLockoutUntil(lockoutTime);
      } else {
        sessionStorage.removeItem('earnings_lockout');
      }
    }
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const rates = await getEarningRatesConfig();
      setConfig(rates);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (lockoutUntil && lockoutUntil > Date.now()) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000 / 60);
      toast({ 
        title: 'Account Locked', 
        description: `Too many failed attempts. Try again in ${remaining} minutes.`,
        variant: 'destructive' 
      });
      return;
    }

    setVerifying(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));
    
    const isValid = await verifySettingsPassword(password);
    
    if (isValid) {
      setIsAuthenticated(true);
      setShowPasswordDialog(false);
      setPassword('');
      setFailedAttempts(0);
      sessionStorage.removeItem('earnings_lockout');
      toast({ title: 'Access Granted', description: 'You can now edit earning settings' });
      loadConfig();
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      
      if (newAttempts >= 5) {
        const lockoutTime = Date.now() + 30 * 60 * 1000;
        setLockoutUntil(lockoutTime);
        sessionStorage.setItem('earnings_lockout', lockoutTime.toString());
        toast({ 
          title: 'Access Denied', 
          description: 'Too many failed attempts. Locked for 30 minutes.',
          variant: 'destructive' 
        });
      } else {
        toast({ 
          title: 'Invalid Password', 
          description: `${5 - newAttempts} attempts remaining`,
          variant: 'destructive' 
        });
      }
    }
    
    setVerifying(false);
    setPassword('');
  };

  const handleLogout = () => {
    clearSettingsSession();
    setIsAuthenticated(false);
    setConfig(null);
    setHasChanges(false);
    toast({ title: 'Logged Out', description: 'Settings session ended' });
  };

  const handleSave = async () => {
    if (!config) return;
    
    setSaving(true);
    try {
      const success = await saveEarningRatesConfig(config);
      if (success) {
        setHasChanges(false);
        toast({ title: 'Saved', description: 'Earning settings updated successfully' });
      } else {
        toast({ title: 'Error', description: 'Failed to save settings. Session may have expired.', variant: 'destructive' });
        setIsAuthenticated(false);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(getDefaultRates());
    setHasChanges(true);
    setShowResetDialog(false);
    toast({ title: 'Reset', description: 'Settings reset to defaults. Click Save to apply.' });
  };

  const updateConfig = (updates: Partial<EarningRatesConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
    setHasChanges(true);
  };

  const updateMilestone = (index: number, updates: Partial<MilestoneConfig>) => {
    if (!config) return;
    const newMilestones = [...config.milestones];
    newMilestones[index] = { ...newMilestones[index], ...updates };
    setConfig({ ...config, milestones: newMilestones });
    setHasChanges(true);
  };

  const addMilestone = () => {
    if (!config) return;
    const newMilestone: MilestoneConfig = {
      id: `milestone_${Date.now()}`,
      name: 'New Milestone',
      requiredCount: 100,
      bonus: 1000,
      icon: '🎯',
      description: 'Achieve this milestone',
    };
    setConfig({ ...config, milestones: [...config.milestones, newMilestone] });
    setHasChanges(true);
  };

  const removeMilestone = (index: number) => {
    if (!config || config.milestones.length <= 1) return;
    const newMilestones = config.milestones.filter((_, i) => i !== index);
    setConfig({ ...config, milestones: newMilestones });
    setHasChanges(true);
  };

  if (!isAuthenticated) {
    return (
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-600" />
            Earning Settings
          </CardTitle>
          <CardDescription>
            Configure uploader earning rates and milestone bonuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Lock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Protected Settings</h3>
            <p className="text-sm text-muted-foreground mb-6">
              These settings are password protected for security.
            </p>
            <Button 
              onClick={() => setShowPasswordDialog(true)}
              disabled={lockoutUntil && lockoutUntil > Date.now()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Unlock className="w-4 h-4 mr-2" />
              {lockoutUntil && lockoutUntil > Date.now() 
                ? `Locked (${Math.ceil((lockoutUntil - Date.now()) / 1000 / 60)}m)`
                : 'Unlock Settings'
              }
            </Button>
          </div>
        </CardContent>

        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                Security Verification
              </DialogTitle>
              <DialogDescription>
                Enter the admin password to access earning settings.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                    placeholder="Enter admin password"
                    className="pr-10"
                    disabled={verifying}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {failedAttempts > 0 && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {5 - failedAttempts} attempts remaining
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)} disabled={verifying}>
                Cancel
              </Button>
              <Button onClick={handlePasswordSubmit} disabled={verifying || !password}>
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

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

  if (!config) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <p className="text-muted-foreground">Failed to load settings</p>
          <Button onClick={loadConfig} variant="outline" className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Earning Settings
              </CardTitle>
              <CardDescription>Configure uploader rewards and milestones</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-500/10 rounded">
                  Unsaved Changes
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Lock
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="perRecitation" className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4" />
                Per Recitation
              </Label>
              <Input
                id="perRecitation"
                type="number"
                value={config.perRecitation}
                onChange={(e) => updateConfig({ perRecitation: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimumPayout">Minimum Payout</Label>
              <Input
                id="minimumPayout"
                type="number"
                value={config.minimumPayout}
                onChange={(e) => updateConfig({ minimumPayout: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency Code</Label>
              <Input
                id="currency"
                value={config.currency}
                onChange={(e) => updateConfig({ currency: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currencySymbol">Currency Symbol</Label>
              <Input
                id="currencySymbol"
                value={config.currencySymbol}
                onChange={(e) => updateConfig({ currencySymbol: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                Milestone Bonuses
              </CardTitle>
              <CardDescription>Configure achievement rewards</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addMilestone}>
              <Plus className="w-4 h-4 mr-2" />
              Add Milestone
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {config.milestones.map((milestone, index) => (
              <div 
                key={milestone.id}
                className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <Input
                      value={milestone.icon}
                      onChange={(e) => updateMilestone(index, { icon: e.target.value })}
                      className="text-center text-xl"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Name</Label>
                    <Input
                      value={milestone.name}
                      onChange={(e) => updateMilestone(index, { name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Required Count</Label>
                    <Input
                      type="number"
                      value={milestone.requiredCount}
                      onChange={(e) => updateMilestone(index, { requiredCount: parseInt(e.target.value) || 0 })}
                      min={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Bonus ({config.currencySymbol})</Label>
                    <Input
                      type="number"
                      value={milestone.bonus}
                      onChange={(e) => updateMilestone(index, { bonus: parseInt(e.target.value) || 0 })}
                      min={0}
                    />
                  </div>

                  <div className="flex items-center justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMilestone(index)}
                      disabled={config.milestones.length <= 1}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={milestone.description}
                    onChange={(e) => updateMilestone(index, { description: e.target.value })}
                    placeholder="Description for this milestone"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={() => setShowResetDialog(true)}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset to Defaults
        </Button>
        
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || saving}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Settings?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all earning settings to their default values. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground">
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
