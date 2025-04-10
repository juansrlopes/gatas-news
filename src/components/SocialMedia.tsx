import { useState, useEffect } from 'react';
import { InstagramEmbed } from 'react-social-media-embed';
import usernamesData from '../utils/insta.json'; // Adjust the path as needed

const InstagramGrid = () => {
  const [usernames, setUsernames] = useState<string[]>([]);
  const [displayedUsernames, setDisplayedUsernames] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
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
  }, []);

  useEffect(() => {
    const filtered = usernames.filter(username =>
      username.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setDisplayedUsernames(filtered.slice(0, page * profilesPerPage));
  }, [searchQuery, usernames, page]);

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  return (
    <section className="w-full p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Perfil das gatas</h1>
        <input
          type="text"
          placeholder="Procurar Instagram..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {displayedUsernames.map(username => (
          <div
            key={username}
            className="bg-purple-950 bg-opacity-50 rounded shadow hover:shadow-lg pb-4"
          >
            <InstagramEmbed url={`https://www.instagram.com/${username}/`} />
            <div className="text-center mt-2">
              <h3 className="font-bold text-sm text-white">{username}</h3>
            </div>
          </div>
        ))}
      </div>
      {displayedUsernames.length <
        usernames.filter(username => username.toLowerCase().includes(searchQuery.toLowerCase()))
          .length && (
        <div className="flex justify-center mt-4">
          <button
            onClick={loadMore}
            className="px-6 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Load More
          </button>
        </div>
      )}
    </section>
  );
};

export default InstagramGrid;
