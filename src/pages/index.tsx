import Head from 'next/head';
import Header from '../components/Header';
import NewsGrid from '../components/NewsGrid';
import BackToTopButton from '../components/BackToTopButton';

const Home = () => {
  return (
    <div>
      <Head>
        <title>Gatas News</title>
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
