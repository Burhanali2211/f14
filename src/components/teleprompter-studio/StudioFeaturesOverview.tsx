import { Upload, Image as ImageIcon, FileText, Monitor, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: Upload,
    title: 'Upload content',
    description: 'Add images, PDFs, and audio files. Drag and drop or choose files.',
  },
  {
    icon: ImageIcon,
    title: 'Image / PDF segment editor',
    description: 'Create regions on images or PDF pages synced with audio playback.',
  },
  {
    icon: FileText,
    title: 'Text segment editor',
    description: 'Create text segments synced with audio for the teleprompter.',
  },
  {
    icon: Monitor,
    title: 'Teleprompter playback',
    description: 'Display content in sync with audio. Use 36–48pt font for readability.',
  },
  {
    icon: WifiOff,
    title: 'Works offline',
    description: 'Drafts save locally and sync when you are back online.',
  },
] as const;

export function StudioFeaturesOverview() {
  return (
    <section aria-labelledby="studio-features-heading" className="max-w-2xl mx-auto w-full">
      <h2 id="studio-features-heading" className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
        What you can do
      </h2>
      <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className={cn(
                'flex gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border border-border bg-card',
                'hover:border-primary/30 transition-colors'
              )}
            >
              <div
                className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"
                aria-hidden
              >
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-medium text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
