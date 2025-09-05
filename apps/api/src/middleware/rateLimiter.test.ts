import request from 'supertest';
import express from 'express';
import { generalLimiter } from './rateLimiter';

describe('Rate Limiter Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(generalLimiter);
    app.get('/test', (req, res) => {
      res.json({ message: 'success' });
    });
  });

  it('should allow requests within rate limit', async () => {
    const response = await request(app).get('/test').expect(200);

    expect(response.body.message).toBe('success');
  });

  it('should include rate limit headers', async () => {
    const response = await request(app).get('/test').expect(200);

    expect(response.headers).toHaveProperty('ratelimit-limit');
    expect(response.headers).toHaveProperty('ratelimit-remaining');
  });

  it('should handle multiple requests from same IP', async () => {
    // Make first request
    await request(app).get('/test').expect(200);

    // Make second request
    const response = await request(app).get('/test').expect(200);

    expect(response.body.message).toBe('success');
  });
});
