const { StatusCodeError, asyncHandler } = require('../src/endpointHelper');

describe('endpointHelper',() => {

  describe('StatusCodeError', ()=> {
    test('store msg and statusCode', () => {
      const error = new StatusCodeError('Not Found', 404);
      expect(error.message).toBe('Not Found');
      expect(error.statusCode).toBe(404);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('asyncHandler', () => {
    test('call function and resolve',async () => {
      const mockFn = jest.fn((req, res, next)=> Promise.resolve('success'));
      const req = {};
      const res = {};
      const next = jest.fn();
      await asyncHandler(mockFn)(req, res, next);
      expect(mockFn).toHaveBeenCalledWith(req,res, next);
      expect(next).not.toHaveBeenCalled();
    });

    test('catch errors and call next', async ()=>{
      const error = new Error('Async Error');
      const mockFn = jest.fn((req, res,next)=> Promise.reject(error));
      const req = {};
      const res = {};
      const next = jest.fn();
      await asyncHandler(mockFn)(req,res,next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});