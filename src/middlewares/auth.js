const jwt = require('jsonwebtoken');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Token no proporcionado');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    const user = await User.findByPk(decoded.id);
    if (!user) {
      throw ApiError.unauthorized('Usuario no encontrado');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(ApiError.unauthorized('Token inválido'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token expirado'));
    }
    next(error);
  }
};

module.exports = auth;
