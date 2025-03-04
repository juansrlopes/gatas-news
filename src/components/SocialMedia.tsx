import { useState, useEffect } from 'react';
import { InstagramEmbed } from 'react-social-media-embed';
import usernamesData from '../utils/insta.json'; // Adjust the path as needed

const InstagramGrid = () => {
  const [usernames, setUsernames] = useState<string[]>([]);

  useEffect(() => {
    // Load usernames from the JSON file
    setUsernames(usernamesData.usernames);
  }, []);

  return (
    <section className="w-full p-4">
      <h1 className="text-2xl font-bold mb-4">Instagram Profiles</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {usernames.map(username => (
          <div
            key={username}
            className="bg-purple-950 bg-opacity-50 rounded shadow hover:shadow-lg p-4"
          >
            <InstagramEmbed url={`https://www.instagram.com/${username}/`} />
            <div className="text-center mt-2">
              <h3 className="font-bold text-sm text-white">{username}</h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default InstagramGrid;
