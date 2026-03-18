const request = require('supertest');
const app = require('../src/service');

test('create order unauthorized', async () => {
  const res = await request(app).post('/api/order');
  expect(res.status).toBe(401);
});

//test('franchise route', async () => {
  //const res = await request(app).get('/api/franchise');
  //expect(res.status).toBe(200);
//});