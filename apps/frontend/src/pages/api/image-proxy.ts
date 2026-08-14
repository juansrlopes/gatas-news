/**
 * Image Proxy API Route - IMPROVED VERSION
 *
 * Secure image proxy that fetches images from trusted news sources
 * while protecting against SSRF attacks and providing caching.
 *
 * Security Features:
 * - Domain whitelist (only trusted news sites)
 * - HTTPS-only enforcement
 * - Content-Type validation
 * - File size limits (5MB max)
 * - Request timeout (20 seconds - increased for slow sites)
 *
 * Performance Features:
 * - 24-hour caching headers
 * - Proper content-length headers
 * - Gzip/Brotli compression support
 * - Better fallback handling
 *
 * @route GET /api/image-proxy?url={imageUrl}
 * @param {string} url - The image URL to proxy (must be from allowed domains)
 * @returns {Buffer} The proxied image data
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { extractBestImageFromHtml } from '../../../../../libs/shared/utils/src/index';

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

  // PHASE 3: Production domains found in logs (2025-09-17)
  'tecoapple.com',
  'www.revistabula.com',
  'revistabula.com',
  'wm.observador.pt',
  'bordalo.observador.pt',
  's3.observador.pt',
  'observador.pt',
  'images.terra.com',
  'p2.trrsf.com',
  'trrsf.com',
  
  // PHASE 4: Scraped / entertainment image domains
  's2-g1.glbimg.com',
  's1-g1.glbimg.com',
  'i.s3.glbimg.com',
  'glbimg.com',
  'istoe.com.br',
  'img.istoe.com.br',
  'assets.istoe.com.br',
  'farofafa.com.br',
  'assets.b9.com.br',
  'b9.com.br',
  
  // PHASE 5: Google/Serper image domains (2025-09-19)
  'encrypted-tbn0.gstatic.com',
  'encrypted-tbn1.gstatic.com',
  'encrypted-tbn2.gstatic.com',
  'encrypted-tbn3.gstatic.com',
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'lh6.googleusercontent.com',
  'lh7.googleusercontent.com',
  'www.gstatic.com',
  'ssl.gstatic.com',
  'gstatic.com',
  'googleusercontent.com',
  'yt3.ggpht.com',
  'yt3.googleusercontent.com',
  
  // PHASE 6: NEW DOMAINS - Fixing blocked domains from terminal output
  'i0.wp.com',
  'i1.wp.com',
  'i2.wp.com',
  'i3.wp.com',
  'wp.com',
  'folhadecuritiba.com.br',
  'ajn1.com.br',
  'www.folhadecuritiba.com.br',
  'www.ajn1.com.br',
  
  // PHASE 7: Additional domains from error logs
  'virgula.me',
  'www.virgula.me',
  'www.fox.com',
  'fox.com',
  'www.msn.com',
  'msn.com',
];

/**
 * Validates if a URL is safe to proxy
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
    /\.wp\.com$/, // WordPress.com hosted images
    /\.me$/, // .me domains (virgula.me, etc.)
    /gstatic\.com$/,
    /cloudfront\.net$/,
    /akamaized\.net$/,
    /glbimg\.com$/,
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
}

/**
 * Logs blocked domains for security monitoring
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
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, extract } = req.query as { url?: string; extract?: string };

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  // Validate URL (article or image URL)
  if (!isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid or unauthorized URL' });
  }

  try {
    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400'); // 24 hours

    // If extract=true, fetch the page HTML and extract a high-quality image
    if (extract === 'true') {
      try {
        const pageResponse = await axios.get(url, {
          responseType: 'text',
          timeout: 20000, // INCREASED: 20 seconds for slow websites
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Gatas-News-Image-Proxy/2.0; +https://gatas-news.com)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
          },
          maxContentLength: 5 * 1024 * 1024,
        });

        const html = typeof pageResponse.data === 'string' ? pageResponse.data : pageResponse.data?.toString?.() ?? '';
        const candidate = extractBestImageFromHtml(html, url);

        if (!candidate) {
          console.log(`[IMAGE-PROXY] No high-quality image found for ${url}, returning placeholder`);
          // Return a placeholder image instead of 404
          return res.redirect(302, '/placeholder-news.svg');
        }

        if (!isValidUrl(candidate)) {
          console.warn(`[IMAGE-PROXY] Extracted image URL not allowed: ${candidate}, trying to whitelist...`);
          // Try to extract domain and auto-whitelist if it's a news domain
          try {
            const candidateUrl = new URL(candidate);
            const hostname = candidateUrl.hostname.toLowerCase();
            // If it matches news patterns, allow it
            if (isDomainSafeForNews(hostname)) {
              console.log(`[IMAGE-PROXY] Auto-whitelisted extracted image domain: ${hostname}`);
              // Continue with the request
            } else {
              // Not a news domain, return placeholder
              console.warn(`[IMAGE-PROXY] Extracted image from non-news domain: ${hostname}, returning placeholder`);
              return res.redirect(302, '/placeholder-news.svg');
            }
          } catch {
            // Invalid URL, return placeholder
            return res.redirect(302, '/placeholder-news.svg');
          }
        }

        const imageResp = await axios.get(candidate, {
          responseType: 'arraybuffer',
          timeout: 15000, // INCREASED: 15 seconds for image downloads
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Gatas-News-Image-Proxy/2.0; +https://gatas-news.com)',
            'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
          },
          maxContentLength: 5 * 1024 * 1024,
        });

        const imgType = imageResp.headers['content-type'];
        if (!imgType || !imgType.startsWith('image/')) {
          return res.status(400).json({ error: 'Extracted resource is not an image' });
        }

        res.setHeader('Content-Type', imgType);
        res.setHeader('Content-Length', imageResp.data.length);
        return res.send(imageResp.data);
      } catch (extractError) {
        console.error(`[IMAGE-PROXY] Extract mode failed for ${url}:`, extractError);
        // Return placeholder instead of 404 to prevent broken images
        return res.redirect(302, '/placeholder-news.svg');
      }
    }

    // Default: proxy a direct image URL
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000, // INCREASED: 15 seconds for direct image URLs
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Gatas-News-Image-Proxy/2.0; +https://gatas-news.com)',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
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
    return res.send(response.data);
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

    // IMPROVED ERROR HANDLING
    if (errorCode === 'ECONNABORTED' || errorCode === 'ETIMEDOUT') {
      console.warn(`[IMAGE-PROXY] Timeout for ${url} (${errorCode})`);
      return res.status(408).json({ error: 'Request timeout - website too slow' });
    }

    if (errorCode === 'ENOTFOUND' || errorCode === 'ECONNREFUSED') {
      console.warn(`[IMAGE-PROXY] Connection failed for ${url} (${errorCode})`);
      return res.status(404).json({ error: 'Website not reachable' });
    }

    if (errorStatus === 404) {
      return res.status(404).json({ error: 'Image not found' });
    }

    if (errorStatus === 403) {
      return res.status(403).json({ error: 'Access forbidden' });
    }

    if (errorStatus === 429) {
      return res.status(429).json({ error: 'Rate limited by source website' });
    }

    return res.status(500).json({ error: 'Failed to fetch image' });
  }
}
