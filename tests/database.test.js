const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { StatusCodeError } = require('../src/endpointHelper');

jest.mock('mysql2/promise');
jest.mock('bcrypt');

describe('database.js',()=> {
  let conn;
  let DB;
  let Role;

  beforeAll(() => {
    conn = {
      execute: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    const dbModule = require('../src/database/database');
    DB = dbModule.DB;
    Role = dbModule.Role;
    jest.spyOn(DB, '_getConnection').mockResolvedValue(conn);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    conn.execute.mockResolvedValue([[]]);
    conn.query.mockResolvedValue([[]]);
  });

  test('getOffset helper',()=> {
    expect(DB.getOffset(3, 10)).toBe(20);
  });

  test('getTokenSignature helper',()=>{
    expect(DB.getTokenSignature('a.b.c')).toBe('c');
    expect(DB.getTokenSignature('bad')).toBe('');
  });

  test('getMenu rows', async()=>{
    conn.execute.mockResolvedValueOnce([[{id: 1 }]]);
    const menu = await DB.getMenu();
    expect(menu[0].id).toBe(1);
  });

  test('addMenuItem inserts and returns id', async()=>{
    conn.execute.mockResolvedValueOnce([{insertId:9}]);
    const item = await DB.addMenuItem({ title:'Pizza', description: 'x',image: 'y',price: 5 });
    expect(item.id).toBe(9);
  });

  test('addUser inserts user w role', async()=>{
    bcrypt.hash.mockResolvedValue('hashed');
    conn.execute.mockResolvedValueOnce([{insertId: 1}]).mockResolvedValueOnce([]);
    const user = await DB.addUser({name: 'A',email: 'e',password: 'p',roles: [{role: Role.Diner}],});
    expect(user.id).toBe(1);
  });

  test('addUser inserts user Franchisee role ', async()=>{
    bcrypt.hash.mockResolvedValue('hashed');
    conn.execute.mockResolvedValueOnce([{insertId:2}]).mockResolvedValueOnce([[{id:99}]]).mockResolvedValueOnce([]);
    const user = await DB.addUser({name: 'F',email: 'f@test.com',password: 'p',roles: [{ role: Role.Franchisee, object: 'PizzaCo' }],});
    expect(user.id).toBe(2);
  });

  test('getUser valid pwd and roles', async()=>{
    bcrypt.compare.mockResolvedValue(true);
    conn.execute.mockResolvedValueOnce([[{id: 1, password:'hash'}]]).mockResolvedValueOnce([[{role: Role.Diner }]]);
    const user = await DB.getUser('e','good');
    expect(user.roles.length).toBe(1);
  });

  test('throws on invalid pwd', async()=>{
    conn.execute.mockResolvedValueOnce([[{ password: 'hash' }]]);
    bcrypt.compare.mockResolvedValue(false);
    await expect(DB.getUser('e', 'bad')).rejects.toBeInstanceOf(StatusCodeError);
  });

  test('updateUser no params skips update', async()=>{
    conn.execute.mockResolvedValueOnce([[{ id:1, password: 'hash' }]]).mockResolvedValueOnce([[{ role: Role.Diner }]]);
    await DB.updateUser(1);
  });

  test('loginUser insert token', async()=>{
    conn.execute.mockResolvedValueOnce([]);
    await DB.loginUser(1, 'a.b.c');
    expect(conn.execute).toHaveBeenCalled();
  });

  test('isLoggedIn true', async()=>{
    conn.execute.mockResolvedValueOnce([[{ userId:1 }]]);
    const result = await DB.isLoggedIn('a.b.c');
    expect(result).toBe(true);
  });

  test('isLoggedIn false', async()=>{
    conn.execute.mockResolvedValueOnce([[]]);
    const result = await DB.isLoggedIn('a.b.c');
    expect(result).toBe(false);
  });

  test('logoutUser deletes token', async()=>{
    conn.execute.mockResolvedValueOnce([]);
    await DB.logoutUser('a.b.c');
    expect(conn.execute).toHaveBeenCalled();
  });

  test('getOrders adds items', async()=>{
    conn.execute.mockResolvedValueOnce([[{ id:10 }]]).mockResolvedValueOnce([[{ id:1, price:5 }]]);
    const result = await DB.getOrders({ id:1 }, 1);
    expect(result.orders[0].items.length).toBe(1);
  });

  test('addDinerOrder inserts order', async()=>{
    conn.execute.mockResolvedValueOnce([{insertId:5}]).mockResolvedValueOnce([[{id:7}]]).mockResolvedValueOnce([]);
    await DB.addDinerOrder({id:1},{ franchiseId:1, storeId:1, items: [{ menuId:7, description: 'x', price: 5 }] });
  });


  test('createStore returns store', async()=>{
    conn.execute.mockResolvedValueOnce([{ insertId:3 }]);
    const store = await DB.createStore(1, { name:'S' });
    expect(store.id).toBe(3);
  });

  test('deleteStore deletes', async()=>{
    conn.execute.mockResolvedValueOnce([]);
    await DB.deleteStore(1, 2);
    expect(conn.execute).toHaveBeenCalled();
  });

  test('createFranchise throw', async()=>{
    conn.execute.mockResolvedValueOnce([[]]);
    await expect(
      DB.createFranchise({ name:'F',admins: [{ email:'x@test.com' }] })
    ).rejects.toBeInstanceOf(StatusCodeError);
  });

  test('createFranchise success', async()=>{
    conn.execute.mockResolvedValueOnce([[{ id:1, name: 'Admin' }]]).mockResolvedValueOnce([{ insertId: 10}]).mockResolvedValueOnce([]);
    const franchise = await DB.createFranchise({name: 'F',admins: [{ email:'a@test.com' }],});
    expect(franchise.id).toBe(10);
  });

  test('getFranchises non-admin', async()=>{
    conn.execute.mockResolvedValueOnce([[{ id:1 }, { id:2 }, { id:3}]]).mockResolvedValue([[{ id:10, name:'Store' }]]);
    const [list, more] = await DB.getFranchises({ isRole:()=> false },0,2, '*');
    expect(more).toBe(true);
    expect(list.length).toBe(2);
  });

  test('getUserFranchises return empty', async()=>{
    conn.execute.mockResolvedValueOnce([[]]);
    const result = await DB.getUserFranchises(1);
    expect(result).toEqual([]);
  });

  test('getUserFranchises return franchises', async()=>{
    conn.execute.mockResolvedValueOnce([[{ objectId:1 }]]).mockResolvedValueOnce([[{ id:1, name:'F' }]]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const result = await DB.getUserFranchises(1);
    expect(result.length).toBe(1);
  });

  test('getFranchise adds admins and stores', async()=>{
    conn.execute.mockResolvedValueOnce([[{ id:1, name: 'Admin'}]]).mockResolvedValueOnce([[{ id:1, totalRevenue: 100 }]]);
    const f = await DB.getFranchise({ id:1 });
    expect(f.stores[0].totalRevenue).toBe(100);
  });

  test('deleteFranchise fail', async()=>{
    conn.beginTransaction.mockResolvedValue();
    conn.execute.mockRejectedValueOnce(new Error('fail'));
    await expect(DB.deleteFranchise(1)).rejects.toBeInstanceOf(StatusCodeError);
    expect(conn.rollback).toHaveBeenCalled();
  });

  test('getID returns id when found', async()=>{
    conn.execute.mockResolvedValueOnce([[{ id: 7 }]]);
    const id = await DB.getID(conn, 'id',7,'x');
    expect(id).toBe(7);
  });

  test('getID throws when no rows', async()=>{
    conn.execute.mockResolvedValueOnce([[]]);
    await expect(DB.getID(conn,'id', 1, 'x')).rejects.toThrow();
  });
});
