import { memo, useState, useCallback } from 'react';
import { PayoutRequestsPanel } from '@/components/admin/PayoutRequestsPanel';
import { EarningsSettingsPanel } from '@/components/admin/EarningsSettingsPanel';
import { Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const EARNINGS_ACCESS_KEY = import.meta.env.VITE_EARNINGS_ACCESS_PASSWORD || '';

export const AdminEarningsSection = memo(() => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleUnlock = useCallback(() => {
    if (password === EARNINGS_ACCESS_KEY) {
      setIsUnlocked(true);
      setError('');
      setPassword('');
      setAttempts(0);
    } else {
      setAttempts(prev => prev + 1);
      setError('Invalid password. Access denied.');
      setPassword('');
    }
  }, [password]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUnlock();
    }
  }, [handleUnlock]);

  if (!isUnlocked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-full max-w-md p-8 bg-gradient-to-br from-red-950/20 via-background to-red-950/10 border-2 border-red-500/30 rounded-2xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Restricted Access</h2>
            <p className="text-sm text-muted-foreground">
              Earnings section requires special authorization
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter access password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                onKeyDown={handleKeyDown}
                className="pr-12 h-12 text-center font-mono tracking-wider border-red-500/30 focus:border-red-500 focus:ring-red-500/20"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {attempts >= 3 && (
              <div className="text-xs text-muted-foreground text-center p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                Multiple failed attempts detected. Please verify your credentials.
              </div>
            )}

            <Button
              onClick={handleUnlock}
              className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold shadow-lg shadow-red-500/25"
              disabled={!password}
            >
              <Lock className="w-4 h-4 mr-2" />
              Unlock Access
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-red-500/20">
            <p className="text-xs text-muted-foreground text-center">
              This area contains sensitive financial data. Unauthorized access is prohibited.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PayoutRequestsPanel />
      <EarningsSettingsPanel />
    </div>
  );
});

AdminEarningsSection.displayName = 'AdminEarningsSection';

