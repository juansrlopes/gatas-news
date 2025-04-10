// components/Header.tsx

import Link from 'next/link';

const Header = () => {
  return (
    <header className="text-white p-4">
      <nav className="flex items-center container justify-between w-full">
        <div id="logo-wrapper">
          <Link href="/" id="logo">
            Gatas News
          </Link>
          <span className="text-xs ml-2">beta</span>
        </div>
        <div id="links-wrapper" className="flex justify-end uppercase">
          <div>
            <Link
              href="/social-media"
              className="hover:text-purple-400 transition-colors duration-200"
            >
              Insta das gatas
            </Link>
          </div>
          <div className="ml-4">
            <Link href="/about" className="hover:text-purple-400 transition-colors duration-200">
              Sobre
            </Link>
          </div>
        </div>
      </nav>
      <h4 className="mt-4">O portal de notícias sobre as mulheres mais admiradas do mundo</h4>
    </header>
  );
};

export default Header;
