import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server';

describe('API', () => {
  describe('auth', () => {
    it('GET /api/profile without Authorization returns 401', async () => {
      const res = await request(app)
        .get('/api/profile')
        .expect(401);
      expect(res.body).toMatchObject({ error: expect.any(String), code: 'auth_required' });
    });

    it('GET /api/messages without Authorization returns 401', async () => {
      await request(app)
        .get('/api/messages')
        .expect(401);
    });

    it('POST /api/chat without Authorization returns 401', async () => {
      await request(app)
        .post('/api/chat')
        .send({ message: 'Hi' })
        .set('Content-Type', 'application/json')
        .expect(401);
    });
  });

  describe('missing routes (document current behavior)', () => {
    it('PUT /api/profile returns 404 (not implemented)', async () => {
      await request(app)
        .put('/api/profile')
        .send({ points: 10 })
        .set('Content-Type', 'application/json')
        .set('Authorization', 'Bearer fake-token')
        .expect(404);
    });

    it('POST /api/character/generate returns 404 (not implemented)', async () => {
      await request(app)
        .post('/api/character/generate')
        .send({ characterName: 'Shelly', characterType: 'Turtle', color: 'Emerald' })
        .set('Content-Type', 'application/json')
        .set('Authorization', 'Bearer fake-token')
        .expect(404);
    });
  });
});
