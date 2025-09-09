/**
 * Accessibility Utilities
 *
 * Helper functions for improving accessibility and WCAG compliance.
 * Includes focus management, ARIA helpers, and keyboard navigation utilities.
 */

import React from 'react';

/**
 * Manages focus for better keyboard navigation
 */
export const focusManager = {
  /**
   * Traps focus within a container element
   *
   * @param container - The container element to trap focus within
   * @returns Function to remove the focus trap
   */
  trapFocus: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  },

  /**
   * Moves focus to an element and announces it to screen readers
   *
   * @param element - Element to focus
   * @param announcement - Optional announcement for screen readers
   */
  moveFocus: (element: HTMLElement, announcement?: string) => {
    element.focus();

    if (announcement) {
      announceToScreenReader(announcement);
    }
  },

  /**
   * Restores focus to a previously focused element
   *
   * @param previousElement - Element that was previously focused
   */
  restoreFocus: (previousElement: HTMLElement | null) => {
    if (previousElement && document.contains(previousElement)) {
      previousElement.focus();
    }
  },
};

/**
 * ARIA helpers for dynamic content
 */
export const aria = {
  /**
   * Sets ARIA live region content for screen reader announcements
   *
   * @param message - Message to announce
   * @param priority - Priority level ('polite' | 'assertive')
   */
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const liveRegion = document.getElementById('aria-live-region') || createLiveRegion();
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      liveRegion.textContent = '';
    }, 1000);
  },

  /**
   * Updates ARIA expanded state for collapsible elements
   *
   * @param trigger - Element that triggers the expansion
   * @param target - Element that expands/collapses
   * @param isExpanded - Whether the target is expanded
   */
  setExpanded: (trigger: HTMLElement, target: HTMLElement, isExpanded: boolean) => {
    trigger.setAttribute('aria-expanded', isExpanded.toString());
    target.setAttribute('aria-hidden', (!isExpanded).toString());

    if (isExpanded) {
      target.removeAttribute('inert');
    } else {
      target.setAttribute('inert', '');
    }
  },

  /**
   * Sets up ARIA describedby relationship
   *
   * @param element - Element to describe
   * @param descriptionId - ID of the description element
   */
  setDescribedBy: (element: HTMLElement, descriptionId: string) => {
    const existingIds = element.getAttribute('aria-describedby') || '';
    const ids = existingIds.split(' ').filter(id => id !== descriptionId);
    ids.push(descriptionId);
    element.setAttribute('aria-describedby', ids.join(' ').trim());
  },

  /**
   * Removes ARIA describedby relationship
   *
   * @param element - Element to update
   * @param descriptionId - ID to remove
   */
  removeDescribedBy: (element: HTMLElement, descriptionId: string) => {
    const existingIds = element.getAttribute('aria-describedby') || '';
    const ids = existingIds.split(' ').filter(id => id !== descriptionId);

    if (ids.length > 0) {
      element.setAttribute('aria-describedby', ids.join(' '));
    } else {
      element.removeAttribute('aria-describedby');
    }
  },
};

/**
 * Keyboard navigation helpers
 */
export const keyboard = {
  /**
   * Handles arrow key navigation in a list
   *
   * @param event - Keyboard event
   * @param items - Array of focusable elements
   * @param currentIndex - Current focused item index
   * @param options - Navigation options
   * @returns New focused index
   */
  handleArrowNavigation: (
    event: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    options: {
      horizontal?: boolean;
      vertical?: boolean;
      wrap?: boolean;
    } = { vertical: true, wrap: true }
  ): number => {
    const { horizontal = false, vertical = true, wrap = true } = options;
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
        if (vertical) {
          newIndex = wrap
            ? (currentIndex + 1) % items.length
            : Math.min(currentIndex + 1, items.length - 1);
          event.preventDefault();
        }
        break;
      case 'ArrowUp':
        if (vertical) {
          newIndex = wrap
            ? (currentIndex - 1 + items.length) % items.length
            : Math.max(currentIndex - 1, 0);
          event.preventDefault();
        }
        break;
      case 'ArrowRight':
        if (horizontal) {
          newIndex = wrap
            ? (currentIndex + 1) % items.length
            : Math.min(currentIndex + 1, items.length - 1);
          event.preventDefault();
        }
        break;
      case 'ArrowLeft':
        if (horizontal) {
          newIndex = wrap
            ? (currentIndex - 1 + items.length) % items.length
            : Math.max(currentIndex - 1, 0);
          event.preventDefault();
        }
        break;
      case 'Home':
        newIndex = 0;
        event.preventDefault();
        break;
      case 'End':
        newIndex = items.length - 1;
        event.preventDefault();
        break;
    }

    if (newIndex !== currentIndex) {
      items[newIndex]?.focus();
    }

    return newIndex;
  },

  /**
   * Handles Enter and Space key activation
   *
   * @param event - Keyboard event
   * @param callback - Function to call on activation
   */
  handleActivation: (event: KeyboardEvent, callback: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  },

  /**
   * Handles Escape key to close modals/menus
   *
   * @param event - Keyboard event
   * @param callback - Function to call on escape
   */
  handleEscape: (event: KeyboardEvent, callback: () => void) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      callback();
    }
  },
};

