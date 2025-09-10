import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Article } from '../../../../libs/shared/types/src/index';
import { ArticleSkeleton } from './LoadingSkeleton';

/**
 * ArticleCard Component - Individual article display
 */
interface ArticleCardProps {
  article: Article;
  onImageError: (_imageUrl: string | null | undefined) => void;
  getImageSrc: (_urlToImage: string | null | undefined, _article: Article) => string;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, onImageError, getImageSrc }) => (
  <article className="group h-80"> {/* Fixed height for consistent card sizes */}
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col h-full bg-purple-950 bg-opacity-50 rounded-lg shadow hover:shadow-lg transition-all duration-200 group-hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
      aria-label={`Ler notícia: ${article.title}`}
    >
      <div className="relative flex-shrink-0">
        <Image
          src={getImageSrc(article.urlToImage, article)}
          alt={article.title || 'Notícia'}
          width={500}
          height={300}
          className="w-full h-48 object-cover rounded-t-lg"
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          onError={() => onImageError(article.urlToImage)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-t-lg"></div>
      </div>
      <div className="flex-1 flex flex-col p-3">
        <h3 className="font-bold text-sm text-white line-clamp-2 mb-2 flex-shrink-0">{article.title}</h3>
        <p 
          className="text-gray-300 text-xs leading-relaxed overflow-hidden"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            lineHeight: '1.4',
            maxHeight: '4.2em' // 3 lines * 1.4 line-height
          }}
        >
          {article.description}
        </p>
      </div>
    </a>
  </article>
);

