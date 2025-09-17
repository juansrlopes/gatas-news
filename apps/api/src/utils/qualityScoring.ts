import { IArticle } from '../database/models/Article';
import { celebrityService } from '../services/celebrityService';
import logger from './logger';

/**
 * Article Quality Scoring System
 * 
 * This system scores articles 0-100 based on celebrity relevance and content quality.
 * The goal is to rank articles by quality WITHOUT filtering them out (volume-first approach).
 */

export interface QualityMetrics {
  celebrityRelevanceScore: number;    // 0-40 points
  contentQualityScore: number;        // 0-30 points
  titleQualityScore: number;          // 0-20 points
  sourceReliabilityScore: number;     // 0-10 points
  totalScore: number;                 // 0-100 total
  category: ArticleCategory;
  trashProbability: number;           // 0-100 (for monitoring, not filtering)
}

/* eslint-disable no-unused-vars */
export enum ArticleCategory {
  PERSONAL_LIFE = 'personal',         // Relationships, family, personal news
  CAREER = 'career',                  // New projects, roles, achievements  
  FASHION_BEAUTY = 'fashion',         // Style, looks, beauty content
  CONTROVERSY = 'controversy',        // Scandals, drama, conflicts
  EVENT_MENTION = 'event',            // Mentioned at events (lower quality)
  GENERIC_LIFESTYLE = 'generic',      // Generic lifestyle content
  UNKNOWN = 'unknown'                 // Cannot categorize
}
/* eslint-enable no-unused-vars */

/**
 * Calculate comprehensive quality score for an article
 */
export function calculateQualityScore(article: IArticle): QualityMetrics {
  const celebrityScore = calculateCelebrityRelevance(article);
  const contentScore = calculateContentQuality(article);
  const titleScore = calculateTitleQuality(article);
  const sourceScore = calculateSourceReliability(article);
  
  const totalScore = celebrityScore + contentScore + titleScore + sourceScore;
  const category = categorizeArticle(article);
  const trashProbability = calculateTrashProbability(article, totalScore);

  const metrics: QualityMetrics = {
    celebrityRelevanceScore: celebrityScore,
    contentQualityScore: contentScore,
    titleQualityScore: titleScore,
    sourceReliabilityScore: sourceScore,
    totalScore: Math.min(100, Math.max(0, totalScore)),
    category,
    trashProbability
  };

  logger.debug(`Quality score for "${article.title}": ${metrics.totalScore} (${category})`);
  return metrics;
}

/**
 * Celebrity Relevance Scoring (0-40 points)
 * Higher scores for articles that are clearly ABOUT the celebrity
 */
function calculateCelebrityRelevance(article: IArticle): number {
  const text = `${article.title} ${article.description || ''}`.toLowerCase();
  const celebrityName = article.celebrity?.toLowerCase() || '';
  
  if (!celebrityName || celebrityName === 'unknown') {
    return 5; // Low but not zero - might still be relevant
  }

  let score = 0;
  
  // Celebrity name mentions (up to 15 points)
  const mentions = (text.match(new RegExp(celebrityName.split(' ')[0], 'g')) || []).length;
  score += Math.min(15, mentions * 5);
  
  // Celebrity as main subject (15 points)
  const firstWords = text.split(' ').slice(0, 5).join(' ');
  if (firstWords.includes(celebrityName.split(' ')[0])) {
    score += 15;
  }
  
  // Celebrity in title (10 points)
  if (article.title.toLowerCase().includes(celebrityName.split(' ')[0])) {
    score += 10;
  }
  
  return Math.min(40, score);
}

/**
 * Content Quality Scoring (0-30 points)
 * Based on content type and personal relevance
 */
