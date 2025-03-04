import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Article {
  url: string;
  urlToImage: string;
  title: string;
  description: string;
}

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
      const response = await fetch('http://localhost:3000/news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page: pageNumber, celebrityName }), // Include page number and celebrity name
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

      if (data.length === 0 && pageNumber === 1) {
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

  const handleSearch = () => {
    setPage(1); // Reset page number on new search
    fetchArticles(1, query); // Fetch articles based on the current query
  };

  const handleClearInput = () => {
    setQuery(''); // Clear the query
    setPage(1); // Reset page number
    fetchArticles(1); // Fetch all articles
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    // No need to update articles or loading state on input change
  };

  return (
    <section className="w-full p-4">
      <div className="flex items-center mb-4">
        <input
          type="text"
          className="p-2 border border-gray-300 rounded w-md"
          placeholder="Filtre pelo nome"
          value={query}
          onChange={handleInputChange}
        />
        <button
          onClick={handleSearch}
          className="ml-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Search
        </button>
        <button
          onClick={handleClearInput}
          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Clear
        </button>
      </div>
      {loading && <p>Loading articles...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {articles.map(article => (
          <a
            key={article.url}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-purple-950 bg-opacity-50 rounded shadow hover:shadow-lg"
          >
            <Image
              src={`/api/image-proxy?url=${encodeURIComponent(article.urlToImage)}`}
              alt={article.title}
              width={500}
              height={300}
              className="w-full h-48 object-cover rounded"
            />
            <div className="p-3">
              <h3 className="font-bold text-sm text-white">{article.title}</h3>
              <p className="text-white text-xs mt-2 overflow-hidden text-ellipsis whitespace-nowrap">
                {article.description.length > 50
                  ? `${article.description.slice(0, 50)}...`
                  : article.description}
              </p>
            </div>
          </a>
        ))}
      </div>
      {!error && (
        <div className="flex justify-center mt-4">
          <button
            onClick={loadMoreArticles}
            className="px-6 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </section>
  );
};

export default NewsGrid;
