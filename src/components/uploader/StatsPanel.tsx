import { BarChart3, X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StatsPanelProps } from './types';

export const StatsPanel = ({ statistics, filteredCount, onClose }: StatsPanelProps) => (
  <div className="bg-gradient-to-br from-card to-muted/30 border rounded-2xl p-6 mb-6 space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        Statistics
      </h2>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onClose} 
        aria-label="Close statistics" 
        className="min-h-[44px] min-w-[44px] touch-manipulation rounded-xl"
      >
        <XIcon className="w-5 h-5" />
      </Button>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border">
        <p className="text-sm text-muted-foreground mb-1">Total Recitations</p>
        <p className="text-3xl font-bold text-primary">{statistics.total}</p>
      </div>
      <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border">
        <p className="text-sm text-muted-foreground mb-1">With Images</p>
        <p className="text-3xl font-bold text-emerald-600">{statistics.withImages}</p>
      </div>
      <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border">
        <p className="text-sm text-muted-foreground mb-1">With Videos</p>
        <p className="text-3xl font-bold text-blue-600">{statistics.withVideos}</p>
      </div>
      <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border">
        <p className="text-sm text-muted-foreground mb-1">Filtered Results</p>
        <p className="text-3xl font-bold text-amber-600">{filteredCount}</p>
      </div>
    </div>
    {Object.keys(statistics.byCategory).length > 0 && (
      <div className="bg-background/50 rounded-xl p-4 border">
        <h3 className="text-sm font-semibold mb-3">By Category</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(statistics.byCategory).map(([cat, count]) => (
            <div key={cat} className="flex justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
              <span className="text-muted-foreground truncate">{cat}</span>
              <span className="font-semibold ml-2">{count}</span>
            </div>
          ))}
        </div>
      </div>
    )}
    {Object.keys(statistics.byLanguage).length > 0 && (
      <div className="bg-background/50 rounded-xl p-4 border">
        <h3 className="text-sm font-semibold mb-3">By Language</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(statistics.byLanguage).map(([lang, count]) => (
            <div key={lang} className="flex justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
              <span className="text-muted-foreground">{lang}</span>
              <span className="font-semibold ml-2">{count}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

