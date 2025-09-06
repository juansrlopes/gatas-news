/**
 * Portuguese Content Scoring System
 *
 * This module implements a sophisticated content scoring algorithm specifically designed
 * for Brazilian celebrity news. It analyzes articles in Portuguese and scores them based
 * on visual appeal and relevance to ensure only high-quality, engaging content is displayed.
 *
 * The scoring system prioritizes:
 * 1. Visual content (photos, videos, social media posts)
 * 2. Lifestyle and fashion content over news/interviews
 * 3. Entertainment sources over traditional news sources
 * 4. Articles where the celebrity is the main subject (not just mentioned)
 *
 * Scoring Formula: Overall Score = (Visual Appeal × 0.7) + (Relevance × 0.3)
 * This weights visual appeal more heavily since the platform focuses on attractive content.
 */

export interface ContentScore {
  visualAppeal: number; // 0-100: How visually appealing the content is
  relevance: number; // 0-100: How relevant to the celebrity
  contentType: string; // Category of content
  overallScore: number; // 0-100: Combined score
  reasons: string[]; // Why this score was given
}

export interface ContentKeywords {
  highValue: string[]; // High visual appeal keywords
  mediumValue: string[]; // Medium appeal keywords
  lowValue: string[]; // Low appeal keywords (filter out)
  actionVerbs: string[]; // Action verbs indicating main subject
  photoIndicators: string[]; // Indicates visual content presence
  sourceQuality: {
    premium: string[]; // High-quality entertainment sources
    good: string[]; // Good entertainment sources
    neutral: string[]; // Neutral sources
    avoid: string[]; // News sources (not entertainment)
  };
}

/**
 * Portuguese keywords for Brazilian celebrity content
 */
export const PORTUGUESE_KEYWORDS: ContentKeywords = {
  // HIGH VALUE - Visual/Lifestyle Content (80-100 points)
  highValue: [
    // Beach/Swimwear
    'biquíni',
    'maiô',
    'praia',
    'piscina',
    'verão',
    'sol',
    'bronzeado',

    // Fashion/Style
    'look',
    'vestido',
    'roupa',
    'estilo',
    'decote',
    'sensual',
    'sexy',
    'gata',
    'gostosa',
    'linda',

    // Fitness/Body
    'academia',
    'treino',
    'malhação',
    'corpo',
    'forma',
    'saúde',
    'shape',
    'barriga',
    'trincada',

    // Events/Glamour
    'festa',
    'evento',
    'tapete vermelho',
    'premiação',
    'gala',
    'red carpet',

    // Social Media/Photos
    'foto',
    'fotos',
    'selfie',
    'stories',
    'instagram',
    'tiktok',
    'post',
    'clique',

    // Lifestyle
    'viagem',
    'férias',
    'casa',
    'luxo',
    'passeio',
    'barco',
    'iate',
  ],

  // MEDIUM VALUE - General celebrity content (40-79 points)
  mediumValue: [
    'família',
    'namorado',
    'relacionamento',
    'namoro',
    'casamento',
    'filho',
    'filha',
    'trabalho',
    'projeto',
    'novela',
    'filme',
    'música',
    'show',
    'apresentação',
    'aniversário',
    'festa',
    'comemoração',
    'celebração',
  ],

  // LOW VALUE - Filter out (0-39 points)
  lowValue: [
    // Interview/Statement content
    'entrevista',
    'declaração',
    'opinião',
    'comentário',
    'disse',
    'afirmou',
    'falou',
    'contou',
    'revelou em entrevista',

    // Political/Legal content
    'política',
    'eleição',
    'governo',
    'lei',
    'justiça',
    'tribunal',
    'processo',
    'advogado',
    'multa',
    'imposto',

    // Business/Financial content
    'negócio',
    'empresa',
    'investimento',
    'dinheiro',
    'contrato',
    'salário',
    'patrimônio',
    'lucro',

    // Health/Medical content
    'doença',
    'hospital',
    'morte',
    'acidente',
    'problema',
    'cirurgia',
    'tratamento',
    'doente',

    // Relationship drama (low visual value)
    'terminou',
    'separou',
    'brigou',
    'discussão',
    'polêmica sem foto',
    'escândalo',
    'traição',
    'fim do relacionamento',

    // Generic mentions (not main subject)
    'citou',
    'mencionou',
    'lembrou',
    'segundo fontes',
    'de acordo com',
    'conforme',
    'segundo informações',

    // Meta content (news about news)
    'repercussão',
    'internautas',
    'redes sociais reagiram',
    'web comenta',
    'comentários',
    'críticas',
  ],

  // ACTION VERBS - Indicates celebrity is main subject (+25 points)
  actionVerbs: [
    // Showing/Displaying
    'exibiu',
    'exibe',
    'mostrou',
    'mostra',
    'revelou',
    'revela',
    'expôs',
    'apresentou',

    // Posing/Photos
    'posou',
    'posa',
    'clicou',
    'fotografou',
    'registrou',
    'capturou',

    // Sharing/Posting
    'postou',
    'posta',
    'compartilhou',
    'compartilha',
    'publicou',
    'publica',
    'divulgou',

    // Appearing/Being
    'apareceu',
    'aparece',
    'surgiu',
    'surge',
    'estava',
    'ficou',
    'usou',
    'usa',

    // Actions
    'fez',
    'faz',
    'foi',
    'está',
    'ficou',
    'saiu',
    'chegou',
    'voltou',
  ],

  // PHOTO INDICATORS - Requires visual content (+20 points)
  photoIndicators: [
    // Direct photo mentions
    'foto',
    'fotos',
    'imagem',
    'imagens',
    'clique',
    'registro',
    'flagra',
    'flagrada',
    'clicada',

    // Social media visual content
    'selfie',
    'stories',
    'post',
    'publicação',
    'instagram',
    'tiktok',

    // Video content
    'vídeo',
    'vídeos',
    'filmada',
    'gravação',

    // Visual verbs
    'posa',
    'posou',
    'exibe',
    'exibiu',
    'mostra',
    'mostrou',
    'aparece',
    'apareceu',
    'surge',
    'surgiu',
  ],

  // SOURCE QUALITY SCORING
  sourceQuality: {
    premium: ['quem.com.br', 'caras.com.br', 'ego.com.br', 'purepeople.com.br', 'gshow.com.br'],
    good: [
      'metropoles.com',
      'papelpop.com',
      'extra.globo.com',
      'gente.ig.com.br',
      'entretenimento.uol.com.br',
    ],
    neutral: ['ig.com.br', 'terra.com.br', 'uol.com.br', 'r7.com', 'msn.com'],
    avoid: ['folha.uol.com.br', 'estadao.com.br', 'g1.globo.com', 'bbc.com', 'cnn.com.br'],
  },
};

