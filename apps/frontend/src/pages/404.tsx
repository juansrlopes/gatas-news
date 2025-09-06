import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import { getEnvConfig } from '../../../../libs/shared/utils/src/index';

const Custom404 = () => {
  const config = getEnvConfig();

  return (
    <div>
      <Head>
        <title>Página não encontrada - {config.appName}</title>
        <meta
          name="description"
          content="A página que você está procurando não foi encontrada. Volte para a página inicial do Gatas News."
        />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <Header />
      <main className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-4xl font-bold text-white mb-4">404</h1>
          <h2 className="text-xl text-gray-300 mb-6">Página não encontrada</h2>
          <p className="text-gray-400 mb-8 max-w-md">
            Ops! A página que você está procurando não existe ou foi movida. Que tal voltar para a
            página inicial e descobrir as últimas notícias das gatas?
          </p>
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
            >
              Voltar ao Início
            </Link>
            <Link
              href="/social-media"
              className="inline-block px-6 py-3 bg-transparent border border-purple-600 text-purple-400 rounded-lg hover:bg-purple-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
            >
              Ver Instagram das Gatas
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Custom404;
