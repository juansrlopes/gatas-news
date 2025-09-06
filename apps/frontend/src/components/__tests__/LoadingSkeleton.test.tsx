/**
 * LoadingSkeleton Component Tests
 *
 * Test suite for loading skeleton components covering:
 * - Basic skeleton rendering
 * - Article skeleton grid layout
 * - Instagram skeleton layout
 * - Custom props and styling
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSkeleton, ArticleSkeleton, InstagramSkeleton } from '../LoadingSkeleton';

describe('LoadingSkeleton Components', () => {
  describe('LoadingSkeleton', () => {
    it('renders with default styling', () => {
      render(<LoadingSkeleton />);

      const skeleton = screen.getByRole('generic');
      expect(skeleton).toHaveClass('animate-pulse', 'bg-gray-300', 'rounded');
    });

    it('applies custom className', () => {
      render(<LoadingSkeleton className="h-4 w-full custom-class" />);

      const skeleton = screen.getByRole('generic');
      expect(skeleton).toHaveClass('h-4', 'w-full', 'custom-class');
    });

    it('maintains base classes with custom className', () => {
      render(<LoadingSkeleton className="custom-class" />);

      const skeleton = screen.getByRole('generic');
      expect(skeleton).toHaveClass('animate-pulse', 'bg-gray-300', 'rounded', 'custom-class');
    });
  });

  describe('ArticleSkeleton', () => {
    it('renders default number of skeleton articles', () => {
      render(<ArticleSkeleton />);

      // Default is 6 articles
      const skeletons = screen.getAllByRole('generic');
      // Each article has multiple skeleton elements (image, title, description lines)
      // So we check for the container divs with the specific class
      const articleContainers = document.querySelectorAll('.bg-purple-950');
      expect(articleContainers).toHaveLength(6);
    });

    it('renders custom number of skeleton articles', () => {
      render(<ArticleSkeleton count={3} />);

      const articleContainers = document.querySelectorAll('.bg-purple-950');
      expect(articleContainers).toHaveLength(3);
    });

    it('renders with proper grid layout classes', () => {
      const { container } = render(<ArticleSkeleton />);

      const gridContainer = container.firstChild;
      expect(gridContainer).toHaveClass(
        'grid',
        'grid-cols-1',
        'sm:grid-cols-2',
        'md:grid-cols-3',
        'lg:grid-cols-4',
        'xl:grid-cols-5',
        'gap-4'
      );
    });

    it('renders skeleton elements for each article', () => {
      render(<ArticleSkeleton count={1} />);

      // Should have image skeleton (h-48)
      expect(document.querySelector('.h-48')).toBeInTheDocument();

      // Should have title and description skeletons
      const skeletonElements = document.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(1);
    });

    it('handles zero count gracefully', () => {
      render(<ArticleSkeleton count={0} />);

      const articleContainers = document.querySelectorAll('.bg-purple-950');
      expect(articleContainers).toHaveLength(0);
    });
  });

  describe('InstagramSkeleton', () => {
    it('renders default number of skeleton profiles', () => {
      render(<InstagramSkeleton />);

      // Default is 10 profiles
      const profileContainers = document.querySelectorAll('.bg-purple-950');
      expect(profileContainers).toHaveLength(10);
    });

    it('renders custom number of skeleton profiles', () => {
      render(<InstagramSkeleton count={5} />);

      const profileContainers = document.querySelectorAll('.bg-purple-950');
      expect(profileContainers).toHaveLength(5);
    });

    it('renders with proper grid layout classes', () => {
      const { container } = render(<InstagramSkeleton />);

      const gridContainer = container.firstChild;
      expect(gridContainer).toHaveClass(
        'grid',
        'grid-cols-1',
        'sm:grid-cols-2',
        'md:grid-cols-3',
        'lg:grid-cols-4',
        'xl:grid-cols-5',
        'gap-4'
      );
    });

    it('renders taller skeleton for Instagram layout', () => {
      render(<InstagramSkeleton count={1} />);

      // Instagram skeletons should be taller (h-96)
      expect(document.querySelector('.h-96')).toBeInTheDocument();
    });

    it('includes profile elements (image and text)', () => {
      render(<InstagramSkeleton count={1} />);

      // Should have profile image skeleton (h-96)
      expect(document.querySelector('.h-96')).toBeInTheDocument();

      // Should have text skeletons for username and button
      const skeletonElements = document.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(1);
    });

    it('handles zero count gracefully', () => {
      render(<InstagramSkeleton count={0} />);

      const profileContainers = document.querySelectorAll('.bg-purple-950');
      expect(profileContainers).toHaveLength(0);
    });
  });

  describe('Animation and Styling', () => {
    it('all skeletons have pulse animation', () => {
      render(
        <div>
          <LoadingSkeleton />
          <ArticleSkeleton count={1} />
          <InstagramSkeleton count={1} />
        </div>
      );

      const animatedElements = document.querySelectorAll('.animate-pulse');
      expect(animatedElements.length).toBeGreaterThan(0);

      // Each animated element should have the pulse class
      animatedElements.forEach(element => {
        expect(element).toHaveClass('animate-pulse');
      });
    });

    it('maintains consistent styling across skeleton types', () => {
      render(
        <div>
          <ArticleSkeleton count={1} />
          <InstagramSkeleton count={1} />
        </div>
      );

      const containers = document.querySelectorAll('.bg-purple-950');
      containers.forEach(container => {
        expect(container).toHaveClass('bg-purple-950', 'bg-opacity-50', 'rounded-lg', 'shadow');
      });
    });
  });

  describe('Accessibility', () => {
    it('provides appropriate semantic structure', () => {
      render(<ArticleSkeleton count={2} />);

      // Should use generic divs for loading states (not interactive elements)
      const skeletons = screen.getAllByRole('generic');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('does not interfere with screen readers', () => {
      render(<LoadingSkeleton />);

      // Loading skeletons should not have aria-labels or roles that confuse screen readers
      const skeleton = screen.getByRole('generic');
      expect(skeleton).not.toHaveAttribute('aria-label');
      expect(skeleton).not.toHaveAttribute('aria-describedby');
    });
  });
});
