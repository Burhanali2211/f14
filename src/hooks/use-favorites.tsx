import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface FavoritesContextType {
  favorites: string[];
  recentlyViewed: string[];
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  addToRecentlyViewed: (id: string) => void;
  clearRecentlyViewed: () => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const MAX_RECENT = 20;

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('favorites');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('recently-viewed');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('recently-viewed', JSON.stringify(recentlyViewed));
  }, [recentlyViewed]);

  const addFavorite = (id: string) => {
    setFavorites(prev => {
      if (prev.includes(id)) return prev;
      return [id, ...prev];
    });
  };

  const removeFavorite = (id: string) => {
    setFavorites(prev => prev.filter(f => f !== id));
  };

  const isFavorite = (id: string) => favorites.includes(id);

  const addToRecentlyViewed = (id: string) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(r => r !== id);
      return [id, ...filtered].slice(0, MAX_RECENT);
    });
  };

  const clearRecentlyViewed = () => {
    setRecentlyViewed([]);
  };

  return (
    <FavoritesContext.Provider value={{
      favorites,
      recentlyViewed,
      addFavorite,
      removeFavorite,
      isFavorite,
      addToRecentlyViewed,
      clearRecentlyViewed,
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
