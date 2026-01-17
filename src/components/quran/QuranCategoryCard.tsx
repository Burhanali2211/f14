import { memo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

export const QuranCategoryCard = memo(function QuranCategoryCard({ index = 0 }: { index?: number }) {
  const { theme } = useTheme();
  
  return (
    <Link
      to="/quran"
      className={`group relative block w-full overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-card via-card ${
        theme === 'light' 
          ? 'to-card border-border/70 shadow-lg hover:shadow-xl' 
          : 'to-card/80 border-border/40 shadow-lg hover:shadow-xl'
      } transition-all duration-500 hover:-translate-y-2 active:scale-[0.98] animate-fade-in`}
      style={{ animationDelay: `${index * 0.08}s` }}
      tabIndex={0}
      aria-label="Read the Holy Quran"
    >
      <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-700 ${
        theme === 'light'
          ? 'from-emerald-500/15 via-emerald-500/8 to-primary/10'
          : 'from-emerald-500/25 via-emerald-500/12 to-primary/15'
      }`} />

      <div className={`absolute inset-0 bg-gradient-to-t transition-opacity duration-700 ${
        theme === 'light'
          ? 'from-background/98 via-background/75 to-transparent opacity-95 group-hover:opacity-85'
          : 'from-background via-background/40 to-transparent opacity-80 group-hover:opacity-60'
      }`} />

      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 dark:via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>

      <div className="relative z-10 p-5 sm:p-6 md:p-5 lg:p-6 flex flex-col h-full min-h-[200px] sm:min-h-[220px] md:min-h-[200px] lg:min-h-[220px]">
        <div className="flex-1 flex flex-col">
          <div className={`w-14 h-14 sm:w-16 sm:h-16 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-xl md:rounded-2xl bg-emerald-500/15 dark:bg-emerald-500/10 border-emerald-500/30 dark:border-emerald-500/20 backdrop-blur-xl border-2 flex items-center justify-center mb-4 sm:mb-5 md:mb-4 lg:mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ${
            theme === 'light'
              ? 'shadow-md group-hover:shadow-lg'
              : 'shadow-lg group-hover:shadow-xl'
          }`}>
            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 md:w-7 md:h-7 lg:w-8 lg:h-8 text-emerald-600 dark:text-emerald-400 transition-transform duration-500 group-hover:scale-110" />
          </div>
          
          <h3 className={`text-xl sm:text-2xl md:text-xl lg:text-2xl font-bold mb-1 transition-colors duration-500 leading-tight ${
            theme === 'light'
              ? 'text-foreground group-hover:text-emerald-600'
              : 'text-foreground group-hover:text-emerald-400'
          }`}>
            القرآن الکریم
          </h3>
          <h4 className={`text-lg sm:text-xl md:text-lg lg:text-xl font-semibold mb-2 sm:mb-3 md:mb-2 lg:mb-3 transition-colors duration-500 leading-tight ${
            theme === 'light'
              ? 'text-foreground/90 group-hover:text-emerald-600'
              : 'text-foreground/90 group-hover:text-emerald-400'
          }`}>
            The Holy Quran
          </h4>
          
          <p className={`text-xs sm:text-sm md:text-xs lg:text-sm line-clamp-2 sm:line-clamp-3 leading-relaxed mb-3 sm:mb-4 md:mb-3 lg:mb-4 transition-colors duration-500 ${
            theme === 'light'
              ? 'text-foreground/75 group-hover:text-foreground/90'
              : 'text-muted-foreground group-hover:text-foreground/80'
          }`}>
            Read and recite the Words of Allah. Browse by Surah or Para.
          </p>
        </div>

        <div className={`mt-auto pt-3 sm:pt-4 md:pt-3 lg:pt-4 border-t transition-colors duration-500 ${
          theme === 'light'
            ? 'border-border/60 group-hover:border-emerald-500/60'
            : 'border-border/30 group-hover:border-emerald-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs sm:text-sm md:text-xs lg:text-sm font-semibold transition-colors duration-500 ${
              theme === 'light'
                ? 'text-emerald-600 group-hover:text-emerald-700'
                : 'text-emerald-400 group-hover:text-emerald-300'
            }`}>
              Read Now
            </span>
            <div className={`w-8 h-8 sm:w-9 sm:h-9 md:w-8 md:h-8 lg:w-9 lg:h-9 rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 ${
              theme === 'light'
                ? 'bg-emerald-500/20 group-hover:bg-emerald-500/30 border border-emerald-500/40 group-hover:border-emerald-500/60'
                : 'bg-emerald-500/10 group-hover:bg-emerald-500/20 border border-emerald-500/20 group-hover:border-emerald-500/40'
            }`}>
              <ArrowRight className={`w-4 h-4 sm:w-4 sm:h-4 md:w-4 md:h-4 lg:w-5 lg:h-5 transition-transform duration-500 group-hover:translate-x-1 ${
                theme === 'light'
                  ? 'text-emerald-600'
                  : 'text-emerald-400'
              }`} />
            </div>
          </div>
        </div>
      </div>

      <div className={`absolute top-0 right-0 w-24 h-24 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-gradient-to-bl rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl ${
        theme === 'light'
          ? 'from-emerald-500/30 via-emerald-500/20 to-transparent'
          : 'from-emerald-500/20 via-emerald-500/10 to-transparent'
      }`} />
      
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 md:h-1 bg-gradient-to-r from-transparent to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-center ${
        theme === 'light'
          ? 'via-emerald-500/70'
          : 'via-emerald-500/50'
      }`} />
    </Link>
  );
});
