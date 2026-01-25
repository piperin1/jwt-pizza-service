jest.mock('../src/database/database',()=> ({
  DB: {addUser: jest.fn(),},Role: {Admin: 'admin',},
}));

describe('init.js',()=> {
  let ogArgv;
  let exitMock;
  let logMock;
  let DB;

  beforeEach(()=> {
    jest.resetModules();
    ogArgv = process.argv;
    exitMock = jest.spyOn(process, 'exit').mockImplementation(() => {});
    logMock = jest.spyOn(console, 'log').mockImplementation(() => {});
    const database = require('../src/database/database');
    DB = database.DB;
    DB.addUser.mockResolvedValue({ id: 1, name: 'admin' });
  });

  afterEach(()=>{
    process.argv = ogArgv;
    exitMock.mockRestore();
    logMock.mockRestore();
  });

  test('exits with error w/o argv', () => {
    process.argv = ['node','init.js'];
    require('../src/init.js');
    expect(logMock).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    expect(exitMock).toHaveBeenCalledWith(1);
  });

  test('creates a user w argv', async () => {
    process.argv = ['node', 'init.js','AdminName','admin@test.com','pass123'];
    const mockUser = { name: 'AdminName', email:'admin@test.com', id: 1 };
    DB.addUser.mockResolvedValue(mockUser);
    require('../src/init.js');
    await new Promise(process.nextTick);
    expect(DB.addUser).toHaveBeenCalledWith({name:'AdminName',email:'admin@test.com',password:'pass123',roles: [{ role:'admin' }],});
    expect(logMock).toHaveBeenCalledWith('created user: ', mockUser);
    expect(exitMock).not.toHaveBeenCalled();
  });
});