function calculateContentQuality(article: IArticle): number {
  const text = `${article.title} ${article.description || ''}`.toLowerCase();
  let score = 10; // Base score
  
  // Personal life content (high value)
  const personalPatterns = [
    /casou|casamento|namorado|namorada|filho|filha|família|relacionamento|gravidez/,
    /separou|divórcio|término|reconciliação|romance/,
    /aniversário|festa|celebração|viagem pessoal/
  ];
  
  if (personalPatterns.some(pattern => pattern.test(text))) {
    score += 15;
  }
  
  // Career content (medium-high value)
  const careerPatterns = [
    /novo projeto|filme|série|trabalho|carreira|contrato/,
    /estreia|lançamento|gravação|bastidores/,
    /prêmio|indicação|reconhecimento|sucesso/
  ];
  
  if (careerPatterns.some(pattern => pattern.test(text))) {
    score += 12;
  }
  
  // Fashion/Beauty content (medium value)
  const fashionPatterns = [
    /look|vestido|estilo|moda|beleza|cabelo|maquiagem/,
    /desfile|red carpet|tapete vermelho|produção/
  ];
  
  if (fashionPatterns.some(pattern => pattern.test(text))) {
    score += 8;
  }
  
  // Controversy content (medium value - generates engagement)
  const controversyPatterns = [
    /polêmica|briga|discussão|crítica|escândalo/,
    /declaração|pronunciamento|resposta|defesa/
  ];
  
  if (controversyPatterns.some(pattern => pattern.test(text))) {
    score += 10;
  }
  
  return Math.min(30, score);
}

/**
 * Title Quality Scoring (0-20 points)
 * Penalize clickbait and generic titles
 */
function calculateTitleQuality(article: IArticle): number {
  const title = article.title.toLowerCase();
  let score = 15; // Start with good score
  
  // Penalize obvious trash patterns
  const trashPatterns = [
    /\d+\s*(dicas|segredos|truques|formas|maneiras)/,
    /veja|confira|saiba|descubra|conheça$/,
    /que funcionam|de verdade|realmente funciona/,
    /anuncia|confirma|revela|divulga|lança$/
  ];
  
  if (trashPatterns.some(pattern => pattern.test(title))) {
    score -= 10;
  }
  
  // Penalize event-focused titles
  const eventPatterns = [
    /rock in rio|the town|festival|evento|show de|concerto/,
    /edição de \d{4}|temporada \d+/
  ];
  
  if (eventPatterns.some(pattern => pattern.test(title))) {
    score -= 8;
  }
  
  // Reward specific, personal titles
  if (title.length > 10 && title.length < 100) {
    score += 3;
  }
  
  // Penalize very short or very long titles
  if (title.length < 10 || title.length > 150) {
    score -= 5;
  }
  
  return Math.max(0, Math.min(20, score));
}

/**
 * Source Reliability Scoring (0-10 points)
 * Based on known source quality
 */
function calculateSourceReliability(article: IArticle): number {
  const sourceName = article.source?.name?.toLowerCase() || '';
  
  // Trusted entertainment sources
  const trustedSources = [
    'globo', 'g1', 'uol', 'r7', 'band', 'sbt', 'record',
    'vogue', 'marie claire', 'elle', 'glamour',
    'caras', 'quem', 'purepeople'
  ];
  
  if (trustedSources.some(source => sourceName.includes(source))) {
    return 10;
  }
  
  // Medium reliability sources
  const mediumSources = [
    'terra', 'ig', 'yahoo', 'msn', 'metropoles',
    'extra', 'o globo', 'folha'
  ];
  
  if (mediumSources.some(source => sourceName.includes(source))) {
    return 7;
  }
  
  // Unknown sources get medium score (don't penalize too much)
  return 5;
}

/**
 * Categorize article content
 */
function categorizeArticle(article: IArticle): ArticleCategory {
  const text = `${article.title} ${article.description || ''}`.toLowerCase();
  
  // Personal life indicators
  if (/casou|namorado|filho|família|relacionamento|gravidez|separou/.test(text)) {
    return ArticleCategory.PERSONAL_LIFE;
  }
  
  // Career indicators
  if (/projeto|filme|série|trabalho|carreira|prêmio|estreia/.test(text)) {
    return ArticleCategory.CAREER;
  }
  
  // Fashion/Beauty indicators
  if (/look|vestido|estilo|moda|beleza|cabelo|maquiagem/.test(text)) {
    return ArticleCategory.FASHION_BEAUTY;
  }
  
  // Controversy indicators
  if (/polêmica|briga|discussão|crítica|escândalo|declaração/.test(text)) {
    return ArticleCategory.CONTROVERSY;
  }
  
  // Event mention indicators
  if (/festival|evento|show|concerto|rock in rio|the town/.test(text)) {
    return ArticleCategory.EVENT_MENTION;
  }
  
  // Generic lifestyle indicators
  if (/dicas|segredos|truques|formas|maneiras|veja|confira/.test(text)) {
    return ArticleCategory.GENERIC_LIFESTYLE;
  }
  
  return ArticleCategory.UNKNOWN;
}

