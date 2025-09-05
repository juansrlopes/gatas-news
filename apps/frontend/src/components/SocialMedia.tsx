import React, { useState, useEffect, useCallback, memo } from 'react';
import { InstagramEmbed } from 'react-social-media-embed';
import usernamesData from '../utils/insta.json';
import { InstagramSkeleton } from './LoadingSkeleton';

const SocialMedia = () => {
  const [usernames, setUsernames] = useState<string[]>([]);
  const [displayedUsernames, setDisplayedUsernames] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const profilesPerPage = 10;

  const shuffleArray = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  useEffect(() => {
    const shuffledUsernames = shuffleArray(usernamesData.usernames);
    setUsernames(shuffledUsernames);
    setDisplayedUsernames(shuffledUsernames.slice(0, profilesPerPage));
    setLoading(false);
  }, []);

  useEffect(() => {
    const filtered = usernames.filter(username =>
      username.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setDisplayedUsernames(filtered.slice(0, page * profilesPerPage));
  }, [searchQuery, usernames, page]);

  const loadMore = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  return (
    <section className="w-full p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white">Perfil das Gatas</h1>
        <input
          type="text"
          placeholder="Procurar Instagram..."
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyPress={handleKeyPress}
          className="w-full sm:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          aria-label="Buscar perfis do Instagram"
        />
      </div>
      {loading ? (
        <InstagramSkeleton count={10} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {displayedUsernames.map(username => (
            <article
              key={username}
              className="bg-purple-950 bg-opacity-50 rounded-lg shadow hover:shadow-lg transition-all duration-200 hover:scale-105 pb-4"
            >
              <div className="rounded-t-lg overflow-hidden">
                <InstagramEmbed url={`https://www.instagram.com/${username}/`} width="100%" />
              </div>
              <div className="text-center mt-3 px-2">
                <h3 className="font-bold text-sm text-white">@{username}</h3>
                <a
                  href={`https://www.instagram.com/${username}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 px-3 py-1 bg-purple-600 text-white text-xs rounded-full hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                  aria-label={`Ver perfil do Instagram de ${username}`}
                >
                  Ver Perfil
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading &&
        displayedUsernames.length <
          usernames.filter(username => username.toLowerCase().includes(searchQuery.toLowerCase()))
            .length && (
          <div className="flex justify-center mt-8">
            <button
              onClick={loadMore}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
              aria-label="Carregar mais perfis"
            >
              Carregar Mais
            </button>
          </div>
        )}

      {!loading && displayedUsernames.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">🔍</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum perfil encontrado</h3>
          <p className="text-gray-500">Tente buscar por outro nome de usuário do Instagram.</p>
        </div>
      )}
    </section>
  );
};

export default memo(SocialMedia);
