import { useState, useEffect, useRef } from 'react';

const CACHE_NAME = 'teleprompter-audio-v1';

/**
 * Buffers remote audio into memory (and optionally Cache API) before playback.
 * Prevents mid-recitation stuttering or stopping due to network issues.
 */
export function useBufferedAudio(sourceUrl: string | null) {
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferingError, setBufferingError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!sourceUrl) {
      setPlaybackUrl(null);
      setIsBuffering(false);
      setBufferingError(null);
      return;
    }

    // Skip invalid URLs (UUID, malformed) - prevents "Invalid URI" when audio_url is wrong
    if (!/^(https?:|\/|blob:|data:)/.test(sourceUrl)) {
      setPlaybackUrl(null);
      setIsBuffering(false);
      setBufferingError('Invalid audio URL');
      return;
    }

    // Skip buffering for already-local URLs (blob, data)
    if (sourceUrl.startsWith('blob:') || sourceUrl.startsWith('data:')) {
      setPlaybackUrl(sourceUrl);
      setIsBuffering(false);
      setBufferingError(null);
      return;
    }

    let cancelled = false;
    abortRef.current = new AbortController();

    const run = async () => {
      setIsBuffering(true);
      setBufferingError(null);
      setPlaybackUrl(null);

      try {
        let blob: Blob | null = null;

        // Try Cache API first (fast for repeated plays)
        if ('caches' in window) {
          try {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(sourceUrl);
            if (cached) {
              blob = await cached.blob();
              if (cancelled) return;
            }
          } catch {
            // Cache miss or error - continue to fetch
          }
        }

        // Fetch if not from cache
        if (!blob) {
          const res = await fetch(sourceUrl, {
            signal: abortRef.current?.signal,
            credentials: 'omit',
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          blob = await res.blob();
          if (cancelled) return;

          // Store in Cache API for next time
          if ('caches' in window && blob) {
            try {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(sourceUrl, new Response(blob, {
                headers: { 'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg' },
              }));
            } catch {
              // Ignore cache write errors
            }
          }
        }

        if (cancelled || !blob) return;

        // Revoke previous object URL
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }

        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setPlaybackUrl(url);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to load audio';
        setBufferingError(msg);
        setPlaybackUrl(null);
      } finally {
        if (!cancelled) {
          setIsBuffering(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setPlaybackUrl(null);
    };
  }, [sourceUrl]);

  return { playbackUrl, isBuffering, bufferingError };
}
