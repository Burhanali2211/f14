import { RefObject } from 'react';
import { Search, BarChart3, Download, RefreshCw, CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { UploaderHeaderProps } from './types';

interface ExtendedHeaderProps extends UploaderHeaderProps {
  searchInputRef?: RefObject<HTMLInputElement>;
}

export const UploaderHeader = ({ 
  activeSection,
  searchQuery,
  setSearchQuery,
  showStats,
  setShowStats,
  onExport,
  onRefresh,
  onShowHelp,
  loading,
  filteredCount,
  searchInputRef
}: ExtendedHeaderProps) => {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      <SidebarTrigger className="h-9 w-9 min-h-[44px] min-w-[44px]" />
      
      <div className="flex-1 flex items-center gap-4">
        <h1 className="font-bold text-xl text-foreground">
          {activeSection === 'earnings' ? 'Earnings' : 'My Recitations'}
        </h1>
        
        {activeSection === 'recitations' && (
          <div className="hidden md:flex relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search recitations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl"
              aria-label="Search recitations"
            />
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {activeSection === 'recitations' && (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setShowStats(!showStats)} 
                    aria-label="Toggle statistics"
                    className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-xl"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>View statistics</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-xl"
                  aria-label="Export options"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Export Data</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onExport('csv')} 
                  disabled={filteredCount === 0}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onExport('json')} 
                  disabled={filteredCount === 0}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={onRefresh} 
                disabled={loading} 
                aria-label="Refresh data"
                className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-xl"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Refresh data</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onShowHelp} 
                  aria-label="Show keyboard shortcuts"
                  className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-xl"
                >
                  <CircleHelp className="w-4 h-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent><p>Keyboard shortcuts (Ctrl+/)</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
};

