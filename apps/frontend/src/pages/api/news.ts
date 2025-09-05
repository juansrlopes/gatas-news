import type { NextApiRequest, NextApiResponse } from 'next';
import { Article } from '../../types';

// Mock data for development - replace with real API when ready
const mockArticles: Article[] = [
  {
    url: 'https://example.com/article1',
    urlToImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=500&h=300&fit=crop',
    title: 'Anitta lança novo single e conquista o mundo',
    description:
      'A cantora brasileira Anitta surpreende mais uma vez com seu novo trabalho musical que promete conquistar as paradas internacionais.',
    publishedAt: '2024-01-15T10:30:00Z',
    source: { id: 'mock-news', name: 'Gatas News' },
    author: 'Redação Gatas News',
  },
  {
    url: 'https://example.com/article2',
    urlToImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500&h=300&fit=crop',
    title: 'Bruna Marquezine estrela nova campanha publicitária',
    description:
      'A atriz e modelo brasileira Bruna Marquezine é escolhida como rosto de importante marca internacional.',
    publishedAt: '2024-01-14T15:45:00Z',
    source: { id: 'mock-news', name: 'Gatas News' },
    author: 'Redação Gatas News',
  },
  {
    url: 'https://example.com/article3',
    urlToImage: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=500&h=300&fit=crop',
    title: 'Luísa Sonza anuncia nova turnê nacional',
    description:
      'A cantora gaúcha Luísa Sonza revela detalhes de sua próxima turnê que passará pelas principais cidades do Brasil.',
    publishedAt: '2024-01-13T09:20:00Z',
    source: { id: 'mock-news', name: 'Gatas News' },
    author: 'Redação Gatas News',
  },
  {
    url: 'https://example.com/article4',
    urlToImage: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=500&h=300&fit=crop',
    title: 'Isis Valverde fala sobre novos projetos na TV',
    description:
      'A atriz Isis Valverde compartilha expectativas sobre seus próximos trabalhos na televisão brasileira.',
    publishedAt: '2024-01-12T14:10:00Z',
    source: { id: 'mock-news', name: 'Gatas News' },
    author: 'Redação Gatas News',
  },
  {
    url: 'https://example.com/article5',
    urlToImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=300&fit=crop',
    title: 'Juliette celebra sucesso nas redes sociais',
    description:
      'A ex-BBB e cantora Juliette comemora marcos importantes em suas plataformas digitais.',
    publishedAt: '2024-01-11T11:30:00Z',
    source: { id: 'mock-news', name: 'Gatas News' },
    author: 'Redação Gatas News',
  },
  {
    url: 'https://example.com/article6',
    urlToImage: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=500&h=300&fit=crop',
    title: 'Camila Queiroz retorna às novelas',
    description:
      'A atriz Camila Queiroz confirma seu retorno às telinhas em nova produção da televisão brasileira.',
    publishedAt: '2024-01-10T16:45:00Z',
    source: { id: 'mock-news', name: 'Gatas News' },
    author: 'Redação Gatas News',
  },
];

// Generate more articles for pagination
const generateMoreArticles = (page: number, celebrityName?: string): Article[] => {
  const baseArticles = mockArticles;
  const articlesPerPage = 6;

  // Filter by celebrity name if provided
  let filteredArticles = baseArticles;
  if (celebrityName && celebrityName.trim()) {
    filteredArticles = baseArticles.filter(
      article =>
        article.title.toLowerCase().includes(celebrityName.toLowerCase()) ||
        article.description.toLowerCase().includes(celebrityName.toLowerCase())
    );
  }

  // If no results for search, return empty array
  if (celebrityName && filteredArticles.length === 0) {
    return [];
  }

  // For pagination, duplicate articles with different IDs
  const startIndex = (page - 1) * articlesPerPage;
  const paginatedArticles = [];

  for (let i = 0; i < articlesPerPage; i++) {
    const articleIndex = (startIndex + i) % filteredArticles.length;
    const baseArticle = filteredArticles[articleIndex];

    paginatedArticles.push({
      ...baseArticle,
      url: `${baseArticle.url}?page=${page}&index=${i}`,
      title: `${baseArticle.title} - Página ${page}`,
    });
  }

  return paginatedArticles;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { page = 1, celebrityName = '' } = req.body;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const articles = generateMoreArticles(page, celebrityName);

    // Return articles with some metadata
    res.status(200).json(articles);
  } catch (error) {
    console.error('Error in news API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
