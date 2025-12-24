import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Maximize2, Minimize2, RotateCw, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FullscreenImageViewerProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
  images?: string[];
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
}

export function FullscreenImageViewer({ 
  src, 
  alt, 
  isOpen, 
  onClose, 
  images, 
  currentIndex = 0, 
  onIndexChange 
}: FullscreenImageViewerProps) {
  const [internalIndex, setInternalIndex] = useState(currentIndex);
  const actualIndex = images && onIndexChange ? currentIndex : internalIndex;
  const actualSrc = images && images.length > 0 ? images[actualIndex] : src;
  const hasMultipleImages = images && images.length > 1;
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  // Image dimensions and fit calculations
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [fitZoom, setFitZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  
  // Zoom constraints
  const MAX_ZOOM = 5;
  const MIN_ZOOM_MULTIPLIER = 0.5; // Minimum zoom is 50% of fit zoom
  
  // Drag state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const mouseDownPositionRef = useRef({ x: 0, y: 0, time: 0 });
  const hasMovedRef = useRef(false);
  
  // Double tap/click detection
  const lastClickTimeRef = useRef(0);
  const clickCountRef = useRef(0);
  
  // Touch state for pinch zoom and tap detection
  const touchStartRef = useRef<{ distance: number; center: { x: number; y: number } } | null>(null);
  const initialTouchRef = useRef<{ x: number; y: number; time: number } | null>(null);
  
  // Track previous rotation to detect changes
  const prevRotationRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  
  // Track if we pushed a history state for back button handling
  const historyStatePushedRef = useRef(false);
  const isOpenRef = useRef(isOpen);

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
    
    // Minimum zoom: allow zooming out to 50% of fit zoom
    const minZoomValue = fitZoomValue * MIN_ZOOM_MULTIPLIER;
    
    return { fitZoom: fitZoomValue, minZoom: Math.max(minZoomValue, 0.3) };
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
    // Only auto-hide if controls are already visible
    // Don't auto-show controls - they should only show on double tap
    if (controlsVisible) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [controlsVisible]);

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

  // Update ref when isOpen changes
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Handle browser back button when image viewer is open
  useEffect(() => {
    if (isOpen) {
      // Push a state to history when opening the viewer
      // This allows us to intercept the back button
      window.history.pushState({ imageViewerOpen: true }, '');
      historyStatePushedRef.current = true;
      
      const handlePopState = () => {
        // When back button is pressed and viewer is open, close the viewer instead
        if (isOpenRef.current && historyStatePushedRef.current) {
          // Close the viewer
          onClose();
          // Push the state back to prevent navigation away from the page
          // Use requestAnimationFrame to ensure this happens after state updates
          requestAnimationFrame(() => {
            window.history.pushState({ imageViewerOpen: true }, '');
            historyStatePushedRef.current = true;
          });
        }
      };
      
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    } else {
      // When viewer closes normally, remove the history entry we added
      // Only if we actually pushed a state
      if (historyStatePushedRef.current && window.history.state?.imageViewerOpen) {
        window.history.back();
        historyStatePushedRef.current = false;
      }
    }
  }, [isOpen, onClose]);

  // Disable body scrolling and prevent wheel events when image viewer is open
  useEffect(() => {
    if (isOpen) {
      // Store original styles
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalWidth = document.body.style.width;
      const originalHeight = document.body.style.height;
      
      // Prevent scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      
      // Prevent wheel and touch events from scrolling the background
      // Only prevent if event is NOT on the image viewer container
      const handleWheel = (e: WheelEvent) => {
        const target = e.target as HTMLElement;
        // Only prevent default if event is outside the image viewer
        if (!containerRef.current?.contains(target)) {
          e.preventDefault();
        }
      };
      
      const handleTouchMove = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        // Only prevent default if event is outside the image viewer
        if (!containerRef.current?.contains(target)) {
          e.preventDefault();
        }
      };
      
      // Add listeners with capture: true to catch events early
      const options = { passive: false, capture: true };
      
      document.addEventListener('wheel', handleWheel, options);
      document.addEventListener('touchmove', handleTouchMove, options);
      window.addEventListener('wheel', handleWheel, options);
      window.addEventListener('touchmove', handleTouchMove, options);
      
      return () => {
        // Restore original styles
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = originalWidth;
        document.body.style.height = originalHeight;
        
        document.removeEventListener('wheel', handleWheel, options);
        document.removeEventListener('touchmove', handleTouchMove, options);
        window.removeEventListener('wheel', handleWheel, options);
        window.removeEventListener('touchmove', handleTouchMove, options);
      };
    }
  }, [isOpen]);


  // Update internal index when currentIndex prop changes
  useEffect(() => {
    if (images && onIndexChange) {
      setInternalIndex(currentIndex);
    }
  }, [currentIndex, images, onIndexChange]);

  // Reset on open and when src changes
  useEffect(() => {
    if (isOpen && actualSrc) {
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setIsLoading(true);
      setError(false);
      setControlsVisible(true);
      resetControlsTimeout();
      isDraggingRef.current = false;
      touchStartRef.current = null;
      initialTouchRef.current = null;
      hasMovedRef.current = false;
      mouseDownPositionRef.current = { x: 0, y: 0, time: 0 };
      lastClickTimeRef.current = 0;
      clickCountRef.current = 0;
      isInitialLoadRef.current = true;
      prevRotationRef.current = 0;
      setImageDimensions({ width: 0, height: 0 });
      
      // Clear any existing loading timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      
      // Check if image is already loaded (cached images might not trigger onLoad)
      // Use requestAnimationFrame to check after the image element is rendered
      const checkImageLoaded = () => {
        requestAnimationFrame(() => {
          if (imageRef.current && isOpen) {
            const img = imageRef.current;
            // Check if image is already complete (cached)
            if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
              // Image is already loaded, process it immediately
              setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
              setIsLoading(false);
              setError(false);
              if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
              }
              return;
            }
          }
          
          // If not loaded yet, set timeout
          if (isOpen) {
            loadingTimeoutRef.current = setTimeout(() => {
              if (isOpen) {
                setIsLoading(prev => {
                  if (prev) {
                    console.warn('Image loading timeout - stopping loader');
                    return false;
                  }
                  return prev;
                });
                setError(true);
              }
            }, 10000);
          }
        });
      };
      
      // Check after image element has a chance to render
      checkImageLoaded();
      
      // Zoom will be set when image loads
    } else if (!isOpen || !actualSrc) {
      // If no src or viewer is closed, stop loading immediately
      setIsLoading(false);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [isOpen, src, resetControlsTimeout]);
  
  // Simple position constraint - keep image within reasonable bounds
  const constrainPosition = useCallback((x: number, y: number, currentZoom: number) => {
    if (!imageRef.current || !imageContainerRef.current || imageDimensions.width === 0) return { x: 0, y: 0 };
    
    const container = imageContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const viewportWidth = containerRect.width;
    const viewportHeight = containerRect.height;
    
    // Account for rotation
    const isRotated = rotation === 90 || rotation === 270;
    const effectiveImgWidth = isRotated ? imageDimensions.height : imageDimensions.width;
    const effectiveImgHeight = isRotated ? imageDimensions.width : imageDimensions.height;
    
    const scaledWidth = effectiveImgWidth * currentZoom;
    const scaledHeight = effectiveImgHeight * currentZoom;
    
    // Simple bounds - allow panning when zoomed in
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    
    if (scaledWidth > viewportWidth) {
      const halfDiff = (scaledWidth - viewportWidth) / 2;
      minX = halfDiff;
      maxX = -halfDiff;
    }
    
    if (scaledHeight > viewportHeight) {
      const halfDiff = (scaledHeight - viewportHeight) / 2;
      minY = halfDiff;
      maxY = -halfDiff;
    }
    
    return {
      x: Math.max(maxX, Math.min(minX, x)),
      y: Math.max(maxY, Math.min(minY, y))
    };
  }, [imageDimensions, rotation]);
  
  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    
    // Store initial mouse position and time to detect clicks vs drags
    mouseDownPositionRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    hasMovedRef.current = false;
    
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    lastPositionRef.current = { ...position };
    e.preventDefault();
    resetControlsTimeout();
  }, [position, resetControlsTimeout]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    
    // Check if mouse has moved significantly (more than 5px) to distinguish drag from click
    const deltaX = e.clientX - mouseDownPositionRef.current.x;
    const deltaY = e.clientY - mouseDownPositionRef.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance > 5) {
      hasMovedRef.current = true;
    }
    
    // Calculate delta from the last mouse position (not from the initial start)
    // This ensures 1:1 movement ratio - image moves exactly as much as mouse moves
    const dragDeltaX = e.clientX - dragStartRef.current.x;
    const dragDeltaY = e.clientY - dragStartRef.current.y;
    
    // Add delta to the last known position
    const newX = lastPositionRef.current.x + dragDeltaX;
    const newY = lastPositionRef.current.y + dragDeltaY;
    
    // Constrain the position
    const constrained = constrainPosition(newX, newY, zoom);
    setPosition(constrained);
    
    // Update references for next move event
    // Update lastPositionRef to the constrained position
    lastPositionRef.current = constrained;
    // Update dragStartRef to current mouse position so next delta is relative to here
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  }, [zoom, constrainPosition]);
  
  const handleMouseUp = useCallback(() => {
    const wasDragging = isDraggingRef.current;
    const wasClick = !hasMovedRef.current;
    
    isDraggingRef.current = false;
    
    // Double click detection for showing controls
    if (wasDragging && wasClick) {
      const timeSinceDown = Date.now() - mouseDownPositionRef.current.time;
      if (timeSinceDown < 300) {
        const now = Date.now();
        const timeSinceLastClick = now - lastClickTimeRef.current;
        
        // If clicked within 300ms of last click, it's a double click
        if (timeSinceLastClick < 300 && clickCountRef.current > 0) {
          // Double click - show controls
          setControlsVisible(true);
          resetControlsTimeout();
          clickCountRef.current = 0;
        } else {
          // Single click - don't toggle, just track for double click
          clickCountRef.current = 1;
          lastClickTimeRef.current = now;
          
          // Hide controls on single click if they're visible
          if (controlsVisible) {
            setControlsVisible(false);
          }
        }
      }
    }
    
    // Reset movement tracking
    hasMovedRef.current = false;
  }, [resetControlsTimeout, controlsVisible]);
  
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
    e.preventDefault();
    e.stopPropagation();
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      // Store initial touch for tap detection
      initialTouchRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      
      // Single touch - start drag
      isDraggingRef.current = true;
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
      lastPositionRef.current = { ...position };
    } else if (e.touches.length === 2) {
      // Two touches - start pinch zoom
      const distance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      touchStartRef.current = { distance, center };
      isDraggingRef.current = false;
      initialTouchRef.current = null;
    }
    resetControlsTimeout();
  }, [position, resetControlsTimeout]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.touches.length === 1 && isDraggingRef.current) {
      // Single touch drag
      const deltaX = e.touches[0].clientX - dragStartRef.current.x;
      const deltaY = e.touches[0].clientY - dragStartRef.current.y;
      
      const newX = lastPositionRef.current.x + deltaX;
      const newY = lastPositionRef.current.y + deltaY;
      
      const constrained = constrainPosition(newX, newY, zoom);
      setPosition(constrained);
      
      lastPositionRef.current = constrained;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && touchStartRef.current) {
      // Pinch zoom
      const currentDistance = getTouchDistance(e.touches);
      
      if (touchStartRef.current.distance > 0 && currentDistance > 0) {
        const scaleChange = currentDistance / touchStartRef.current.distance;
        const newZoom = Math.max(minZoom, Math.min(MAX_ZOOM, zoom * scaleChange));
        
        setZoom(newZoom);
        const constrained = constrainPosition(position.x, position.y, newZoom);
        setPosition(constrained);
      }
      
      touchStartRef.current.distance = currentDistance;
    }
  }, [zoom, minZoom, position, constrainPosition]);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If only one touch remains, switch to drag mode
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastPositionRef.current = { ...position };
      touchStartRef.current = null;
    } else if (e.touches.length === 0) {
      // No touches left - check if it was a tap
      const wasDragging = isDraggingRef.current;
      const wasPinching = touchStartRef.current !== null;
      
      isDraggingRef.current = false;
      touchStartRef.current = null;
      
      // Check if it was a tap (not a drag or pinch)
      if (!wasDragging && !wasPinching && initialTouchRef.current && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const initialTouch = initialTouchRef.current;
        
        // Check if it was a tap (small movement and short duration)
        const deltaX = Math.abs(touch.clientX - initialTouch.x);
        const deltaY = Math.abs(touch.clientY - initialTouch.y);
        const deltaTime = Date.now() - initialTouch.time;
        
        if (deltaX < 10 && deltaY < 10 && deltaTime < 300) {
          // Double tap detection for showing controls
          const now = Date.now();
          const timeSinceLastTap = now - lastClickTimeRef.current;
          
          // If tapped within 300ms of last tap, it's a double tap
          if (timeSinceLastTap < 300 && clickCountRef.current > 0) {
            // Double tap - show controls
            setControlsVisible(true);
            resetControlsTimeout();
            clickCountRef.current = 0;
          } else {
            // Single tap - don't show controls, just track for double tap
            clickCountRef.current = 1;
            lastClickTimeRef.current = now;
            
            // On single tap, always hide controls (don't show them)
            // Only double tap should show controls
            if (controlsVisible) {
              setControlsVisible(false);
            }
            
            // Clear any pending timeout that might show controls
            if (controlsTimeoutRef.current) {
              clearTimeout(controlsTimeoutRef.current);
              controlsTimeoutRef.current = null;
            }
          }
        }
      }
      
      initialTouchRef.current = null;
    }
  }, [zoom, position, resetControlsTimeout, controlsVisible]);
  
  // Global mouse event listeners for drag
  useEffect(() => {
    if (!isOpen) return;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        handleMouseMove(e);
      }
    };
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        handleMouseUp(e);
      }
    };
    
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isOpen, handleMouseMove, handleMouseUp]);

  // Navigate between images
  const handlePrevious = useCallback(() => {
    if (!hasMultipleImages || !images) return;
    const newIndex = actualIndex > 0 ? actualIndex - 1 : images.length - 1;
    if (onIndexChange) {
      onIndexChange(newIndex);
    } else {
      setInternalIndex(newIndex);
    }
    // Reset zoom and position when changing images
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, [hasMultipleImages, images, actualIndex, onIndexChange]);

  const handleNext = useCallback(() => {
    if (!hasMultipleImages || !images) return;
    const newIndex = actualIndex < images.length - 1 ? actualIndex + 1 : 0;
    if (onIndexChange) {
      onIndexChange(newIndex);
    } else {
      setInternalIndex(newIndex);
    }
    // Reset zoom and position when changing images
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, [hasMultipleImages, images, actualIndex, onIndexChange]);

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
            const newZoom = Math.min(MAX_ZOOM, prev + 0.25);
            const constrained = constrainPosition(position.x, position.y, newZoom);
            setPosition(constrained);
            return newZoom;
          });
          break;
        case '-':
          e.preventDefault();
          setZoom(prev => {
            const newZoom = Math.max(minZoom, prev - 0.25);
            const constrained = constrainPosition(position.x, position.y, newZoom);
            setPosition(constrained);
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
        case 'ArrowLeft':
          if (hasMultipleImages) {
            e.preventDefault();
            handlePrevious();
          }
          break;
        case 'ArrowRight':
          if (hasMultipleImages) {
            e.preventDefault();
            handleNext();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, onClose, toggleFullscreen, hasMultipleImages, handlePrevious, handleNext]);

  // Handle tap/click to toggle controls on container background (not on image)
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // Only handle clicks directly on the container background, not on child elements
    if (e.target === e.currentTarget && !isDraggingRef.current && !hasMovedRef.current) {
      setControlsVisible(prev => !prev);
      resetControlsTimeout();
    }
  }, [resetControlsTimeout]);


  // Simple wheel zoom
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => {
        const newZoom = Math.max(minZoom, Math.min(MAX_ZOOM, prev + delta));
        const constrained = constrainPosition(position.x, position.y, newZoom);
        setPosition(constrained);
        resetControlsTimeout();
        return newZoom;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen, minZoom, position, constrainPosition, resetControlsTimeout]);

  // Download image
  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(actualSrc);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${alt || 'image'}-${actualIndex + 1}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  }, [actualSrc, alt, actualIndex]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm"
      onClick={handleContainerClick}
      style={{ 
        touchAction: 'none',
        overscrollBehavior: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Image Container - Centered with proper fit */}
      <div 
        ref={imageContainerRef}
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{
          padding: 0,
          margin: 0,
          touchAction: 'none',
          overscrollBehavior: 'none',
        }}
        onTouchStart={(e) => {
          // Don't prevent default on container - let buttons handle their own touches
          e.stopPropagation();
        }}
        onTouchMove={(e) => {
          // Only prevent if it's actually a drag, not a button interaction
          if (isDraggingRef.current || touchStartRef.current) {
            e.preventDefault();
          }
          e.stopPropagation();
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
          src={actualSrc || ''}
          alt={`${alt}${hasMultipleImages ? ` - Page ${actualIndex + 1} of ${images?.length}` : ''}`}
          key={actualSrc}
          className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200 cursor-grab active:cursor-grabbing`}
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
            WebkitTouchCallout: 'none',
            overscrollBehavior: 'none',
          }}
          onMouseDown={handleMouseDown}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleMouseUp();
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={(e) => {
            e.preventDefault();
            isDraggingRef.current = false;
            touchStartRef.current = null;
            initialTouchRef.current = null;
          }}
          onLoad={(e) => {
            const img = e.currentTarget;
            const naturalWidth = img.naturalWidth;
            const naturalHeight = img.naturalHeight;
            
            // Clear loading timeout
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current);
              loadingTimeoutRef.current = null;
            }
            
            // Only process if we have valid dimensions and viewer is still open
            if (isOpen && naturalWidth > 0 && naturalHeight > 0) {
              // Set dimensions first - useEffect will calculate fit zoom
              setImageDimensions({ width: naturalWidth, height: naturalHeight });
              setIsLoading(false);
              setError(false);
              setRotation(0);
              setPosition({ x: 0, y: 0 });
            } else {
              // Invalid image dimensions
              setIsLoading(false);
              setError(true);
            }
          }}
          onError={(e) => {
            // Clear loading timeout
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current);
              loadingTimeoutRef.current = null;
            }
            
            // Only update state if viewer is still open
            if (isOpen) {
              setIsLoading(false);
              setError(true);
              console.error('Image failed to load:', actualSrc);
            }
          }}
          draggable={false}
        />
      </div>

      {/* Navigation Arrows for Multiple Images */}
      {hasMultipleImages && images && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 active:bg-white/30 h-12 w-12 touch-manipulation"
            onClick={handlePrevious}
            title="Previous image (←)"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 active:bg-white/30 h-12 w-12 touch-manipulation"
            onClick={handleNext}
            title="Next image (→)"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/80 backdrop-blur-md rounded-lg px-4 py-2 text-white text-sm">
            {actualIndex + 1} / {images.length}
          </div>
        </>
      )}

      {/* Controls */}
      <div 
        className={`absolute bottom-4 left-4 right-4 md:bottom-auto md:left-auto md:top-4 md:right-4 flex items-center gap-2 bg-black/80 backdrop-blur-md rounded-lg p-1.5 md:p-2 border border-white/10 transition-all duration-300 max-w-full ${
          controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
        onMouseEnter={resetControlsTimeout}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 flex-wrap justify-center w-full md:w-auto">
          {/* Reset */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 active:bg-white/30 h-11 w-11 sm:h-9 sm:w-9 touch-manipulation"
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setZoom(fitZoom);
              setRotation(0);
              setPosition({ x: 0, y: 0 });
              resetControlsTimeout();
            }}
            title="Reset (0)"
            aria-label="Reset zoom and rotation"
          >
            <RotateCw className="w-5 h-5 sm:w-4 sm:h-4" />
          </Button>

          <div className="w-px h-6 bg-white/30" />

          {/* Rotate */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 active:bg-white/30 h-11 w-11 sm:h-9 sm:w-9 touch-manipulation"
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setRotation(prev => {
                const newRotation = (prev + 90) % 360;
                // Reset position when rotating
                setPosition({ x: 0, y: 0 });
                return newRotation;
              });
              resetControlsTimeout();
            }}
            title="Rotate (R)"
            aria-label="Rotate image"
          >
            <RotateCw className="w-5 h-5 sm:w-4 sm:h-4" />
          </Button>

          {/* Desktop-only: Fullscreen and Download */}
          <div className="hidden md:contents">
            <div className="w-px h-6 bg-white/30" />
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
            <div className="w-px h-6 bg-white/30" />
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

          <div className="w-px h-6 bg-white/30" />

          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 active:bg-white/30 h-9 w-9 touch-manipulation"
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              resetControlsTimeout();
            }}
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

    </div>
  );
}
