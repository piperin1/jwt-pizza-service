const request = require('supertest');
const app = require('../src/service'); 
const { DB, Role } = require('../src/database/database');

jest.mock('../src/database/database');
global.fetch = jest.fn();

describe('Order Router',()=> {
  let mockUser;
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 1, name: 'Pizza Diner', email: 'diner@test.com', isRole: jest.fn() };
  });

  test('GET /api/order/menu', async()=>{
    const mockMenu = [{ id: 1,title:'Veggie', price:0.05 }];
    DB.getMenu.mockResolvedValue(mockMenu);
    const res = await request(app).get('/api/order/menu');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockMenu);
  });

  test('PUT /api/order/menu', async()=>{
    mockUser.isRole.mockReturnValue(false); 
    const res = await request(app).put('/api/order/menu').send({ title: 'New Pizza' });
    expect(res.status).toBe(401);
  });
});