/**
 * Performance Monitoring and Optimization Utilities
 *
 * Tools for measuring, monitoring, and optimizing frontend performance.
 * Includes Core Web Vitals tracking, bundle analysis, and performance hints.
 */

/**
 * Core Web Vitals monitoring
 */
export const webVitals = {
  /**
   * Measures and reports Core Web Vitals
   *
   * @param onReport - Callback to handle the metrics
   */
  measureCoreWebVitals: (onReport: (_metric: WebVitalMetric) => void) => {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint (LCP)
    measureLCP(onReport);

    // First Input Delay (FID)
    measureFID(onReport);

    // Cumulative Layout Shift (CLS)
    measureCLS(onReport);

    // First Contentful Paint (FCP)
    measureFCP(onReport);

    // Time to First Byte (TTFB)
    measureTTFB(onReport);
  },

  /**
   * Gets performance thresholds for Core Web Vitals
   */
  getThresholds: () => ({
    LCP: { good: 2500, needsImprovement: 4000 },
    FID: { good: 100, needsImprovement: 300 },
    CLS: { good: 0.1, needsImprovement: 0.25 },
    FCP: { good: 1800, needsImprovement: 3000 },
    TTFB: { good: 800, needsImprovement: 1800 },
  }),

  /**
   * Evaluates if a metric value is good, needs improvement, or poor
   *
   * @param metricName - Name of the metric
   * @param value - Metric value
   * @returns Performance rating
   */
  evaluateMetric: (
    metricName: keyof ReturnType<typeof webVitals.getThresholds>,
    value: number
  ): 'good' | 'needs-improvement' | 'poor' => {
    const thresholds = webVitals.getThresholds()[metricName];

    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.needsImprovement) return 'needs-improvement';
    return 'poor';
  },
};

/**
 * Performance monitoring utilities
 */
export const monitor = {
  /**
   * Monitors component render performance
   *
   * @param componentName - Name of the component
   * @param renderFn - Function that triggers the render
   * @returns Render time in milliseconds
   */
  measureRender: async (
    componentName: string,
    renderFn: () => Promise<void> | void
  ): Promise<number> => {
    const startTime = performance.now();

    await renderFn();

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    if (process.env.NODE_ENV === 'development') {
      console.log(`🎨 ${componentName} render time: ${renderTime.toFixed(2)}ms`);

      if (renderTime > 16) {
        console.warn(
          `⚠️ ${componentName} render took longer than 16ms (${renderTime.toFixed(2)}ms)`
        );
      }
    }

    return renderTime;
  },

  /**
   * Monitors API request performance
   *
   * @param url - Request URL
   * @param requestFn - Function that makes the request
   * @returns Request metrics
   */
  measureRequest: async <T>(
    url: string,
    requestFn: () => Promise<T>
  ): Promise<{ result: T; metrics: RequestMetrics }> => {
    const startTime = performance.now();
    const startMemory = getMemoryUsage();

    try {
      const result = await requestFn();
      const endTime = performance.now();
      const endMemory = getMemoryUsage();

      const metrics: RequestMetrics = {
        url,
        duration: endTime - startTime,
        memoryDelta: endMemory - startMemory,
        success: true,
        timestamp: Date.now(),
      };

      if (process.env.NODE_ENV === 'development') {
        console.log(`🌐 API Request: ${url}`, metrics);
      }

      return { result, metrics };
    } catch (error) {
      const endTime = performance.now();
      const endMemory = getMemoryUsage();

      const metrics: RequestMetrics = {
        url,
        duration: endTime - startTime,
        memoryDelta: endMemory - startMemory,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };

      if (process.env.NODE_ENV === 'development') {
        console.error(`🌐 API Request Failed: ${url}`, metrics);
      }

      throw error;
    }
  },

  /**
   * Monitors memory usage over time
   *
   * @param interval - Monitoring interval in milliseconds
   * @param onUpdate - Callback for memory updates
   * @returns Function to stop monitoring
   */
  monitorMemory: (
    interval: number = 5000,
    onUpdate: (_usage: MemoryUsage) => void
  ): (() => void) => {
    if (!('memory' in performance)) {
      console.warn('Memory monitoring not supported in this browser');
      return () => {};
    }

    const intervalId = setInterval(() => {
      const _usage = getDetailedMemoryUsage();
      onUpdate(_usage);

      if (process.env.NODE_ENV === 'development') {
        if (_usage.usedJSHeapSize > _usage.jsHeapSizeLimit * 0.9) {
          console.warn('⚠️ Memory usage is approaching the limit');
        }
      }
    }, interval);

    return () => clearInterval(intervalId);
  },
};