/**
 * Color contrast utilities
 */
export const contrast = {
  /**
   * Calculates color contrast ratio between two colors
   *
   * @param color1 - First color (hex, rgb, or hsl)
   * @param color2 - Second color (hex, rgb, or hsl)
   * @returns Contrast ratio (1-21)
   */
  calculateRatio: (color1: string, color2: string): number => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    if (!rgb1 || !rgb2) return 1;

    const l1 = getRelativeLuminance(rgb1);
    const l2 = getRelativeLuminance(rgb2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  },

  /**
   * Checks if color combination meets WCAG contrast requirements
   *
   * @param foreground - Foreground color
   * @param background - Background color
   * @param level - WCAG level ('AA' | 'AAA')
   * @param size - Text size ('normal' | 'large')
   * @returns Whether the combination passes
   */
  meetsWCAG: (
    foreground: string,
    background: string,
    level: 'AA' | 'AAA' = 'AA',
    size: 'normal' | 'large' = 'normal'
  ): boolean => {
    const ratio = contrast.calculateRatio(foreground, background);

    const requirements = {
      AA: { normal: 4.5, large: 3 },
      AAA: { normal: 7, large: 4.5 },
    };

    return ratio >= requirements[level][size];
  },
};

/**
 * Screen reader utilities
 */
export const screenReader = {
  /**
   * Checks if screen reader is likely active
   *
   * @returns Whether screen reader is detected
   */
  isActive: (): boolean => {
    // Check for common screen reader indicators
    return !!(
      window.navigator.userAgent.match(/NVDA|JAWS|VoiceOver|TalkBack/) ||
      window.speechSynthesis ||
      document.querySelector('[aria-live]')
    );
  },

  /**
   * Creates optimized content for screen readers
   *
   * @param visualText - Text visible to sighted users
   * @param screenReaderText - Alternative text for screen readers
   * @returns Element with appropriate content
   */
  createOptimizedContent: (visualText: string, screenReaderText?: string) => {
    if (!screenReaderText) return visualText;

    const container = document.createElement('span');

    // Visual text
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    visual.textContent = visualText;

    // Screen reader text
    const srOnly = document.createElement('span');
    srOnly.className = 'sr-only';
    srOnly.textContent = screenReaderText;

    container.appendChild(visual);
    container.appendChild(srOnly);

    return container;
  },
};

/**
 * Helper functions
 */

function createLiveRegion(): HTMLElement {
  const liveRegion = document.createElement('div');
  liveRegion.id = 'aria-live-region';
  liveRegion.className = 'sr-only';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  document.body.appendChild(liveRegion);
  return liveRegion;
}

function announceToScreenReader(message: string): void {
  aria.announce(message);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function getRelativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * React hooks for accessibility
 */

/**
 * Hook for managing focus trap in modals/dialogs
 *
 * @param isActive - Whether the focus trap should be active
 * @returns Ref to attach to the container element
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const cleanup = focusManager.trapFocus(containerRef.current);
    return cleanup;
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for announcing content changes to screen readers
 *
 * @param message - Message to announce
 * @param deps - Dependencies that trigger announcements
 */
export function useAnnouncement(message: string, deps: React.DependencyList) {
  React.useEffect(() => {
    if (message) {
      aria.announce(message);
    }
  }, deps);
}

/**
 * Hook for keyboard navigation in lists
 *
 * @param items - Array of items to navigate
 * @param options - Navigation options
 * @returns Current index and keyboard handler
 */
export function useKeyboardNavigation<T>(
  items: T[],
  options?: {
    horizontal?: boolean;
    vertical?: boolean;
    wrap?: boolean;
  }
) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const itemRefs = React.useRef<(HTMLElement | null)[]>([]);

  const handleKeyDown = React.useCallback(
    (event: KeyboardEvent) => {
      const newIndex = keyboard.handleArrowNavigation(
        event,
        itemRefs.current.filter(Boolean) as HTMLElement[],
        currentIndex,
        options
      );
      setCurrentIndex(newIndex);
    },
    [currentIndex, options]
  );

  return {
    currentIndex,
    setCurrentIndex,
    handleKeyDown,
    itemRefs,
  };
}
