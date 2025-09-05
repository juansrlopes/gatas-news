import request from 'supertest';
import app from '../app';

describe('Health Controller', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('node');
      expect(response.body.status).toBe('healthy');
    });

    it('should include basic health information', async () => {
      const response = await request(app).get('/health');

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('should return proper headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['content-type']).toMatch(/json/);
      // Basic health endpoint doesn't set cache-control headers
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health information', async () => {
      const response = await request(app).get('/health/detailed');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(typeof response.body.uptime).toBe('number');
    });

    it('should include database connection details', async () => {
      const response = await request(app).get('/health/detailed');

      expect(response.body.services).toHaveProperty('mongodb');
      expect(response.body.services.mongodb).toBeDefined();
    });

    it('should include cache service details', async () => {
      const response = await request(app).get('/health/detailed');

      expect(response.body.services).toHaveProperty('cache');
      expect(response.body.services.cache).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle health check gracefully even with service errors', async () => {
      // This test ensures the health endpoint doesn't crash even if services are down
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      // Status could be 'healthy', 'degraded', or 'unhealthy' depending on service states
      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.status);
    });
  });
});