/**
 * Performance optimization utilities
 */
export const optimize = {
  /**
   * Debounces a function to improve performance
   *
   * @param func - Function to debounce
   * @param wait - Wait time in milliseconds
   * @returns Debounced function
   */
  debounce: <T extends (..._args: unknown[]) => unknown>(
    func: T,
    wait: number
  ): ((..._args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;

    return (..._args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(..._args), wait);
    };
  },

  /**
   * Throttles a function to limit execution frequency
   *
   * @param func - Function to throttle
   * @param limit - Time limit in milliseconds
   * @returns Throttled function
   */
  throttle: <T extends (..._args: unknown[]) => unknown>(
    func: T,
    limit: number
  ): ((..._args: Parameters<T>) => void) => {
    let inThrottle: boolean;

    return (..._args: Parameters<T>) => {
      if (!inThrottle) {
        func(..._args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Creates a memoized version of a function
   *
   * @param func - Function to memoize
   * @param getKey - Function to generate cache key
   * @returns Memoized function
   */
  memoize: <T extends (..._args: unknown[]) => unknown>(
    func: T,
    getKey?: (..._args: Parameters<T>) => string
  ): T => {
    const cache = new Map();

    return ((..._args: Parameters<T>) => {
      const key = getKey ? getKey(..._args) : JSON.stringify(_args);

      if (cache.has(key)) {
        return cache.get(key);
      }

      const result = func(..._args);
      cache.set(key, result);

      return result;
    }) as T;
  },

  /**
   * Lazy loads a component or resource
   *
   * @param importFn - Function that returns a dynamic import
   * @returns Lazy-loaded component
   */
  lazyLoad: <T>(importFn: () => Promise<{ default: T }>) => {
    let promise: Promise<{ default: T }> | null = null;

    return (): Promise<{ default: T }> => {
      if (!promise) {
        promise = importFn();
      }
      return promise;
    };
  },
};

/**
 * Bundle analysis utilities
 */
export const bundle = {
  /**
   * Analyzes the current page's bundle size
   *
   * @returns Bundle analysis data
   */
  analyzePage: (): BundleAnalysis => {
    const scripts = Array.from(document.scripts);
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

    const scriptSizes = scripts.map(script => ({
      src: script.src,
      size: script.src ? 0 : script.textContent?.length || 0, // Can't get external script size
      type: 'script' as const,
    }));

    const stylesheetSizes = stylesheets.map(link => ({
      src: (link as HTMLLinkElement).href,
      size: 0, // Can't get external stylesheet size
      type: 'stylesheet' as const,
    }));

    return {
      scripts: scriptSizes,
      stylesheets: stylesheetSizes,
      totalScripts: scriptSizes.length,
      totalStylesheets: stylesheetSizes.length,
    };
  },

  /**
   * Checks for duplicate dependencies
   *
   * @returns List of potential duplicates
   */
  findDuplicates: (): string[] => {
    const scripts = Array.from(document.scripts);
    const sources = scripts.map(s => s.src).filter(Boolean);

    const duplicates: string[] = [];
    const seen = new Set();

    sources.forEach(src => {
      const filename = src.split('/').pop()?.split('?')[0];
      if (filename && seen.has(filename)) {
        duplicates.push(filename);
      }
      if (filename) seen.add(filename);
    });

    return duplicates;
  },
};

/**
 * Image optimization utilities
 */
export const images = {
  /**
   * Preloads critical images
   *
   * @param urls - Array of image URLs to preload
   */
  preloadCritical: (urls: string[]) => {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    });
  },

  /**
   * Lazy loads images with intersection observer
   *
   * @param selector - CSS selector for images to lazy load
   */
  lazyLoadImages: (selector: string = 'img[data-src]') => {
    if (!('IntersectionObserver' in window)) {
      // Fallback for browsers without IntersectionObserver
      const images = document.querySelectorAll(selector) as NodeListOf<HTMLImageElement>;
      images.forEach(img => {
        const src = img.dataset.src;
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
        }
      });
      return;
    }

    const imageObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;

          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    });

    const images = document.querySelectorAll(selector);
    images.forEach(img => imageObserver.observe(img));
  },

  /**
   * Optimizes image loading with modern formats
   *
   * @param originalUrl - Original image URL
   * @returns Optimized image URL or picture element
   */
  getOptimizedUrl: (originalUrl: string): string => {
    // This would integrate with your image optimization service
    // For now, return the original URL
    return originalUrl;
  },
};

/**
 * Type definitions
 */
