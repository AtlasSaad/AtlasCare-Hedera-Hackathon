import React from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
          <div className="max-w-lg w-full">
            {/* Error Card */}
            <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/5 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                    <FiAlertTriangle className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      Oops! Something went wrong
                    </h2>
                    <p className="text-white/90 text-sm">
                      But we can fix this
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Body */}
              <div className="p-8">
                
                {/* Error Message */}
                <div className="mb-6">
                  <p className="text-slate-700 mb-3">
                    This happens sometimes in live demos. No worries – your data is safe on Hedera blockchain!
                  </p>
                  
                  {/* Technical Details (Collapsible) */}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700 font-medium">
                      Technical details (for developers)
                    </summary>
                    <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xs font-mono text-red-600 mb-2">
                        {this.state.error && this.state.error.toString()}
                      </p>
                      {this.state.errorInfo && (
                        <pre className="text-xs text-slate-600 overflow-auto max-h-32">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  </details>
                </div>
                
                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={this.handleReload}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/30"
                  >
                    <FiRefreshCw className="w-5 h-5" />
                    Reload App
                  </button>
                  
                  <button 
                    onClick={this.handleGoHome}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all ring-1 ring-slate-200"
                  >
                    <FiHome className="w-5 h-5" />
                    Go Home
                  </button>
                </div>
                
                {/* Help Text */}
                <p className="mt-6 text-center text-sm text-slate-500">
                  If this keeps happening, please contact{' '}
                  <a href="mailto:support@atlascare.health" className="text-emerald-600 hover:underline">
                    support@atlascare.health
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

