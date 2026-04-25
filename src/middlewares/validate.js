const ApiError = require('../utils/ApiError');

/**
 * Creates a validation middleware using a Zod schema.
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} source - Where to validate from
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const issues = result.error.issues || [];
      const errors = issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return next(ApiError.badRequest('Error de validación', errors));
    }

    // Replace with parsed (and coerced) data
    req[source] = result.data;
    next();
  };
};

module.exports = validate;
