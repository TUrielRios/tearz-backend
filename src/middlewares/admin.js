const ApiError = require('../utils/ApiError');

const admin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(ApiError.forbidden('Se requieren permisos de administrador'));
  }
  next();
};

module.exports = admin;
