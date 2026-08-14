import { extractBestImageFromHtml, scoreImageUrl } from './imageExtract';

describe('scoreImageUrl', () => {
  it('prefers large / CDN URLs over thumbnails', () => {
    expect(scoreImageUrl('https://cdn.example.com/images/photo-1920.jpg')).toBeGreaterThan(
      scoreImageUrl('https://example.com/thumb-150.jpg')
    );
  });
});

describe('extractBestImageFromHtml', () => {
  const base = 'https://news.example.com/story';

  it('prefers og:image', () => {
    const html = `
      <meta property="og:image" content="/media/hero-1200.jpg" />
      <img src="/tiny-thumb.jpg" />
    `;
    expect(extractBestImageFromHtml(html, base)).toBe(
      'https://news.example.com/media/hero-1200.jpg'
    );
  });

  it('falls back to img src when no meta tags exist', () => {
    const html = `<img src="https://cdn.example.com/assets/photo.jpg" />`;
    expect(extractBestImageFromHtml(html, base)).toBe(
      'https://cdn.example.com/assets/photo.jpg'
    );
  });

  it('returns null when there are no image candidates', () => {
    expect(extractBestImageFromHtml('<p>no images</p>', base)).toBeNull();
  });
});
