import { useState, useCallback } from 'react';
import { Article, UseArticlesReturn } from '../types';
import config from '../config/env';

export const useArticles = (): UseArticlesReturn => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);

  const fetchArticles = useCallback(async (pageNumber = 1, celebrityName = '') => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${config.apiUrl}${config.newsApiEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page: pageNumber, celebrityName }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }

      const data = await response.json();

      if (pageNumber === 1) {
        setArticles(data);
      } else {
        setArticles(prevArticles => [...prevArticles, ...data]);
      }

      // Check if there are more articles to load
      setHasMore(data.length > 0);

      if (data.length === 0 && pageNumber === 1) {
        setError('No articles found. Please double-check the name and try again.');
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
      setError('An error occurred. Please try again later.');
      if (pageNumber === 1) {
        setArticles([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = Math.floor(articles.length / 10) + 1; // Assuming 10 articles per page
      fetchArticles(nextPage);
    }
  }, [articles.length, fetchArticles, hasMore, loading]);

  return {
    articles,
    loading,
    error,
    fetchArticles,
    loadMore,
    hasMore,
  };
};
