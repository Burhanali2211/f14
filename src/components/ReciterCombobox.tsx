import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { safeQuery } from "@/lib/db-utils";
import { logger } from "@/lib/logger";

interface ReciterComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function ReciterCombobox({
  value,
  onChange,
  placeholder = "e.g., Maher Zain",
  className,
  id = "piece-reciter",
}: ReciterComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [reciters, setReciters] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Fetch ALL artists from artistes table (not just those with pieces)
  React.useEffect(() => {
    const fetchReciters = async () => {
      setLoading(true);
      try {
        const { data, error } = await safeQuery(async () =>
          await (supabase as any)
            .from('artistes')
            .select('name')
            .order('name')
        );

        if (error) {
          logger.error('Error fetching artistes:', error);
          // Fallback: try fetching from pieces table if artistes table fails
          const { data: piecesData, error: piecesError } = await safeQuery(async () =>
            await supabase
              .from('pieces')
              .select('reciter')
              .not('reciter', 'is', null)
          );

          if (piecesError) {
            logger.error('Error fetching reciters from pieces:', piecesError);
            return;
          }

          if (piecesData) {
            const uniqueReciters = [
              ...new Set(
                piecesData
                  .map((p: { reciter: string | null }) => p.reciter)
                  .filter((r): r is string => Boolean(r))
              )
            ].sort();
            setReciters(uniqueReciters);
          }
          return;
        }

        if (data) {
          // Get all artist names from artistes table
          const artistNames = data
            .map((a: { name: string }) => a.name)
            .filter((name): name is string => Boolean(name))
            .sort();
          setReciters(artistNames);
        }
      } catch (error) {
        logger.error('Unexpected error fetching reciters:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReciters();
  }, []);

  // Filter reciters based on input value
  const filteredReciters = React.useMemo(() => {
    if (!value || value.trim().length === 0) return [];
    const lowerValue = value.toLowerCase().trim();
    return reciters.filter(reciter =>
      reciter.toLowerCase().includes(lowerValue)
    );
  }, [value, reciters]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    // Show suggestions when typing if there are matches
    if (newValue.trim().length > 0) {
      setOpen(filteredReciters.length > 0);
    } else {
      setOpen(false);
    }
  };

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    // Close dropdown but keep input focused and editable
    setOpen(false);
    // Set cursor to end of input so user can continue editing
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const length = selectedValue.length;
        inputRef.current.setSelectionRange(length, length);
      }
    }, 10);
  };

  const handleFocus = () => {
    // Show suggestions when focused if there are matches
    if (value && value.trim().length > 0 && filteredReciters.length > 0) {
      setOpen(true);
    }
  };

  const handleClick = () => {
    // Show suggestions when clicking if there are matches
    if (value && value.trim().length > 0 && filteredReciters.length > 0) {
      setOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && filteredReciters.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-[300px] overflow-hidden"
        >
          <Command>
            <CommandList>
              {loading ? (
                <CommandEmpty>Loading reciters...</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredReciters.map((reciter) => (
                    <CommandItem
                      key={reciter}
                      value={reciter}
                      onSelect={() => handleSelect(reciter)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === reciter ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {reciter}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
