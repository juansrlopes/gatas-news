import Head from 'next/head';
import dynamic from 'next/dynamic';
import Header from '../components/Header';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { getEnvConfig } from '../../../../libs/shared/utils/src/index';

// Dynamic imports for code splitting
const NewsGrid = dynamic(() => import('../components/NewsGrid'), {
  loading: () => (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="bg-purple-950 bg-opacity-50 rounded-lg shadow">
            <LoadingSkeleton className="w-full h-48 rounded-t-lg" />
            <div className="p-3 space-y-2">
              <LoadingSkeleton className="h-4 w-full" />
              <LoadingSkeleton className="h-4 w-3/4" />
              <LoadingSkeleton className="h-3 w-full" />
              <LoadingSkeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
  ssr: false, // Disable SSR for this component to improve initial load
});

const BackToTopButton = dynamic(() => import('../components/BackToTopButton'), {
  loading: () => null,
  ssr: false,
});

const Home = () => {
  const config = getEnvConfig();

  return (
    <div>
      <Head>
        <title>{`${config.appName} - Portal de Notícias sobre Celebridades`}</title>
        <meta name="description" content={config.appDescription} />
        <meta
          name="keywords"
          content="notícias, celebridades, famosas, mulheres, entretenimento, brasil"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://gatas-news.vercel.app/" />
        <meta
          property="og:title"
          content={`${config.appName} - Portal de Notícias sobre Celebridades`}
        />
        <meta property="og:description" content={config.appDescription} />
        <meta property="og:image" content="/og-image.jpg" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://gatas-news.vercel.app/" />
        <meta
          property="twitter:title"
          content={`${config.appName} - Portal de Notícias sobre Celebridades`}
        />
        <meta property="twitter:description" content={config.appDescription} />
        <meta property="twitter:image" content="/og-image.jpg" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://gatas-news.vercel.app/" />
      </Head>
      <Header />
      <main>
        <NewsGrid />
        <BackToTopButton />
      </main>
    </div>
  );
};

export default Home;
