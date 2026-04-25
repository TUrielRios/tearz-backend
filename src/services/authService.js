const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');

class AuthService {
  /**
   * Generate access + refresh tokens
   */
  generateTokens(user) {
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Register a new user
   */
  async register({ email, password, firstName, lastName }) {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      throw ApiError.conflict('Este email ya está registrado');
    }

    const user = await User.create({ email, password, firstName, lastName });
    const tokens = this.generateTokens(user);

    // Save refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return { user, ...tokens };
  }

  /**
   * Login user
   */
  async login({ email, password }) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw ApiError.unauthorized('Credenciales inválidas');
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      throw ApiError.unauthorized('Credenciales inválidas');
    }

    const tokens = this.generateTokens(user);

    user.refreshToken = tokens.refreshToken;
    await user.save();

    return { user, ...tokens };
  }

  /**
   * Refresh access token
   */
  async refresh(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      const user = await User.findByPk(decoded.id);

      if (!user || user.refreshToken !== refreshToken) {
        throw ApiError.unauthorized('Refresh token inválido');
      }

      const tokens = this.generateTokens(user);

      user.refreshToken = tokens.refreshToken;
      await user.save();

      return { user, ...tokens };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.unauthorized('Refresh token inválido o expirado');
    }
  }
}

module.exports = new AuthService();
