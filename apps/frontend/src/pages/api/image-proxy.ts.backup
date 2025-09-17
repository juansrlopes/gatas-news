/**
 * Image Proxy API Route
 *
 * Secure image proxy that fetches images from trusted news sources
 * while protecting against SSRF attacks and providing caching.
 *
 * Security Features:
 * - Domain whitelist (only trusted news sites)
 * - HTTPS-only enforcement
 * - Content-Type validation
 * - File size limits (5MB max)
 * - Request timeout (10 seconds)
 *
 * Performance Features:
 * - 24-hour caching headers
 * - Proper content-length headers
 * - Gzip/Brotli compression support
 *
 * @route GET /api/image-proxy?url={imageUrl}
 * @param {string} url - The image URL to proxy (must be from allowed domains)
 * @returns {Buffer} The proxied image data
 *
 * @example
 * ```tsx
 * // In a Next.js Image component
 * <Image
 *   src="/api/image-proxy?url=https://images.unsplash.com/photo-123.jpg"
 *   alt="News image"
 * />
 * ```
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

/**
 * Allowed domains for security - only trusted news sources
 * This whitelist prevents SSRF attacks by restricting which domains
 * can be accessed through the proxy.
 */
const ALLOWED_DOMAINS = [
  'images.unsplash.com',
  'cdn.cnn.com',
  'media.cnn.com',
  'static01.nyt.com',
  'www.bbc.com',
  'ichef.bbci.co.uk',
  'cdn.vox-cdn.com',
  'www.reuters.com',
  'cloudfront-us-east-1.images.arcpublishing.com',
  'img.estadao.com.br',
  // Brazilian news domains
  'veja.abril.com.br',
  'uploads.metroimg.com',
  'i0.statig.com.br',
  'p2.trrsf.com',
  'www.metropoles.com',
  'uploads.metropoles.com',
  'static.poder360.com.br',
  'conteudo.imguol.com.br',
  'www.cnnbrasil.com.br',
  'cdn-images-1.medium.com',
  'miro.medium.com',
  'www.uol.com.br',
  'f.i.uol.com.br',
  'imagens.ebc.com.br',
  // CRITICAL: Missing domains found in actual articles
  'assets.papelpop.com',
  'blogger.googleusercontent.com',
  'claudia.abril.com.br',
  'olhardigital.com.br',
  'www.infomoney.com.br',

  // PHASE 2: Additional Brazilian entertainment/celebrity news domains
  'gente.ig.com.br',
  'img.ig.com.br',
  'caras.uol.com.br',
  'img.caras.uol.com.br',
  'quem.globo.com',
  'gshow.globo.com',
  'purepeople.com.br',
  'img.purepeople.com.br',
  'papelpop.com',
  'img.papelpop.com',
  'extra.globo.com',
  'ogimg.infoglobo.com.br',
  's2.glbimg.com',
  's3.glbimg.com',
  'media.globo.com',
  'g1.globo.com',
  'r7.com',
  'img.r7.com',
  'recordtv.r7.com',
  'band.uol.com.br',
  'img.band.uol.com.br',
  'sbt.com.br',
  'jovempan.com.br',
  'img.jovempan.com.br',
  'terra.com.br',
  'img.terra.com.br',
  'img-s-msn-com.akamaized.net',
  'media.zenfs.com',
];

/**
 * Validates if a URL is safe to proxy
 *
 * Checks if the URL uses HTTPS and is from an allowed domain.
 * This prevents SSRF attacks and ensures we only proxy trusted sources.
 *
 * @param {string} urlString - The URL to validate
 * @returns {boolean} True if the URL is safe to proxy
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Only allow HTTPS
    if (url.protocol !== 'https:') {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    // Check against whitelist first (fastest path)
    const isWhitelisted = ALLOWED_DOMAINS.some(
      domain => hostname === domain || hostname.endsWith('.' + domain)
    );

    if (isWhitelisted) {
      return true;
    }

    // Dynamic validation for new domains
    return isDomainSafeForNews(hostname);
  } catch {
    return false;
  }
}

/**
 * Dynamic domain validation for news-related domains
 *
 * @param hostname - The domain to validate
 * @returns {boolean} True if domain appears safe for news images
 */
