import React, { Component, ReactNode } from 'react';

/**
 * Props for the ErrorBoundary component
 */
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (_error: Error, _errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

/**
 * State for the ErrorBoundary component
 */
interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  eventId?: string;
}

/**
 * ErrorBoundary Component
 *
 * Enterprise-grade error boundary that catches JavaScript errors anywhere in the child
 * component tree, logs those errors, and displays a fallback UI instead of crashing.
 *
 * Features:
 * - Automatic error catching and logging
 * - Multiple recovery options (retry, reload, go back)
 * - Unique error IDs for support tracking
 * - Development error details with stack traces
 * - Sentry integration ready
 * - Automatic reset on props/key changes
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * // With custom error handler
 * <ErrorBoundary
 *   onError={(error, errorInfo) => logToService(error)}
 *   resetKeys={[userId, dataVersion]}
 * >
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * // With custom fallback
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate a unique event ID for this error
    const eventId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      eventId,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Enhanced error logging
    console.group('🚨 ErrorBoundary caught an error');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error Boundary Props:', this.props);
    console.groupEnd();

    // Store error info in state
    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service (if available)
    if (typeof window !== 'undefined' && 'Sentry' in window) {
      (
        window as { Sentry: { captureException: (_error: Error, _context?: unknown) => void } }
      ).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error state if resetKeys changed
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys![index]
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    // Reset error state if any props changed (when resetOnPropsChange is true)
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      eventId: undefined,
    });
  };

  handleRetry = () => {
    this.resetErrorBoundary();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, eventId } = this.state;
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
          <div className="text-center max-w-2xl">
            <div className="text-6xl mb-6">💥</div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Oops! Algo deu errado</h2>
            <p className="text-gray-600 mb-6">
              Ocorreu um erro inesperado na aplicação. Nossa equipe foi notificada e está
              trabalhando para resolver o problema.
            </p>

            {/* Error ID for support */}
            {eventId && (
              <p className="text-xs text-gray-500 mb-6 font-mono">ID do Erro: {eventId}</p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
              >
                🔄 Tentar Novamente
              </button>
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                🔃 Recarregar Página
              </button>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                ← Voltar
              </button>
            </div>

            {/* Development Error Details */}
            {isDevelopment && error && (
              <details className="text-left bg-gray-50 rounded-lg p-4">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700 mb-2">
                  🔧 Detalhes do Erro (Desenvolvimento)
                </summary>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-red-600 mb-1">Erro:</h4>
                    <pre className="text-xs bg-red-50 p-2 rounded overflow-auto">
                      {error.message}
                    </pre>
                  </div>

                  {error.stack && (
                    <div>
                      <h4 className="font-semibold text-red-600 mb-1">Stack Trace:</h4>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                        {error.stack}
                      </pre>
                    </div>
                  )}

                  {errorInfo?.componentStack && (
                    <div>
                      <h4 className="font-semibold text-blue-600 mb-1">Component Stack:</h4>
                      <pre className="text-xs bg-blue-50 p-2 rounded overflow-auto max-h-40">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* User Feedback */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Dica:</strong> Se o problema persistir, tente limpar o cache do navegador
                ou entre em contato conosco.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
