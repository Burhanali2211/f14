/**
 * Error tracking utility
 * Can be extended to integrate with services like Sentry, LogRocket, etc.
 */

import { logger } from './logger';

interface ErrorContext {
  userId?: string;
  userRole?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  [key: string]: unknown;
}

class ErrorTracker {
  private enabled: boolean;
  private serviceUrl?: string;

  constructor() {
    // Enable error tracking in production
    this.enabled = import.meta.env.PROD;
    this.serviceUrl = import.meta.env.VITE_ERROR_TRACKING_URL;
  }

  /**
   * Capture and log an error
   */
  captureException(error: Error, context?: ErrorContext): void {
    if (!this.enabled) {
      logger.error('Error (dev mode):', error, context);
      return;
    }

    const errorData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context: {
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
    };

    // Log to console in production (for debugging)
    logger.error('Error tracked:', errorData);

    // Send to error tracking service if configured
    if (this.serviceUrl) {
      this.sendToService(errorData).catch((err) => {
        logger.error('Failed to send error to tracking service:', err);
      });
    }

    // You can add integrations here:
    // - Sentry.captureException(error, { extra: context });
    // - LogRocket.captureException(error, { tags: context });
  }

  /**
   * Capture a message (non-error)
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): void {
    if (!this.enabled) {
      logger[level]('Message (dev mode):', message, context);
      return;
    }

    const messageData = {
      message,
      level,
      context: {
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
    };

    logger[level]('Message tracked:', messageData);

    if (this.serviceUrl) {
      this.sendToService(messageData).catch((err) => {
        logger.error('Failed to send message to tracking service:', err);
      });
    }
  }

  /**
   * Set user context for error tracking
   */
  setUser(userId: string, userRole?: string): void {
    // Store user context for future errors
    if (typeof window !== 'undefined') {
      (window as any).__errorTrackingUser = { userId, userRole };
    }
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    if (typeof window !== 'undefined') {
      delete (window as any).__errorTrackingUser;
    }
  }

  /**
   * Get current user context
   */
  private getUserContext(): { userId?: string; userRole?: string } {
    if (typeof window !== 'undefined') {
      return (window as any).__errorTrackingUser || {};
    }
    return {};
  }

  /**
   * Send error data to tracking service
   */
  private async sendToService(data: unknown): Promise<void> {
    if (!this.serviceUrl) {
      return;
    }

    try {
      await fetch(this.serviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        // Don't wait for response to avoid blocking
        keepalive: true,
      });
    } catch (error) {
      // Silently fail - don't break the app if tracking fails
      logger.error('Error tracking service unavailable:', error);
    }
  }
}

export const errorTracker = new ErrorTracker();

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private enabled: boolean;

  constructor() {
    this.enabled = import.meta.env.PROD;
  }

  /**
   * Measure page load performance
   */
  measurePageLoad(): void {
    if (!this.enabled || typeof window === 'undefined' || !window.performance) {
      return;
    }

    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (perfData) {
          const metrics = {
            dns: perfData.domainLookupEnd - perfData.domainLookupStart,
            tcp: perfData.connectEnd - perfData.connectStart,
            request: perfData.responseStart - perfData.requestStart,
            response: perfData.responseEnd - perfData.responseStart,
            dom: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            load: perfData.loadEventEnd - perfData.loadEventStart,
            total: perfData.loadEventEnd - perfData.fetchStart,
            url: window.location.href,
            timestamp: new Date().toISOString(),
          };

          logger.info('Performance metrics:', metrics);
          errorTracker.captureMessage('Page load performance', 'info', metrics);
        }
      }, 0);
    });
  }

  /**
   * Measure custom operation
   */
  measureOperation(name: string, operation: () => void | Promise<void>): void {
    if (!this.enabled) {
      return operation();
    }

    const start = performance.now();
    
    const result = operation();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        logger.debug(`Operation "${name}" took ${duration.toFixed(2)}ms`);
      });
    } else {
      const duration = performance.now() - start;
      logger.debug(`Operation "${name}" took ${duration.toFixed(2)}ms`);
      return result;
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();

