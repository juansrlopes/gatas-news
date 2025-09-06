/**
 * NewsGrid Component Tests
 *
 * Comprehensive test suite for the NewsGrid component covering:
 * - Rendering and initial state
 * - Search functionality
 * - Error handling and retry logic
 * - Loading states and pagination
 * - Network connectivity detection
 * - Accessibility features
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewsGrid from '../NewsGrid';

// Mock data
const mockArticles = [
  {
    url: 'https://example.com/article1',
    urlToImage: 'https://example.com/image1.jpg',
    title: 'Test Article 1',
    description: 'Test description 1',
    publishedAt: '2024-01-01T00:00:00Z',
    source: { id: 'test', name: 'Test Source' },
  },
  {
    url: 'https://example.com/article2',
    urlToImage: 'https://example.com/image2.jpg',
    title: 'Test Article 2',
    description: 'Test description 2',
    publishedAt: '2024-01-02T00:00:00Z',
    source: { id: 'test', name: 'Test Source' },
  },
];

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('NewsGrid Component', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Initial Rendering', () => {
    it('renders the search input and buttons', () => {
      render(<NewsGrid />);

      expect(screen.getByPlaceholderText('Filtre pelo nome')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /buscar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /limpar/i })).toBeInTheDocument();
    });

    it('shows loading skeleton on initial load', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<NewsGrid />);

      // Should show loading skeletons
      expect(screen.getByTestId('article-skeleton')).toBeInTheDocument();
    });
  });

  describe('Article Fetching', () => {
    it('fetches and displays articles successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { articles: mockArticles },
        }),
      } as Response);

      render(<NewsGrid />);

      await waitFor(() => {
        expect(screen.getByText('Test Article 1')).toBeInTheDocument();
        expect(screen.getByText('Test Article 2')).toBeInTheDocument();
      });
    });

    it('handles API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<NewsGrid />);

      await waitFor(() => {
        expect(screen.getByText(/ops! algo deu errado/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
      });
    });

    it('handles timeout errors', async () => {
      mockFetch.mockRejectedValueOnce({ name: 'AbortError' });

      render(<NewsGrid />);

      await waitFor(() => {
        expect(screen.getByText(/a requisição demorou muito/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters articles by celebrity name', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { articles: mockArticles },
        }),
      } as Response);

      render(<NewsGrid />);

      const searchInput = screen.getByPlaceholderText('Filtre pelo nome');
      const searchButton = screen.getByRole('button', { name: /buscar/i });

      await user.type(searchInput, 'Anitta');
      await user.click(searchButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('celebrity=Anitta'),
          expect.any(Object)
        );
      });
    });

    it('clears search and shows all articles', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { articles: mockArticles },
        }),
      } as Response);

      render(<NewsGrid />);

      const searchInput = screen.getByPlaceholderText('Filtre pelo nome');
      const clearButton = screen.getByRole('button', { name: /limpar/i });

      await user.type(searchInput, 'Test search');
      await user.click(clearButton);

      expect(searchInput).toHaveValue('');
    });

    it('handles Enter key for search', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { articles: mockArticles },
        }),
      } as Response);

      render(<NewsGrid />);

      const searchInput = screen.getByPlaceholderText('Filtre pelo nome');

      await user.type(searchInput, 'Anitta{enter}');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('celebrity=Anitta'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Error Handling and Retry', () => {
    it('shows retry button on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<NewsGrid />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
      });
    });

    it('retries failed requests', async () => {
      const user = userEvent.setup();

      mockFetch.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { articles: mockArticles },
        }),
      } as Response);

      render(<NewsGrid />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /tentar novamente/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Test Article 1')).toBeInTheDocument();
      });
    });

    it('shows helpful tip after multiple retries', async () => {
      const user = userEvent.setup();

      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<NewsGrid />);

      // Wait for initial error
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
      });

      // Retry multiple times
      const retryButton = screen.getByRole('button', { name: /tentar novamente/i });
      await user.click(retryButton);
      await user.click(retryButton);
      await user.click(retryButton);

      await waitFor(() => {
        expect(
          screen.getByText(/verifique se o servidor da api está rodando/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Network Connectivity', () => {
    it('shows offline indicator when offline', () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<NewsGrid />);

      // Simulate offline event
      fireEvent(window, new Event('offline'));

      expect(screen.getByText(/offline/i)).toBeInTheDocument();
      expect(screen.getByText(/você está sem conexão/i)).toBeInTheDocument();
    });

    it('retries request when coming back online', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { articles: mockArticles },
        }),
      } as Response);

      render(<NewsGrid />);

      // Simulate going offline then online
      fireEvent(window, new Event('offline'));
      fireEvent(window, new Event('online'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe('Pagination', () => {
    it('loads more articles when clicking load more button', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { articles: mockArticles },
        }),
      } as Response);

      render(<NewsGrid />);

      // Wait for initial articles to load
      await waitFor(() => {
        expect(screen.getByText('Test Article 1')).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByRole('button', { name: /carregar mais/i });
      await user.click(loadMoreButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('page=2'),
          expect.any(Object)
        );
      });
    });

    it('shows loading indicator when loading more articles', async () => {
      const user = userEvent.setup();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { articles: mockArticles },
          }),
        } as Response)
        .mockImplementation(() => new Promise(() => {})); // Never resolves for second call

      render(<NewsGrid />);

      // Wait for initial articles
      await waitFor(() => {
        expect(screen.getByText('Test Article 1')).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByRole('button', { name: /carregar mais/i });
      await user.click(loadMoreButton);

      expect(screen.getByText(/carregando mais notícias/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<NewsGrid />);

      expect(screen.getByLabelText('Filtrar notícias por nome')).toBeInTheDocument();
      expect(screen.getByLabelText('Buscar notícias')).toBeInTheDocument();
      expect(screen.getByLabelText('Limpar filtro')).toBeInTheDocument();
    });

    it('has proper error alert role', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<NewsGrid />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no articles found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { articles: [] },
        }),
      } as Response);

      render(<NewsGrid />);

      await waitFor(() => {
        expect(screen.getByText(/nenhuma notícia encontrada/i)).toBeInTheDocument();
      });
    });

    it('shows specific message for search with no results', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { articles: [] },
        }),
      } as Response);

      render(<NewsGrid />);

      const searchInput = screen.getByPlaceholderText('Filtre pelo nome');
      await user.type(searchInput, 'NonexistentCelebrity');

      const searchButton = screen.getByRole('button', { name: /buscar/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(
          screen.getByText(/nenhuma notícia encontrada para "NonexistentCelebrity"/i)
        ).toBeInTheDocument();
      });
    });
  });
});
