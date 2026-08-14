/**
 * Extract best image URL from an article page at ingest time.
 * Used so we store a high-res image URL once per article and serve it to all users.
 */

import axios from 'axios';
import { extractBestImageFromHtml } from '../../../../libs/shared/utils/src/index';
import logger from '../utils/logger';

const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT = 'Mozilla/5.0 (compatible; Gatas-News-Bot/1.0; +https://gatas-news.com)';

/** Allow HTTPS image URLs from common news/CDN patterns; reject obvious bad domains */
function isImageUrlSafe(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    if (url.protocol !== 'https:') return false;
    const hostname = url.hostname.toLowerCase();
    const bad = [/localhost/, /127\.0\.0\.1/, /\.onion$/];
    if (bad.some(p => p.test(hostname))) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch article page HTML and extract the best image URL. Returns null on failure or if none found.
 */
export async function extractBestImageUrl(articleUrl: string): Promise<string | null> {
  try {
    const response = await axios.get(articleUrl, {
      responseType: 'text',
      timeout: FETCH_TIMEOUT_MS,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      maxContentLength: 2 * 1024 * 1024,
      validateStatus: () => true,
    });

    const html = typeof response.data === 'string' ? response.data : String(response.data ?? '');
    if (response.status !== 200 || !html) return null;

    const candidate = extractBestImageFromHtml(html, articleUrl);
    if (!candidate || !isImageUrlSafe(candidate)) return null;
    return candidate;
  } catch (err) {
    logger.debug(`Image extract failed for ${articleUrl.substring(0, 60)}...: ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}

/**
 * Run extract for multiple article URLs with a concurrency limit. Returns a map of articleUrl -> highResImageUrl (or null).
 */
export async function extractBestImageUrls(
  articleUrls: string[],
  concurrency: number = 3
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const queue = [...articleUrls];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) break;
      const highRes = await extractBestImageUrl(url);
      results.set(url, highRes);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, articleUrls.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
