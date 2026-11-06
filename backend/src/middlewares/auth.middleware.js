const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

async function autenticar(req, res, next) {
  try {
    const header = req.headers.authorization || '';

    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Debes iniciar sesión'
      });
    }

    const token = header.slice(7);

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ['HS256'] }
    );

    const usuario = await Usuario.findByPk(payload.sub);

    if (!usuario || !usuario.activo) {
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo o inexistente'
      });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.name === 'NotBeforeError'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Sesión inválida o expirada'
      });
    }

    next(error);
  }
}

function autorizar(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para esta operación'
      });
    }

    next();
  };
}

module.exports = { autenticar, autorizar };