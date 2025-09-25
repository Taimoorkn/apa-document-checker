'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, FileText } from 'lucide-react';

class EditorErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
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

    // Log error only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Editor Error Boundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 min-h-[400px] bg-red-50 border-2 border-red-200 rounded-lg flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>

            <h3 className="text-xl font-semibold text-red-800 mb-3">
              Editor Encountered an Error
            </h3>

            <p className="text-red-700 mb-6 text-sm leading-relaxed">
              The document editor has encountered an unexpected error and cannot display properly.
              This might be due to corrupted document data or a temporary issue.
            </p>

            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium flex items-center justify-center space-x-2"
                disabled={this.state.retryCount >= 3}
              >
                <RefreshCw className="h-4 w-4" />
                <span>
                  {this.state.retryCount >= 3 ? 'Max retries reached' : `Retry ${this.state.retryCount > 0 ? `(${this.state.retryCount}/3)` : ''}`}
                </span>
              </button>

              <button
                onClick={this.handleReload}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium flex items-center justify-center space-x-2"
              >
                <FileText className="h-4 w-4" />
                <span>Reload Page</span>
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-red-600 cursor-pointer font-medium mb-2">
                  Error Details (Development)
                </summary>
                <div className="bg-red-100 border border-red-300 rounded p-3 text-xs text-red-800 font-mono overflow-auto max-h-32">
                  <div className="mb-2 font-bold">Error: {this.state.error.toString()}</div>
                  <div className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</div>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EditorErrorBoundary;