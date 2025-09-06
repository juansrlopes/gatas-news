import React, { useState, useEffect, useCallback, memo } from 'react';
import Image from 'next/image';
import { getEnvConfig } from '../../../../libs/shared/utils/src/index';
import { Article } from '../../../../libs/shared/types/src/index';
import { ArticleSkeleton } from './LoadingSkeleton';

const NewsGrid = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchArticles(); // Fetch all articles on initial load
  }, []);

  const fetchArticles = async (pageNumber = 1, celebrityName = '') => {
    setLoading(true);
    setError('');
    try {
      // Currently using mock API - will be replaced with real news API
      const config = getEnvConfig();
      // Build query parameters for GET request
      const params = new URLSearchParams({
        page: pageNumber.toString(),
        limit: '20',
        ...(celebrityName && { celebrity: celebrityName }),
      });

      const response = await fetch(`${config.apiUrl}/api/v1/news?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }

      const data = await response.json();
      // Handle the API response structure: { success: true, data: { articles: [...] } }
      const articles = data.data?.articles || data.articles || [];

      if (pageNumber === 1) {
        setArticles(articles);
      } else {
        setArticles(prevArticles => [...prevArticles, ...articles]);
      }

      if (articles.length === 0 && pageNumber === 1) {
        setError('No articles found. Please double-check the name and try again.');
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
      setError('An error occurred. Please try again later.');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreArticles = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArticles(nextPage, query);
  };

  const handleSearch = useCallback(() => {
    setPage(1);
    fetchArticles(1, query);
  }, [query]);

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
      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
          role="alert"
        >
          <strong className="font-bold">Erro: </strong>
          <span className="block sm:inline">{error}</span>
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
                  src={`/api/image-proxy?url=${encodeURIComponent(article.urlToImage)}`}
                  alt={article.title}
                  width={500}
                  height={300}
                  className="w-full h-48 object-cover rounded-t-lg"
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
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
      {!error && articles.length > 0 && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMoreArticles}
            className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={loading}
            aria-label="Carregar mais notícias"
          >
            {loading ? 'Carregando...' : 'Carregar Mais'}
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
