import {AlertTriangle, Check, ChevronDown, Copy, Loader2} from 'lucide-react';
import React, {Component, ReactNode, useState} from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({error, errorInfo});
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#050505]">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" aria-hidden="true"/>
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Oops! Something went wrong</h1>
          <p className="text-sm text-zinc-400 mb-2 max-w-md">
            We encountered an unexpected error while processing your request.
          </p>
          <p className="text-sm text-zinc-500 mb-6 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>

          {/* Expandable error details */}
          <ErrorDetails error={this.state.error} errorInfo={this.state.errorInfo}/>

          <ResetButton onReset={() => this.setState({hasError: false, error: undefined, errorInfo: undefined})}/>
        </div>
      );
    }

    return this.props.children;
  }
}

// Helper component for the reset button with immediate feedback
function ResetButton({onReset}: { onReset: () => void }) {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = () => {
    setIsResetting(true);
    try {
      onReset();
    } finally {
      // Reset loading state after a brief moment to show feedback
      setTimeout(() => setIsResetting(false), 200);
    }
  };

  return (
    <button
      onClick={handleReset}
      disabled={isResetting}
      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white rounded-lg transition-all mt-4 flex items-center gap-2"
    >
      {isResetting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin"/>
          <span>Resetting...</span>
        </>
      ) : (
        <span>Try Again</span>
      )}
    </button>
  );
}

function ErrorDetails({error, errorInfo}: { error?: Error; errorInfo?: React.ErrorInfo }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!error) return;

    const errorText = errorInfo
      ? `${error.message}\n\nStack:\n${error.stack}\n\nComponent Stack:\n${errorInfo.componentStack}`
      : `${error.message}\n\nStack:\n${error.stack}`;

    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  if (!error) return null;

  return (
    <div className="mt-4 w-full max-w-2xl text-left">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
      >
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
        <span>{isExpanded ? 'Hide error details' : 'Show error details'}</span>
      </button>

      {isExpanded && (
        <div className="mt-3 p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-zinc-500">Error Details</span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded hover:bg-zinc-800 transition-colors"
              title={copied ? 'Copied!' : 'Copy error details'}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500"/>
              ) : (
                <Copy className="w-3.5 h-3.5 text-zinc-400"/>
              )}
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-xs font-mono text-zinc-500 mb-1">Message:</div>
              <code className="text-sm text-red-400 font-mono break-words whitespace-pre-wrap">
                {error.message}
              </code>
            </div>

            {error.stack && (
              <div>
                <div className="text-xs font-mono text-zinc-500 mb-1">Stack trace:</div>
                <pre className="text-xs font-mono text-zinc-400 bg-zinc-950 p-2 rounded overflow-auto max-h-48">
                  {error.stack}
                </pre>
              </div>
            )}

            {errorInfo && (
              <div>
                <div className="text-xs font-mono text-zinc-500 mb-1">Component stack:</div>
                <pre className="text-xs font-mono text-zinc-400 bg-zinc-950 p-2 rounded overflow-auto max-h-48">
                  {errorInfo.componentStack}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
