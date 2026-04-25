const ApiError = require('../utils/ApiError');
const config = require('../config');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = ApiError.badRequest('Error de validación', errors);
  }

  // Sequelize unique constraint
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors?.[0]?.path || 'campo';
    error = ApiError.conflict(`El ${field} ya está en uso`);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Error interno del servidor';

  // Log server errors
  if (statusCode >= 500) {
    console.error('❌ Server Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(error.errors?.length && { errors: error.errors }),
    ...(config.env === 'development' && statusCode >= 500 && { stack: err.stack }),
  });
};

module.exports = errorHandler;
