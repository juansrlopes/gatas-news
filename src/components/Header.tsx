// components/Header.tsx

import Link from 'next/link';

const Header = () => {
  return (
    <header className="text-white p-4">
      <nav className="flex justify-between items-center">
        <div className="container">
          <Link href="/" id="logo">
            Gatas News
          </Link>
          <span className="text-xs ml-2">beta</span>
        </div>
        <div>
          <Link href="/social-media">Insta das gatas</Link>
        </div>
        <div>
          <Link href="/about">About</Link>
        </div>
      </nav>
      <h4 className="mt-4">O portal de notícias sobre as mulheres mais admiradas do mundo</h4>
    </header>
  );
};

export default Header;
