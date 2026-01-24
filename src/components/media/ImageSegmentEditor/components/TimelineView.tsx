import { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { ImageRegion } from '../types';
import { formatTimeDisplay } from '../types';

interface TimelineViewProps {
  regions: ImageRegion[];
  allPages: string[];
  duration: number;
  currentTime: number;
  selectedRegionId: string | null;
  onRegionSelect: (id: string) => void;
  onRegionEdit: (id: string) => void;
  onSeekTo: (time: number) => void;
  onRegionUpdate: (id: string, updates: Partial<ImageRegion>) => void;
}

function TimelineViewComponent({
  regions,
  allPages,
  duration,
  currentTime,
  selectedRegionId,
  onRegionSelect,
  onRegionEdit,
  onSeekTo,
  onRegionUpdate,
}: TimelineViewProps) {
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    onSeekTo(percentage * duration);
  }, [duration, onSeekTo]);

  const timeMarkers = [];
  if (duration > 0) {
    const interval = duration < 60 ? 10 : duration < 300 ? 30 : 60;
    for (let t = 0; t <= duration; t += interval) {
      timeMarkers.push(t);
    }
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="space-y-2">
        <div 
          className="relative h-8 bg-muted rounded cursor-pointer"
          onClick={handleTimelineClick}
        >
          {timeMarkers.map(t => (
            <div
              key={t}
              className="absolute top-0 h-full flex flex-col items-center"
              style={{ left: `${(t / duration) * 100}%` }}
            >
              <div className="w-px h-2 bg-border" />
              <span className="text-[9px] text-muted-foreground mt-0.5">
                {Math.floor(t / 60)}:{(t % 60).toString().padStart(2, '0')}
              </span>
            </div>
          ))}
          
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
            style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        {allPages.map((_, pageIdx) => {
          const pageRegions = regions.filter(r => r.imageIndex === pageIdx);
          
          return (
            <div key={pageIdx} className="relative">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-muted-foreground w-16">
                  Page {pageIdx + 1}
                </span>
                <div 
                  className="flex-1 h-10 bg-muted/50 rounded relative cursor-pointer"
                  onClick={handleTimelineClick}
                >
                  {pageRegions.map(region => {
                    const isSelected = selectedRegionId === region.id;
                    const left = duration > 0 ? (region.startTime / duration) * 100 : 0;
                    const width = duration > 0 ? ((region.endTime - region.startTime) / duration) * 100 : 0;

                    return (
                      <div
                        key={region.id}
                        className={cn(
                          "absolute top-1 bottom-1 rounded cursor-pointer transition-all group",
                          isSelected 
                            ? "bg-primary ring-2 ring-primary ring-offset-1" 
                            : "bg-amber-500/60 hover:bg-amber-500/80"
                        )}
                        style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRegionSelect(region.id);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          onRegionEdit(region.id);
                        }}
                        title={`${region.label || 'Segment'}: ${formatTimeDisplay(region.startTime)} - ${formatTimeDisplay(region.endTime)}`}
                      >
                        {width > 5 && (
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium truncate px-1">
                            {region.label || `S${region.order + 1}`}
                          </span>
                        )}
                        
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/50 rounded-l"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                        />
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/50 rounded-r"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                        />
                      </div>
                    );
                  })}
                  
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
                    style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {regions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No segments yet</p>
            <p className="text-sm">Switch to Image View to create segments</p>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-muted/30 rounded-lg">
        <h4 className="text-sm font-medium mb-2">Timeline Overview</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Duration:</span>
            <span className="ml-2 font-mono">{formatTimeDisplay(duration)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Segments:</span>
            <span className="ml-2 font-mono">{regions.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Current Time:</span>
            <span className="ml-2 font-mono">{formatTimeDisplay(currentTime)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Coverage:</span>
            <span className="ml-2 font-mono">
              {duration > 0 
                ? Math.round((regions.reduce((sum, r) => sum + (r.endTime - r.startTime), 0) / duration) * 100)
                : 0
              }%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const TimelineView = memo(TimelineViewComponent);
