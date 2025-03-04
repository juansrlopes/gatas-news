import Head from 'next/head';
import Header from '../components/Header';
import SocialMedia from '../components/SocialMedia';
const About = () => {
  return (
    <div>
      <Head>
        <title>Sobre - Gatas News</title>
      </Head>
      <Header />
      <SocialMedia />
    </div>
  );
};

export default About;
