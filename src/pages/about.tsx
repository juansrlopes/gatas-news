import Head from 'next/head';
import Header from '../components/Header';

const About = () => {
  return (
    <div>
      <Head>
        <title>Sobre - Gatas News</title>
      </Head>
      <Header />
      <main className="p-4 max-w-7xl">
        <h1 className="text-2xl font-bold mb-4">Sobre o Gatas News</h1>
        <p>
          Bem-vindo ao Gatas News, o seu destino online para as últimas e mais quentes notícias
          sobre mulheres bonitas e famosas. No Gatas News, reunimos as novidades mais recentes sobre
          as mulheres mais admiradas do mundo, diretamente de fontes confiáveis, tudo em um só lugar
          para a sua conveniência. Nosso site utiliza a poderosa News API para garantir que você
          esteja sempre atualizado com as últimas tendências e acontecimentos no universo das
          celebridades femininas. À medida que você navega por nossa página, novas notícias são
          carregadas automaticamente, proporcionando uma experiência contínua e envolvente. Estamos
          comprometidos em oferecer uma plataforma de fácil acesso e constantemente atualizada, e
          estamos sempre trabalhando em melhorias para tornar sua experiência ainda melhor. Esta é
          apenas a versão beta do Gatas News, e estamos ansiosos para evoluir e atender cada vez
          melhor nossos usuários. Explore, descubra e fique por dentro de tudo sobre as gatas mais
          comentadas do momento com o Gatas News!
        </p>
      </main>
    </div>
  );
};

export default About;
