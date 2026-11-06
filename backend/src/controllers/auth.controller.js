const { Usuario } = require('../models');

const {
  verificarPassword,
  firmarToken,
  usuarioPublico
} = require('../services/auth.service');

exports.login = async (req, res, next) => {
  try {
    const correo = req.body.correo.trim().toLowerCase();

    const usuario = await Usuario.findOne({
      where: { correo }
    });

    const valido = usuario && usuario.activo &&
      await verificarPassword(
        req.body.password,
        usuario.password_hash
      );

    if (!valido) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }

    res.json({
      success: true,
      token: firmarToken(usuario),
      usuario: usuarioPublico(usuario)
    });
  } catch (error) {
    next(error);
  }
};

exports.perfil = (req, res) => {
  res.json({
    success: true,
    usuario: usuarioPublico(req.usuario)
  });
};