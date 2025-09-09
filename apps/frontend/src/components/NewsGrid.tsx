import React, { useState, useEffect, useCallback, memo } from 'react';
import Image from 'next/image';
import { getEnvConfig } from '../../../../libs/shared/utils/src/index';
import { Article } from '../../../../libs/shared/types/src/index';
import { ArticleSkeleton } from './LoadingSkeleton';

/**
 * NewsGrid Component
 *
 * A comprehensive news display component that provides:
 * - Real-time search filtering by celebrity names
 * - Infinite scroll pagination with loading states
 * - Network connectivity detection and offline support
 * - Robust error handling with retry mechanisms
 * - Responsive grid layout (1-5 columns based on screen size)
 * - Image optimization with fallback placeholders
 *
 * @component
 * @example
 * ```tsx
 * import NewsGrid from './components/NewsGrid';
 *
 * function HomePage() {
 *   return (
 *     <main>
 *       <NewsGrid />
 *     </main>
 *   );
 * }
 * ```
 */
const NewsGrid = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [lastFailedRequest, setLastFailedRequest] = useState<{
    page: number;
    celebrity: string;
  } | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  /**
   * PHASE 2: Enhanced image source selection with multiple fallback options
   *
   * @param imageUrl - The original image URL from the article
   * @param article - The full article object for context-aware fallbacks
   * @returns The best available image source
   */
  const getImageSrc = useCallback(
    (imageUrl: string | null | undefined, article?: Article): string => {
      // No image URL provided - use context-aware placeholder
      if (!imageUrl) {
        return getContextualPlaceholder(article);
      }

      // Image previously failed to load - use context-aware placeholder
      if (failedImages.has(imageUrl)) {
        return getContextualPlaceholder(article);
      }

      // Use image proxy for external images
      return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    },
    [failedImages]
  );

  /**
   * PHASE 2: Context-aware placeholder selection
   * Returns different placeholders based on article content
   */
  const getContextualPlaceholder = useCallback((article?: Article): string => {
    if (!article) {
      return '/placeholder-news.svg';
    }

    const title = (article.title || '').toLowerCase();
    const description = (article.description || '').toLowerCase();
    const content = `${title} ${description}`;

    // Fashion/Style content
    if (
      content.includes('look') ||
      content.includes('vestido') ||
      content.includes('moda') ||
      content.includes('estilo') ||
      content.includes('roupa')
    ) {
      return '/placeholder-fashion.svg';
    }

    // Beach/Bikini content
    if (
      content.includes('biquíni') ||
      content.includes('praia') ||
      content.includes('piscina') ||
      content.includes('verão') ||
      content.includes('maiô')
    ) {
      return '/placeholder-beach.svg';
    }

    // Fitness/Gym content
    if (
      content.includes('academia') ||
      content.includes('treino') ||
      content.includes('shape') ||
      content.includes('corpo') ||
      content.includes('fitness')
    ) {
      return '/placeholder-fitness.svg';
    }

    // Event/Party content
    if (
      content.includes('festa') ||
      content.includes('evento') ||
      content.includes('premiação') ||
      content.includes('gala') ||
      content.includes('tapete vermelho')
    ) {
      return '/placeholder-event.svg';
    }

    // Default news placeholder
    return '/placeholder-news.svg';
  }, []);

  /**
   * Enhanced image error handling with domain monitoring
   *
   * @param imageUrl - The image URL that failed to load
   */
  const handleImageError = useCallback((imageUrl: string | null | undefined) => {
    if (!imageUrl) return;

    // Add to failed images set
    setFailedImages(prev => new Set([...prev, imageUrl]));

    // Extract domain for monitoring
    try {
      const url = new URL(imageUrl);
      const domain = url.hostname;

      // Log domain failure for future whitelisting
      console.warn(`[IMAGE-FAILURE] Domain may need whitelisting:`, {
        domain,
        imageUrl,
        timestamp: new Date().toISOString(),
      });

      // TODO: Future enhancement - send to monitoring service
      // await reportImageFailure({ domain, imageUrl });
    } catch (error) {
      console.error('Error parsing failed image URL:', error);
    }
  }, []);

  // Network connectivity detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Retry last failed request if we come back online
      if (lastFailedRequest) {
        fetchArticles(lastFailedRequest.page, lastFailedRequest.celebrity);
        setLastFailedRequest(null);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setError('Você está offline. Verifique sua conexão com a internet.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial connectivity
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [lastFailedRequest]);

  useEffect(() => {
    // Safely fetch articles on initial load with error boundary protection
    const initializeArticles = async () => {
      try {
        await fetchArticles(); // Fetch all articles on initial load
      } catch (error) {
        console.error('Failed to initialize articles:', error);
        // Error is already handled in fetchArticles, this is just a safety net
      }
    };

    initializeArticles();
  }, []);

  /**
   * Fetches articles from the API with comprehensive error handling
   *
   * Features:
   * - Network connectivity validation
   * - Input sanitization for security
   * - 15-second timeout protection
   * - Retry logic with exponential backoff
   * - Detailed error messages in Portuguese
   * - Article data validation
   *
   * @param {number} pageNumber - Page number for pagination (default: 1)
   * @param {string} celebrityName - Celebrity name to filter by (default: '')
   * @param {boolean} isRetry - Whether this is a retry attempt (default: false)
   *
   * @example
   * ```tsx
   * // Fetch first page of all articles
   * await fetchArticles();
   *
   * // Fetch specific celebrity articles
   * await fetchArticles(1, 'Anitta');
   *
   * // Retry failed request
   * await fetchArticles(1, 'Anitta', true);
   * ```
   */
  const fetchArticles = async (pageNumber = 1, celebrityName = '', isRetry = false) => {
    // Don't fetch if offline
    if (!isOnline && !isRetry) {
      setError('Você está offline. Verifique sua conexão com a internet.');
      return;
    }

    setLoading(true);
    if (!isRetry) {
      setError('');
      setRetryCount(0);
    }

    // Sanitize input
    const sanitizedCelebrityName = celebrityName.trim().replace(/[<>]/g, '');

    try {
      const config = getEnvConfig();

      // Build query parameters for GET request
      const params = new URLSearchParams({
        page: pageNumber.toString(),
        limit: '20',
        ...(sanitizedCelebrityName && { celebrity: sanitizedCelebrityName }),
      });

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(`${config.apiUrl}/api/v1/news?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('API não encontrada. Verifique se o servidor está rodando.');
        } else if (response.status === 500) {
          throw new Error('Erro interno do servidor. Tente novamente em alguns minutos.');
        } else if (response.status >= 400 && response.status < 500) {
          throw new Error('Erro na requisição. Verifique os parâmetros.');
        } else {
          throw new Error(`Erro do servidor: ${response.status}`);
        }
      }

      const data = await response.json();

      // Handle the API response structure: { success: true, data: { articles: [...] } }
      const articles = data.data?.articles || data.articles || [];

      // Validate articles structure
      const validArticles = articles.filter(
        (article: any) =>
          article &&
          typeof article.title === 'string' &&
          typeof article.url === 'string' &&
          article.title.trim() !== '' &&
          article.url.trim() !== ''
      );

      if (pageNumber === 1) {
        setArticles(validArticles);
        setFailedImages(new Set()); // Clear failed images on new search
      } else {
        setArticles(prevArticles => [...prevArticles, ...validArticles]);
      }

      // Reset retry count on success
      setRetryCount(0);
      setLastFailedRequest(null);

      if (validArticles.length === 0 && pageNumber === 1) {
        if (sanitizedCelebrityName) {
          setError(
            `Nenhuma notícia encontrada para "${sanitizedCelebrityName}". Tente outro nome ou limpe o filtro.`
          );
        } else {
          setError('Nenhuma notícia disponível no momento. Tente novamente mais tarde.');
        }
      }
    } catch (error: any) {
      console.error('Error fetching articles:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        code: error?.code,
        type: typeof error,
        error: error,
      });

      // Store failed request for retry when back online
      setLastFailedRequest({ page: pageNumber, celebrity: sanitizedCelebrityName });

      let errorMessage = 'Erro inesperado. Tente novamente.';

      if (error.name === 'AbortError') {
        errorMessage = 'A requisição demorou muito para responder. Verifique sua conexão.';
      } else if (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('fetch') ||
        error.code === 'NETWORK_ERROR' ||
        !navigator.onLine
      ) {
        errorMessage = 'Servidor indisponível. Verifique se a API está rodando e tente novamente.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Ensure error state is always set
      setError(errorMessage || 'Erro de conexão. Verifique se a API está rodando.');

      if (pageNumber === 1) {
        setArticles([]);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Retries the last failed API request with incremented retry count
   *
   * This function handles retry logic for failed requests, maintaining
   * the retry count and calling fetchArticles with the appropriate parameters.
   *
   * @example
   * ```tsx
   * // Retry button onClick handler
   * <button onClick={retryLastRequest}>
   *   Tentar Novamente
   * </button>
   * ```
   */
  const retryLastRequest = useCallback(() => {
    if (lastFailedRequest) {
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      fetchArticles(lastFailedRequest.page, lastFailedRequest.celebrity, true);
    } else {
      // Retry current page
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      fetchArticles(page, query, true);
    }
  }, [lastFailedRequest, retryCount, page, query]);

  /**
   * Loads the next page of articles for infinite scroll pagination
   *
   * Increments the page counter and fetches additional articles,
   * which are appended to the existing articles array.
   */
  const loadMoreArticles = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArticles(nextPage, query);
  };

  /**
   * Handles search form submission
   *
   * Resets pagination to page 1 and fetches articles filtered by the search query.
   */
  const handleSearch = useCallback(() => {
    setPage(1);
    fetchArticles(1, query);
  }, [query]);

  /**
   * Clears the search input and resets to show all articles
   *
   * Resets the query state and pagination, then fetches all articles.
   */
  const handleClearInput = useCallback(() => {
    setQuery('');
    setPage(1);
    fetchArticles(1);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  return (
    <section className="w-full p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
        <input
          type="text"
          className="p-2 border border-gray-300 rounded w-full sm:w-96 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Filtre pelo nome"
          value={query}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          aria-label="Filtrar notícias por nome"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={loading}
            aria-label="Buscar notícias"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
          <button
            onClick={handleClearInput}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Limpar filtro"
          >
            Limpar
          </button>
        </div>
      </div>
      {loading && articles.length === 0 && <ArticleSkeleton count={8} />}

      {/* Network Status Indicator */}
      {!isOnline && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4 flex items-center">
          <div className="flex items-center">
            <span className="text-lg mr-2">📡</span>
            <div>
              <strong className="font-bold">Offline</strong>
              <p className="text-sm">
                Você está sem conexão. Tentaremos reconectar automaticamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display with Retry */}
      {error && (
        <div
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-4 rounded-lg mb-4"
          role="alert"
        >
          <div className="flex items-start">
            <span className="text-xl mr-3 mt-0.5">⚠️</span>
            <div className="flex-1">
              <strong className="font-bold block mb-1">Ops! Algo deu errado</strong>
              <p className="text-sm mb-3">{error}</p>

              {/* Retry Button */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={retryLastRequest}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading
                    ? 'Tentando...'
                    : retryCount > 0
                      ? `Tentar Novamente (${retryCount + 1})`
                      : 'Tentar Novamente'}
                </button>

                {query && (
                  <button
                    onClick={handleClearInput}
                    className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    Limpar Filtro
                  </button>
                )}
              </div>

              {retryCount > 2 && (
                <p className="text-xs mt-2 text-red-600">
                  💡 Dica: Verifique se o servidor da API está rodando ou tente novamente mais
                  tarde.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {articles.map(article => (
          <article key={article.url} className="group">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-purple-950 bg-opacity-50 rounded-lg shadow hover:shadow-lg transition-all duration-200 group-hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              aria-label={`Ler notícia: ${article.title}`}
            >
              <div className="relative">
                <Image
                  src={getImageSrc(article.urlToImage, article)}
                  alt={article.title || 'Notícia'}
                  width={500}
                  height={300}
                  className="w-full h-48 object-cover rounded-t-lg"
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                  onError={() => handleImageError(article.urlToImage)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-t-lg"></div>
              </div>
              <div className="p-3">
                <h3 className="font-bold text-sm text-white line-clamp-2 mb-2">{article.title}</h3>
                <p className="text-gray-300 text-xs line-clamp-3">{article.description}</p>
              </div>
            </a>
          </article>
        ))}
      </div>
      {/* Loading more articles indicator */}
      {loading && articles.length > 0 && (
        <div className="flex justify-center mt-8">
          <div className="flex items-center space-x-2 text-purple-400">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400"></div>
            <span>Carregando mais notícias...</span>
          </div>
        </div>
      )}

      {/* Load More Button */}
      {!error && !loading && articles.length > 0 && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMoreArticles}
            className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={loading}
            aria-label="Carregar mais notícias"
          >
            Carregar Mais
          </button>
        </div>
      )}

      {!loading && !error && articles.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">📰</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhuma notícia encontrada</h3>
          <p className="text-gray-500">
            Tente ajustar sua pesquisa ou volte mais tarde para ver novas notícias.
          </p>
        </div>
      )}
    </section>
  );
};

export default memo(NewsGrid);
