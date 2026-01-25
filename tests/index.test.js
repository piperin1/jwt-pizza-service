
jest.mock('../src/service.js',()=> ({
  listen: jest.fn((port, callback)=> {
    if (callback) callback();
  }),
}));

describe('index.js startup',()=> {
  let ogArgv;
  let logSpy;
  let app;

  beforeEach(() => {
    jest.resetModules();
    ogArgv = process.argv;
    logSpy = jest.spyOn(console,'log').mockImplementation(()=>{});
    app = require('../src/service.js');
  });

  afterEach(() => {
    process.argv = ogArgv;
    logSpy.mockRestore();
  });

  test('starts server default', ()=> {
    process.argv = ['node','index.js'];
    require('../src/index.js');
    expect(app.listen).toHaveBeenCalledWith(3000, expect.any(Function));
    expect(logSpy).toHaveBeenCalledWith('Server started on port 3000');
  });

  test('starts server custom', ()=> {
    process.argv = ['node','index.js','4000'];
    require('../src/index.js');
    expect(app.listen).toHaveBeenCalledWith('4000',expect.any(Function));
    expect(logSpy).toHaveBeenCalledWith('Server started on port 4000');
  });
});