/**
 * Content type classifications with priority scores
 */
export const CONTENT_TYPES = {
  'praia-biquini': {
    keywords: ['biquíni', 'maiô', 'praia', 'piscina'],
    priority: 95,
    description: 'Beach/swimwear content - highest visual appeal',
  },

  'moda-estilo': {
    keywords: ['look', 'vestido', 'roupa', 'estilo', 'decote'],
    priority: 85,
    description: 'Fashion/style content - high visual appeal',
  },

  'academia-fitness': {
    keywords: ['academia', 'treino', 'shape', 'corpo', 'barriga'],
    priority: 80,
    description: 'Fitness/body content - high visual appeal',
  },

  'evento-festa': {
    keywords: ['festa', 'evento', 'premiação', 'gala'],
    priority: 75,
    description: 'Event/party content - good visual appeal',
  },

  'social-media': {
    keywords: ['foto', 'selfie', 'stories', 'instagram', 'post'],
    priority: 70,
    description: 'Social media content - good visual appeal',
  },

  lifestyle: {
    keywords: ['viagem', 'casa', 'luxo', 'passeio', 'barco'],
    priority: 65,
    description: 'Lifestyle content - moderate visual appeal',
  },

  relacionamento: {
    keywords: ['namorado', 'relacionamento', 'namoro', 'casamento'],
    priority: 50,
    description: 'Relationship content - moderate appeal',
  },

  trabalho: {
    keywords: ['trabalho', 'projeto', 'novela', 'filme', 'show'],
    priority: 40,
    description: 'Work/career content - lower appeal',
  },

  entrevista: {
    keywords: ['entrevista', 'declaração', 'opinião', 'disse'],
    priority: 20,
    description: 'Interview/statement content - low appeal',
  },
};

/**
 * Analyzes Portuguese article content and assigns a quality score
 *
 * This is the main scoring function that evaluates articles based on multiple factors:
 * - Visual appeal indicators (photos, videos, social media)
 * - Content quality keywords (fashion, lifestyle vs interviews, politics)
 * - Source quality (entertainment vs news sources)
 * - Celebrity relevance (main subject vs just mentioned)
 *
 * @param title - Article title (required)
 * @param description - Article description (optional)
 * @param sourceUrl - Source URL for domain analysis (optional)
 * @returns ContentScore object with detailed scoring breakdown
 */
