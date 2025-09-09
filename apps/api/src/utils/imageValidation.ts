/**
 * Image URL Validation Utilities
 *
 * This module provides image validation functionality for the news fetcher.
 * It validates image URLs to ensure they are accessible and from trusted sources
 * before storing articles in the database.
 */

import axios from 'axios';
import logger from './logger';

/**
 * Allowed domains for image sources - trusted news domains
 */
const TRUSTED_IMAGE_DOMAINS = [
  // Brazilian news domains
  'uploads.metroimg.com',
  'img.estadao.com.br',
  'conteudo.imguol.com.br',
  'p2.trrsf.com',
  'www.cnnbrasil.com.br',
  'cdn.cnnbrasil.com.br',
  'extra.globo.com',
  'ogimg.infoglobo.com.br',
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
  'metropoles.com',
  'uploads.metropoles.com',

  // International news domains
  'images.unsplash.com',
  'cdn.cnn.com',
  'media.cnn.com',
  'static01.nyt.com',
  'ichef.bbci.co.uk',
  'cdn.vox-cdn.com',
  'cloudfront-us-east-1.images.arcpublishing.com',
  'media.reuters.com',
  'cdn.abcotvs.com',
  'media.npr.org',
  'www.washingtonpost.com',
  'img.washingtonpost.com',
];

/**
 * News domain patterns for dynamic validation
 */
const NEWS_DOMAIN_PATTERNS = [
  /\.com\.br$/,
  /\.globo\.com$/,
  /\.uol\.com\.br$/,
  /\.estadao\.com\.br$/,
  /\.folha\.uol\.com\.br$/,
  /\.g1\.globo\.com$/,
  /\.cnn\.com$/,
  /\.bbc\.com$/,
  /\.reuters\.com$/,
  /\.ap\.org$/,
  /\.npr\.org$/,
  /\.washingtonpost\.com$/,
  /\.nytimes\.com$/,
  /\.wsj\.com$/,
  /\.usatoday\.com$/,
  /\.abcnews\.go\.com$/,
  /\.cbsnews\.com$/,
  /\.nbcnews\.com$/,
  /\.foxnews\.com$/,
  /\.theguardian\.com$/,
  /\.independent\.co\.uk$/,
  /\.dailymail\.co\.uk$/,
  /\.telegraph\.co\.uk$/,
  /\.metro\.co\.uk$/,
  /\.mirror\.co\.uk$/,
];

/**
 * Suspicious domain patterns to block
 */
const SUSPICIOUS_PATTERNS = [
  /localhost/,
  /127\.0\.0\.1/,
  /192\.168\./,
  /10\./,
  /172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /\.local$/,
  /\.internal$/,
  /\.corp$/,
  /\.lan$/,
  /bit\.ly/,
  /tinyurl/,
  /t\.co/,
  /goo\.gl/,
  /short/,
  /redirect/,
  /malware/,
  /phishing/,
  /spam/,
];

export interface ImageValidationResult {
  isValid: boolean;
  reason?: string;
  contentType?: string;
  contentLength?: number;
}

/**
 * Validates if a domain is safe for image loading
 */
function isDomainSafeForImages(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();

  // Check against trusted domains first
  const isTrusted = TRUSTED_IMAGE_DOMAINS.some(
    domain => lowerHostname === domain || lowerHostname.endsWith('.' + domain)
  );

  if (isTrusted) {
    return true;
  }

  // Check against suspicious patterns
  const isSuspicious = SUSPICIOUS_PATTERNS.some(pattern => pattern.test(lowerHostname));
  if (isSuspicious) {
    return false;
  }

  // Check against news domain patterns
  const isNewsRelated = NEWS_DOMAIN_PATTERNS.some(pattern => pattern.test(lowerHostname));
  return isNewsRelated;
}

/**
 * Validates an image URL by checking domain and making a HEAD request
 *
 * @param imageUrl - The image URL to validate
 * @param timeout - Request timeout in milliseconds (default: 5000)
 * @returns Promise<ImageValidationResult>
 */
export async function validateImageUrl(
  imageUrl: string,
  timeout: number = 5000
): Promise<ImageValidationResult> {
  try {
    // Basic URL validation
    if (!imageUrl || typeof imageUrl !== 'string') {
      return { isValid: false, reason: 'Invalid URL format' };
    }

    const url = new URL(imageUrl);

    // Only allow HTTPS
    if (url.protocol !== 'https:') {
      return { isValid: false, reason: 'Only HTTPS URLs are allowed' };
    }

    // Domain validation
    if (!isDomainSafeForImages(url.hostname)) {
      return { isValid: false, reason: `Domain not trusted: ${url.hostname}` };
    }

    // Make HEAD request to check if image exists and get metadata
    const response = await axios.head(imageUrl, {
      timeout,
      headers: {
        'User-Agent': 'Gatas-News-Bot/1.0 (+https://gatas-news.com)',
      },
      maxRedirects: 3,
    });

    const contentType = response.headers['content-type'];
    const contentLength = parseInt(response.headers['content-length'] || '0');

    // Validate content type
    if (!contentType || !contentType.startsWith('image/')) {
      return {
        isValid: false,
        reason: `Invalid content type: ${contentType}`,
        contentType,
      };
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (contentLength > maxSize) {
      return {
        isValid: false,
        reason: `Image too large: ${contentLength} bytes (max: ${maxSize})`,
        contentType,
        contentLength,
      };
    }

    // Validate image format
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(contentType.toLowerCase())) {
      return {
        isValid: false,
        reason: `Unsupported image format: ${contentType}`,
        contentType,
      };
    }

    return {
      isValid: true,
      contentType,
      contentLength,
    };
  } catch (error: unknown) {
    let errorMessage = 'Unknown error';

    if (error && typeof error === 'object') {
      if (
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'status' in error.response
      ) {
        errorMessage = `HTTP ${error.response.status}`;
      } else if ('message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
      }
    }

    return {
      isValid: false,
      reason: `Image validation failed: ${errorMessage}`,
    };
  }
}

/**
 * Validates multiple image URLs in parallel
 *
 * @param imageUrls - Array of image URLs to validate
 * @param timeout - Request timeout in milliseconds (default: 5000)
 * @returns Promise<ImageValidationResult[]>
 */
export async function validateImageUrls(
  imageUrls: string[],
  timeout: number = 5000
): Promise<ImageValidationResult[]> {
  const validationPromises = imageUrls.map(url =>
    validateImageUrl(url, timeout).catch(error => ({
      isValid: false,
      reason: `Validation error: ${error.message}`,
    }))
  );

  return Promise.all(validationPromises);
}

/**
 * Quick domain-only validation (no HTTP request)
 * Useful for fast filtering before making HTTP requests
 *
 * @param imageUrl - The image URL to validate
 * @returns boolean
 */
export function isImageUrlDomainValid(imageUrl: string): boolean {
  try {
    if (!imageUrl || typeof imageUrl !== 'string') {
      return false;
    }

    const url = new URL(imageUrl);

    // Only allow HTTPS
    if (url.protocol !== 'https:') {
      return false;
    }

    return isDomainSafeForImages(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Logs image validation results for monitoring
 */
export function logImageValidation(
  imageUrl: string,
  result: ImageValidationResult,
  context: string = 'unknown'
): void {
  if (result.isValid) {
    logger.debug(`✅ Image validation passed: ${imageUrl}`, {
      context,
      contentType: result.contentType,
      contentLength: result.contentLength,
    });
  } else {
    logger.debug(`❌ Image validation failed: ${imageUrl}`, {
      context,
      reason: result.reason,
    });
  }
}
