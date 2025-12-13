import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
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

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

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
    }, 300);
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
    } else if (e.key === 'Enter') {
      // Trigger search immediately on Enter
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      onSearch(query);
    }
  };

  const showResults = (query.trim() || searchResults.length > 0) && (isFocused || searchResults.length > 0);

  return (
    <div className="relative max-w-2xl mx-auto">
      <div className={`relative transition-all duration-300 ${
        isFocused ? 'scale-[1.02]' : 'scale-100'
      }`}>
        {/* Glow effect when focused */}
        <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${
          isFocused ? 'opacity-100' : 'opacity-0'
        }`} style={{
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.1))',
          filter: 'blur(8px)',
          transform: 'scale(1.02)',
        }} />
        
        <div className="relative">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200 ${
            isFocused ? 'text-primary' : 'text-muted-foreground'
          }`} />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              // Delay blur to allow clicking on results
              setTimeout(() => setIsFocused(false), 200);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-12 pr-12 py-6 text-base rounded-2xl bg-card border-border shadow-soft focus:shadow-card transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary/20"
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
                className="h-8 w-8 p-0 hover:bg-muted rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 max-h-[60vh] md:max-h-[70vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-lg z-50 animate-in fade-in-0 slide-in-from-top-2 duration-200">
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
                    className="block px-4 py-3 rounded-lg hover:bg-secondary transition-colors group"
                  >
                    <h3 className="font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {piece.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </>
          ) : query.trim() && !isLoading ? (
            <div className="p-8 text-center">
              <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground mb-1">No results found</p>
              <p className="text-xs text-muted-foreground">Try searching with different keywords</p>
            </div>
          ) : null}
        </div>
      )}
      
      {/* Keyboard hint */}
      {isFocused && !showResults && (
        <p className="absolute -bottom-6 left-0 right-0 text-center text-xs text-muted-foreground animate-fade-in">
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Esc</kbd> to clear
        </p>
      )}
    </div>
  );
}
