import Head from 'next/head';
import Header from '../components/Header';
import NewsGrid from '../components/NewsGrid';
import BackToTopButton from '../components/BackToTopButton';
import { getEnvConfig } from '../../../../libs/shared/utils/src/index';

const Home = () => {
  const config = getEnvConfig();

  return (
    <div>
      <Head>
        <title>{config.appName} - Portal de Notícias sobre Celebridades</title>
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
