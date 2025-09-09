import Head from 'next/head';
import Header from '../components/Header';
import { getEnvConfig } from '../../../../libs/shared/utils/src/index';

const Admin = () => {
  const config = getEnvConfig();

  return (
    <div>
      <Head>
        <title>{`${config.appName} - Admin`}</title>
        <meta name="description" content="Admin panel for Gatas News" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Admin Page</h1>
          <p className="text-gray-300">Welcome to the admin panel</p>
        </div>
      </main>
    </div>
  );
};

export default Admin;
