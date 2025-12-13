import { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, 
  Repeat, Repeat1, Music, Timer, Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSettings } from '@/hooks/use-settings';
import { isYouTubeUrl, getYouTubeId, getAudioUrl, mightHaveCorsIssues } from '@/lib/youtube-audio';

// YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface EnhancedAudioPlayerProps {
  src: string;
  title?: string;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
}

export function EnhancedAudioPlayer({ 
  src, 
  title, 
  onTimeUpdate,
  onEnded 
}: EnhancedAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const youtubePlayerRef = useRef<any>(null);
  const { settings, updateSetting } = useSettings();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(true);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout>();
  const [audioError, setAudioError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isYouTube = isYouTubeUrl(src);
  const youtubeId = isYouTube ? getYouTubeId(src) : null;
  
  // Get the best audio URL (with proxy if needed for external sources)
  const audioSrc = isYouTube ? src : getAudioUrl(src, true);

  // Load YouTube IFrame API for YouTube URLs
  useEffect(() => {
    if (!isYouTube || !youtubeId) return;

    const playerId = `youtube-player-${youtubeId}`;
    let interval: NodeJS.Timeout | null = null;

    const initPlayer = () => {
      // Wait a bit to ensure container is in DOM
      const checkAndInit = () => {
        if (youtubePlayerRef.current) {
          try {
            youtubePlayerRef.current.destroy();
          } catch (e) {
            // Ignore destroy errors
          }
        }

        // Ensure container exists - create it in body if not found
        let container = document.getElementById(playerId);
        if (!container) {
          const containerParent = document.getElementById(`youtube-player-container-${youtubeId}`);
          if (containerParent) {
            // Container parent exists, create the player div
            container = document.createElement('div');
            container.id = playerId;
            container.style.width = '320px';
            container.style.height = '240px';
            container.style.minWidth = '320px';
            container.style.minHeight = '240px';
            container.style.pointerEvents = 'none';
            containerParent.appendChild(container);
          } else {
            // Retry if container not found yet
            setTimeout(checkAndInit, 100);
            return;
          }
        }

        try {
          youtubePlayerRef.current = new window.YT.Player(playerId, {
            videoId: youtubeId,
            playerVars: {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              enablejsapi: 1,
              fs: 0,
              iv_load_policy: 3,
              modestbranding: 1,
              playsinline: 1,
              rel: 0,
              showinfo: 0,
              origin: window.location.origin,
            },
            events: {
              onReady: (event: any) => {
                try {
                  const player = event.target;
                  const duration = player.getDuration();
                  if (duration && isFinite(duration)) {
                    setDuration(duration);
                  }
                  setIsLoading(false);
                  setAudioError(null);
                  
                  // Set initial volume and playback speed
                  player.setVolume(volume * 100);
                  if (isMuted) {
                    player.mute();
                  }
                  // Set playback speed if player supports it
                  try {
                    player.setPlaybackRate(settings.playbackSpeed);
                  } catch (e) {
                    console.warn('Could not set initial playback speed:', e);
                  }
                } catch (e) {
                  console.error('Error in onReady:', e);
                  setIsLoading(false);
                }
              },
              onStateChange: (event: any) => {
                try {
                  const state = event.data;
                  const player = event.target;
                  
                  if (state === window.YT.PlayerState.PLAYING) {
                    setIsPlaying(true);
                    setIsLoading(false);
                  } else if (state === window.YT.PlayerState.PAUSED) {
                    // Check if this was an unexpected pause (during scroll, etc.)
                    // Only auto-resume if we're scrolling or page was hidden
                    const isScrolling = window.scrollY > 0;
                    const wasUnexpectedPause = (isScrolling || document.hidden) && isPlaying;
                    
                    if (wasUnexpectedPause) {
                      // Likely an unexpected pause - resume it after a short delay
                      setTimeout(() => {
                        try {
                          if (youtubePlayerRef.current && typeof youtubePlayerRef.current.playVideo === 'function') {
                            youtubePlayerRef.current.playVideo();
                          }
                        } catch (e) {
                          // Ignore errors
                        }
                      }, 200);
                      // Don't update isPlaying state - keep it as playing
                    } else {
                      // User-initiated pause - update state
                      setIsPlaying(false);
                    }
                    setIsLoading(false);
                  } else if (state === window.YT.PlayerState.ENDED) {
                    setIsPlaying(false);
                    setIsLoading(false);
                    // Handle repeat modes
                    if (settings.repeatMode === 'one') {
                      // Repeat current track
                      setTimeout(() => {
                        try {
                          player.seekTo(0);
                          player.playVideo();
                        } catch (e) {
                          console.error('Error repeating track:', e);
                        }
                      }, 100);
                    } else if (settings.repeatMode === 'all') {
                      // Repeat all - trigger onEnded to play next
                      onEnded?.();
                    } else {
                      // No repeat - just end
                      onEnded?.();
                    }
                  } else if (state === window.YT.PlayerState.BUFFERING) {
                    setIsLoading(true);
                  } else if (state === window.YT.PlayerState.CUED) {
                    setIsLoading(false);
                  } else if (state === window.YT.PlayerState.UNSTARTED) {
                    setIsLoading(true);
                  }
                  
                  // State change handled above
                } catch (e) {
                  console.error('Error in onStateChange:', e);
                }
              },
              onError: (event: any) => {
                const errorCode = event.data;
                console.error('YouTube player error:', errorCode);
                setIsLoading(false);
                
                let errorMessage = 'Failed to load YouTube video.';
                switch (errorCode) {
                  case 2:
                    errorMessage = 'Invalid YouTube URL.';
                    break;
                  case 5:
                    errorMessage = 'HTML5 player error.';
                    break;
                  case 100:
                    errorMessage = 'Video not found or unavailable.';
                    break;
                  case 101:
                  case 150:
                    errorMessage = 'Video cannot be played in embedded players.';
                    break;
                  default:
                    errorMessage = `YouTube error (${errorCode}). The video may be unavailable or restricted.`;
                }
                
                setAudioError(errorMessage);
              },
            },
          });

          // Update time for YouTube player and aggressively maintain playback
          interval = setInterval(() => {
            if (youtubePlayerRef.current) {
              try {
                const playerState = youtubePlayerRef.current.getPlayerState();
                if (playerState === window.YT.PlayerState.PLAYING) {
                  const time = youtubePlayerRef.current.getCurrentTime();
                  if (time !== null && isFinite(time) && time >= 0) {
                    setCurrentTime(time);
                    onTimeUpdate?.(time);
                  }
                } else if (playerState === window.YT.PlayerState.PAUSED && isPlaying) {
                  // Player was paused but we expect it to be playing - resume it
                  // Only resume if PAUSED, not CUED (CUED will auto-play when ready)
                  try {
                    youtubePlayerRef.current.playVideo();
                    // Also ensure volume is set (sometimes gets reset)
                    if (typeof youtubePlayerRef.current.setVolume === 'function') {
                      youtubePlayerRef.current.setVolume(volume * 100);
                    }
                    if (isMuted && typeof youtubePlayerRef.current.mute === 'function') {
                      youtubePlayerRef.current.mute();
                    }
                  } catch (e) {
                    // Ignore errors
                  }
                }
                // Don't sync state here - let onStateChange handle it
              } catch (e) {
                // Player might not be ready - ignore errors silently
              }
            }
          }, 250); // Update every 250ms for smooth progress
        } catch (e) {
          console.error('Error creating YouTube player:', e);
          setIsLoading(false);
          setAudioError('Failed to create YouTube player');
        }
      };
      
      // Initial check with delay to ensure DOM is ready
      setTimeout(checkAndInit, 200);
    };

    // Load YouTube IFrame API script if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      const originalCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (originalCallback) originalCallback();
        initPlayer();
      };
    } else {
      // API already loaded, create player immediately
      initPlayer();
    }

    return () => {
      if (interval) clearInterval(interval);
      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors
        }
        youtubePlayerRef.current = null;
      }
    };
  }, [isYouTube, youtubeId, settings.repeatMode, onTimeUpdate, onEnded, volume, isMuted]);

  useEffect(() => {
    if (isYouTube) return; // Skip audio setup for YouTube URLs

    const audio = audioRef.current;
    if (!audio) return;

    // Set the audio source
    audio.src = audioSrc;
    audio.playbackRate = settings.playbackSpeed;
    setAudioError(null);
    setIsLoading(true);

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };
    const updateDuration = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      // Handle repeat modes
      if (settings.repeatMode === 'one') {
        // Repeat current track
        audio.currentTime = 0;
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch(e => {
          console.error('Error repeating audio:', e);
        });
      } else if (settings.repeatMode === 'all') {
        // Repeat all - trigger onEnded to play next
        onEnded?.();
      } else {
        // No repeat - just end
        onEnded?.();
      }
    };
    const handleCanPlay = () => {
      setIsLoading(false);
      setAudioError(null);
    };
    const handleWaiting = () => setIsLoading(true);
    
    const handleError = () => {
      setIsLoading(false);
      const error = audio.error;
      let errorMessage = 'Failed to load audio';
      
      if (error) {
        switch (error.code) {
          case error.MEDIA_ERR_ABORTED:
            errorMessage = 'Audio loading aborted';
            break;
          case error.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error. Trying proxy...';
            // Retry with proxy if not already using it
            if (retryCount === 0 && mightHaveCorsIssues(src) && !audioSrc.includes('audio-proxy')) {
              setRetryCount(1);
              audio.src = getAudioUrl(src, true);
              audio.load();
              return;
            }
            break;
          case error.MEDIA_ERR_DECODE:
            errorMessage = 'Audio format not supported';
            break;
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Audio source not supported';
            break;
        }
      }
      
      setAudioError(errorMessage);
      console.error('Audio error:', error);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('error', handleError);

    // Load the audio
    audio.load();

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('error', handleError);
    };
  }, [settings.repeatMode, settings.playbackSpeed, onTimeUpdate, onEnded, isYouTube, audioSrc, src, retryCount]);

  useEffect(() => {
    if (isYouTube && youtubePlayerRef.current) {
      try {
        const playerState = youtubePlayerRef.current.getPlayerState();
        // Only set playback rate if player is ready
        if (playerState !== window.YT.PlayerState.UNSTARTED) {
          youtubePlayerRef.current.setPlaybackRate(settings.playbackSpeed);
        }
      } catch (e) {
        console.warn('Could not set YouTube playback speed:', e);
      }
    } else if (audioRef.current) {
      audioRef.current.playbackRate = settings.playbackSpeed;
    }
  }, [settings.playbackSpeed, isYouTube]);

  useEffect(() => {
    if (sleepTimer && isPlaying) {
      sleepTimerRef.current = setTimeout(() => {
        if (isYouTube && youtubePlayerRef.current) {
          try {
            youtubePlayerRef.current.pauseVideo();
          } catch (e) {
            // Ignore errors
          }
        } else if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
        setSleepTimer(null);
      }, sleepTimer * 60 * 1000);
    }

    return () => {
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
      }
    };
  }, [sleepTimer, isPlaying, isYouTube]);

  // Ensure audio continues playing when page visibility changes (only when tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only resume if page becomes visible AND we were playing AND player is paused
      // Don't interfere with normal playback
      if (!document.hidden && isPlaying) {
        // Small delay to let browser settle
        setTimeout(() => {
          if (isYouTube && youtubePlayerRef.current) {
            try {
              const playerState = youtubePlayerRef.current.getPlayerState();
              // Only resume if actually paused (not playing or buffering)
              if (playerState === window.YT.PlayerState.PAUSED && isPlaying) {
                youtubePlayerRef.current.playVideo();
              }
            } catch (e) {
              // Ignore errors - player might not be ready
            }
          } else if (audioRef.current) {
            // For regular audio, only resume if actually paused
            if (audioRef.current.paused && isPlaying && !audioRef.current.ended) {
              audioRef.current.play().catch(e => {
                // Ignore autoplay policy errors
                if (e.name !== 'NotAllowedError') {
                  console.warn('Could not resume audio playback:', e);
                }
              });
            }
          }
        }, 200);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, isYouTube]);

  // Maintain playback during scroll - only resume if actually paused (not CUED)
  useEffect(() => {
    if (!isPlaying || !isYouTube) return;
    
    const playbackMaintainer = setInterval(() => {
      if (!isPlaying) return;
      
      if (youtubePlayerRef.current && typeof youtubePlayerRef.current.getPlayerState === 'function') {
        try {
          const playerState = youtubePlayerRef.current.getPlayerState();
          
          // Only resume if actually PAUSED - don't touch CUED state (it will auto-play)
          // CUED (5) means the video is loaded and ready, calling playVideo() on it causes reload
          if (playerState === window.YT.PlayerState.PAUSED) {
            try {
              youtubePlayerRef.current.playVideo();
            } catch (e) {
              // Ignore errors
            }
          }
        } catch (e) {
          // Player not ready - ignore silently
        }
      }
    }, 1000); // Check every 1 second (less aggressive)
    
    return () => clearInterval(playbackMaintainer);
  }, [isPlaying, isYouTube]);

  const togglePlay = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isYouTube && youtubePlayerRef.current) {
      try {
        const playerState = youtubePlayerRef.current.getPlayerState();
        
        if (playerState === window.YT.PlayerState.PLAYING) {
          youtubePlayerRef.current.pauseVideo();
          setIsPlaying(false);
        } else {
          // Ensure player is ready before playing
          if (playerState === window.YT.PlayerState.UNSTARTED || 
              playerState === window.YT.PlayerState.CUED) {
            // Load video first if not loaded
            youtubePlayerRef.current.loadVideoById(youtubeId);
            // Wait a bit then play
            setTimeout(() => {
              youtubePlayerRef.current.playVideo();
            }, 100);
          } else {
            youtubePlayerRef.current.playVideo();
          }
          setIsPlaying(true);
        }
      } catch (e) {
        console.error('Error toggling YouTube play:', e);
        setAudioError('Failed to control playback: ' + (e as Error).message);
      }
    } else if (audioRef.current) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          await audioRef.current.play();
          setIsPlaying(true);
        }
      } catch (e) {
        console.error('Error toggling audio play:', e);
        setAudioError('Failed to play audio');
      }
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isYouTube && youtubePlayerRef.current) {
      if (isMuted) {
        youtubePlayerRef.current.unMute();
      } else {
        youtubePlayerRef.current.mute();
      }
      setIsMuted(!isMuted);
    } else if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (value: number[]) => {
    if (isYouTube && youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(value[0], true);
      setCurrentTime(value[0]);
    } else if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (isYouTube && youtubePlayerRef.current) {
      youtubePlayerRef.current.setVolume(value[0] * 100);
      setVolume(value[0]);
      if (value[0] > 0 && isMuted) {
        setIsMuted(false);
        youtubePlayerRef.current.unMute();
      }
    } else if (audioRef.current) {
      audioRef.current.volume = value[0];
      setVolume(value[0]);
      if (value[0] > 0 && isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
      }
    }
  };

  const skip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    if (isYouTube && youtubePlayerRef.current) {
      try {
        youtubePlayerRef.current.seekTo(newTime, true);
        setCurrentTime(newTime);
      } catch (e) {
        console.error('Error seeking YouTube:', e);
      }
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const skipForward10 = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    skip(10);
  };
  const skipBackward5 = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    skip(-5);
  };

  const toggleRepeat = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(settings.repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    updateSetting('repeatMode', nextMode);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Prevent form submissions and page reloads from this component
  useEffect(() => {
    const handleSubmit = (e: SubmitEvent) => {
      const target = e.target as HTMLElement;
      const audioPlayerContainer = target.closest('.bg-gradient-to-br.from-primary\\/5');
      if (audioPlayerContainer) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Prevent accidental page reloads
    };
    
    document.addEventListener('submit', handleSubmit, true);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('submit', handleSubmit, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <div 
      className="bg-gradient-to-br from-primary/5 via-card to-accent/5 rounded-2xl p-5 shadow-card border border-border/50 relative"
      style={{ 
        // Ensure audio player stays in viewport context
        position: 'relative',
        zIndex: 1
      }}
    >
      {!isYouTube && (
        <audio 
          ref={audioRef} 
          preload="metadata" 
          crossOrigin="anonymous"
          // Ensure audio continues playing even when not visible
          style={{ display: 'none' }}
        />
      )}
      {isYouTube && youtubeId && (
        <div 
          id={`youtube-player-container-${youtubeId}`}
          className="fixed opacity-0 pointer-events-none"
          style={{ 
            position: 'fixed', 
            top: '-9999px', 
            left: '-9999px',
            width: '320px', 
            height: '240px',
            overflow: 'hidden',
            zIndex: -9999,
            isolation: 'isolate',
            willChange: 'auto',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
          }}
          aria-hidden="true"
          onScroll={(e) => {
            // Prevent any scroll events from affecting the player
            e.stopPropagation();
          }}
          onWheel={(e) => {
            // Prevent wheel events
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            // Prevent touch events
            e.stopPropagation();
          }}
        >
          <div 
            id={`youtube-player-${youtubeId}`} 
            style={{ 
              width: '320px', 
              height: '240px',
              minWidth: '320px',
              minHeight: '240px',
              pointerEvents: 'none',
              willChange: 'auto'
            }} 
          />
        </div>
      )}
      
      {/* Error Message */}
      {audioError && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{audioError}</p>
          {retryCount === 0 && mightHaveCorsIssues(src) && !isYouTube && (
            <p className="text-xs text-muted-foreground mt-1">
              Trying alternative method...
            </p>
          )}
        </div>
      )}

      {/* Loading Message for YouTube */}
      {isYouTube && isLoading && !audioError && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <p className="text-sm text-primary">Loading YouTube audio...</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Music className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{title || 'Audio'}</p>
            <p className="text-xs text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(duration)}
            </p>
          </div>
        </div>

        {/* Speed & Timer Controls */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs">
                {settings.playbackSpeed}x
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <div className="space-y-2">
                <p className="text-sm font-medium">Playback Speed</p>
                <div className="grid grid-cols-4 gap-1">
                  {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                    <Button
                      key={speed}
                      type="button"
                      variant={settings.playbackSpeed === speed ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        updateSetting('playbackSpeed', speed);
                      }}
                    >
                      {speed}x
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button 
                type="button"
                variant="ghost" 
                size="icon" 
                className={`h-8 w-8 ${sleepTimer ? 'text-primary' : ''}`}
              >
                <Timer className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <div className="space-y-2">
                <p className="text-sm font-medium">Sleep Timer</p>
                <div className="grid grid-cols-3 gap-1">
                  {[5, 10, 15, 30, 45, 60].map((mins) => (
                    <Button
                      key={mins}
                      type="button"
                      variant={sleepTimer === mins ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        setSleepTimer(sleepTimer === mins ? null : mins);
                      }}
                    >
                      {mins}m
                    </Button>
                  ))}
                </div>
                {sleepTimer && (
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.stopImmediatePropagation();
                      setSleepTimer(null);
                    }}
                  >
                    Cancel Timer
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="absolute inset-0 cursor-pointer [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:opacity-0 hover:[&_[role=slider]]:opacity-100"
          />
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleRepeat}
            className={`h-9 w-9 ${settings.repeatMode !== 'none' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            {settings.repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={skipBackward5}
            className="h-10 px-3 flex flex-col items-center justify-center gap-0.5"
            title="Skip backward 5 seconds"
          >
            <SkipBack className="w-4 h-4" />
            <span className="text-[10px] leading-none text-muted-foreground font-medium">5s</span>
          </Button>
          
          <Button
            type="button"
            onClick={togglePlay}
            size="icon"
            disabled={isLoading}
            className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6 text-primary-foreground" />
            ) : (
              <Play className="w-6 h-6 text-primary-foreground ml-1" />
            )}
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={skipForward10}
            className="h-10 px-3 flex flex-col items-center justify-center gap-0.5"
            title="Skip forward 10 seconds"
          >
            <SkipForward className="w-4 h-4" />
            <span className="text-[10px] leading-none text-muted-foreground font-medium">10s</span>
          </Button>
        </div>
        
        {/* Volume */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="h-9 w-9"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.05}
            onValueChange={handleVolumeChange}
            className="w-20 hidden sm:flex"
          />
        </div>
      </div>
    </div>
  );
}
