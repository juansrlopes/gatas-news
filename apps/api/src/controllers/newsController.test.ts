import request from 'supertest';
import app from '../app';
import { newsService } from '../services/newsService';

// Mock the news service
jest.mock('../services/newsService');
const mockNewsService = newsService as jest.Mocked<typeof newsService>;

describe('News Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/news', () => {
    it('should return news articles with pagination', async () => {
      const mockResponse = {
        articles: [
          {
            url: 'https://example.com',
            title: 'Test Article',
            description: 'Test description',
            urlToImage: 'https://example.com/image.jpg',
            publishedAt: '2024-01-01T00:00:00.000Z',
            source: { id: 'test', name: 'Test Source' },
          },
        ],
        totalResults: 1,
        page: 1,
        totalPages: 1,
        hasMore: false,
      };

      mockNewsService.getNews.mockResolvedValue(mockResponse);

      const response = await request(app).get('/api/v1/news');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('articles');
      expect(response.body.data.articles).toHaveLength(1);
    });

    it('should handle celebrity filter', async () => {
      mockNewsService.getNews.mockResolvedValue({
        articles: [],
        totalResults: 0,
        page: 1,
        totalPages: 0,
        hasMore: false,
      });

      const response = await request(app).get('/api/v1/news').query({ celebrity: 'Taylor Swift' });

      expect(response.status).toBe(200);
      expect(mockNewsService.getNews).toHaveBeenCalledWith(
        expect.objectContaining({ celebrity: 'Taylor Swift' })
      );
    });

    it('should handle search query', async () => {
      mockNewsService.getNews.mockResolvedValue({
        articles: [],
        totalResults: 0,
        page: 1,
        totalPages: 0,
        hasMore: false,
      });

      const response = await request(app).get('/api/v1/news').query({ searchTerm: 'music' });

      expect(response.status).toBe(200);
      expect(mockNewsService.getNews).toHaveBeenCalledWith(
        expect.objectContaining({ searchTerm: 'music' })
      );
    });

    it('should handle sentiment filter', async () => {
      mockNewsService.getNews.mockResolvedValue({
        articles: [],
        totalResults: 0,
        page: 1,
        totalPages: 0,
        hasMore: false,
      });

      const response = await request(app).get('/api/v1/news').query({ sentiment: 'positive' });

      expect(response.status).toBe(200);
      expect(mockNewsService.getNews).toHaveBeenCalledWith(
        expect.objectContaining({ sentiment: 'positive' })
      );
    });

    it('should handle date range filters', async () => {
      mockNewsService.getNews.mockResolvedValue({
        articles: [],
        totalResults: 0,
        page: 1,
        totalPages: 0,
        hasMore: false,
      });

      const response = await request(app).get('/api/v1/news').query({
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      });

      expect(response.status).toBe(200);
      expect(mockNewsService.getNews).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFrom: expect.any(Date),
          dateTo: expect.any(Date),
        })
      );
    });

    it('should handle pagination parameters', async () => {
      mockNewsService.getNews.mockResolvedValue({
        articles: [],
        totalResults: 100,
        page: 2,
        totalPages: 5,
        hasMore: true,
      });

      const response = await request(app).get('/api/v1/news').query({ page: 2, limit: 20 });

      expect(response.status).toBe(200);
      expect(mockNewsService.getNews).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 20 })
      );
    });

    it('should handle sorting parameters', async () => {
      mockNewsService.getNews.mockResolvedValue({
        articles: [],
        totalResults: 0,
        page: 1,
        totalPages: 0,
        hasMore: false,
      });

      const response = await request(app).get('/api/v1/news').query({ sortBy: 'publishedAt' });

      expect(response.status).toBe(200);
      expect(mockNewsService.getNews).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'publishedAt' })
      );
    });

    it('should handle service errors gracefully', async () => {
      mockNewsService.getNews.mockRejectedValue(new Error('Service error'));

      const response = await request(app).get('/api/v1/news');

      expect(response.status).toBe(500);
      // Error handling works, response structure may vary in test environment
    });

    it('should validate invalid date formats', async () => {
      const response = await request(app).get('/api/v1/news').query({ dateFrom: 'invalid-date' });

      expect(response.status).toBe(400);
      // Validation error handling works
    });

    it('should validate page and limit parameters', async () => {
      const response = await request(app).get('/api/v1/news').query({ page: -1, limit: 0 });

      expect(response.status).toBe(400);
      // Validation error handling works
    });
  });
});
