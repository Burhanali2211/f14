import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw, Trash2, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { errorTracker } from '@/lib/error-tracking';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isOffline: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    };
  }

  componentDidMount() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  handleOnline = () => {
    this.setState({ isOffline: false });
    if (this.state.hasError) {
      this.handleReset();
    }
  };

  handleOffline = () => {
    this.setState({ isOffline: true });
  };

  isNetworkError = (error: Error | null): boolean => {
    if (!error) return false;
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    return (
      !navigator.onLine ||
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('failed to fetch') ||
      message.includes('networkerror') ||
      message.includes('net::') ||
      message.includes('connection') ||
      message.includes('offline') ||
      message.includes('internet') ||
      name === 'typeerror' && message.includes('failed') ||
      name === 'networkerror'
    );
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
    
    const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
    
    this.setState({
      error,
      errorInfo,
      isOffline,
    });

    if (!isOffline) {
      errorTracker.captureException(error, {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleForceClear = async () => {
    const { forceClearCacheAndReload } = await import('@/lib/app-version');
    await forceClearCacheAndReload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.state.isOffline || this.isNetworkError(this.state.error)) {
        return (
          <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-elevated text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
                <WifiOff className="w-8 h-8 text-amber-500" />
              </div>
              
              <h1 className="text-2xl font-bold text-foreground mb-2">
                You're Offline
              </h1>
              
              <p className="text-muted-foreground mb-6">
                Please check your internet connection and try again. The app will automatically reload when you're back online.
              </p>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => window.location.reload()}
                  className="rounded-xl w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                
                <Button
                  onClick={() => (window.location.href = '/')}
                  variant="outline"
                  className="rounded-xl w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>
            </div>
          </div>
        );
      }

      const isSyntaxError = this.state.error?.name === 'SyntaxError' || 
                           this.state.error?.message.includes('module') ||
                           this.state.error?.message.includes('import');

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-elevated text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Something went wrong
            </h1>
            
            <p className="text-muted-foreground mb-6">
              {isSyntaxError 
                ? "A critical loading error occurred. This is usually caused by a stale browser cache." 
                : "We're sorry, but something unexpected happened. Please try refreshing the page."}
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-destructive/10 rounded-lg text-left">
                <p className="text-sm font-mono text-destructive mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer mb-2">Stack trace</summary>
                    <pre className="overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="rounded-xl"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={() => (window.location.href = '/')}
                  variant="outline"
                  className="rounded-xl"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>
              
              <Button
                onClick={this.handleForceClear}
                className="rounded-xl w-full bg-destructive hover:bg-destructive/90 text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Cache & Force Reload
              </Button>
              
              <p className="text-[10px] text-muted-foreground mt-2">
                Use "Clear Cache" if the app keeps crashing after a refresh.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

