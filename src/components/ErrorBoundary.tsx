/**
 * Global Error Boundary — friendly fallback when something goes wrong.
 * Shows a calm, on-brand message and a recovery action (no stack traces).
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Turtle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 font-sans text-center">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl border-b-8 border-emerald-200 max-w-md space-y-6">
            <div className="flex justify-center">
              <div className="bg-emerald-100 p-6 rounded-full">
                <Turtle size={64} className="text-emerald-600" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-emerald-900">
              Something went wrong
            </h1>
            <p className="text-emerald-700">
              Don’t worry — try refreshing the page and we’ll get you back on track.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-6 rounded-2xl shadow-[0_4px_0_rgb(5,150,105)] transition-all"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