// Add display name for React DevTools
ArticleCard.displayName = 'ArticleCard';

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
  const [allArticles, setAllArticles] = useState<Article[]>([]); // All fetched articles
  const [displayedArticles, setDisplayedArticles] = useState<Article[]>([]); // Currently displayed articles
  const [articlesToShow, setArticlesToShow] = useState(20); // How many articles to show (starts at 20)
  const [hasMoreFromAPI, setHasMoreFromAPI] = useState(true); // Whether API has more articles
  const [dbQuery, setDbQuery] = useState(''); // Database search query
  const [liveQuery, setLiveQuery] = useState(''); // Live search query
  const [showLiveSearch, setShowLiveSearch] = useState(false); // Show/hide live search
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Rate limiting for live search
  const [dailySearchCount, setDailySearchCount] = useState(0);
  const [maxDailySearches] = useState(5);
  const [searchSource, setSearchSource] = useState<'database' | 'live'>('database');
  
  // Grid configuration - show 4 rows initially, then 4 more rows on Load More
  const ARTICLES_PER_PAGE = 20; // 4 rows × 5 columns = 20 articles per load

  // Update displayed articles when articlesToShow or allArticles changes
  useEffect(() => {
    setDisplayedArticles(allArticles.slice(0, articlesToShow));
  }, [allArticles, articlesToShow]);

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
  const fetchArticles = useCallback(
    async (pageNumber = 1, celebrityName = '', isRetry = false, isLiveSearch = false) => {
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

        // Build query parameters for GET request
        const params = new URLSearchParams({
          page: pageNumber.toString(),
          limit: ARTICLES_PER_PAGE.toString(),
          ...(sanitizedCelebrityName && { celebrity: sanitizedCelebrityName }),
          source: isLiveSearch ? 'live' : 'database',
        });

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch(`http://localhost:8000/api/v1/news?${params}`, {
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

        // Handle the API response structure: { success: true, data: { articles: [...], hasMore: boolean } }
        const articles = data.data?.articles || data.articles || [];
        const hasMore = data.data?.hasMore ?? true; // Default to true if not provided

        // Validate articles structure
        const validArticles = articles.filter(
          (article: unknown): article is Article =>
            article !== null &&
            typeof article === 'object' &&
            'title' in article &&
            'url' in article &&
            typeof (article as Article).title === 'string' &&
            typeof (article as Article).url === 'string' &&
            (article as Article).title.trim() !== '' &&
            (article as Article).url.trim() !== ''
        );

        if (pageNumber === 1) {
          setAllArticles(validArticles);
          setArticlesToShow(20); // Reset to show only 4 rows initially
          setFailedImages(new Set()); // Clear failed images on new search
        } else {
          setAllArticles(prevArticles => [...prevArticles, ...validArticles]);
        }

        // Update hasMore state based on API response
        setHasMoreFromAPI(hasMore);

        // Reset retry count on success
        setRetryCount(0);

        if (validArticles.length === 0 && pageNumber === 1) {
          if (sanitizedCelebrityName) {
            setError(
              `Nenhuma notícia encontrada para "${sanitizedCelebrityName}". Tente outro nome ou limpe o filtro.`
            );
          } else {
            setError('Nenhuma notícia disponível no momento. Tente novamente mais tarde.');
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorName = error instanceof Error ? error.name : 'UnknownError';
        const errorStack = error instanceof Error ? error.stack : undefined;
        const errorCode =
          error && typeof error === 'object' && 'code' in error
            ? (error as { code: unknown }).code
            : undefined;

        console.error('Error fetching articles:', {
          message: errorMessage,
          name: errorName,
          stack: errorStack,
          code: errorCode,
          type: typeof error,
          error: error,
        });

        // Failed request - will be retried with current state

        let displayErrorMessage = 'Erro inesperado. Tente novamente.';

        if (errorName === 'AbortError') {
          displayErrorMessage = 'A requisição demorou muito para responder. Verifique sua conexão.';
        } else if (
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('fetch') ||
          errorCode === 'NETWORK_ERROR' ||
          !navigator.onLine
        ) {
          displayErrorMessage =
            'Servidor indisponível. Verifique se a API está rodando e tente novamente.';
        } else if (errorMessage) {
          displayErrorMessage = errorMessage;
        }

        // Ensure error state is always set
        setError(displayErrorMessage || 'Erro de conexão. Verifique se a API está rodando.');

        if (pageNumber === 1) {
          setAllArticles([]);
          setArticlesToShow(20);
          setHasMoreFromAPI(true); // Reset for new search
        }
      } finally {
        setLoading(false);
      }
    },
    [isOnline]
  );


  /**
   * Simple image source selection with fallback placeholder
   */
  const getImageSrc = useCallback(
    (imageUrl: string | null | undefined, _article?: Article): string => {
      // No image URL provided or failed to load - use simple placeholder
      if (!imageUrl || failedImages.has(imageUrl)) {
        return '/placeholder-news.svg';
      }

      // Use image proxy for external images
      return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    },
    [failedImages]
  );

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

  // Rate limiting: Track daily search count in localStorage
  useEffect(() => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('gatas-search-count');

    try {
      const data = stored ? JSON.parse(stored) : {};

      if (data.date === today) {
        setDailySearchCount(data.count || 0);
      } else {
        // Reset for new day
        const newData = { date: today, count: 0 };
        localStorage.setItem('gatas-search-count', JSON.stringify(newData));
        setDailySearchCount(0);
      }
    } catch (error) {
      console.error('Error reading search count from localStorage:', error);
      setDailySearchCount(0);
    }
  }, []);

  // Auto-hide live search after successful database search
  useEffect(() => {
    if (displayedArticles.length > 0 && !liveQuery && searchSource === 'database') {
      setShowLiveSearch(false);
    }
  }, [displayedArticles, liveQuery, searchSource]);

  // Network connectivity detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Clear error when back online
      setError('');
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
  }, [fetchArticles]);

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
  }, [fetchArticles]);

  /**
   * Retries the last failed API request with incremented retry count
   *
   * This function handles retry logic for failed requests, maintaining
   * the retry count and calling fetchArticles with the appropriate parameters.
   *
   * @example
   * ```tsx
   * // Retry button onClick handler
   * <button onClick={retryRequest}>
   *   Tentar Novamente
   * </button>
   * ```
   */
  const retryRequest = useCallback(() => {
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    const currentQuery = searchSource === 'live' ? liveQuery : dbQuery;
    fetchArticles(page, currentQuery, true, searchSource === 'live');
  }, [retryCount, page, dbQuery, liveQuery, searchSource, fetchArticles]);

  /**
   * Loads the next page of articles for infinite scroll pagination
   *
   * Increments the page counter and fetches additional articles,
   * which are appended to the existing articles array.
   */
  const loadMoreArticles = () => {
    const newArticlesToShow = articlesToShow + 20;
    
    // If we have enough articles already fetched, just show more
    if (allArticles.length >= newArticlesToShow) {
      setArticlesToShow(newArticlesToShow);
    } else {
      // Need to fetch more articles from API
      const nextPage = page + 1;
      setPage(nextPage);
      const currentQuery = searchSource === 'live' ? liveQuery : dbQuery;
      setArticlesToShow(newArticlesToShow); // Update display count
      fetchArticles(nextPage, currentQuery, false, searchSource === 'live');
    }
  };

  /**
   * Handles database search form submission
   *
   * Resets pagination to page 1 and fetches articles from database.
   */
  const handleDatabaseSearch = useCallback(() => {
    setPage(1);
    setSearchSource('database');
    fetchArticles(1, dbQuery, false, false);
  }, [dbQuery, fetchArticles]);

  /**
   * Handles live search form submission with rate limiting
   *
   * Checks rate limits, increments counter, and fetches from NewsAPI.
   */
  const handleLiveSearch = useCallback(() => {
    // Check rate limit
    if (dailySearchCount >= maxDailySearches) {
      setError(
        `Limite diário de buscas atingido (${maxDailySearches}/dia). Tente novamente amanhã.`
      );
      return;
    }

    // Increment search count and save to localStorage
    const newCount = dailySearchCount + 1;
    setDailySearchCount(newCount);

    const today = new Date().toDateString();
    const searchData = { date: today, count: newCount };
    localStorage.setItem('gatas-search-count', JSON.stringify(searchData));

    // Perform live search
    setPage(1);
    setSearchSource('live');
    fetchArticles(1, liveQuery, false, true);
  }, [liveQuery, dailySearchCount, maxDailySearches, fetchArticles]);

  /**
   * Clears the database search input and resets to show all articles
   */
  const handleClearDatabaseInput = useCallback(() => {
    setDbQuery('');
    setPage(1);
    setSearchSource('database');
    fetchArticles(1, '', false, false);
  }, [fetchArticles]);

  /**
   * Shows the live search interface
   */
  const handleShowLiveSearch = useCallback(() => {
    setShowLiveSearch(true);
  }, []);

  /**
   * Hides the live search interface and clears live query
   */
  const handleCancelLiveSearch = useCallback(() => {
    setShowLiveSearch(false);
    setLiveQuery('');
  }, []);

  // Input change handlers
  const handleDbInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDbQuery(e.target.value);
  }, []);

  const handleLiveInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLiveQuery(e.target.value);
  }, []);

  // Key press handlers
  const handleDbKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleDatabaseSearch();
      }
    },
    [handleDatabaseSearch]
  );

  const handleLiveKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleLiveSearch();
      }
    },
    [handleLiveSearch]
  );

  return (
    <section className="w-full p-4">
      {/* Database Search Section (Always Visible) */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2">
          <input
            type="text"
            className="p-2 border border-gray-300 rounded w-full sm:w-96 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Busque por Anitta, Bruna Marquezine, Paolla Oliveira..."
            value={dbQuery}
            onChange={handleDbInputChange}
            onKeyPress={handleDbKeyPress}
            aria-label="Buscar notícias na nossa base de dados"
          />
          <div className="flex gap-2">
            <button
              onClick={handleDatabaseSearch}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
              disabled={loading}
              aria-label="Buscar notícias"
            >
              {loading && searchSource === 'database' ? 'Buscando...' : 'Buscar'}
            </button>
            <button
              onClick={handleClearDatabaseInput}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Limpar filtro"
            >
              Limpar
            </button>
          </div>
        </div>

        <p className="text-sm text-white">🗃️ Busca rápida e gratuita na nossa base de dados</p>

        {/* Live Search Trigger */}
        {!showLiveSearch && (
          <div className="mt-2">
            <button
              onClick={handleShowLiveSearch}
              className="text-sm text-white hover:text-purple-300 underline transition-colors cursor-pointer"
              aria-label="Mostrar busca ao vivo"
            >
              + Não encontrou? Buscar ao vivo ({maxDailySearches - dailySearchCount} restantes)
            </button>
          </div>
        )}
      </div>

      {/* Live Search Section - Clean design matching database search */}
      {showLiveSearch && (
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2">
            <input
              type="text"
              className="p-2 border border-gray-300 rounded w-full sm:w-96 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Digite o nome da celebridade para busca ao vivo..."
              value={liveQuery}
              onChange={handleLiveInputChange}
              onKeyPress={handleLiveKeyPress}
              aria-label="Buscar celebridade ao vivo"
            />
            <div className="flex gap-2">
              <button
                onClick={handleLiveSearch}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
                disabled={loading || dailySearchCount >= maxDailySearches}
                aria-label="Buscar ao vivo"
              >
                {loading && searchSource === 'live' ? 'Buscando...' : 'Buscar ao Vivo'}
              </button>
              <button
                onClick={handleCancelLiveSearch}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                aria-label="Cancelar"
              >
                Cancelar
              </button>
            </div>
          </div>
          <p className="text-sm text-white">
            🔴 Busca ao vivo limitada: {maxDailySearches - dailySearchCount}/{maxDailySearches}{' '}
            buscas restantes hoje
          </p>
        </div>
      )}

      {loading && displayedArticles.length === 0 && <ArticleSkeleton count={ARTICLES_PER_PAGE} />}

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
                  onClick={retryRequest}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading
                    ? 'Tentando...'
                    : retryCount > 0
                      ? `Tentar Novamente (${retryCount + 1})`
                      : 'Tentar Novamente'}
                </button>

                {(dbQuery || liveQuery) && (
                  <button
                    onClick={
                      searchSource === 'live' ? handleCancelLiveSearch : handleClearDatabaseInput
                    }
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
        {displayedArticles.map(article => (
          <ArticleCard
            key={article.url}
            article={article}
            onImageError={handleImageError}
            getImageSrc={getImageSrc}
          />
        ))}
      </div>
      {/* Loading more articles indicator */}
      {loading && displayedArticles.length > 0 && (
        <div className="flex justify-center mt-8">
          <div className="flex items-center space-x-2 text-purple-400">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400"></div>
            <span>Carregando mais notícias...</span>
          </div>
        </div>
      )}

      {/* Load More Button */}
      {!error && !loading && displayedArticles.length > 0 && (allArticles.length > displayedArticles.length || hasMoreFromAPI) && (
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

      {!loading && !error && displayedArticles.length === 0 && (
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

// Add display name for React DevTools
NewsGrid.displayName = 'NewsGrid';

export default NewsGrid;
