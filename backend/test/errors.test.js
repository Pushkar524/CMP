const test = require('node:test');
const assert = require('node:assert/strict');
const {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} = require('../src/utils/errors');
const errorHandler = require('../src/middleware/errorHandler');

test('Errors and Error Handler Suite', async (t) => {
  await t.test('AppError subclasses have correct status codes', () => {
    assert.strictEqual(new AppError('Server error', 500).statusCode, 500);
    assert.strictEqual(new BadRequestError().statusCode, 400);
    assert.strictEqual(new UnauthorizedError().statusCode, 401);
    assert.strictEqual(new ForbiddenError().statusCode, 403);
    assert.strictEqual(new NotFoundError().statusCode, 404);
    assert.strictEqual(new ConflictError().statusCode, 409);
  });

  await t.test('errorHandler properly formats AppError responses', () => {
    const error = new NotFoundError('Target location was not found.');
    const req = {};
    let statusReturned = 0;
    let jsonReturned = null;

    const res = {
      status(code) {
        statusReturned = code;
        return this;
      },
      json(data) {
        jsonReturned = data;
        return this;
      },
    };

    errorHandler(error, req, res, () => {});

    assert.strictEqual(statusReturned, 404);
    assert.strictEqual(jsonReturned.success, false);
    assert.strictEqual(jsonReturned.message, 'Target location was not found.');
  });
});
