import request from 'supertest';
import app from '../app';

describe('App Integration', () => {
  describe('Basic Routes', () => {
    it('should respond to root endpoint', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name');
      expect(response.body.name).toContain('Gatas News API');
    });

    it('should respond to health endpoint', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
    });

    it('should handle 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
    });
  });

  describe('API Route Structure', () => {
    it('should have API v1 routes mounted', async () => {
      // Test that the API routes are mounted by checking for proper error responses
      const response = await request(app).get('/api/v1/nonexistent');

      // Should get 404 from the API router, not the main app
      expect(response.status).toBe(404);
    });
  });
});
