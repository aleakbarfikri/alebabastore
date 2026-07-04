import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-destructive/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4 tracking-tight">Something went wrong</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              We apologize for the inconvenience. An unexpected error has occurred in the application.
            </p>
            
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-8 text-left bg-muted p-4 rounded-xl overflow-auto max-h-40 text-xs font-mono text-muted-foreground">
                <p className="font-bold text-destructive mb-2">{this.state.error.toString()}</p>
                <p>{this.state.errorInfo?.componentStack}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <RefreshCcw className="w-5 h-5" />
                Refresh Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-8 py-4 bg-secondary/10 text-secondary rounded-xl font-bold hover:bg-secondary hover:text-secondary-foreground active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;