import Head from 'next/head';
import dynamic from 'next/dynamic';
import Header from '../components/Header';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { getEnvConfig } from '../../../../libs/shared/utils/src/index';

// Dynamic import for code splitting with proper display name
const SocialMedia = dynamic(
  () => import('../components/SocialMedia').then((mod) => {
    const Component = mod.default;
    Component.displayName = 'SocialMedia';
    return { default: Component };
  }),
  {
    loading: () => (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <LoadingSkeleton className="h-8 w-64 mx-auto mb-4" />
          <LoadingSkeleton className="h-4 w-96 mx-auto" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
              <LoadingSkeleton className="w-full h-48" />
              <div className="p-4 space-y-2">
                <LoadingSkeleton className="h-5 w-3/4" />
                <LoadingSkeleton className="h-4 w-full" />
                <LoadingSkeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    ssr: false,
  }
);
const SocialMediaPage = () => {
  const config = getEnvConfig();

  return (
    <div>
      <Head>
        <title>{`Instagram das Gatas - ${config.appName}`}</title>
        <meta
          name="description"
          content="Descubra os perfis do Instagram das celebridades e influenciadoras mais famosas do Brasil. Acompanhe as gatas mais seguidas nas redes sociais."
        />
        <meta
          name="keywords"
          content="instagram, gatas, celebridades, influenciadoras, perfis, redes sociais, brasil"
        />
        <link rel="canonical" href="https://gatas-news.vercel.app/social-media" />
      </Head>
      <Header />
      <SocialMedia />
    </div>
  );
};

export default SocialMediaPage;
