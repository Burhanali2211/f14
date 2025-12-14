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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

  // Fetch distinct reciters from database
  React.useEffect(() => {
    const fetchReciters = async () => {
      setLoading(true);
      try {
        const { data, error } = await safeQuery(async () =>
          await supabase
            .from('pieces')
            .select('reciter')
            .not('reciter', 'is', null)
        );

        if (error) {
          logger.error('Error fetching reciters:', error);
          return;
        }

        if (data) {
          // Get unique, non-null reciter names
          const uniqueReciters = [
            ...new Set(
              data
                .map((p: { reciter: string | null }) => p.reciter)
                .filter((r): r is string => Boolean(r))
            )
          ].sort();
          setReciters(uniqueReciters);
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
    if (!value) return reciters;
    const lowerValue = value.toLowerCase().trim();
    return reciters.filter(reciter =>
      reciter.toLowerCase().includes(lowerValue)
    );
  }, [value, reciters]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    // Always show suggestions when typing if there are matches
    if (newValue.length > 0) {
      setOpen(filteredReciters.length > 0);
    } else {
      // Show all reciters when input is cleared
      setOpen(reciters.length > 0 && reciters.length <= 50);
    }
  };

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    // Close popover but keep input focused and editable
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
    // Show suggestions when focused
    if (value && filteredReciters.length > 0) {
      setOpen(true);
    } else if (reciters.length > 0 && reciters.length <= 50) {
      // Show all if there are not too many (max 50)
      setOpen(true);
    }
  };

  const handleClick = () => {
    // Reopen suggestions when clicking on the input
    if (value && filteredReciters.length > 0) {
      setOpen(true);
    } else if (reciters.length > 0 && reciters.length <= 50) {
      setOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList>
            {loading ? (
              <CommandEmpty>Loading reciters...</CommandEmpty>
            ) : filteredReciters.length === 0 ? (
              <CommandEmpty>
                No matching reciter found. Type to add new.
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredReciters.map((reciter) => (
                  <CommandItem
                    key={reciter}
                    value={reciter}
                    onSelect={() => handleSelect(reciter)}
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
      </PopoverContent>
    </Popover>
  );
}
