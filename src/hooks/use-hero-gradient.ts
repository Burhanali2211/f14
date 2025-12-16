/**
 * Hook to get gradient styles based on preset
 */
export function getGradientStyles(preset: string, opacity: number = 1.0): string {
  const baseOpacity = opacity;
  switch (preset) {
    case 'emerald':
      return `
        radial-gradient(ellipse 100% 60% at 50% -10%, hsl(162 70% 24% / ${baseOpacity * 0.15}), transparent),
        radial-gradient(ellipse 70% 50% at 85% 50%, hsl(160 55% 35% / ${baseOpacity * 0.1}), transparent),
        radial-gradient(ellipse 60% 40% at 15% 70%, hsl(162 70% 24% / ${baseOpacity * 0.08}), transparent)
      `;
    case 'gold':
      return `
        radial-gradient(ellipse 100% 60% at 50% -10%, hsl(38 90% 50% / ${baseOpacity * 0.15}), transparent),
        radial-gradient(ellipse 70% 50% at 85% 50%, hsl(40 75% 62% / ${baseOpacity * 0.1}), transparent),
        radial-gradient(ellipse 60% 40% at 15% 70%, hsl(36 85% 40% / ${baseOpacity * 0.08}), transparent)
      `;
    case 'purple':
      return `
        radial-gradient(ellipse 100% 60% at 50% -10%, hsl(270 70% 50% / ${baseOpacity * 0.15}), transparent),
        radial-gradient(ellipse 70% 50% at 85% 50%, hsl(280 60% 55% / ${baseOpacity * 0.1}), transparent),
        radial-gradient(ellipse 60% 40% at 15% 70%, hsl(260 75% 45% / ${baseOpacity * 0.08}), transparent)
      `;
    case 'blue':
      return `
        radial-gradient(ellipse 100% 60% at 50% -10%, hsl(210 70% 50% / ${baseOpacity * 0.15}), transparent),
        radial-gradient(ellipse 70% 50% at 85% 50%, hsl(200 60% 55% / ${baseOpacity * 0.1}), transparent),
        radial-gradient(ellipse 60% 40% at 15% 70%, hsl(220 75% 45% / ${baseOpacity * 0.08}), transparent)
      `;
    case 'minimal':
      return `
        radial-gradient(ellipse 100% 60% at 50% -10%, hsl(0 0% 0% / ${baseOpacity * 0.05}), transparent)
      `;
    case 'none':
      return 'none';
    case 'default':
    default:
      return `
        radial-gradient(ellipse 100% 60% at 50% -10%, hsl(var(--primary) / ${baseOpacity * 0.12}), transparent),
        radial-gradient(ellipse 70% 50% at 85% 50%, hsl(var(--accent) / ${baseOpacity * 0.08}), transparent),
        radial-gradient(ellipse 60% 40% at 15% 70%, hsl(var(--primary) / ${baseOpacity * 0.05}), transparent)
      `;
  }
}
