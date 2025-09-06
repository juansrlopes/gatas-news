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

    // Check if domain is allowed
    const hostname = url.hostname.toLowerCase();
    const isAllowed = ALLOWED_DOMAINS.some(
      domain => hostname === domain || hostname.endsWith('.' + domain)
    );

    return isAllowed;
  } catch {
    return false;
  }
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
  } catch (error: any) {
    console.error('Image proxy error:', {
      url,
      error: error.message,
      code: error.code,
      status: error.response?.status,
    });

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(408).json({ error: 'Request timeout' });
    }

    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Image not found' });
    }

    if (error.response?.status === 403) {
      return res.status(403).json({ error: 'Access forbidden' });
    }

    return res.status(500).json({ error: 'Failed to fetch image' });
  }
}