interface WebVitalMetric {
  name: 'LCP' | 'FID' | 'CLS' | 'FCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

interface RequestMetrics {
  url: string;
  duration: number;
  memoryDelta: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

interface MemoryUsage {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface BundleAnalysis {
  scripts: Array<{ src: string; size: number; type: 'script' }>;
  stylesheets: Array<{ src: string; size: number; type: 'stylesheet' }>;
  totalScripts: number;
  totalStylesheets: number;
}

/**
 * Helper functions
 */
function measureLCP(onReport: (_metric: WebVitalMetric) => void) {
  if (!('PerformanceObserver' in window)) return;

  const observer = new PerformanceObserver(list => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1] as PerformanceEntry;

    if (lastEntry) {
      const metric: WebVitalMetric = {
        name: 'LCP',
        value: lastEntry.startTime,
        rating: webVitals.evaluateMetric('LCP', lastEntry.startTime),
        delta: lastEntry.startTime,
        id: generateId(),
      };
      onReport(metric);
    }
  });

  observer.observe({ entryTypes: ['largest-contentful-paint'] });
}

function measureFID(onReport: (_metric: WebVitalMetric) => void) {
  if (!('PerformanceObserver' in window)) return;

  const observer = new PerformanceObserver(list => {
    const entries = list.getEntries();
    entries.forEach((entry: PerformanceEntry) => {
      const metric: WebVitalMetric = {
        name: 'FID',
        value: entry.processingStart - entry.startTime,
        rating: webVitals.evaluateMetric('FID', entry.processingStart - entry.startTime),
        delta: entry.processingStart - entry.startTime,
        id: generateId(),
      };
      onReport(metric);
    });
  });

  observer.observe({ entryTypes: ['first-input'] });
}

function measureCLS(onReport: (_metric: WebVitalMetric) => void) {
  if (!('PerformanceObserver' in window)) return;

  let clsValue = 0;
  let sessionValue = 0;
  let sessionEntries: PerformanceEntry[] = [];

  const observer = new PerformanceObserver(list => {
    const entries = list.getEntries();

    entries.forEach((entry: PerformanceEntry & { hadRecentInput?: boolean; value?: number }) => {
      if (!entry.hadRecentInput) {
        const firstSessionEntry = sessionEntries[0];
        const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

        if (
          sessionValue &&
          entry.startTime - lastSessionEntry.startTime < 1000 &&
          entry.startTime - firstSessionEntry.startTime < 5000
        ) {
          sessionValue += entry.value;
          sessionEntries.push(entry);
        } else {
          sessionValue = entry.value;
          sessionEntries = [entry];
        }

        if (sessionValue > clsValue) {
          clsValue = sessionValue;

          const metric: WebVitalMetric = {
            name: 'CLS',
            value: clsValue,
            rating: webVitals.evaluateMetric('CLS', clsValue),
            delta: entry.value,
            id: generateId(),
          };
          onReport(metric);
        }
      }
    });
  });

  observer.observe({ entryTypes: ['layout-shift'] });
}

function measureFCP(onReport: (_metric: WebVitalMetric) => void) {
  if (!('PerformanceObserver' in window)) return;

  const observer = new PerformanceObserver(list => {
    const entries = list.getEntries();
    entries.forEach((entry: PerformanceEntry) => {
      if (entry.name === 'first-contentful-paint') {
        const metric: WebVitalMetric = {
          name: 'FCP',
          value: entry.startTime,
          rating: webVitals.evaluateMetric('FCP', entry.startTime),
          delta: entry.startTime,
          id: generateId(),
        };
        onReport(metric);
      }
    });
  });

  observer.observe({ entryTypes: ['paint'] });
}

function measureTTFB(onReport: (_metric: WebVitalMetric) => void) {
  if (!('PerformanceObserver' in window)) return;

  const observer = new PerformanceObserver(list => {
    const entries = list.getEntries();
    entries.forEach(
      (entry: PerformanceEntry & { responseStart?: number; requestStart?: number }) => {
        if (entry.entryType === 'navigation') {
          const ttfb = (entry.responseStart || 0) - (entry.requestStart || 0);

          const metric: WebVitalMetric = {
            name: 'TTFB',
            value: ttfb,
            rating: webVitals.evaluateMetric('TTFB', ttfb),
            delta: ttfb,
            id: generateId(),
          };
          onReport(metric);
        }
      }
    );
  });

  observer.observe({ entryTypes: ['navigation'] });
}

function getMemoryUsage(): number {
  if ('memory' in performance) {
    return (performance as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize;
  }
  return 0;
}

function getDetailedMemoryUsage(): MemoryUsage {
  if ('memory' in performance) {
    const memory = (
      performance as {
        memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
      }
    ).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    };
  }

  return {
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
