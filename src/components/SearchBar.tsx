import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, BookOpen, CircleHelp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Piece } from '@/lib/supabase-types';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
  isLoading?: boolean;
  searchResults?: Piece[];
  searchQuery?: string;
}

export function SearchBar({ 
  onSearch, 
  placeholder = "Search...", 
  initialValue = "",
  isLoading = false,
  searchResults = [],
  searchQuery = ""
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  // Handle focus out properly by checking if click is outside the entire search component
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      onSearch(value);
    }, 400); // Optimized debounce to reduce DB load
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear();
      inputRef.current?.blur();
      setIsFocused(false);
    } else if (e.key === 'Enter') {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      onSearch(query);
    }
  };

    const handleBlur = (e: React.FocusEvent) => {
      // If we're moving focus within the container (like clicking a result), don't close
      if (e.relatedTarget && containerRef.current?.contains(e.relatedTarget as Node)) {
        return;
      }
      
      // On mobile, blur can be triggered when scrolling or tapping results
      // We rely more on the handleClickOutside for mobile to prevent accidental closing
      if (isMobile) {
        return;
      }

      // Small delay for desktop to allow pointer events on results to fire first
      setTimeout(() => {
        if (document.activeElement && containerRef.current?.contains(document.activeElement)) {
          return;
        }
        setIsFocused(false);
      }, 200);
    };

  const showResults = (query.trim().length >= 2 || searchResults.length > 0) && (isFocused || searchResults.length > 0);

  return (
    <div ref={containerRef} className="relative max-w-2xl mx-auto z-50">
      <div className={`relative transition-[box-shadow,border-color] duration-300 ${
        isFocused && !isMobile ? 'ring-2 ring-primary/20 rounded-2xl' : ''
      }`}>
        {/* Glow effect - subtle on mobile */}
        <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${
          isFocused ? 'opacity-100' : 'opacity-0'
        }`} style={{
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.1))',
          filter: 'blur(8px)',
        }} />
        
        <div className="relative">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200 ${
            isFocused ? 'text-primary' : 'text-muted-foreground'
          }`} />
          <Input
            ref={inputRef}
            type="text"
            inputMode="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={isMobile ? "Search recitations..." : placeholder}
            className={`pl-12 pr-12 ${isMobile ? 'py-7 text-lg' : 'py-6 text-base'} rounded-2xl bg-card border-border shadow-soft focus:shadow-card transition-[box-shadow,border-color] duration-300 focus-visible:ring-0`}
            aria-label="Search for recitations"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
            {query && !isLoading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className={`${isMobile ? 'h-10 w-10' : 'h-8 w-8'} p-0 hover:bg-muted rounded-lg touch-manipulation`}
                aria-label="Clear search"
              >
                <X className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Search Results Dropdown */}
      {showResults && (
        <div 
          className="absolute top-full left-0 right-0 mt-2 max-h-[60vh] md:max-h-[70vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-lg z-50 animate-in fade-in-0 slide-in-from-top-2 duration-200"
          onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking results
        >
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Searching...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <>
              <div className="p-4 border-b border-border">
                <p className="text-sm text-muted-foreground">
                  {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found
                </p>
              </div>
              <div className="p-2">
                {searchResults.map((piece) => (
                  <Link
                    key={piece.id}
                    to={`/piece/${piece.id}`}
                    onClick={() => setIsFocused(false)}
                    className={`block ${isMobile ? 'px-4 py-4 min-h-[56px]' : 'px-4 py-3'} rounded-lg hover:bg-secondary active:bg-secondary/80 transition-colors group touch-manipulation`}
                  >
                    <h3 
                      className={`${isMobile ? 'text-base' : 'text-sm'} font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-[1.6] py-0.5`}
                    >
                      {piece.title}
                    </h3>
                    {piece.reciter && (
                      <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-muted-foreground mt-1`}>
                        by {piece.reciter}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </>
          ) : query.trim().length >= 2 && !isLoading ? (
            <div className="p-8 text-center">
              <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground mb-1">No results found</p>
              <p className="text-xs text-muted-foreground">Try searching with different keywords</p>
            </div>
          ) : null}
        </div>
      )}
      
      {/* Search tips when empty and focused */}
      {isFocused && !query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-card border border-border rounded-2xl shadow-lg z-50 animate-in fade-in-0 slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <CircleHelp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-foreground">Search Tips</p>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>Search by title, reciter name, or category</li>
                <li>Results appear as you type (min. 2 chars)</li>
                <li>Tap any result to start reading</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