/**
 * Calculate trash probability (for monitoring, not filtering)
 */
function calculateTrashProbability(article: IArticle, totalScore: number): number {
  let trashScore = 0;
  
  // Low quality score indicates higher trash probability
  if (totalScore < 30) trashScore += 40;
  else if (totalScore < 50) trashScore += 20;
  
  // Unknown celebrity increases trash probability
  if (article.celebrity === 'unknown') trashScore += 30;
  
  // Generic content patterns
  const text = `${article.title} ${article.description || ''}`.toLowerCase();
  const genericPatterns = [
    /\d+\s*(dicas|segredos|truques)/,
    /veja|confira|saiba|descubra/,
    /anuncia|confirma|revela|divulga/
  ];
  
  if (genericPatterns.some(pattern => pattern.test(text))) {
    trashScore += 25;
  }
  
  return Math.min(100, trashScore);
}

/**
 * Ultra-conservative trash detection (for the <5% filtering)
 * Only returns true for articles we're 95%+ certain are trash
 */
export function isDefinitelyTrash(article: IArticle): boolean {
  const text = `${article.title} ${article.description || ''}`.toLowerCase();
  const celebrityName = article.celebrity?.toLowerCase() || '';
  
  // If celebrity mentioned 2+ times, probably not trash
  if (celebrityName && celebrityName !== 'unknown') {
    const mentions = (text.match(new RegExp(celebrityName.split(' ')[0], 'g')) || []).length;
    if (mentions >= 2) return false;
  }
  
  // Only filter obvious non-celebrity content
  const obviousTrashPatterns = [
    /^(compre|desconto|promoção|oferta especial)/,
    /^(política|eleições|governo|economia nacional)/,
    /^(covid|pandemia|vacina|saúde pública)/,
    /^(futebol|copa do mundo|olimpíadas)/ // unless celeb mentioned
  ];
  
  const isObviousTrash = obviousTrashPatterns.some(pattern => pattern.test(text));
  const hasLowCelebrityMentions = !celebrityName || celebrityName === 'unknown' || 
    (text.match(new RegExp(celebrityName.split(' ')[0], 'g')) || []).length < 1;
  
  return isObviousTrash && hasLowCelebrityMentions;
}

/**
 * AGGRESSIVE TRASH DETECTION - Celebrity List Validation
 * Returns true for articles that should be filtered out aggressively
 */
