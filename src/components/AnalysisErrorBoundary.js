'use client';

import React from 'react';
import { AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

class AnalysisErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    if (process.env.NODE_ENV === 'development') {
      console.error('Analysis Error Boundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Trigger a retry if onRetry prop is provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-orange-800 font-semibold">Analysis Error</h4>
              <p className="text-orange-700 text-sm mt-1">
                The document analysis encountered an error. The document is still editable, but some features may not work correctly.
              </p>
            </div>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm font-medium flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry Analysis</span>
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4">
              <summary className="text-xs text-orange-600 cursor-pointer">
                Error Details (Development)
              </summary>
              <div className="mt-2 bg-orange-100 border border-orange-300 rounded p-3 text-xs text-orange-800 font-mono">
                {this.state.error.toString()}
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default AnalysisErrorBoundary;