import axios from 'axios';
import { extractBestImageUrl, extractBestImageUrls } from './imageExtractService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('imageExtractService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the og:image URL from a successful page fetch', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: '<meta property="og:image" content="https://cdn.example.com/hero-1200.jpg" />',
    });

    await expect(extractBestImageUrl('https://news.example.com/story')).resolves.toBe(
      'https://cdn.example.com/hero-1200.jpg'
    );
  });

  it('returns null when the page request fails', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('timeout'));

    await expect(extractBestImageUrl('https://news.example.com/story')).resolves.toBeNull();
  });

  it('extracts a batch of URLs with a concurrency limit', async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: '<meta property="og:image" content="https://cdn.example.com/a.jpg" />',
    });

    const result = await extractBestImageUrls(
      ['https://news.example.com/1', 'https://news.example.com/2'],
      2
    );

    expect(result.size).toBe(2);
    expect(result.get('https://news.example.com/1')).toBe('https://cdn.example.com/a.jpg');
  });
});
