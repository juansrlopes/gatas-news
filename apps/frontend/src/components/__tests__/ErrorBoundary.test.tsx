/**
 * ErrorBoundary Component Tests
 *
 * Test suite for the ErrorBoundary component covering:
 * - Error catching and display
 * - Recovery mechanisms
 * - Development vs production behavior
 * - Custom error handlers
 * - Reset functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

// Mock console.error to avoid noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary Component', () => {
  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('does not show error UI when no error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText(/algo deu errado/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('catches and displays error when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/oops! algo deu errado/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /recarregar página/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /voltar/i })).toBeInTheDocument();
    });

    it('shows error ID for support', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/id do erro:/i)).toBeInTheDocument();
    });

    it('calls custom error handler when provided', () => {
      const mockErrorHandler = jest.fn();

      render(
        <ErrorBoundary onError={mockErrorHandler}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(mockErrorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });
  });

  describe('Recovery Mechanisms', () => {
    it('allows retry by resetting error state', async () => {
      const user = userEvent.setup();
      let shouldThrow = true;

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );

      // Error should be displayed
      expect(screen.getByText(/oops! algo deu errado/i)).toBeInTheDocument();

      // Fix the error condition
      shouldThrow = false;

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /tentar novamente/i });
      await user.click(retryButton);

      // Rerender with fixed component
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );

      // Should show the working component
      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('reloads page when reload button is clicked', async () => {
      const user = userEvent.setup();
      const mockReload = jest.fn();

      // Mock window.location.reload
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /recarregar página/i });
      await user.click(reloadButton);

      expect(mockReload).toHaveBeenCalled();
    });

    it('goes back when back button is clicked', async () => {
      const user = userEvent.setup();
      const mockBack = jest.fn();

      // Mock window.history.back
      Object.defineProperty(window, 'history', {
        value: { back: mockBack },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const backButton = screen.getByRole('button', { name: /voltar/i });
      await user.click(backButton);

      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const CustomFallback = <div>Custom error message</div>;

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText(/oops! algo deu errado/i)).not.toBeInTheDocument();
    });
  });

  describe('Development Features', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('shows error details in development mode', () => {
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/detalhes do erro/i)).toBeInTheDocument();
    });

    it('hides error details in production mode', () => {
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/detalhes do erro/i)).not.toBeInTheDocument();
    });
  });

  describe('Reset on Props Change', () => {
    it('resets error state when resetKeys change', () => {
      let resetKey = 'key1';

      const { rerender } = render(
        <ErrorBoundary resetKeys={[resetKey]}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error should be displayed
      expect(screen.getByText(/oops! algo deu errado/i)).toBeInTheDocument();

      // Change reset key
      resetKey = 'key2';

      rerender(
        <ErrorBoundary resetKeys={[resetKey]}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // Should reset and show working component
      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('resets error state when resetOnPropsChange is true and children change', () => {
      const { rerender } = render(
        <ErrorBoundary resetOnPropsChange={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error should be displayed
      expect(screen.getByText(/oops! algo deu errado/i)).toBeInTheDocument();

      // Change children
      rerender(
        <ErrorBoundary resetOnPropsChange={true}>
          <div>Different content</div>
        </ErrorBoundary>
      );

      // Should reset and show new content
      expect(screen.getByText('Different content')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('has proper button labels', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /🔄 tentar novamente/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /🔃 recarregar página/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /← voltar/i })).toBeInTheDocument();
    });
  });
});