export async function isAggressiveTrash(article: IArticle): Promise<boolean> {
  const text = `${article.title} ${article.description || ''}`.toLowerCase();
  const celebrityName = article.celebrity?.toLowerCase() || '';
  
  // Get our actual celebrity list
  const validCelebrities = await celebrityService.getCelebrities();
  const validCelebrityNames = validCelebrities.map(name => name.toLowerCase());
  
  // 1. CELEBRITY LIST VALIDATION - Most important filter
  if (celebrityName && celebrityName !== 'unknown') {
    // Check if the assigned celebrity is in our actual list
    const isValidCelebrity = validCelebrityNames.some(validName => 
      validName.includes(celebrityName) || celebrityName.includes(validName)
    );
    
    if (!isValidCelebrity) {
      logger.debug(`Filtering article about non-list celebrity: ${celebrityName}`);
      return true; // AGGRESSIVE: Remove articles about celebrities not in our list
    }
  }
  
  // 2. BLOCK ALL UNKNOWN CELEBRITY ARTICLES
  if (celebrityName === 'unknown') {
    logger.debug(`Filtering unknown celebrity article: "${article.title.substring(0, 50)}..."`);
    return true; // BLOCK: Remove ALL unknown celebrity articles
  }
  
  // 3. GENERIC CONTENT PATTERNS (more aggressive)
  const aggressiveTrashPatterns = [
    // Generic trends not about specific people
    /^(rostos ovais|clique nostálgico|tendência entre)/i,
    /^(o que está na moda|nova tendência)/i,

    // Event coverage without personal focus
    /transforma.*frio.*festa/i, // "J Balvin transforma o frio paulistano em festa"
    /show suspenso.*custo/i,    // "Leonardo pode ter show suspenso"

    // Generic lifestyle/beauty content
    /^(\d+\s*(dicas|segredos|truques|formas|maneiras))/i,
    /que funcionam de verdade/i,

    // TV/Entertainment industry news (not personal)
    /programação.*filmes/i,
    /resumo.*novela/i,
    /reta final.*novela/i,

    // SMART AGGRESSIVE PATTERNS - Remove obvious non-celebrity content
    // Health/Medical content (never about celebrities personally)
    /^(\d+\s*(mitos|verdades|benefícios|riscos|sinais|sintomas))/i,
    /doação de órgãos|transplante|medicina|saúde pública|vacina/i,
    /mitos e verdades|benefícios e riscos|cuidados médicos/i,

    // Reality TV show content (not personal celebrity news)
    /^(a fazenda|big brother|reality|programa de tv)/i,
    /relembre.*tretas|histórias do reality|participantes do/i,
    /tretas históricas|reality show|temporada de/i,

    // Business/Venue/Establishment news (not celebrity personal)
    /estreia em são paulo|nova casa|estabelecimento|inauguração/i,
    /music hall|teatro|casa de shows|venue|espaço cultural/i,
    /proposta única|conceito inovador|experiência gastronômica/i,

    // Generic numbered content (tips, lists, guides)
    /^(\d+\s*(ativos|produtos|formas|maneiras|truques|segredos))/i,
    /^(confira|veja|saiba|descubra|conheça)\s+\d+/i,
    /que funcionam de verdade|mais eficazes|realmente funcionam/i,

    // Event announcements without celebrity focus
    /anuncia.*datas|programação completa|ingressos à venda/i,
    /festival confirma|evento terá|show acontece/i,

    // SPECIFIC TRASH PATTERNS - Based on user reports
    /^resumo da novela/i,                    // "Resumo da novela 'Vale Tudo'"
    /^rostos ovais.*tendência/i,             // "Rostos ovais: a tendência entre celebridades"
    /^\d+\s*mitos e verdades sobre/i,        // "6 mitos e verdades sobre a doação de órgãos"
    /leonardo.*pode ter show suspenso.*custo.*milhão/i, // Leonardo show cancellation
    /^não é só.*leonardo pode ter show suspenso/i,      // "Não é só Ana Castela... Leonardo pode ter show suspenso"
  ];
  
  if (aggressiveTrashPatterns.some(pattern => pattern.test(text))) {
    logger.debug(`Filtering generic content: ${article.title.substring(0, 50)}...`);
    return true; // ← CRITICAL FIX: Added missing return statement!
  }
  
  // 4. BUSINESS/EVENT FOCUS (not personal celebrity news)
  const businessEventPatterns = [
    /pode ter show suspenso/i,
    /custo.*milhão/i,
    /festival|the town|rock in rio/i,
    /programação|horário.*assistir/i,
  ];
  
  if (businessEventPatterns.some(pattern => pattern.test(text))) {
    // Only filter if celebrity is not prominently featured in title
    const titleWords = article.title.toLowerCase().split(' ');
    const celebrityInTitle = celebrityName !== 'unknown' && 
      titleWords.slice(0, 5).some(word => celebrityName.includes(word));
    
    if (!celebrityInTitle) {
      logger.debug(`Filtering business/event content: ${article.title.substring(0, 50)}...`);
      return true;
    }
  }
  
  return false;
}

/**
 * Sort articles by quality while preserving volume
 */
export function sortByQuality(articles: IArticle[]): IArticle[] {
  return articles
    .map(article => ({
      article,
      quality: calculateQualityScore(article)
    }))
    .sort((a, b) => {
      // First sort by quality score (high to low)
      if (a.quality.totalScore !== b.quality.totalScore) {
        return b.quality.totalScore - a.quality.totalScore;
      }
      
      // Then by category priority
      const categoryPriority = {
        [ArticleCategory.PERSONAL_LIFE]: 5,
        [ArticleCategory.CONTROVERSY]: 4,
        [ArticleCategory.CAREER]: 3,
        [ArticleCategory.FASHION_BEAUTY]: 2,
        [ArticleCategory.EVENT_MENTION]: 1,
        [ArticleCategory.GENERIC_LIFESTYLE]: 0,
        [ArticleCategory.UNKNOWN]: -1
      };
      
      return categoryPriority[b.quality.category] - categoryPriority[a.quality.category];
    })
    .map(item => item.article);
}
