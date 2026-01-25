const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const { authRouter, setAuthUser } = require('../src/routes/authRouter');
const { DB } = require('../src/database/database');

jest.mock('../src/database/database');

describe('Router & middleware', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(setAuthUser);
    app.use('/api/auth', authRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth',()=> {
    test('success', async()=> {
      const mockUser = { id:1, name:'Pizza', email:'p@test.com', roles: [{ role:'diner'}] };
      DB.addUser.mockResolvedValue(mockUser);
      DB.loginUser.mockResolvedValue();
      const res = await request(app).post('/api/auth').send({ name:'Pizza',email: 'p@test.com',password: 'password' });
      expect(res.status).toBe(200);
      expect(res.body.user).toEqual(mockUser);
      expect(res.body).toHaveProperty('token');
    });

    test('fail', async()=> {
      const res = await request(app).post('/api/auth').send({ name:'Pizza' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/required/);
    });
  });

  describe('PUT /api/auth', ()=> {
    test('success', async()=> {
      const mockUser = { id:1, name:'Pizza', email:'p@test.com', roles: [{ role:'diner'}] };
      DB.getUser.mockResolvedValue(mockUser);
      const res = await request(app).put('/api/auth').send({ email: 'p@test.com', password: 'password'});
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });
  });

  describe('DELETE /api/auth', ()=> {
    test('success', async()=> {
      const token = jwt.sign({ id:1}, config.jwtSecret);
      DB.isLoggedIn.mockResolvedValue(true);
      const res = await request(app).delete('/api/auth').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(DB.logoutUser).toHaveBeenCalled();
    });

    test('logout no token', async()=> {
        const res = await request(app).delete('/api/auth');
        expect(res.status).toBe(401);
    });
  });

  describe('setAuthUser', ()=> {
    test('IDs logged-in user', async()=> {
      const userData = { id:1, roles: [{role: 'diner' }] };
      const token = jwt.sign(userData, config.jwtSecret);
      DB.isLoggedIn.mockResolvedValue(true);
      const res = await request(app).delete('/api/auth').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200); 
    });

    test('token not in database', async()=> {
      const token = jwt.sign({ id: 1 }, config.jwtSecret);
      DB.isLoggedIn.mockResolvedValue(false);
      const res = await request(app).delete('/api/auth').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    test('catch block on invalid JWT', async () => {
      DB.isLoggedIn.mockResolvedValue(true);
      const res = await request(app).delete('/api/auth').set('Authorization', `Bearer not-a-real-token`);
      expect(res.status).toBe(401);
    });
  });

  describe('Role Helper', () => {
    test('correctly ids roles', async () => {
        const userData = {id: 1,roles: [{role:'admin' }] };
        const token = jwt.sign(userData, config.jwtSecret);
        DB.isLoggedIn.mockResolvedValue(true);
        app.get('/test-role', (req, res) => {
            const hasRole = req.user.isRole('admin');
            const noRole = req.user.isRole('diner');
            res.json({ hasRole, noRole });
        });
        const res = await request(app).get('/test-role').set('Authorization', `Bearer ${token}`);
        expect(res.body.hasRole).toBe(true);
        expect(res.body.noRole).toBe(false);
    });
  });
});