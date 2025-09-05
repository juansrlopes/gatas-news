import Head from 'next/head';
import Header from '../components/Header';
import SocialMedia from '../components/SocialMedia';
import config from '../config/env';
const SocialMediaPage = () => {
  return (
    <div>
      <Head>
        <title>Instagram das Gatas - {config.appName}</title>
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
