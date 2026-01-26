import { Clock, Trash2, Plus, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RecentActivityProps } from './types';

export const RecentActivity = ({ activities, onClear }: RecentActivityProps) => {
  if (activities.length === 0) return null;
  
  return (
    <div className="bg-card border rounded-xl p-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Recent Activity
        </h3>
        <Button variant="ghost" size="sm" onClick={onClear} className="text-xs h-8 rounded-lg">
          Clear
        </Button>
      </div>
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {activities.slice(0, 5).map((activity) => (
          <div key={activity.id} className="flex items-center justify-between text-xs bg-muted/30 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              {activity.type === 'delete' && <Trash2 className="w-3 h-3 text-destructive" />}
              {activity.type === 'create' && <Plus className="w-3 h-3 text-green-600" />}
              {activity.type === 'update' && <Edit2 className="w-3 h-3 text-blue-600" />}
              <span className="text-muted-foreground truncate max-w-[200px]">{activity.pieceTitle}</span>
            </div>
            <span className="text-muted-foreground">
              {new Date(activity.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

