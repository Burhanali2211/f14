import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, BookOpen, Heart, Users, Search, X } from 'lucide-react';
import { ChildFriendlyTile, ChildFriendlyTileButton } from './ChildFriendlyTile';
import { playTapSound } from './ChildFriendlyNav';

interface ChildFriendlyHomeProps {
  soundEnabled?: boolean;
  onSearchClick?: () => void;
}

export function ChildFriendlyHome({ soundEnabled = true, onSearchClick }: ChildFriendlyHomeProps) {
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();

  const handleSearchClick = () => {
    if (soundEnabled) playTapSound();
    if (onSearchClick) {
      onSearchClick();
    } else {
      setShowSearch(true);
    }
  };

  const tiles = [
    {
      to: '/category/naat',
      icon: Headphones,
      label: 'Listen',
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
      size: 'large' as const,
    },
    {
      to: '/favorites',
      icon: Heart,
      label: 'Favorites',
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-rose-400 to-rose-600',
      size: 'large' as const,
    },
    {
      to: '/ahlul-bayt',
      icon: Users,
      label: 'Ahlul Bayt',
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-amber-400 to-amber-600',
      size: 'large' as const,
    },
    {
      to: '/',
      icon: BookOpen,
      label: 'Read',
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-blue-400 to-blue-600',
      size: 'large' as const,
      isCategories: true,
    },
  ];

  return (
    <section className="min-h-[70vh] flex flex-col items-center justify-center py-8 px-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-emerald-light flex items-center justify-center shadow-lg">
            <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-primary-foreground" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 justify-items-center max-w-lg mx-auto">
          {tiles.map((tile, index) => (
            <ChildFriendlyTile
              key={tile.label}
              to={tile.isCategories ? '#categories' : tile.to}
              icon={tile.icon}
              label={tile.label}
              color={tile.color}
              bgColor={tile.bgColor}
              soundEnabled={soundEnabled}
              size={tile.size}
              delay={index * 100}
            />
          ))}
        </div>

        <div className="flex justify-center mt-6 sm:mt-8">
          <ChildFriendlyTileButton
            onClick={handleSearchClick}
            icon={Search}
            label="Search"
            color="text-white"
            bgColor="bg-gradient-to-br from-purple-400 to-purple-600"
            soundEnabled={soundEnabled}
            size="medium"
            delay={400}
          />
        </div>
      </div>

      {showSearch && (
        <SearchOverlay 
          onClose={() => setShowSearch(false)} 
          soundEnabled={soundEnabled}
        />
      )}
    </section>
  );
}

function SearchOverlay({ onClose, soundEnabled }: { onClose: () => void; soundEnabled: boolean }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleClose = () => {
    if (soundEnabled) playTapSound();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex flex-col items-center justify-start pt-20 px-4 animate-fade-in">
      <button
        onClick={handleClose}
        className="absolute top-6 right-6 w-16 h-16 rounded-full bg-secondary flex items-center justify-center shadow-lg active:scale-90 transition-transform"
        aria-label="Close search"
      >
        <X className="w-8 h-8 text-foreground" />
      </button>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Search className="w-16 h-16 text-primary mx-auto mb-4" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type to search..."
          autoFocus
          className="w-full h-16 sm:h-20 text-xl sm:text-2xl px-6 rounded-2xl border-4 border-primary/30 bg-card focus:border-primary focus:outline-none transition-colors"
        />

        {query && (
          <button
            onClick={() => setQuery('')}
            className="mt-4 w-full h-14 rounded-xl bg-secondary text-foreground font-semibold active:scale-95 transition-transform"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
