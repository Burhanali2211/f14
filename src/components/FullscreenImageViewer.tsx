import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FullscreenImageViewerProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export function FullscreenImageViewer({ src, alt, isOpen, onClose }: FullscreenImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  // Image dimensions and fit calculations
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [fitZoom, setFitZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  
  // Drag state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastPositionRef = useRef({ x: 0, y: 0 });
  
  // Touch state for pinch zoom
  const touchStartRef = useRef<{ distance: number; center: { x: number; y: number } } | null>(null);
  
  // Track previous rotation to detect changes
  const prevRotationRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  // Calculate fit zoom and minimum zoom based on image dimensions and viewport
  const calculateFitZoom = useCallback((imgWidth: number, imgHeight: number, rotation: number) => {
    if (!imageContainerRef.current || imgWidth === 0 || imgHeight === 0) return { fitZoom: 1, minZoom: 1 };
    
    const container = imageContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const viewportWidth = containerRect.width;
    const viewportHeight = containerRect.height;
    
    // Account for rotation - swap dimensions if rotated 90 or 270 degrees
    const isRotated = rotation === 90 || rotation === 270;
    const effectiveImgWidth = isRotated ? imgHeight : imgWidth;
    const effectiveImgHeight = isRotated ? imgWidth : imgHeight;
    
    // Calculate zoom to fit viewport (contain mode - no cropping)
    const scaleX = viewportWidth / effectiveImgWidth;
    const scaleY = viewportHeight / effectiveImgHeight;
    const fitZoomValue = Math.min(scaleX, scaleY);
    
    // Minimum zoom: ensure image fills at least 80% of the smaller viewport dimension
    // This prevents images from being too small while still allowing some zoom out
    const minZoomValue = Math.min(scaleX, scaleY) * 0.8;
    
    return { fitZoom: fitZoomValue, minZoom: Math.max(minZoomValue, 0.5) };
  }, []);

  // Update fit calculations when image dimensions or rotation changes
  useEffect(() => {
    if (imageDimensions.width > 0 && imageDimensions.height > 0) {
      const { fitZoom: newFitZoom, minZoom: newMinZoom } = calculateFitZoom(
        imageDimensions.width,
        imageDimensions.height,
        rotation
      );
      setFitZoom(newFitZoom);
      setMinZoom(newMinZoom);
      
      const rotationChanged = prevRotationRef.current !== rotation;
      prevRotationRef.current = rotation;
      
      // On initial load or when rotation changes, set to fit
      if (isInitialLoadRef.current || rotationChanged) {
        setZoom(newFitZoom);
        setPosition({ x: 0, y: 0 });
        isInitialLoadRef.current = false;
      } else {
        // Ensure zoom is within valid range and adjust position
        setZoom(prev => {
          if (prev < newMinZoom) {
            setPosition({ x: 0, y: 0 });
            return newMinZoom;
          }
          if (prev <= newFitZoom) {
            setPosition({ x: 0, y: 0 });
          }
          return prev;
        });
      }
    }
  }, [imageDimensions.width, imageDimensions.height, rotation, calculateFitZoom]);

  // Recalculate on window resize
  useEffect(() => {
    if (!isOpen) return;
    
    const handleResize = () => {
      if (imageDimensions.width > 0 && imageDimensions.height > 0) {
        const { fitZoom: newFitZoom, minZoom: newMinZoom } = calculateFitZoom(
          imageDimensions.width,
          imageDimensions.height,
          rotation
        );
        setFitZoom(newFitZoom);
        setMinZoom(newMinZoom);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, imageDimensions, rotation, calculateFitZoom]);

  // Auto-hide controls after inactivity
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setControlsVisible(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  }, []);

  // Handle fullscreen API
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Disable body scrolling when image viewer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setIsLoading(true);
      setError(false);
      setControlsVisible(true);
      resetControlsTimeout();
      isDraggingRef.current = false;
      touchStartRef.current = null;
      isInitialLoadRef.current = true;
      prevRotationRef.current = 0;
      setImageDimensions({ width: 0, height: 0 });
      // Zoom will be set when image loads
    } else {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isOpen, resetControlsTimeout]);
  
  // Constrain position to image bounds (accounting for rotation)
  const constrainPosition = useCallback((x: number, y: number, currentZoom: number) => {
    if (!imageRef.current || !imageContainerRef.current || imageDimensions.width === 0) return { x: 0, y: 0 };
    
    const container = imageContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const viewportWidth = containerRect.width;
    const viewportHeight = containerRect.height;
    
    // Account for rotation
    const isRotated = rotation === 90 || rotation === 270;
    const effectiveImgWidth = isRotated ? imageDimensions.height : imageDimensions.width;
    const effectiveImgHeight = isRotated ? imageDimensions.height : imageDimensions.width;
    
    // Calculate scaled dimensions
    const scaledWidth = effectiveImgWidth * currentZoom;
    const scaledHeight = effectiveImgHeight * currentZoom;
    
    // Calculate bounds - only constrain if image is larger than viewport
    const maxX = Math.max(0, (scaledWidth - viewportWidth) / 2);
    const maxY = Math.max(0, (scaledHeight - viewportHeight) / 2);
    
    // Only constrain if zoomed in beyond fit
    if (currentZoom > fitZoom) {
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y))
      };
    }
    
    return { x: 0, y: 0 };
  }, [imageDimensions, rotation, fitZoom]);
  
  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    if (zoom <= fitZoom) return; // Only allow drag when zoomed beyond fit
    
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    lastPositionRef.current = { ...position };
    e.preventDefault();
    resetControlsTimeout();
  }, [zoom, fitZoom, position, resetControlsTimeout]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    
    const newX = lastPositionRef.current.x + deltaX;
    const newY = lastPositionRef.current.y + deltaY;
    
    const constrained = constrainPosition(newX, newY, zoom);
    setPosition(constrained);
  }, [zoom, constrainPosition]);
  
  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);
  
  // Touch handlers for drag and pinch zoom
  const getTouchDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  const getTouchCenter = (touches: TouchList): { x: number; y: number } => {
    if (touches.length === 0) return { x: 0, y: 0 };
    if (touches.length === 1) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  };
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && zoom > 1) {
      // Single touch - start drag
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastPositionRef.current = { ...position };
    } else if (e.touches.length === 2) {
      // Two touches - start pinch zoom
      const distance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      touchStartRef.current = { distance, center };
      isDraggingRef.current = false;
    }
    resetControlsTimeout();
  }, [zoom, position, resetControlsTimeout]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && isDraggingRef.current && zoom > fitZoom) {
      // Single touch drag - only when zoomed beyond fit
      const deltaX = e.touches[0].clientX - dragStartRef.current.x;
      const deltaY = e.touches[0].clientY - dragStartRef.current.y;
      
      const newX = lastPositionRef.current.x + deltaX;
      const newY = lastPositionRef.current.y + deltaY;
      
      const constrained = constrainPosition(newX, newY, zoom);
      setPosition(constrained);
    } else if (e.touches.length === 2 && touchStartRef.current) {
      // Pinch zoom
      const currentDistance = getTouchDistance(e.touches);
      const scaleChange = currentDistance / touchStartRef.current.distance;
      const newZoom = Math.max(minZoom, Math.min(5, zoom * scaleChange));
      
      if (newZoom !== zoom) {
        setZoom(newZoom);
        // Reset position when zoom changes to fit or below
        if (newZoom <= fitZoom) {
          setPosition({ x: 0, y: 0 });
        } else {
          // Constrain position after zoom
          const constrained = constrainPosition(position.x, position.y, newZoom);
          setPosition(constrained);
        }
      }
      
      touchStartRef.current.distance = currentDistance;
    }
  }, [zoom, fitZoom, minZoom, position, constrainPosition]);
  
  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
    if (touchStartRef.current) {
      touchStartRef.current = null;
    }
  }, []);
  
  // Global mouse event listeners for drag
  useEffect(() => {
    if (!isOpen) return;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        handleMouseMove(e);
      }
    };
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        handleMouseUp();
      }
    };
    
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isOpen, handleMouseMove, handleMouseUp]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen();
          } else {
            onClose();
          }
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoom(prev => {
            const newZoom = Math.min(5, prev + 0.25);
            if (newZoom > fitZoom) {
              const constrained = constrainPosition(position.x, position.y, newZoom);
              setPosition(constrained);
            }
            return newZoom;
          });
          break;
        case '-':
          e.preventDefault();
          setZoom(prev => {
            const newZoom = Math.max(minZoom, prev - 0.25);
            if (newZoom <= fitZoom) {
              setPosition({ x: 0, y: 0 });
            } else {
              const constrained = constrainPosition(position.x, position.y, newZoom);
              setPosition(constrained);
            }
            return newZoom;
          });
          break;
        case '0':
          e.preventDefault();
          setZoom(fitZoom);
          setRotation(0);
          setPosition({ x: 0, y: 0 });
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          setRotation(prev => {
            const newRotation = (prev + 90) % 360;
            // Reset position when rotating
            setPosition({ x: 0, y: 0 });
            return newRotation;
          });
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, onClose, toggleFullscreen]);

  // Handle tap/click to toggle controls (but not when dragging)
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDraggingRef.current) {
      setControlsVisible(prev => !prev);
      resetControlsTimeout();
    }
  }, [resetControlsTimeout]);

  // Wheel zoom with position reset
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => {
        const newZoom = Math.max(minZoom, Math.min(5, prev + delta));
        // Reset position when zooming out to fit or below
        if (newZoom <= fitZoom) {
          setPosition({ x: 0, y: 0 });
        } else {
          // Constrain position after zoom
          const constrained = constrainPosition(position.x, position.y, newZoom);
          setPosition(constrained);
        }
        return newZoom;
      });
      resetControlsTimeout();
    }
  }, [minZoom, fitZoom, position, constrainPosition, resetControlsTimeout]);

  // Download image
  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = alt || 'image';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  }, [src, alt]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm"
      onClick={handleContainerClick}
      onWheel={handleWheel}
      style={{ touchAction: 'none' }}
    >
      {/* Image Container - Centered with proper fit */}
      <div 
        ref={imageContainerRef}
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{
          padding: 0,
          margin: 0,
        }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-white text-center">
              <p className="text-lg mb-2">Failed to load image</p>
              <Button variant="outline" onClick={onClose} className="text-white border-white/50">
                Close
              </Button>
            </div>
          </div>
        )}
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200 ${zoom > fitZoom ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
          style={{
            width: imageDimensions.width > 0 ? `${imageDimensions.width}px` : 'auto',
            height: imageDimensions.height > 0 ? `${imageDimensions.height}px` : 'auto',
            maxWidth: 'none',
            maxHeight: 'none',
            objectFit: 'contain',
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            userSelect: 'none',
            WebkitUserDrag: 'none',
            touchAction: 'none',
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onLoad={(e) => {
            const img = e.currentTarget;
            const naturalWidth = img.naturalWidth;
            const naturalHeight = img.naturalHeight;
            
            // Set dimensions first - useEffect will calculate fit zoom
            setImageDimensions({ width: naturalWidth, height: naturalHeight });
            setIsLoading(false);
            setRotation(0);
            setPosition({ x: 0, y: 0 });
          }}
          onError={() => {
            setIsLoading(false);
            setError(true);
          }}
          draggable={false}
        />
      </div>

      {/* Controls */}
      <div 
        className={`absolute bottom-4 left-4 right-4 md:bottom-auto md:left-auto md:top-4 md:right-4 flex items-center gap-1.5 md:gap-2 bg-black/80 backdrop-blur-md rounded-lg p-1.5 md:p-2 border border-white/10 transition-all duration-300 max-w-full ${
          controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
        onMouseEnter={resetControlsTimeout}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap justify-center w-full md:w-auto">
          {/* Zoom Controls */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-8 w-8 md:h-9 md:w-9 touch-manipulation"
            onClick={() => {
              setZoom(prev => {
                const newZoom = Math.max(minZoom, prev - 0.25);
                if (newZoom <= fitZoom) {
                  setPosition({ x: 0, y: 0 });
                } else {
                  const constrained = constrainPosition(position.x, position.y, newZoom);
                  setPosition(constrained);
                }
                return newZoom;
              });
              resetControlsTimeout();
            }}
            disabled={zoom <= minZoom}
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-white text-xs md:text-sm min-w-[50px] md:min-w-[60px] text-center font-medium hidden sm:inline">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-8 w-8 md:h-9 md:w-9 touch-manipulation"
            onClick={() => {
              setZoom(prev => {
                const newZoom = Math.min(5, prev + 0.25);
                if (newZoom > fitZoom) {
                  const constrained = constrainPosition(position.x, position.y, newZoom);
                  setPosition(constrained);
                }
                return newZoom;
              });
              resetControlsTimeout();
            }}
            disabled={zoom >= 5}
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>

          <div className="w-px h-5 md:h-6 bg-white/30 mx-0.5 md:mx-1" />

          {/* Reset */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-8 w-8 md:h-9 md:w-9 touch-manipulation"
            onClick={() => {
              setZoom(fitZoom);
              setRotation(0);
              setPosition({ x: 0, y: 0 });
              resetControlsTimeout();
            }}
            title="Reset (0)"
          >
            <RotateCw className="w-4 h-4" />
          </Button>

          <div className="w-px h-5 md:h-6 bg-white/30 mx-0.5 md:mx-1" />

          {/* Rotate */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-8 w-8 md:h-9 md:w-9 touch-manipulation"
            onClick={() => {
              setRotation(prev => {
                const newRotation = (prev + 90) % 360;
                // Reset position when rotating
                setPosition({ x: 0, y: 0 });
                return newRotation;
              });
              resetControlsTimeout();
            }}
            title="Rotate (R)"
          >
            <RotateCw className="w-4 h-4" />
          </Button>

          {/* Desktop-only: Fullscreen and Download */}
          <div className="hidden md:contents">
            <div className="w-px h-6 bg-white/30 mx-1" />
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-9 w-9"
              onClick={() => {
                toggleFullscreen();
                resetControlsTimeout();
              }}
              title="Toggle Fullscreen (F)"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
            <div className="w-px h-6 bg-white/30 mx-1" />
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-9 w-9"
              onClick={() => {
                handleDownload();
                resetControlsTimeout();
              }}
              title="Download"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>

          <div className="w-px h-5 md:h-6 bg-white/30 mx-0.5 md:mx-1" />

          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-8 w-8 md:h-9 md:w-9 touch-manipulation"
            onClick={() => {
              onClose();
              resetControlsTimeout();
            }}
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mobile Instructions */}
      <div className={`absolute bottom-16 left-4 right-4 md:hidden transition-all duration-300 ${
        controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}>
        <div className="bg-black/70 backdrop-blur-md rounded-lg p-2.5 border border-white/10 text-white text-xs">
          <p className="font-medium mb-1">Touch Gestures:</p>
          <p>• Pinch to zoom • Drag to pan • Tap image to show/hide controls</p>
        </div>
      </div>

      {/* Desktop Instructions */}
      <div className={`absolute bottom-4 left-4 hidden md:block transition-all duration-300 ${
        controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}>
        <div className="bg-black/70 backdrop-blur-md rounded-lg p-3 border border-white/10 text-white text-xs">
          <p className="font-medium mb-1">Keyboard Shortcuts:</p>
          <p>+/- Zoom | 0 Reset | R Rotate | F Fullscreen | Esc Close</p>
          <p className="mt-1 text-white/70">Click image to toggle controls</p>
        </div>
      </div>
    </div>
  );
}
