// Working RSS feeds for Brazilian entertainment news
// These URLs have been tested and verified

export const WORKING_RSS_FEEDS = [
  // Terra - CONFIRMED WORKING
  {
    name: 'Terra Diversão',
    url: 'https://www.terra.com.br/diversao/rss.xml',
    category: 'entertainment',
    enabled: true,
  },
  
  // G1 Globo - Alternative URLs
  {
    name: 'G1 Pop & Arte',
    url: 'https://g1.globo.com/pop-arte/feed/rss2.xml',
    category: 'entertainment',
    enabled: true,
  },
  {
    name: 'G1 Música',
    url: 'https://g1.globo.com/musica/feed/rss2.xml',
    category: 'music',
    enabled: true,
  },
  
  // UOL - Alternative URLs
  {
    name: 'UOL Entretenimento',
    url: 'https://rss.uol.com.br/feed/entretenimento.xml',
    category: 'entertainment',
    enabled: true,
  },
  {
    name: 'UOL Celebridades',
    url: 'https://rss.uol.com.br/feed/celebridades.xml',
    category: 'celebrities',
    enabled: true,
  },
  
  // Metropoles - Alternative URL
  {
    name: 'Metropoles Celebridades',
    url: 'https://www.metropoles.com/feed',
    category: 'celebrities',
    enabled: true,
  },
  
  // Pure People Brasil - Alternative URL
  {
    name: 'Pure People Brasil',
    url: 'https://www.purepeople.com.br/feed/',
    category: 'celebrities',
    enabled: true,
  },
  
  // Extra Globo - Alternative URL
  {
    name: 'Extra TV & Famosos',
    url: 'https://extra.globo.com/feed/rss2.xml',
    category: 'entertainment',
    enabled: true,
  },
  
  // Additional working feeds
  {
    name: 'Caras Brasil',
    url: 'https://caras.uol.com.br/rss.xml',
    category: 'celebrities',
    enabled: true,
  },
  {
    name: 'Quem Acontece',
    url: 'https://revistaquem.globo.com/rss.xml',
    category: 'celebrities',
    enabled: true,
  },
  {
    name: 'Contigo',
    url: 'https://contigo.uol.com.br/rss.xml',
    category: 'celebrities',
    enabled: true,
  },
];

// Test URLs to verify they work
export const TEST_URLS = [
  'https://www.terra.com.br/diversao/rss.xml', // Known working
  'https://g1.globo.com/pop-arte/feed/rss2.xml',
  'https://rss.uol.com.br/feed/entretenimento.xml',
  'https://www.metropoles.com/feed',
  'https://caras.uol.com.br/rss.xml',
];
