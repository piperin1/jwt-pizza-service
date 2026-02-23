const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const app = require('../src/service');
const { DB } = require('../src/database/database');
jest.mock('../src/database/database', () => ({
  DB: {
    isLoggedIn: jest.fn().mockResolvedValue(true),
    deleteUser: jest.fn().mockResolvedValue(true),
    getUsers: jest.fn().mockResolvedValue([
      { id: 1, name: 'pizza diner', email: 'p@test.com', roles: [{ role: 'diner' }] },
      { id: 2, name: 'admin user', email: 'a@test.com', roles: [{ role: 'admin' }] },
    ])
  }
}));
describe('User tests - List Users', () => {

  test('list users unauthorized', async () => {
    const res = await request(app).get('/api/user');
    expect(res.status).toBe(401);
  });

  test('list users forbidden for non-admin', async () => {
    const userToken = generateToken([{ role: 'diner' }]);

    const res = await request(app)
      .get('/api/user')
      .set('Authorization', 'Bearer ' + userToken);

    expect(res.status).toBe(403);
  });

  test('admin can list users', async () => {
    const adminToken = generateToken([{ role: 'admin' }]);

    const res = await request(app)
      .get('/api/user')
      .set('Authorization', 'Bearer ' + adminToken);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(typeof res.body.more).toBe('boolean');
  });

  test('pagination works', async () => {
    const adminToken = generateToken([{ role: 'admin' }]);

    const res = await request(app)
      .get('/api/user?page=1&limit=2')
      .set('Authorization', 'Bearer ' + adminToken);

    expect(res.status).toBe(200);
    expect(res.body.users.length).toBeLessThanOrEqual(2);
  });

  test('name filter works', async () => {
    const adminToken = generateToken([{ role: 'admin' }]);

    const res = await request(app)
      .get('/api/user?name=pizza')
      .set('Authorization', 'Bearer ' + adminToken);

    expect(res.status).toBe(200);
    
    if (res.body.users.length > 0) {
      for (const user of res.body.users) {
        expect(user.name.toLowerCase()).toContain('pizza');
      }
    }
  });

});

describe('Delete User', () => {

  test('delete user unauthorized', async () => {
    const res = await request(app).delete('/api/user/1');
    expect(res.status).toBe(401);
  });

  test('delete user forbidden for non-admin', async () => {
    const userToken = generateToken([{ role: 'diner' }]);

    const res = await request(app)
      .delete('/api/user/1')
      .set('Authorization', 'Bearer ' + userToken);

    expect(res.status).toBe(403);
  });

  test('admin can delete user', async () => {
    const adminToken = generateToken([{ role: 'admin' }]);

    const res = await request(app)
      .delete('/api/user/1')
      .set('Authorization', 'Bearer ' + adminToken);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

});

test('list users handles DB error', async () => {
  const adminToken = generateToken([{ role: 'admin' }]);

  DB.getUsers.mockRejectedValueOnce(new Error('DB failure'));

  const res = await request(app)
    .get('/api/user')
    .set('Authorization', 'Bearer ' + adminToken);

  expect(res.status).toBe(500);
});

test('delete user handles DB error', async () => {
  const adminToken = generateToken([{ role: 'admin' }]);

  DB.deleteUser.mockRejectedValueOnce(new Error('DB exploded'));

  const res = await request(app)
    .delete('/api/user/1')
    .set('Authorization', 'Bearer ' + adminToken);

  expect(res.status).toBe(500);
});

// Helper
function generateToken(roles) {
  return jwt.sign(
    {
      id: 1,
      roles
    },
    config.jwtSecret
  );
}