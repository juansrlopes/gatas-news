/**
 * Development Tools and Utilities
 *
 * Helper functions and debugging tools for development environment.
 * These utilities are only available in development mode.
 */

/**
 * Logs component render information for debugging
 *
 * @param componentName - Name of the component
 * @param props - Component props
 * @param renderTime - Optional render time measurement
 */
export const logComponentRender = (
  componentName: string,
  props?: Record<string, any>,
  renderTime?: number
) => {
  if (process.env.NODE_ENV !== 'development') return;

  console.group(`🔧 ${componentName} Render`);
  console.log('Props:', props);
  if (renderTime) {
    console.log(`Render time: ${renderTime.toFixed(2)}ms`);
  }
  console.log('Timestamp:', new Date().toISOString());
  console.groupEnd();
};

/**
 * Logs API request information
 *
 * @param url - Request URL
 * @param method - HTTP method
 * @param data - Request/response data
 * @param duration - Request duration in ms
 */
export const logApiRequest = (
  url: string,
  method: string = 'GET',
  data?: any,
  duration?: number
) => {
  if (process.env.NODE_ENV !== 'development') return;

  console.group(`🌐 API ${method.toUpperCase()} ${url}`);
  if (data) {
    console.log('Data:', data);
  }
  if (duration) {
    console.log(`Duration: ${duration}ms`);
  }
  console.log('Timestamp:', new Date().toISOString());
  console.groupEnd();
};

/**
 * Logs error information with context
 *
 * @param error - Error object or message
 * @param context - Additional context information
 * @param component - Component where error occurred
 */
export const logError = (
  error: Error | string,
  context?: Record<string, any>,
  component?: string
) => {
  if (process.env.NODE_ENV !== 'development') return;

  console.group(`❌ Error${component ? ` in ${component}` : ''}`);
  console.error('Error:', error);
  if (context) {
    console.log('Context:', context);
  }
  console.log('Timestamp:', new Date().toISOString());
  console.trace('Stack trace');
  console.groupEnd();
};

/**
 * Performance measurement utilities
 */
export const performance = {
  /**
   * Starts a performance measurement
   *
   * @param label - Label for the measurement
   * @returns Function to end the measurement
   */
  start: (label: string) => {
    if (process.env.NODE_ENV !== 'development') return () => {};

    const startTime = Date.now();
    console.time(label);

    return () => {
      console.timeEnd(label);
      const duration = Date.now() - startTime;
      console.log(`⏱️ ${label}: ${duration}ms`);
      return duration;
    };
  },

  /**
   * Measures function execution time
   *
   * @param fn - Function to measure
   * @param label - Label for the measurement
   * @returns Function result and execution time
   */
  measure: async <T>(
    fn: () => T | Promise<T>,
    label: string
  ): Promise<{ result: T; time: number }> => {
    const start = Date.now();
    const result = await fn();
    const time = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${label}: ${time}ms`);
    }

    return { result, time };
  },
};

/**
 * Memory usage monitoring
 */
export const memory = {
  /**
   * Logs current memory usage
   *
   * @param label - Label for the measurement
   */
  log: (label?: string) => {
    if (process.env.NODE_ENV !== 'development' || !('memory' in performance)) return;

    const memInfo = (performance as any).memory;
    console.group(`🧠 Memory Usage${label ? ` - ${label}` : ''}`);
    console.log(`Used: ${(memInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total: ${(memInfo.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Limit: ${(memInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
    console.groupEnd();
  },

  /**
   * Monitors memory usage over time
   *
   * @param interval - Monitoring interval in ms
   * @returns Function to stop monitoring
   */
  monitor: (interval: number = 5000) => {
    if (process.env.NODE_ENV !== 'development') return () => {};

    const intervalId = setInterval(() => {
      memory.log('Monitor');
    }, interval);

    return () => clearInterval(intervalId);
  },
};

/**
 * Network request debugging
 */
export const network = {
  /**
   * Intercepts and logs fetch requests
   */
  interceptFetch: () => {
    if (process.env.NODE_ENV !== 'development') return;

    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const [url, options] = args;
      const startTime = Date.now();

      console.group(`🌐 Fetch Request: ${url}`);
      console.log('Options:', options);

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;

        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log(`Duration: ${duration}ms`);
        console.groupEnd();

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error('Error:', error);
        console.log(`Duration: ${duration}ms`);
        console.groupEnd();
        throw error;
      }
    };
  },

  /**
   * Restores original fetch function
   */
  restoreFetch: () => {
    // This would need to store the original fetch reference
    // Implementation depends on specific needs
  },
};

/**
 * Component state debugging
 */
export const state = {
  /**
   * Logs component state changes
   *
   * @param componentName - Name of the component
   * @param stateName - Name of the state variable
   * @param oldValue - Previous state value
   * @param newValue - New state value
   */
  logChange: (componentName: string, stateName: string, oldValue: any, newValue: any) => {
    if (process.env.NODE_ENV !== 'development') return;

    console.group(`🔄 State Change: ${componentName}.${stateName}`);
    console.log('Old value:', oldValue);
    console.log('New value:', newValue);
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
  },

  /**
   * Creates a state logger hook
   *
   * @param componentName - Name of the component
   * @returns Function to log state changes
   */
  createLogger: (componentName: string) => {
    return (stateName: string, oldValue: any, newValue: any) => {
      state.logChange(componentName, stateName, oldValue, newValue);
    };
  },
};

/**
 * Development environment checks
 */
export const env = {
  /**
   * Checks if running in development mode
   */
  isDevelopment: () => process.env.NODE_ENV === 'development',

  /**
   * Checks if running in test mode
   */
  isTest: () => process.env.NODE_ENV === 'test',

  /**
   * Checks if running in production mode
   */
  isProduction: () => process.env.NODE_ENV === 'production',

  /**
   * Logs current environment information
   */
  logInfo: () => {
    if (process.env.NODE_ENV !== 'development') return;

    console.group('🌍 Environment Info');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('User Agent:', navigator.userAgent);
    console.log('URL:', window.location.href);
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
  },
};

/**
 * Global development tools object
 * Available in browser console as window.devTools
 */
export const devTools = {
  log: {
    component: logComponentRender,
    api: logApiRequest,
    error: logError,
  },
  performance,
  memory,
  network,
  state,
  env,
};

// Make devTools available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).devTools = devTools;
  console.log('🔧 Dev tools available at window.devTools');
}
