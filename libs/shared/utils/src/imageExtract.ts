/**
 * Shared article-page image extraction (og:image, twitter:image, img tags).
 * Used at ingest (API) and by the frontend image proxy.
 */

function toAbsolute(u: string, baseUrl: string): string | null {
  try {
    return new URL(u, baseUrl).toString();
  } catch {
    return null;
  }
}

export function scoreImageUrl(u: string): number {
  let score = 0;
  const lowered = u.toLowerCase();

  if (/(2048|1920|1600|1440|1200|1080)/.test(lowered)) score += 10;
  if (/(1024|900|800)/.test(lowered)) score += 5;
  if (/(large|big|high|hd|full|original|max|hq|quality)/.test(lowered)) score += 8;
  if (/(xl|xlarge|xxl|2x|3x|retina)/.test(lowered)) score += 6;
  if (/webp|avif/.test(lowered)) score += 3;
  if (/(cdn|media|images|static|assets|uploads|storage)/.test(lowered)) score += 4;
  if (/(thumb|thumbnail|small|xs|mini|icon|avatar)/.test(lowered)) score -= 10;
  if (/(150|200|300|400)/.test(lowered)) score -= 5;
  if (/(facebook|twitter|instagram|social)/.test(lowered)) score -= 3;

  return score;
}

export function extractBestImageFromHtml(html: string, baseUrl: string): string | null {
  const candidates: string[] = [];

  const ogMatch =
    /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"'>]+)["']/i.exec(html) ||
    /<meta[^>]+content=["']([^"'>]+)["'][^>]*property=["']og:image["']/i.exec(html);
  if (ogMatch?.[1]) {
    const abs = toAbsolute(ogMatch[1], baseUrl);
    if (abs) candidates.push(abs);
  }

  const twMatch =
    /<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"'>]+)["']/i.exec(html) ||
    /<meta[^>]+content=["']([^"'>]+)["'][^>]*name=["']twitter:image["']/i.exec(html);
  if (twMatch?.[1]) {
    const abs = toAbsolute(twMatch[1], baseUrl);
    if (abs) candidates.push(abs);
  }

  const linkMatch =
    /<link[^>]+rel=["']image_src["'][^>]*href=["']([^"'>]+)["']/i.exec(html) ||
    /<link[^>]+href=["']([^"'>]+)["'][^>]*rel=["']image_src["']/i.exec(html);
  if (linkMatch?.[1]) {
    const abs = toAbsolute(linkMatch[1], baseUrl);
    if (abs) candidates.push(abs);
  }

  const articleImgRegex =
    /<img[^>]+(?:class|id)=["'][^"']*(?:article|featured|hero|main|principal|destaque|cover)[^"']*["'][^>]+src=["']([^"'>]+)["']/gi;
  let articleMatch: RegExpExecArray | null;
  while ((articleMatch = articleImgRegex.exec(html)) && candidates.length < 10) {
    const abs = toAbsolute(articleMatch[1], baseUrl);
    if (abs) candidates.push(abs);
  }

  const sizedImgRegex =
    /<img[^>]+(?:width|height)=["'](?:[5-9]\d{2}|\d{4})["'][^>]+src=["']([^"'>]+)["']/gi;
  let sizedMatch: RegExpExecArray | null;
  while ((sizedMatch = sizedImgRegex.exec(html)) && candidates.length < 15) {
    const abs = toAbsolute(sizedMatch[1], baseUrl);
    if (abs) candidates.push(abs);
  }

  const imgRegex = /<img[^>]+src=["']([^"'>]+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRegex.exec(html)) && candidates.length < 20) {
    const abs = toAbsolute(m[1], baseUrl);
    if (abs && !candidates.includes(abs)) candidates.push(abs);
  }

  const unique = [...new Set(candidates)];
  const scored = unique
    .map(url => ({ url, score: scoreImageUrl(url) }))
    .sort((a, b) => b.score - a.score);
  return scored[0]?.url ?? null;
}