export function analyzePortugueseContent(
  title: string,
  description?: string,
  sourceUrl?: string
): ContentScore {
  // Normalize text for consistent analysis
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const fullText = `${titleLower} ${descLower}`;

  // Initialize scoring variables
  let visualAppeal = 0;
  let relevance = 0;
  let contentType = 'unknown';
  const reasons: string[] = [];

  // Check for high-value keywords
  const highValueMatches = PORTUGUESE_KEYWORDS.highValue.filter(keyword =>
    fullText.includes(keyword)
  );

  if (highValueMatches.length > 0) {
    visualAppeal += Math.min(highValueMatches.length * 20, 80);
    reasons.push(`High-value content: ${highValueMatches.join(', ')}`);
  }

  // Check for medium-value keywords
  const mediumValueMatches = PORTUGUESE_KEYWORDS.mediumValue.filter(keyword =>
    fullText.includes(keyword)
  );

  if (mediumValueMatches.length > 0) {
    visualAppeal += Math.min(mediumValueMatches.length * 10, 40);
    reasons.push(`Medium-value content: ${mediumValueMatches.join(', ')}`);
  }

  // Check for low-value keywords (penalty)
  const lowValueMatches = PORTUGUESE_KEYWORDS.lowValue.filter(keyword =>
    fullText.includes(keyword)
  );

  if (lowValueMatches.length > 0) {
    visualAppeal -= lowValueMatches.length * 15;
    reasons.push(`Low-value content penalty: ${lowValueMatches.join(', ')}`);
  }

  // Check for action verbs (indicates celebrity is main subject)
  const actionVerbMatches = PORTUGUESE_KEYWORDS.actionVerbs.filter(verb => fullText.includes(verb));

  if (actionVerbMatches.length > 0) {
    relevance += 25;
    reasons.push(`Action verbs (main subject): ${actionVerbMatches.join(', ')}`);
  }

  // PHASE 1 ENHANCEMENT: Photo presence detection (REQUIRED for high scores)
  const photoMatches = PORTUGUESE_KEYWORDS.photoIndicators.filter(indicator =>
    fullText.includes(indicator)
  );

  if (photoMatches.length > 0) {
    visualAppeal += 20;
    relevance += 15;
    reasons.push(`Visual content indicators: ${photoMatches.join(', ')}`);
  } else {
    // Heavily penalize articles without photo indicators
    visualAppeal -= 30;
    reasons.push(`No visual content indicators found - major penalty`);
  }

  // PHASE 1 ENHANCEMENT: Source quality scoring
  if (sourceUrl) {
    const sourceDomain = sourceUrl.toLowerCase();

    if (PORTUGUESE_KEYWORDS.sourceQuality.premium.some(domain => sourceDomain.includes(domain))) {
      visualAppeal += 20;
      relevance += 10;
      reasons.push(`Premium entertainment source`);
    } else if (
      PORTUGUESE_KEYWORDS.sourceQuality.good.some(domain => sourceDomain.includes(domain))
    ) {
      visualAppeal += 10;
      relevance += 5;
      reasons.push(`Good entertainment source`);
    } else if (
      PORTUGUESE_KEYWORDS.sourceQuality.avoid.some(domain => sourceDomain.includes(domain))
    ) {
      visualAppeal -= 20;
      reasons.push(`News source penalty (not entertainment)`);
    }
  }

  // Determine content type
  for (const [type, config] of Object.entries(CONTENT_TYPES)) {
    const matches = config.keywords.filter(keyword => fullText.includes(keyword));
    if (matches.length > 0) {
      contentType = type;
      visualAppeal += config.priority * 0.2; // Bonus based on content type priority
      reasons.push(`Content type: ${config.description}`);
      break;
    }
  }

  // Title position bonus (celebrity name in first 3 words)
  const titleWords = titleLower.split(' ');
  if (titleWords.length >= 3) {
    // This would need celebrity name matching - simplified for now
    relevance += 10;
  }

  // Ensure scores are within bounds
  visualAppeal = Math.max(0, Math.min(100, visualAppeal));
  relevance = Math.max(0, Math.min(100, relevance));

  // Calculate overall score (weighted average)
  const overallScore = Math.round(visualAppeal * 0.7 + relevance * 0.3);

  return {
    visualAppeal,
    relevance,
    contentType,
    overallScore,
    reasons,
  };
}

/**
 * Determine if article should be kept based on score
 */
export function shouldKeepArticle(score: ContentScore, minScore: number = 50): boolean {
  return score.overallScore >= minScore;
}

/**
 * Get content quality level
 */
export function getContentQuality(score: number): string {
  if (score >= 80) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 50) return 'fair';
  if (score >= 35) return 'poor';
  return 'reject';
}
