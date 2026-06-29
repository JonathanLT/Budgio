import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

/**
 * Security tests: verify all protected routes return 401 without a valid JWT.
 */
describe('Auth security (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const protectedRoutes: Array<{ method: 'get' | 'post' | 'patch' | 'delete'; path: string }> = [
    { method: 'get', path: '/users/me' },
    { method: 'get', path: '/households' },
    { method: 'post', path: '/households' },
    { method: 'get', path: '/households/fake-id/transactions' },
    { method: 'post', path: '/households/fake-id/transactions' },
    { method: 'get', path: '/households/fake-id/categories' },
    { method: 'get', path: '/households/fake-id/goals' },
    { method: 'post', path: '/households/fake-id/goals' },
    { method: 'get', path: '/households/fake-id/recurring' },
  ];

  it.each(protectedRoutes)(
    '$method $path should return 401 without token',
    async ({ method, path }) => {
      const res = await (request(app.getHttpServer()) as any)[method](path);
      expect(res.status).toBe(401);
    },
  );

  it('GET /auth/me should return 401 without token', async () => {
    const res = await request(app.getHttpServer()).get('/auth/me');
    expect(res.status).toBe(401);
  });
});
