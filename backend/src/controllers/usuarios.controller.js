const { Usuario } = require('../models');
const {
  hashPassword,
  usuarioPublico
} = require('../services/auth.service');

exports.listar = async (req, res, next) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: {
        exclude: ['password_hash']
      },
      order: [['id', 'ASC']]
    });

    res.json({
      success: true,
      usuarios
    });
  } catch (error) {
    next(error);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const {
      nombre,
      apellido,
      correo,
      password,
      rol
    } = req.body;

    const correoNormalizado = correo.trim().toLowerCase();

    const existe = await Usuario.findOne({
      where: { correo: correoNormalizado }
    });

    if (existe) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un usuario con ese correo'
      });
    }

    const usuario = await Usuario.create({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      correo: correoNormalizado,
      password_hash: await hashPassword(password),
      rol
    });

    res.status(201).json({
      success: true,
      message: 'Usuario creado correctamente',
      usuario: usuarioPublico(usuario)
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'El correo ya está registrado'
      });
    }

    next(error);
  }
};

exports.cambiarEstado = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (usuario.id === req.usuario.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes desactivar tu propia cuenta'
      });
    }

    await usuario.update({
      activo: req.body.activo
    });

    res.json({
      success: true,
      message: usuario.activo
        ? 'Usuario activado correctamente'
        : 'Usuario desactivado correctamente',
      usuario: usuarioPublico(usuario)
    });
  } catch (error) {
    next(error);
  }
};