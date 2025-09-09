/**
 * Test Helper Utilities
 *
 * Common testing utilities and custom render functions for consistent testing.
 * Includes helpers for user interactions, async operations, and component testing.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// import { UserEvent } from '@testing-library/user-event/dist/types/setup/setup';

/**
 * Custom render function with common providers and setup
 *
 * @param ui - The component to render
 * @param options - Additional render options
 * @returns Render result with additional utilities
 */
export const renderWithProviders = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  // Add any global providers here (Context, Router, etc.)
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
  };

  return render(ui, { wrapper: Wrapper, ...options });
};

/**
 * Sets up user event with default configuration
 *
 * @returns Configured UserEvent instance
 */
export const setupUser = () => {
  return userEvent.setup({
    // Add default user event configuration
    advanceTimers: jest.advanceTimersByTime,
  });
};

/**
 * Waits for an element to appear and returns it
 *
 * @param text - Text content or regex to find
 * @param options - Additional options for finding the element
 * @returns Promise that resolves to the found element
 */
export const waitForElement = async (
  text: string | RegExp,
  options?: Parameters<typeof screen.findByText>[1]
) => {
  return await screen.findByText(text, options);
};

/**
 * Waits for an element to disappear
 *
 * @param text - Text content or regex to find
 * @param options - Additional options
 */
export const waitForElementToDisappear = async (
  text: string | RegExp,
  options?: { timeout?: number }
) => {
  await waitFor(
    () => {
      expect(screen.queryByText(text)).not.toBeInTheDocument();
    },
    { timeout: options?.timeout || 5000 }
  );
};

/**
 * Simulates typing in a search input and submitting
 *
 * @param searchTerm - The term to search for
 * @param submitMethod - How to submit ('button' | 'enter')
 */
export const performSearch = async (
  searchTerm: string,
  submitMethod: 'button' | 'enter' = 'button'
) => {
  const user = setupUser();
  const searchInput = screen.getByPlaceholderText(/filtre pelo nome/i);

  await user.clear(searchInput);
  await user.type(searchInput, searchTerm);

  if (submitMethod === 'button') {
    const searchButton = screen.getByRole('button', { name: /buscar/i });
    await user.click(searchButton);
  } else {
    await user.keyboard('{Enter}');
  }
};

/**
 * Simulates clearing the search input
 */
export const clearSearch = async () => {
  const user = setupUser();
  const clearButton = screen.getByRole('button', { name: /limpar/i });
  await user.click(clearButton);
};

/**
 * Simulates clicking the load more button
 */
export const loadMoreArticles = async () => {
  const user = setupUser();
  const loadMoreButton = screen.getByRole('button', { name: /carregar mais/i });
  await user.click(loadMoreButton);
};

/**
 * Simulates clicking the retry button in error states
 */
export const retryFailedRequest = async () => {
  const user = setupUser();
  const retryButton = screen.getByRole('button', { name: /tentar novamente/i });
  await user.click(retryButton);
};

/**
 * Simulates network connectivity changes
 */
export const simulateNetworkChange = {
  goOffline: () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
    window.dispatchEvent(new Event('offline'));
  },

  goOnline: () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    window.dispatchEvent(new Event('online'));
  },
};

/**
 * Mock fetch with different response scenarios
 */
export const mockFetch = {
  /**
   * Sets up fetch to return successful response
   */
  mockSuccess: (data: any) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(data),
    });
  },

  /**
   * Sets up fetch to return error response
   */
  mockError: (status: number = 500, message: string = 'Server Error') => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status,
      json: () => Promise.resolve({ error: message }),
    });
  },

  /**
   * Sets up fetch to reject with network error
   */
  mockNetworkError: () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));
  },

  /**
   * Sets up fetch to timeout
   */
  mockTimeout: () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce({ name: 'AbortError' });
  },

  /**
   * Sets up fetch to never resolve (for loading states)
   */
  mockLoading: () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));
  },

  /**
   * Resets all fetch mocks
   */
  reset: () => {
    (global.fetch as jest.Mock).mockReset();
  },
};

/**
 * Assertion helpers for common test scenarios
 */
export const assertions = {
  /**
   * Asserts that loading skeleton is visible
   */
  expectLoadingSkeleton: () => {
    expect(screen.getByTestId('article-skeleton')).toBeInTheDocument();
  },

  /**
   * Asserts that error message is displayed
   */
  expectErrorMessage: (message?: string | RegExp) => {
    if (message) {
      expect(screen.getByText(message)).toBeInTheDocument();
    } else {
      expect(screen.getByText(/algo deu errado/i)).toBeInTheDocument();
    }
  },

  /**
   * Asserts that articles are displayed
   */
  expectArticles: (count?: number) => {
    const articles = screen.getAllByRole('article');
    if (count !== undefined) {
      expect(articles).toHaveLength(count);
    } else {
      expect(articles.length).toBeGreaterThan(0);
    }
  },

  /**
   * Asserts that no articles message is displayed
   */
  expectNoArticles: () => {
    expect(screen.getByText(/nenhuma notícia encontrada/i)).toBeInTheDocument();
  },

  /**
   * Asserts that retry button is visible
   */
  expectRetryButton: () => {
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  },

  /**
   * Asserts that offline indicator is visible
   */
  expectOfflineIndicator: () => {
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  },
};

/**
 * Debugging helpers for tests
 */
export const debug = {
  /**
   * Logs the current DOM structure
   */
  logDOM: () => {
    screen.debug();
  },

  /**
   * Logs all elements with a specific role
   */
  logByRole: (role: string) => {
    const elements = screen.getAllByRole(role as any);
    console.log(`Found ${elements.length} elements with role "${role}":`, elements);
  },

  /**
   * Logs all elements containing specific text
   */
  logByText: (text: string | RegExp) => {
    const elements = screen.getAllByText(text);
    console.log(`Found ${elements.length} elements with text "${text}":`, elements);
  },

  /**
   * Logs current fetch mock calls
   */
  logFetchCalls: () => {
    const mockFetch = global.fetch as jest.Mock;
    console.log('Fetch calls:', mockFetch.mock.calls);
  },
};

/**
 * Performance testing helpers
 */
export const performance = {
  /**
   * Measures component render time
   */
  measureRenderTime: async (renderFn: () => void): Promise<number> => {
    const start = window.performance.now();
    renderFn();
    await waitFor(() => {
      // Wait for component to be fully rendered
    });
    const end = window.performance.now();
    return end - start;
  },

  /**
   * Checks if component renders within acceptable time
   */
  expectFastRender: async (renderFn: () => void, maxTime: number = 100) => {
    const renderTime = await performance.measureRenderTime(renderFn);
    expect(renderTime).toBeLessThan(maxTime);
  },
};

/**
 * Accessibility testing helpers
 */
export const accessibility = {
  /**
   * Checks if element has proper ARIA label
   */
  expectAriaLabel: (element: HTMLElement, expectedLabel: string) => {
    expect(element).toHaveAttribute('aria-label', expectedLabel);
  },

  /**
   * Checks if element is focusable
   */
  expectFocusable: (element: HTMLElement) => {
    expect(element).toHaveAttribute('tabindex');
  },

  /**
   * Checks if error has proper alert role
   */
  expectErrorAlert: () => {
    expect(screen.getByRole('alert')).toBeInTheDocument();
  },
};

// Re-export commonly used testing utilities
export { screen, waitFor, fireEvent } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
