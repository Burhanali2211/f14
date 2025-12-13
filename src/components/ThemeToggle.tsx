import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="w-10 h-10 rounded-xl hover:bg-secondary relative overflow-hidden group"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <Sun className={`w-5 h-5 transition-all duration-300 ${
        theme === 'light' 
          ? 'rotate-0 scale-100 text-accent' 
          : 'rotate-90 scale-0 absolute'
      }`} />
      <Moon className={`w-5 h-5 transition-all duration-300 ${
        theme === 'dark' 
          ? 'rotate-0 scale-100 text-accent' 
          : '-rotate-90 scale-0 absolute'
      }`} />
    </Button>
  );
}
