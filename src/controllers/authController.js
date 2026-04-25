const authService = require('../services/authService');
const { asyncHandler } = require('../utils/helpers');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);

  res.status(201).json({
    success: true,
    message: 'Usuario registrado exitosamente',
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);

  res.json({
    success: true,
    message: 'Login exitoso',
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken);

  res.json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user },
  });
});

module.exports = { register, login, refresh, me };