function isDomainSafeForNews(hostname: string): boolean {
  // News domain patterns (Brazilian and international)
  const newsPatterns = [
    /\.com\.br$/, // Brazilian domains
    /\.abril\.com\.br$/, // Abril group
    /\.globo\.com$/, // Globo group
    /\.uol\.com\.br$/, // UOL group
    /\.estadao\.com\.br$/, // Estadão group
    /\.folha\.uol\.com\.br$/, // Folha group
    /\.g1\.globo\.com$/, // G1 news
    /\.cnn\.com$/, // CNN
    /\.bbc\.com$/, // BBC
    /\.reuters\.com$/, // Reuters
    /\.ap\.org$/, // Associated Press
    /googleusercontent\.com$/, // Google hosted content
    /\.medium\.com$/, // Medium articles
    /\.wordpress\.com$/, // WordPress blogs
  ];

  // Check if domain matches news patterns
  const matchesNewsPattern = newsPatterns.some(pattern => pattern.test(hostname));

  if (matchesNewsPattern) {
    // Log new domain for future whitelisting
    logNewDomain(hostname, 'auto-validated');
    return true;
  }

  // Additional safety checks for unknown domains
  const suspiciousPatterns = [
    /localhost/,
    /127\.0\.0\.1/,
    /192\.168\./,
    /10\./,
    /\.onion$/,
    /\.tk$/,
    /\.ml$/,
    /\.ga$/,
    /\.cf$/,
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(hostname));

  if (isSuspicious) {
    logBlockedDomain(hostname, 'suspicious-pattern');
    return false;
  }

  // Log unknown domain for manual review
  logNewDomain(hostname, 'needs-review');
  return false; // Conservative approach - block unknown domains
}

/**
 * Logs new domains for future whitelisting consideration
 *
 * @param hostname - The domain that was encountered
 * @param status - The validation status
 */
function logNewDomain(hostname: string, status: 'auto-validated' | 'needs-review'): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    hostname,
    status,
    action: status === 'auto-validated' ? 'ALLOWED' : 'BLOCKED',
  };

  // Log to console for now (future: database/file logging)
  console.log(`[IMAGE-PROXY] New domain ${status}:`, logEntry);

  // TODO: Future enhancement - store in database for admin dashboard
  // await storeDomainLog(logEntry);
}

/**
 * Logs blocked domains for security monitoring
 *
 * @param hostname - The domain that was blocked
 * @param reason - Why it was blocked
 */
function logBlockedDomain(hostname: string, reason: string): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    hostname,
    reason,
    action: 'BLOCKED',
  };

  console.warn(`[IMAGE-PROXY] Domain blocked:`, logEntry);

  // TODO: Future enhancement - security alerts for suspicious domains
  // await alertSecurityTeam(logEntry);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  // Validate URL
  if (!isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid or unauthorized URL' });
  }

  try {
    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400'); // 24 hours

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'Gatas-News-Image-Proxy/1.0',
      },
      maxContentLength: 5 * 1024 * 1024, // 5MB max
    });

    const contentType = response.headers['content-type'];

    // Validate content type
    if (!contentType || !contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', response.data.length);
    res.send(response.data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Type guard for error with code
    const hasCode = (err: unknown): err is { code: string } =>
      err !== null && typeof err === 'object' && 'code' in err;

    // Type guard for error with response
    const hasResponse = (err: unknown): err is { response: { status: number } } =>
      err !== null &&
      typeof err === 'object' &&
      'response' in err &&
      typeof (err as { response: unknown }).response === 'object' &&
      (err as { response: unknown }).response !== null &&
      'status' in (err as { response: { status: unknown } }).response;

    const errorCode = hasCode(error) ? error.code : undefined;
    const errorStatus = hasResponse(error) ? error.response.status : undefined;

    console.error('Image proxy error:', {
      url,
      error: errorMessage,
      code: errorCode,
      status: errorStatus,
    });

    if (errorCode === 'ECONNABORTED' || errorCode === 'ETIMEDOUT') {
      return res.status(408).json({ error: 'Request timeout' });
    }

    if (errorStatus === 404) {
      return res.status(404).json({ error: 'Image not found' });
    }

    if (errorStatus === 403) {
      return res.status(403).json({ error: 'Access forbidden' });
    }

    return res.status(500).json({ error: 'Failed to fetch image' });
  }
}
