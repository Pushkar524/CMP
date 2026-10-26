const { BadRequestError } = require('../utils/errors');

/**
 * Express middleware to validate request data (body, query, params) using a Zod schema.
 * @param {import('zod').ZodSchema} schema 
 * @param {'body' | 'query' | 'params'} [source='body']
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  try {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issue = result.error.issues[0];
      const message = issue.message || 'Invalid request payload';
      throw new BadRequestError(message);
    }
    req[source] = result.data;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { validate };
