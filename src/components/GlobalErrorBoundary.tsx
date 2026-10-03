import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../services/logger';
import { RefreshCw, RotateCcw, AlertOctagon, Copy, Check, ChevronDown, ChevronUp, Terminal } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  logId: string | null;
  copied: boolean;
  showTechnicalDetails: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      logId: null,
      copied: false,
      showTechnicalDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Capture exception and record telemetry to Firestore & offline cache
    logger
      .captureException(error, {
        category: 'react_crash',
        componentStack: errorInfo.componentStack || undefined
      })
      .then((id) => {
        if (id && id !== 'throttled') {
          this.setState({ logId: id });
        }
      })
      .catch((err) => {
        console.error('[GlobalErrorBoundary] Failed to capture exception:', err);
      });
  }

  handleCopyReport = () => {
    const { error, errorInfo, logId } = this.state;
    const report = [
      '### 💥 System Crash Diagnostics Report',
      `- **Reference ID**: \`${logId || 'Pending/Offline'}\``,
      `- **Timestamp**: ${new Date().toISOString()}`,
      `- **URL**: ${window.location.href}`,
      `- **User Agent**: ${navigator.userAgent}`,
      `- **Error Name**: ${error?.name || 'Error'}`,
      `- **Error Message**: ${error?.message || 'Unknown error'}`,
      '\n**Call Stack**:',
      '```',
      error?.stack || 'No stack trace available',
      '```',
      '\n**Component Stack**:',
      '```',
      errorInfo?.componentStack || 'No component stack available',
      '```'
    ].join('\n');

    navigator.clipboard.writeText(report).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      sessionStorage.clear();
      // Keep essential auth tokens, but clear stale route/tenant navigation state
      localStorage.removeItem('notx_active_tenant');
    } catch (_) {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, logId, copied, showTechnicalDetails } = this.state;

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-8 font-sans selection:bg-rose-500 selection:text-white">
          <div className="w-full max-w-2xl bg-slate-900 border-4 border-slate-700 shadow-[8px_8px_0px_0px_rgba(244,63,94,0.4)] rounded-2xl p-6 sm:p-10 relative overflow-hidden">
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-500" />

            {/* Header Badge */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-rose-500/20 text-rose-400 border-2 border-rose-500/40 rounded-xl">
                <AlertOctagon className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <span className="text-xs font-mono font-black tracking-widest uppercase bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded border border-rose-500/40">
                  Crash Shield Active
                </span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1 text-white">
                  Something Went Wrong
                </h1>
              </div>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 font-medium">
              An unexpected render exception was caught. The crash report has been automatically recorded to system diagnostics for administrative review.
            </p>

            {/* Error Summary Card */}
            <div className="bg-slate-950/80 border-2 border-slate-800 rounded-xl p-4 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400 mb-2 border-b border-slate-800 pb-2">
                <span>Incident Log ID: <strong className="text-rose-400">{logId || 'Logging...'}</strong></span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
              <div className="text-rose-300 font-mono text-sm break-words font-semibold">
                {error?.name || 'RuntimeError'}: {error?.message || 'Unknown runtime error occurred.'}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all text-sm uppercase tracking-wider"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>

              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-600 font-bold rounded-xl active:translate-x-0.5 active:translate-y-0.5 transition-all text-sm uppercase tracking-wider"
              >
                <RotateCcw className="w-4 h-4" />
                Return to Safety
              </button>

              <button
                onClick={this.handleCopyReport}
                title="Copy markdown diagnostic report"
                className="flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border-2 border-slate-600 font-semibold rounded-xl text-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span className="sm:hidden">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Expandable Technical Details */}
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <button
                onClick={() => this.setState({ showTechnicalDetails: !showTechnicalDetails })}
                className="w-full flex items-center justify-between p-3.5 bg-slate-950/60 hover:bg-slate-950 text-slate-400 hover:text-slate-200 text-xs font-mono font-bold tracking-wide uppercase transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  Technical Stack Trace ({showTechnicalDetails ? 'Collapse' : 'Inspect'})
                </span>
                {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showTechnicalDetails && (
                <div className="p-4 bg-slate-950 font-mono text-xs text-slate-400 overflow-x-auto max-h-64 border-t border-slate-800">
                  <p className="text-slate-500 font-bold mb-1">// Exception Stack</p>
                  <pre className="text-rose-400/90 whitespace-pre-wrap mb-4">
                    {error?.stack || 'No call stack available'}
                  </pre>
                  {errorInfo?.componentStack && (
                    <>
                      <p className="text-slate-500 font-bold mb-1">// React Component Hierarchy</p>
                      <pre className="text-slate-400 whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 text-center text-xs font-mono text-slate-500">
              ThinkBotz Enterprise Telemetry Engine &bull; Zero-Loss Shield v1.3.0
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
